const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const rateLimit = require("express-rate-limit");
const db = require("../db/init");
const { getSetting } = require("../db/settings");
const { sendMail } = require("../services/mailer");
const { setSessionCookie, clearSessionCookie, requireAuth } = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." }
});
router.use(authLimiter);

function sixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    status: u.status,
    credits: u.credits,
    vps_slot_limit: u.vps_slot_limit
  };
}

// ---------------- REGISTER ----------------
router.post("/register", async (req, res) => {
  const { email, username, password, confirmPassword } = req.body || {};
  if (!email || !username || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ? OR username = ?`)
    .get(emailNorm, username);
  if (existing) {
    return res.status(409).json({ error: "An account with that email or username already exists" });
  }

  const id = uuidv4();
  const now = Date.now();
  const passwordHash = bcrypt.hashSync(password, 10);
  const code = sixDigitCode();
  const startingCredits = Number(getSetting("default_starting_credits", "10"));

  db.prepare(
    `INSERT INTO users
      (id, email, username, password_hash, role, status, credits, vps_slot_limit, email_verify_code, email_verify_expires, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'member', 'pending', ?, 5, ?, ?, ?, ?)`
  ).run(id, emailNorm, username, passwordHash, startingCredits, code, now + 15 * 60 * 1000, now, now);

  await sendMail({
    to: emailNorm,
    subject: "Verify your StoneNodes account",
    text: `Your verification code is ${code}. It expires in 15 minutes.`
  });

  res.json({ ok: true, userId: id, message: "Verification code sent to your email" });
});

// ---------------- VERIFY EMAIL ----------------
router.post("/verify-email", (req, res) => {
  const { userId, code } = req.body || {};
  if (!userId || !code) return res.status(400).json({ error: "Missing userId or code" });

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: "Account not found" });
  if (user.status !== "pending") return res.status(400).json({ error: "Account already verified" });
  if (!user.email_verify_code || user.email_verify_code !== code) {
    return res.status(400).json({ error: "Invalid verification code" });
  }
  if (Date.now() > user.email_verify_expires) {
    return res.status(400).json({ error: "Verification code expired, please register again" });
  }

  db.prepare(
    `UPDATE users SET status = 'active', email_verify_code = NULL, email_verify_expires = NULL, updated_at = ? WHERE id = ?`
  ).run(Date.now(), user.id);

  db.prepare(
    `INSERT INTO transactions (id, user_id, type, amount, balance_after, note, created_at)
     VALUES (?, ?, 'signup_bonus', ?, ?, 'Welcome bonus', ?)`
  ).run(uuidv4(), user.id, user.credits, user.credits, Date.now());

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
  setSessionCookie(res, updated);
  res.json({ ok: true, user: publicUser(updated) });
});

// ---------------- LOGIN (step 1: credentials -> emails OTP) ----------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(String(email).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (user.status === "pending") {
    return res.status(403).json({ error: "PENDING_VERIFICATION", userId: user.id });
  }

  const otp = sixDigitCode();
  db.prepare(`UPDATE users SET otp_code = ?, otp_expires = ?, updated_at = ? WHERE id = ?`).run(
    otp,
    Date.now() + 10 * 60 * 1000,
    Date.now(),
    user.id
  );

  await sendMail({
    to: user.email,
    subject: "Your StoneNodes login code",
    text: `Your one-time login code is ${otp}. It expires in 10 minutes.`
  });

  res.json({ ok: true, userId: user.id, message: "One-time code sent to your email" });
});

// ---------------- LOGIN (step 2: verify OTP -> session) ----------------
router.post("/verify-otp", (req, res) => {
  const { userId, otp } = req.body || {};
  if (!userId || !otp) return res.status(400).json({ error: "Missing userId or otp" });

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: "Account not found" });
  if (!user.otp_code || user.otp_code !== otp) {
    return res.status(400).json({ error: "Invalid one-time code" });
  }
  if (Date.now() > user.otp_expires) {
    return res.status(400).json({ error: "One-time code expired, please log in again" });
  }

  db.prepare(`UPDATE users SET otp_code = NULL, otp_expires = NULL, updated_at = ? WHERE id = ?`).run(
    Date.now(),
    user.id
  );

  setSessionCookie(res, user);
  res.json({ ok: true, user: publicUser(user) });
});

// ---------------- LOGOUT ----------------
router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ---------------- ME ----------------
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
