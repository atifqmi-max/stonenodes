const nodemailer = require("nodemailer");
const { getSetting } = require("../db/settings");

function buildTransport() {
  const host = getSetting("smtp_host", "");
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(getSetting("smtp_port", "587")),
    secure: getSetting("smtp_secure", "false") === "true",
    auth: getSetting("smtp_user", "")
      ? { user: getSetting("smtp_user"), pass: getSetting("smtp_pass") }
      : undefined
  });
}

async function sendMail({ to, subject, text, html }) {
  const transport = buildTransport();
  const from = getSetting("smtp_from", "StoneNodes <no-reply@stonenodes.local>");

  if (!transport) {
    // No SMTP configured yet — log so the flow is still testable end-to-end.
    console.log("\n===== [mailer] SMTP not configured, logging email instead =====");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text || html);
    console.log("=================================================================\n");
    return { simulated: true };
  }

  return transport.sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail };
