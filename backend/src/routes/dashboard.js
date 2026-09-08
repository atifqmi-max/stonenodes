const express = require("express");
const db = require("../db/init");
const { requireAuth, requireActive } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireActive);

router.get("/summary", (req, res) => {
  const counts = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) AS stopped,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspended
       FROM instances WHERE owner_id = ?`
    )
    .get(req.user.id);

  res.json({
    totals: {
      total: counts.total || 0,
      running: counts.running || 0,
      stopped: counts.stopped || 0,
      suspended: counts.suspended || 0
    },
    credits: req.user.credits
  });
});

module.exports = router;
