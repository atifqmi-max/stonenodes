require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

require("./db/init"); // ensures schema + seed run before routes attach

const { requireAuth, requireActive } = require("./middleware/auth");
const { maintenanceGate } = require("./middleware/maintenance");
const { startBillingScheduler } = require("./services/billing");
const { getSetting } = require("./db/settings");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const instanceRoutes = require("./routes/instances");
const redeemRoutes = require("./routes/redeem");
const shopRoutes = require("./routes/shop");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 4000;

const corsOrigins = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

// ---- public status endpoints (no auth needed) ----
app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    siteName: getSetting("site_name", "StoneNodes"),
    maintenanceMode: getSetting("maintenance_mode", "false") === "true",
    maintenanceMessage: getSetting("maintenance_message", "")
  });
});

app.use("/api/auth", authRoutes);

// Everything below requires a valid session; maintenance mode blocks non-admins.
app.use("/api/dashboard", requireAuth, maintenanceGate, dashboardRoutes);
app.use("/api/instances", requireAuth, maintenanceGate, instanceRoutes);
app.use("/api/redeem", requireAuth, maintenanceGate, redeemRoutes);
app.use("/api/shop", requireAuth, maintenanceGate, shopRoutes);
app.use("/api/admin", requireAuth, maintenanceGate, adminRoutes);

// ---- serve built frontend in production (single-port deploy) ----
const frontendDist = path.join(__dirname, "..", "public");
app.use(express.static(frontendDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`StoneNodes API listening on http://localhost:${PORT}`);
  startBillingScheduler();
});
