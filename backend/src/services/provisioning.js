/**
 * StoneNodes does NOT provision real VPS instances itself.
 * This module is a thin client for YOUR existing VPS provisioning bot/service,
 * reached over an internal HTTP API (PROVISIONING_API_URL / PROVISIONING_API_KEY).
 *
 * If no provisioning backend is configured, it falls back to MOCK MODE:
 * actions are simulated locally (random IP, instant "success") so the rest of
 * the panel (accounts, credits, admin, billing) can be built/tested end-to-end
 * without a real infrastructure backend attached. Swap MOCK MODE out by
 * setting PROVISIONING_API_URL + PROVISIONING_API_KEY in .env.
 */

const MOCK_MODE = !process.env.PROVISIONING_API_URL;

async function callProvisioningApi(path, body) {
  const url = `${process.env.PROVISIONING_API_URL.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PROVISIONING_API_KEY || ""}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Provisioning backend error (${res.status}): ${text}`);
  }
  return res.json();
}

function mockIp() {
  return `10.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${
    Math.floor(Math.random() * 254) + 1
  }`;
}

async function createInstance({ node, name, hostname, os, cpu, ramMb, password }) {
  if (MOCK_MODE) {
    return {
      provisioning_ref: `mock-${Date.now()}`,
      ip: mockIp(),
      port: 22,
      status: "running"
    };
  }
  return callProvisioningApi("/instances", {
    node_id: node.api_url ? node.id : undefined,
    node_ref: node.id,
    name,
    hostname,
    os,
    cpu,
    ram_mb: ramMb,
    username: "root",
    password
  });
}

async function performAction(instance, action) {
  // action: 'start' | 'stop' | 'delete'
  if (MOCK_MODE) return { ok: true };
  return callProvisioningApi(`/instances/${instance.provisioning_ref}/${action}`, {});
}

async function reinstall(instance, os) {
  if (MOCK_MODE) return { ok: true };
  return callProvisioningApi(`/instances/${instance.provisioning_ref}/reinstall`, { os });
}

async function changePassword(instance, password) {
  if (MOCK_MODE) return { ok: true };
  return callProvisioningApi(`/instances/${instance.provisioning_ref}/password`, { password });
}

async function changeHostname(instance, hostname) {
  if (MOCK_MODE) return { ok: true };
  return callProvisioningApi(`/instances/${instance.provisioning_ref}/hostname`, { hostname });
}

async function getUsage(instance) {
  if (MOCK_MODE) {
    return {
      ram_used_mb: Math.floor(Math.random() * instance.ram_mb),
      cpu_used_pct: Math.floor(Math.random() * 100),
      disk_used_gb: Math.floor(Math.random() * 20)
    };
  }
  return callProvisioningApi(`/instances/${instance.provisioning_ref}/usage`, {});
}

module.exports = {
  MOCK_MODE,
  createInstance,
  performAction,
  reinstall,
  changePassword,
  changeHostname,
  getUsage
};
