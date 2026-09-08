const jwt = require("jsonwebtoken");
const db = require("../db/init");

const COOKIE_NAME = "sn_session";

function signSession(user) {
  return jwt.sign({ uid: user.id }, process.env.SESSION_SECRET, { expiresIn: "180d" });
}

function setSessionCookie(res, user) {
  const token = signSession(user);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 180 // 180 days - "stay logged in until manual logout"
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(payload.uid);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Session expired, please log in again" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

function requireActive(req, res, next) {
  if (req.user.status === "suspended") {
    return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
  }
  next();
}

module.exports = {
  COOKIE_NAME,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  requireAdmin,
  requireActive
};
