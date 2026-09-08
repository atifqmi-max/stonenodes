const { getSetting } = require("../db/settings");

// Blocks non-admin API access site-wide while maintenance mode is on.
// Auth endpoints (login) stay open so an admin can still log in.
function maintenanceGate(req, res, next) {
  const on = getSetting("maintenance_mode", "false") === "true";
  if (!on) return next();

  const isAdmin = req.user && req.user.role === "admin";
  if (isAdmin) return next();

  return res.status(503).json({
    error: "MAINTENANCE_MODE",
    message: getSetting("maintenance_message", "StoneNodes is currently undergoing maintenance.")
  });
}

module.exports = { maintenanceGate };
