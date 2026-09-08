const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const DB_FILE = process.env.DATABASE_FILE || "./data/stonenodes.db";
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'member' | 'admin'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'suspended'
  credits REAL NOT NULL DEFAULT 0,
  vps_slot_limit INTEGER NOT NULL DEFAULT 5,
  email_verify_code TEXT,
  email_verify_expires INTEGER,
  otp_code TEXT,
  otp_expires INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'remote', -- 'remote' | 'local'
  api_url TEXT,
  api_key TEXT,
  vps_limit INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'disabled'
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS instances (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  node_id TEXT NOT NULL REFERENCES nodes(id),
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  os TEXT NOT NULL,
  cpu TEXT NOT NULL,
  ram_mb INTEGER NOT NULL,
  username TEXT NOT NULL DEFAULT 'root',
  password_enc TEXT NOT NULL,
  ip TEXT,
  port INTEGER DEFAULT 22,
  status TEXT NOT NULL DEFAULT 'running', -- 'running' | 'stopped' | 'suspended'
  hourly_cost REAL NOT NULL,
  provisioning_ref TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS redeem_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  credits REAL NOT NULL,
  max_claims INTEGER NOT NULL,
  claims_used INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS redeem_claims (
  id TEXT PRIMARY KEY,
  code_id TEXT NOT NULL REFERENCES redeem_codes(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  claimed_at INTEGER NOT NULL,
  UNIQUE(code_id, user_id)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits REAL NOT NULL,
  price TEXT NOT NULL,
  description TEXT,
  buy_link TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- 'redeem' | 'admin_adjust' | 'billing' | 'signup_bonus'
  amount REAL NOT NULL, -- positive = credit, negative = debit
  balance_after REAL NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// ---- default settings ----
const defaultSettings = {
  site_name: "StoneNodes",
  support_discord: process.env.DISCORD_INVITE_URL || "https://discord.gg/wf9NVXa3xF",
  default_starting_credits: process.env.DEFAULT_STARTING_CREDITS || "10",
  maintenance_mode: "false",
  maintenance_message: "StoneNodes is currently undergoing scheduled maintenance. Please check back soon.",
  smtp_host: process.env.SMTP_HOST || "",
  smtp_port: process.env.SMTP_PORT || "587",
  smtp_secure: process.env.SMTP_SECURE || "false",
  smtp_user: process.env.SMTP_USER || "",
  smtp_pass: process.env.SMTP_PASS || "",
  smtp_from: process.env.SMTP_FROM || "StoneNodes <no-reply@stonenodes.local>"
};

const insertSetting = db.prepare(
  `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
);
for (const [k, v] of Object.entries(defaultSettings)) insertSetting.run(k, String(v));

// ---- seed admin + local node on first run ----
const userCount = db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c;
if (userCount === 0) {
  const now = Date.now();
  const { v4: uuidv4 } = require("uuid");
  const adminId = uuidv4();
  const hash = bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD || "admin123", 10);
  db.prepare(
    `INSERT INTO users (id, email, username, password_hash, role, status, credits, vps_slot_limit, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'admin', 'active', ?, 5, ?, ?)`
  ).run(
    adminId,
    process.env.DEFAULT_ADMIN_EMAIL || "atifqmi@gmail.com",
    "admin",
    hash,
    1000,
    now,
    now
  );
  console.log(`[seed] Created default admin: ${process.env.DEFAULT_ADMIN_EMAIL || "atifqmi@gmail.com"}`);
}

const nodeCount = db.prepare(`SELECT COUNT(*) AS c FROM nodes`).get().c;
if (nodeCount === 0) {
  const { v4: uuidv4 } = require("uuid");
  db.prepare(
    `INSERT INTO nodes (id, name, type, api_url, api_key, vps_limit, status, created_at) VALUES (?, ?, 'local', NULL, NULL, ?, 'active', ?)`
  ).run(uuidv4(), "Local Node (this host)", 100, Date.now());
  console.log("[seed] Created default local node");
}

module.exports = db;
