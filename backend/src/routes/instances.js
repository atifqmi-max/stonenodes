const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");
const { requireAuth, requireActive } = require("../middleware/auth");
const { computeHourlyCost, OS_OPTIONS, CPU_OPTIONS, RAM_TIERS } = require("../services/pricing");
const provisioning = require("../services/provisioning");
const crypto = require("../services/crypto");

const router = express.Router();
router.use(requireAuth, requireActive);

function serializeInstance(row, { withPassword = false } = {}) {
  return {
    id: row.id,
    name: row.name,
    hostname: row.hostname,
    os: row.os,
    cpu: row.cpu,
    ram_mb: row.ram_mb,
    username: row.username,
    password: withPassword ? crypto.decrypt(row.password_enc) : undefined,
    ip: row.ip,
    port: row.port,
    status: row.status,
    hourly_cost: row.hourly_cost,
    node_id: row.node_id,
    created_at: row.created_at
  };
}

// ---------------- OPTIONS (for the create form) ----------------
router.get("/options", (req, res) => {
  const nodes = db.prepare(`SELECT id, name, type, vps_limit FROM nodes WHERE status = 'active'`).all();
  const nodeUsage = db.prepare(`SELECT node_id, COUNT(*) AS c FROM instances WHERE status != 'deleted' GROUP BY node_id`).all();
  const usageMap = Object.fromEntries(nodeUsage.map((r) => [r.node_id, r.c]));

  res.json({
    os: OS_OPTIONS,
    cpu: CPU_OPTIONS,
    ram: RAM_TIERS.map((t) => ({ label: t.label, mb: t.mb, costPerHour: t.costPerHour })),
    nodes: nodes
      .filter((n) => (usageMap[n.id] || 0) < n.vps_limit)
      .map((n) => ({ id: n.id, name: n.name, type: n.type }))
  });
});

