const express = require("express");
const { v4: uuidv4 } = require("uuid");
const rateLimit = require("express-rate-limit");
const db = require("../db/init");
const { requireAuth, requireActive } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireActive);

const redeemLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many redeem attempts, please slow down." }
});

router.post("/", redeemLimiter, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "Please enter a code" });

  const result = db.transaction(() => {
    const redeemCode = db.prepare(`SELECT * FROM redeem_codes WHERE code = ?`).get(code.trim());
    if (!redeemCode) return { error: "Invalid code", status: 404 };
    if (redeemCode.claims_used >= redeemCode.max_claims) {
      return { error: "This code has already been fully claimed", status: 410 };
    }
    const alreadyClaimed = db
      .prepare(`SELECT id FROM redeem_claims WHERE code_id = ? AND user_id = ?`)
      .get(redeemCode.id, req.user.id);
    if (alreadyClaimed) return { error: "You have already redeemed this code", status: 409 };

    db.prepare(`INSERT INTO redeem_claims (id, code_id, user_id, claimed_at) VALUES (?, ?, ?, ?)`).run(
      uuidv4(),
      redeemCode.id,
      req.user.id,
      Date.now()
    );
    const newClaims = redeemCode.claims_used + 1;
    db.prepare(`UPDATE redeem_codes SET claims_used = ? WHERE id = ?`).run(newClaims, redeemCode.id);
    // Fully claimed codes are deactivated: delete them so they can no longer be entered.
    if (newClaims >= redeemCode.max_claims) {
      db.prepare(`DELETE FROM redeem_codes WHERE id = ?`).run(redeemCode.id);
    }

    const newBalance = Number((req.user.credits + redeemCode.credits).toFixed(4));
    db.prepare(`UPDATE users SET credits = ?, updated_at = ? WHERE id = ?`).run(
      newBalance,
      Date.now(),
      req.user.id
    );
    db.prepare(
      `INSERT INTO transactions (id, user_id, type, amount, balance_after, note, created_at)
       VALUES (?, ?, 'redeem', ?, ?, ?, ?)`
    ).run(uuidv4(), req.user.id, redeemCode.credits, newBalance, `Redeemed code`, Date.now());

    return { ok: true, creditsAdded: redeemCode.credits, newBalance };
  })();

  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

module.exports = router;
