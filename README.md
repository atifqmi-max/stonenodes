# StoneNodes

A web-based control panel for managing free/credit-based VPS instances: registration with email
verification, login with OTP, an hourly credit-billing system, redeem codes, a credits shop, and a
full admin back office (users, nodes, redeem codes, VPS oversight, settings, broadcast emails).

**StoneNodes is the account/credit/admin layer only.** It does not provision real virtual machines
itself — VPS create/start/stop/reinstall actions are delegated to your own existing provisioning
bot/service over a small internal HTTP API (see [Provisioning backend](#provisioning-backend) below).
If you don't have one configured yet, the panel runs in **mock mode** so you can try every feature
end-to-end (instances just simulate an IP/status locally).

---

## Quick install

On a fresh Ubuntu/Debian server:

```bash
curl -fsSL https://raw.githubusercontent.com/atifqmi-max/stonenodes/main/install.sh | bash
```

This installs Docker if it's missing, clones the repo, generates a random session secret in `.env`,
and starts the panel with `docker compose up -d --build`. Once it finishes, the panel is reachable at
**http://localhost:4000**.

Default admin login (change immediately in Admin → Settings, or by editing `.env` before first boot):

```
Email:    atifqmi@gmail.com
Password: admin123
```

### Manual install (without the script)

```bash
git clone https://github.com/atifqmi-max/stonenodes.git
cd stonenodes
cp .env.example .env   # edit SESSION_SECRET, SMTP, admin email/password, etc.
docker compose up -d --build
```

### Running without Docker

```bash
# backend
cd backend
cp .env.example .env
npm install
npm start          # http://localhost:4000/api

# frontend (separate terminal, for local development with hot reload)
cd frontend
npm install
npm run dev         # http://localhost:5173, proxies /api to :4000
```

For a single-port production build without Docker:

```bash
cd frontend && npm install && npm run build   # outputs into backend/public
cd ../backend && npm install && npm start      # serves the built frontend + API on :4000
```

---

## Exposing it publicly with Cloudflare Tunnel

StoneNodes listens on port 4000 by default. To put it on the public internet without opening any
inbound ports on your server, use `cloudflared`:

```bash
# install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel login
cloudflared tunnel create stonenodes
cloudflared tunnel route dns stonenodes panel.yourdomain.com
cloudflared tunnel run --url http://localhost:4000 stonenodes
```

Or for a quick throwaway URL while testing: `cloudflared tunnel --url http://localhost:4000`.

---

## Provisioning backend

StoneNodes calls out to `PROVISIONING_API_URL` (set in `.env`) with a bearer token
(`PROVISIONING_API_KEY`) for every VPS lifecycle action:

| Action | Request |
|---|---|
| Create | `POST {PROVISIONING_API_URL}/instances` |
| Start / Stop / Delete | `POST {PROVISIONING_API_URL}/instances/{ref}/{start\|stop\|delete}` |
| Reinstall | `POST {PROVISIONING_API_URL}/instances/{ref}/reinstall` |
| Change password | `POST {PROVISIONING_API_URL}/instances/{ref}/password` |
| Change hostname | `POST {PROVISIONING_API_URL}/instances/{ref}/hostname` |
| Usage stats | `POST {PROVISIONING_API_URL}/instances/{ref}/usage` |

Point this at whatever provisioning bot/service you already run. See
`backend/src/services/provisioning.js` — it's a thin, easily-editable client; adjust the payload
shape to match your bot's actual API. Leave `PROVISIONING_API_URL` blank to keep using mock mode.

---

## Environment variables

See [`backend/.env.example`](backend/.env.example) for the full list with comments. Highlights:

- `SESSION_SECRET` — signs session cookies and encrypts stored VPS passwords. **Set a real random value.**
- `DATABASE_FILE` — SQLite file path (default `./data/stonenodes.db`); mount this as a volume in Docker.
- `SMTP_*` — mail settings for verification codes/OTPs/broadcasts. Can also be edited live in Admin → Settings. Leave `SMTP_HOST` blank to log emails to the console instead of sending them, useful for local testing.
- `PROVISIONING_API_URL` / `PROVISIONING_API_KEY` — your VPS backend (see above).
- `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` — seeded once, on first boot only, when the users table is empty.

---

## Billing rules (built in)

- CPU surcharge: AMD Ryzen 9 9950X → **+20 credits/hour**; Intel Xeon Platinum 8480+ → no surcharge.
- RAM tier cost/hour: 512MB 0.01 · 1GB 0.05 · 2GB 0.10 · 4GB 0.15 · 8GB 0.20 · 16GB 0.30 · 32GB 0.80.
- A background job runs every hour, deducts each running instance's cost from its owner's balance,
  and automatically stops any instance whose owner hits zero credits.
- Members get a maximum of 5 VPS instances by default; admins can override this per-user.

To change pricing, edit `backend/src/services/pricing.js`.

---

## Security notes

- Passwords are hashed with bcrypt; VPS root passwords are encrypted at rest (AES-256-GCM, derived from `SESSION_SECRET`) and only decrypted when shown to the owning member.
- Login, register, OTP, and redeem-code endpoints are rate-limited.
- Redeem-code claims are enforced atomically inside a DB transaction to prevent double-claims under load.
- All admin actions (suspend/delete/credit changes/settings changes) are written to an audit log (Admin → Users, or query the `audit_log` table directly).
- **Before going live:** change the default admin password, set a real `SESSION_SECRET`, and configure real SMTP so verification/OTP codes are actually delivered by email instead of logged to the console.

---

## Project structure

```
stonenodes/
├── backend/            Express API + SQLite (better-sqlite3)
│   └── src/
│       ├── db/         schema + settings helpers
│       ├── middleware/ auth, maintenance mode
│       ├── routes/     auth, dashboard, instances, redeem, shop, admin
│       └── services/   mailer, provisioning client, billing cron, pricing, crypto
├── frontend/           React + Vite + Tailwind dashboard (dark theme)
├── Dockerfile           multi-stage build: frontend build → backend runtime
├── docker-compose.yml
└── install.sh           one-line installer
```
