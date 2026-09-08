#!/usr/bin/env bash
# StoneNodes one-line installer
#   curl -fsSL https://raw.githubusercontent.com/atifqmi-max/stonenodes/main/install.sh | bash
#
# Installs Docker (if missing), clones the repo, generates a .env with a
# random session secret, and starts the panel on port 4000.
set -euo pipefail

REPO_URL="https://github.com/atifqmi-max/stonenodes.git"
INSTALL_DIR="${STONENODES_DIR:-$HOME/stonenodes}"

echo "==> StoneNodes installer"

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Docker not found, installing via get.docker.com ..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "==> Docker Compose plugin not found. Please install it and re-run this script."
  exit 1
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "==> Existing install found at $INSTALL_DIR, pulling latest changes ..."
  git -C "$INSTALL_DIR" pull
else
  echo "==> Cloning StoneNodes into $INSTALL_DIR ..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

if [ ! -f .env ]; then
  echo "==> Creating .env from template ..."
  cp .env.example .env
  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c32 /dev/urandom | xxd -p | tr -d '\n')
  # portable in-place sed for both GNU and BSD sed
  sed -i.bak "s/^SESSION_SECRET=.*/SESSION_SECRET=${SECRET}/" .env && rm -f .env.bak
  echo "    Generated a random SESSION_SECRET."
  echo "    Edit $INSTALL_DIR/.env to set your SMTP credentials and admin email/password."
fi

echo "==> Building and starting StoneNodes ..."
docker compose up -d --build

echo ""
echo "==> Done! StoneNodes is running at http://localhost:4000"
echo "    Default admin login: atifqmi@gmail.com / admin123 (change this immediately)"
echo "    To expose it publicly, point a Cloudflare Tunnel at http://localhost:4000"
echo "    (see README.md for the cloudflared setup)."
