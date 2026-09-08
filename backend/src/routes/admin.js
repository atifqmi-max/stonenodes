const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");
const { getAllSettings, setSettings, getSetting } = require("../db/settings");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { sendMail } = require("../services/mailer");
const provisioning = require("../services/provisioning");

const router = express.Router();
router.use(requireAuth, requireAdmin);

function audit(actorId, action, target, details) {
  db.prepare(
    `INSERT INTO audit_log (id, actor_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uuidv4(), actorId, action, target || null, details ? JSON.stringify(details) : null, Date.now());
}

// ================= USERS =================
router.get("/users", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.username, u.role, u.status, u.credits, u.vps_slot_limit, u.created_at,
              (SELECT COUNT(*) FROM instances i WHERE i.owner_id = u.id) AS vps_count
       FROM users u ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users: rows });
});

router.post("/users/:id/suspend", async (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  db.prepare(`UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?`).run(Date.now(), user.id);

  const running = db.prepare(`SELECT * FROM instances WHERE owner_id = ? AND status = 'running'`).all(user.id);
  for (const inst of running) {
    try {
      await provisioning.performAction(inst, "stop");
    } catch (e) {
      console.error(`[admin] failed to stop instance ${inst.id}:`, e.message);
    }
    db.prepare(`UPDATE instances SET status = 'stopped', updated_at = ? WHERE id = ?`).run(Date.now(), inst.id);
  }

  audit(req.user.id, "suspend_user", user.id, { email: user.email });
  res.json({ ok: true });
});

router.post("/users/:id/unsuspend", (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  db.prepare(`UPDATE users SET status = 'active', updated_at = ? WHERE id = ?`).run(Date.now(), user.id);
  audit(req.user.id, "unsuspend_user", user.id, { email: user.email });
  res.json({ ok: true });
});

router.delete("/users/:id", (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.id === req.user.id) return res.status(400).json({ error: "You cannot delete your own account" });

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM instances WHERE owner_id = ?`).run(user.id);
    db.prepare(`DELETE FROM redeem_claims WHERE user_id = ?`).run(user.id);
    db.prepare(`DELETE FROM transactions WHERE user_id = ?`).run(user.id);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(user.id);
  });
  tx();

  audit(req.user.id, "delete_user", user.id, { email: user.email });
  res.json({ ok: true });
});

router.post("/users/:id/promote", (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  db.prepare(`UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?`).run(Date.now(), user.id);
  audit(req.user.id, "promote_admin", user.id, { email: user.email });
  res.json({ ok: true });
});

router.post("/users/:id/credits", (req, res) => {
  const { amount, note } = req.body || {};
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt === 0) return res.status(400).json({ error: "Provide a non-zero amount" });

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const newBalance = Math.max(0, Number((user.credits + amt).toFixed(4)));
  db.prepare(`UPDATE users SET credits = ?, updated_at = ? WHERE id = ?`).run(newBalance, Date.now(), user.id);
  db.prepare(
    `INSERT INTO transactions (id, user_id, type, amount, balance_after, note, created_at)
     VALUES (?, ?, 'admin_adjust', ?, ?, ?, ?)`
  ).run(uuidv4(), user.id, amt, newBalance, note || `Adjusted by admin ${req.user.username}`, Date.now());

  audit(req.user.id, "adjust_credits", user.id, { amount: amt, newBalance });
  res.json({ ok: true, newBalance });
});

router.post("/users/:id/slot-limit", (req, res) => {
  const { limit } = req.body || {};
  const lim = Number(limit);
  if (!Number.isInteger(lim) || lim < 0) return res.status(400).json({ error: "Invalid limit" });

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  db.prepare(`UPDATE users SET vps_slot_limit = ?, updated_at = ? WHERE id = ?`).run(lim, Date.now(), user.id);
  audit(req.user.id, "set_slot_limit", user.id, { limit: lim });
  res.json({ ok: true });
});

// ================= REDEEM CODES =================
router.get("/redeem-codes", (req, res) => {
  const rows = db.prepare(`SELECT * FROM redeem_codes ORDER BY created_at DESC`).all();
  res.json({
    codes: rows.map((c) => ({
      ...c,
      claims_remaining: c.max_claims - c.claims_used
    }))
  });
});

