const cron = require("node-cron");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");
const provisioning = require("./provisioning");

// Deducts each running instance's hourly_cost from its owner's balance, once per hour.
// Stops (suspends) instances for members whose balance hits zero.
async function runBillingCycle() {
  const running = db.prepare(`SELECT * FROM instances WHERE status = 'running'`).all();

  for (const instance of running) {
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(instance.owner_id);
    if (!user) continue;

    const newBalance = Number((user.credits - instance.hourly_cost).toFixed(4));

    if (newBalance <= 0) {
      // Out of credits: stop the instance instead of letting it run for free.
      try {
        await provisioning.performAction(instance, "stop");
      } catch (e) {
        console.error(`[billing] failed to stop instance ${instance.id} on provisioning backend:`, e.message);
      }
      db.prepare(`UPDATE instances SET status = 'stopped', updated_at = ? WHERE id = ?`).run(
        Date.now(),
        instance.id
      );
      db.prepare(`UPDATE users SET credits = 0, updated_at = ? WHERE id = ?`).run(Date.now(), user.id);
      db.prepare(
        `INSERT INTO transactions (id, user_id, type, amount, balance_after, note, created_at)
         VALUES (?, ?, 'billing', ?, 0, ?, ?)`
      ).run(uuidv4(), user.id, -user.credits, `Instance ${instance.name} stopped: out of credits`, Date.now());
      continue;
    }

    db.prepare(`UPDATE users SET credits = ?, updated_at = ? WHERE id = ?`).run(newBalance, Date.now(), user.id);
    db.prepare(
      `INSERT INTO transactions (id, user_id, type, amount, balance_after, note, created_at)
       VALUES (?, ?, 'billing', ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      user.id,
      -instance.hourly_cost,
      newBalance,
      `Hourly billing for ${instance.name}`,
      Date.now()
    );
  }
}

function startBillingScheduler() {
  // Every hour on the hour.
  cron.schedule("0 * * * *", () => {
    runBillingCycle().catch((e) => console.error("[billing] cycle failed:", e));
  });
  console.log("[billing] Hourly billing scheduler started");
}

module.exports = { startBillingScheduler, runBillingCycle };