// ---------------- LIST ----------------
router.get("/", (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM instances WHERE owner_id = ? ORDER BY created_at DESC`)
    .all(req.user.id);
  res.json({ instances: rows.map((r) => serializeInstance(r)) });
});

// ---------------- CREATE ----------------
router.post("/", async (req, res) => {
  const { name, hostname, password, os, cpu, ram, nodeId } = req.body || {};
  if (!name || !hostname || !password || !os || !cpu || !ram || !nodeId) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (!OS_OPTIONS.includes(os)) return res.status(400).json({ error: "Invalid OS selection" });
  if (!CPU_OPTIONS.includes(cpu)) return res.status(400).json({ error: "Invalid CPU selection" });

  const existingCount = db
    .prepare(`SELECT COUNT(*) AS c FROM instances WHERE owner_id = ? AND status != 'deleted'`)
    .get(req.user.id).c;
  if (existingCount >= req.user.vps_slot_limit) {
    return res.status(409).json({
      error: "SLOT_LIMIT_REACHED",
      message: `You've reached your limit of ${req.user.vps_slot_limit} VPS instances. Delete an existing instance to free a slot, or contact an admin on Discord to request more.`
    });
  }

  const node = db.prepare(`SELECT * FROM nodes WHERE id = ? AND status = 'active'`).get(nodeId);
  if (!node) return res.status(400).json({ error: "Selected node is not available" });
  const nodeCount = db
    .prepare(`SELECT COUNT(*) AS c FROM instances WHERE node_id = ? AND status != 'deleted'`)
    .get(node.id).c;
  if (nodeCount >= node.vps_limit) {
    return res.status(409).json({ error: "This node is currently full. Please pick a different node." });
  }

  let hourlyCost;
  try {
    hourlyCost = computeHourlyCost({ cpu, ramLabel: ram });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  if (req.user.credits < hourlyCost) {
    return res.status(402).json({ error: "Insufficient credits to run this configuration for even one hour" });
  }

  const tier = RAM_TIERS.find((t) => t.label === ram);

  let provisioned;
  try {
    provisioned = await provisioning.createInstance({
      node,
      name,
      hostname,
      os,
      cpu,
      ramMb: tier.mb,
      password
    });
  } catch (e) {
    return res.status(502).json({ error: `Provisioning backend failed: ${e.message}` });
  }

  const id = uuidv4();
  const now = Date.now();
  db.prepare(
    `INSERT INTO instances
      (id, owner_id, node_id, name, hostname, os, cpu, ram_mb, username, password_enc, ip, port, status, hourly_cost, provisioning_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'root', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.user.id,
    node.id,
    name,
    hostname,
    os,
    cpu,
    tier.mb,
    crypto.encrypt(password),
    provisioned.ip || null,
    provisioned.port || 22,
    provisioned.status || "running",
    hourlyCost,
    provisioned.provisioning_ref || null,
    now,
    now
  );

  const row = db.prepare(`SELECT * FROM instances WHERE id = ?`).get(id);
  res.status(201).json({ instance: serializeInstance(row, { withPassword: true }) });
});

// ---------------- helper: load + ownership check ----------------
function loadOwned(req, res) {
  const row = db.prepare(`SELECT * FROM instances WHERE id = ?`).get(req.params.id);
  if (!row || row.owner_id !== req.user.id) {
    res.status(404).json({ error: "Instance not found" });
    return null;
  }
  return row;
}

// ---------------- DETAIL ----------------
router.get("/:id", (req, res) => {
  const row = loadOwned(req, res);
  if (!row) return;
  res.json({ instance: serializeInstance(row, { withPassword: true }) });
});

// ---------------- USAGE ----------------
router.get("/:id/usage", async (req, res) => {
  const row = loadOwned(req, res);
  if (!row) return;
  try {
    const usage = await provisioning.getUsage(row);
    res.json({ usage });
  } catch (e) {
    res.status(502).json({ error: `Could not fetch usage: ${e.message}` });
  }
});

// ---------------- START / STOP ----------------
router.post("/:id/start", async (req, res) => {
  const row = loadOwned(req, res);
  if (!row) return;
  if (row.status === "suspended") {
    return res.status(403).json({ error: "This instance is suspended and cannot be started" });
  }
  if (req.user.credits < row.hourly_cost) {
    return res.status(402).json({ error: "Insufficient credits to start this instance" });
  }
  try {
    await provisioning.performAction(row, "start");
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
  db.prepare(`UPDATE instances SET status = 'running', updated_at = ? WHERE id = ?`).run(Date.now(), row.id);
  res.json({ ok: true });
});

router.post("/:id/stop", async (req, res) => {
  const row = loadOwned(req, res);
  if (!row) return;
  try {
    await provisioning.performAction(row, "stop");
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
  db.prepare(`UPDATE instances SET status = 'stopped', updated_at = ? WHERE id = ?`).run(Date.now(), row.id);
  res.json({ ok: true });
});

// ---------------- REINSTALL ----------------
router.post("/:id/reinstall", async (req, res) => {
  const row = loadOwned(req, res);
  if (!row) return;
  const { os } = req.body || {};
  if (!OS_OPTIONS.includes(os)) return res.status(400).json({ error: "Invalid OS selection" });
  try {
    await provisioning.reinstall(row, os);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
  db.prepare(`UPDATE instances SET os = ?, updated_at = ? WHERE id = ?`).run(os, Date.now(), row.id);
  res.json({ ok: true });
});

// ---------------- CHANGE PASSWORD ----------------
router.post("/:id/password", async (req, res) => {
  const row = loadOwned(req, res);
  if (!row) return;
  const { password } = req.body || {};
  if (!password || password.length < 4) return res.status(400).json({ error: "Password too short" });
  try {
    await provisioning.changePassword(row, password);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
  db.prepare(`UPDATE instances SET password_enc = ?, updated_at = ? WHERE id = ?`).run(
    crypto.encrypt(password),
    Date.now(),
    row.id
  );
  res.json({ ok: true });
});

// ---------------- CHANGE HOSTNAME ----------------
router.post("/:id/hostname", async (req, res) => {
  const row = loadOwned(req, res);
  if (!row) return;
  const { hostname } = req.body || {};
  if (!hostname) return res.status(400).json({ error: "Hostname required" });
  try {
    await provisioning.changeHostname(row, hostname);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
  db.prepare(`UPDATE instances SET hostname = ?, updated_at = ? WHERE id = ?`).run(hostname, Date.now(), row.id);
  res.json({ ok: true });
});

// ---------------- DELETE ----------------
router.delete("/:id", async (req, res) => {
  const row = loadOwned(req, res);
  if (!row) return;
  try {
    await provisioning.performAction(row, "delete");
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
  db.prepare(`DELETE FROM instances WHERE id = ?`).run(row.id);
  res.json({ ok: true });
});

module.exports = router;