router.post("/redeem-codes", (req, res) => {
  const { credits, userCount, code } = req.body || {};
  const creditsNum = Number(credits);
  const maxClaims = Number(userCount);
  if (!Number.isFinite(creditsNum) || creditsNum <= 0) {
    return res.status(400).json({ error: "Credits must be a positive number" });
  }
  if (!Number.isInteger(maxClaims) || maxClaims <= 0) {
    return res.status(400).json({ error: "User count must be a positive integer" });
  }

  const generated = (code && String(code).trim()) || `SN-${uuidv4().split("-")[0].toUpperCase()}`;
  const id = uuidv4();
  try {
    db.prepare(
      `INSERT INTO redeem_codes (id, code, credits, max_claims, claims_used, created_by, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).run(id, generated, creditsNum, maxClaims, req.user.id, Date.now());
  } catch (e) {
    return res.status(409).json({ error: "That code already exists" });
  }

  audit(req.user.id, "create_redeem_code", id, { code: generated, credits: creditsNum, maxClaims });
  res.status(201).json({ ok: true, code: generated });
});

router.delete("/redeem-codes/:id", (req, res) => {
  db.prepare(`DELETE FROM redeem_codes WHERE id = ?`).run(req.params.id);
  audit(req.user.id, "delete_redeem_code", req.params.id);
  res.json({ ok: true });
});

// ================= VPS OVERSIGHT =================
router.get("/instances", (req, res) => {
  const rows = db
    .prepare(
      `SELECT i.id, i.name, i.status, i.os, i.cpu, i.ram_mb, i.hourly_cost, i.created_at,
              n.name AS node_name, u.username AS owner_username, u.email AS owner_email
       FROM instances i
       JOIN nodes n ON n.id = i.node_id
       JOIN users u ON u.id = i.owner_id
       ORDER BY i.created_at DESC`
    )
    .all();
  res.json({ instances: rows });
});

router.post("/instances/:id/suspend", async (req, res) => {
  const inst = db.prepare(`SELECT * FROM instances WHERE id = ?`).get(req.params.id);
  if (!inst) return res.status(404).json({ error: "Instance not found" });
  try {
    await provisioning.performAction(inst, "stop");
  } catch (e) {
    console.error(e.message);
  }
  db.prepare(`UPDATE instances SET status = 'suspended', updated_at = ? WHERE id = ?`).run(Date.now(), inst.id);
  audit(req.user.id, "suspend_instance", inst.id);
  res.json({ ok: true });
});

router.post("/instances/:id/unsuspend", (req, res) => {
  const inst = db.prepare(`SELECT * FROM instances WHERE id = ?`).get(req.params.id);
  if (!inst) return res.status(404).json({ error: "Instance not found" });
  db.prepare(`UPDATE instances SET status = 'stopped', updated_at = ? WHERE id = ?`).run(Date.now(), inst.id);
  audit(req.user.id, "unsuspend_instance", inst.id);
  res.json({ ok: true });
});

router.delete("/instances/:id", async (req, res) => {
  const inst = db.prepare(`SELECT * FROM instances WHERE id = ?`).get(req.params.id);
  if (!inst) return res.status(404).json({ error: "Instance not found" });
  try {
    await provisioning.performAction(inst, "delete");
  } catch (e) {
    console.error(e.message);
  }
  db.prepare(`DELETE FROM instances WHERE id = ?`).run(inst.id);
  audit(req.user.id, "delete_instance", inst.id);
  res.json({ ok: true });
});

// ================= NODES =================
router.get("/nodes", (req, res) => {
  const rows = db
    .prepare(
      `SELECT n.*, (SELECT COUNT(*) FROM instances i WHERE i.node_id = n.id) AS instance_count
       FROM nodes n ORDER BY n.created_at DESC`
    )
    .all();
  res.json({ nodes: rows });
});

router.post("/nodes", (req, res) => {
  const { name, type, apiUrl, apiKey, vpsLimit } = req.body || {};
  if (!name) return res.status(400).json({ error: "Node name is required" });
  const nodeType = type === "local" ? "local" : "remote";
  if (nodeType === "remote" && !apiUrl) {
    return res.status(400).json({ error: "Remote nodes require an API URL" });
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO nodes (id, name, type, api_url, api_key, vps_limit, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
  ).run(id, name, nodeType, apiUrl || null, apiKey || null, Number(vpsLimit) || 50, Date.now());
  audit(req.user.id, "create_node", id, { name, type: nodeType });
  res.status(201).json({ ok: true, id });
});

router.post("/nodes/:id/limit", (req, res) => {
  const { limit } = req.body || {};
  const lim = Number(limit);
  if (!Number.isInteger(lim) || lim < 0) return res.status(400).json({ error: "Invalid limit" });
  db.prepare(`UPDATE nodes SET vps_limit = ? WHERE id = ?`).run(lim, req.params.id);
  audit(req.user.id, "set_node_limit", req.params.id, { limit: lim });
  res.json({ ok: true });
});

router.post("/nodes/:id/toggle", (req, res) => {
  const node = db.prepare(`SELECT * FROM nodes WHERE id = ?`).get(req.params.id);
  if (!node) return res.status(404).json({ error: "Node not found" });
  const newStatus = node.status === "active" ? "disabled" : "active";
  db.prepare(`UPDATE nodes SET status = ? WHERE id = ?`).run(newStatus, node.id);
  res.json({ ok: true, status: newStatus });
});

router.delete("/nodes/:id", (req, res) => {
  const inUse = db.prepare(`SELECT COUNT(*) AS c FROM instances WHERE node_id = ?`).get(req.params.id).c;
  if (inUse > 0) {
    return res.status(409).json({ error: "Cannot delete a node that still has instances on it" });
  }
  db.prepare(`DELETE FROM nodes WHERE id = ?`).run(req.params.id);
  audit(req.user.id, "delete_node", req.params.id);
  res.json({ ok: true });
});

// ================= SETTINGS =================
router.get("/settings", (req, res) => {
  const settings = getAllSettings();
  // never echo the SMTP password back in full
  if (settings.smtp_pass) settings.smtp_pass = "";
  res.json({ settings });
});

router.post("/settings", (req, res) => {
  const allowedKeys = [
    "site_name",
    "support_discord",
    "default_starting_credits",
    "maintenance_mode",
    "maintenance_message",
    "smtp_host",
    "smtp_port",
    "smtp_secure",
    "smtp_user",
    "smtp_pass",
    "smtp_from"
  ];
  const updates = {};
  for (const key of allowedKeys) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
      // Don't overwrite the stored SMTP password with a blank "unchanged" submission
      if (key === "smtp_pass" && req.body[key] === "") continue;
      updates[key] = req.body[key];
    }
  }
  setSettings(updates);
  audit(req.user.id, "update_settings", null, { keys: Object.keys(updates) });
  res.json({ ok: true });
});

// ================= BROADCAST =================
router.post("/broadcast", async (req, res) => {
  const { message, subject } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message is required" });

  const users = db.prepare(`SELECT email FROM users WHERE status != 'pending'`).all();
  const results = { sent: 0, failed: 0 };
  for (const u of users) {
    try {
      await sendMail({
        to: u.email,
        subject: subject || `Announcement from ${getSetting("site_name", "StoneNodes")}`,
        text: message
      });
      results.sent++;
    } catch (e) {
      results.failed++;
    }
  }
  audit(req.user.id, "broadcast", null, { recipients: users.length, subject });
  res.json({ ok: true, ...results });
});

// ================= SHOP MANAGEMENT =================
router.get("/shop-items", (req, res) => {
  const items = db.prepare(`SELECT * FROM shop_items ORDER BY credits ASC`).all();
  res.json({ items });
});

router.post("/shop-items", (req, res) => {
  const { name, credits, price, description, buyLink } = req.body || {};
  if (!name || !credits || !price) return res.status(400).json({ error: "Name, credits and price are required" });
  const id = uuidv4();
  db.prepare(
    `INSERT INTO shop_items (id, name, credits, price, description, buy_link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    Number(credits),
    price,
    description || "",
    buyLink || getSetting("support_discord"),
    Date.now()
  );
  audit(req.user.id, "create_shop_item", id, { name });
  res.status(201).json({ ok: true, id });
});

router.put("/shop-items/:id", (req, res) => {
  const item = db.prepare(`SELECT * FROM shop_items WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  const { name, credits, price, description, buyLink } = req.body || {};
  db.prepare(
    `UPDATE shop_items SET name = ?, credits = ?, price = ?, description = ?, buy_link = ? WHERE id = ?`
  ).run(
    name ?? item.name,
    credits !== undefined ? Number(credits) : item.credits,
    price ?? item.price,
    description ?? item.description,
    buyLink ?? item.buy_link,
    item.id
  );
  audit(req.user.id, "update_shop_item", item.id);
  res.json({ ok: true });
});

router.delete("/shop-items/:id", (req, res) => {
  db.prepare(`DELETE FROM shop_items WHERE id = ?`).run(req.params.id);
  audit(req.user.id, "delete_shop_item", req.params.id);
  res.json({ ok: true });
});

// ================= AUDIT LOG =================
router.get("/audit-log", (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, u.username AS actor_username FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 200`
    )
    .all();
  res.json({ logs: rows });
});

module.exports = router;
