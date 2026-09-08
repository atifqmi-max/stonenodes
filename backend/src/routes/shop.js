const express = require("express");
const db = require("../db/init");
const { getSetting } = require("../db/settings");
const { requireAuth, requireActive } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireActive);

router.get("/", (req, res) => {
  const items = db.prepare(`SELECT * FROM shop_items ORDER BY credits ASC`).all();
  res.json({
    items,
    discordInvite: getSetting("support_discord")
  });
});

module.exports = router;
