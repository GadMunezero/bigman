#!/usr/bin/env bash
#
# One command to take a bare Ubuntu server to a running site with HTTPS.
#
#   curl -fsSL https://raw.githubusercontent.com/GadMunezero/bigman/claude/prop-firm-challenge-finder-frpvmc/deploy/bootstrap.sh | bash
#
# It installs Docker, clones the repo, asks two questions, and brings the
# stack up. Everything it does is in docs/HOSTING-FREE.md as separate steps —
# this is the same sequence with the typing removed.
#
# What it deliberately does NOT do: open the cloud firewall (that is in your
# provider's console, not on the machine) or touch DNS. Both are outside the
# server and both are yours.
set -euo pipefail

REPO="https://github.com/GadMunezero/bigman.git"
BRANCH="claude/prop-firm-challenge-finder-frpvmc"
DIR="${HOME}/bigman"

say() { printf "\n\033[1;33m==> %s\033[0m\n" "$1"; }
die() { printf "\n\033[1;31mError: %s\033[0m\n" "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] && die "Run this as your normal user, not root. Docker is installed with sudo where needed."

# ---------------------------------------------------------------- 1. packages
say "Installing git and Docker"
sudo apt-get update -qq
sudo apt-get install -y -qq git curl
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  ADDED_TO_GROUP=1
fi

# ------------------------------------------------------------------ 2. source
say "Fetching the site"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin "$BRANCH"
  git -C "$DIR" checkout "$BRANCH"
  git -C "$DIR" pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR"

# ------------------------------------------------------------------- 3. config
ENV_FILE="deploy/.env"
if [ -f "$ENV_FILE" ]; then
  say "deploy/.env already exists — leaving it alone"
else
  # Two questions, four values: the site URL is derived from the domain and the
  # admin password is generated below, because neither is worth a prompt.
  say "Two questions"
  read -rp "  Your domain, no https:// and no www (e.g. propfirm.com): " DOMAIN
  [ -z "$DOMAIN" ] && die "A domain is required — Caddy needs it to get an HTTPS certificate."
  read -rp "  Email for certificate expiry warnings: " EMAIL
  [ -z "$EMAIL" ] && die "An email is required by Let's Encrypt."

  # Generated rather than chosen. This guards /admin, which can edit every
  # figure on the site, and a password someone invents under time pressure is
  # the weakest part of the whole deployment.
  ADMIN_PASSWORD="$(openssl rand -base64 24)"

  cat > "$ENV_FILE" <<EOF
SITE_DOMAIN=${DOMAIN}
ACME_EMAIL=${EMAIL}
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
  chmod 600 "$ENV_FILE"

  say "Your admin password — save it now, it is not shown again"
  printf "\n    %s\n\n" "$ADMIN_PASSWORD"
  printf "  It is also in %s/deploy/.env\n" "$DIR"
  read -rp "  Press Enter once you have copied it. " _
fi

# ------------------------------------------------------------------- 4. up
say "Building and starting — this takes 5 to 10 minutes on a small server"
DOCKER="docker"
# usermod does not affect the current shell, so the first run after installing
# Docker still needs sudo.
if [ "${ADDED_TO_GROUP:-0}" = "1" ]; then DOCKER="sudo docker"; fi
$DOCKER compose -f deploy/docker-compose.yml up -d --build

DOMAIN_NOW="$(grep '^SITE_DOMAIN=' "$ENV_FILE" | cut -d= -f2)"
say "Up. Open https://${DOMAIN_NOW}"
cat <<EOF

  The certificate arrives automatically a few seconds after the first request.
  If the page does not load, in order of likelihood:

    1. DNS is not pointing here yet, or has not propagated. Check with:
         dig +short ${DOMAIN_NOW}
       It should print this server's public IP.

    2. Ports 80 and 443 are not open. BOTH firewalls have to allow them —
       your cloud provider's security rules AND the machine's own iptables.
       Forgetting the second is the most common cause of a dead Oracle box.

    3. Still starting. Watch it with:
         docker compose -f deploy/docker-compose.yml logs -f

  On first boot the catalogue loads and 113 challenges across 19 firms go live.
  The rest stay as drafts because they are missing figures the engine needs —
  finish them at https://${DOMAIN_NOW}/admin.

EOF
