#!/usr/bin/env bash
# Run ON Hostinger after: ssh -p 65002 u436250536@195.35.39.220
# Usage: bash scripts/setup-hostinger-persistent.sh [app_dir]
#
# Creates persistent data OUTSIDE the deploy folder so git push never wipes
# balances, orders, users, or platform settings.

set -euo pipefail

HOST_USER="u436250536"
PERSIST_ROOT="/home/${HOST_USER}/persistent/data"
APP_DIR="${1:-}"

if [ -z "$APP_DIR" ]; then
  for candidate in \
    "/home/${HOST_USER}/youraiseller" \
    "/home/${HOST_USER}/domains/youraiseller.com/public_html" \
    "/home/${HOST_USER}/domains/app.youraiseller.com/public_html" \
    "$HOME/youraiseller"; do
    if [ -f "$candidate/package.json" ]; then
      APP_DIR="$candidate"
      break
    fi
  done
fi

if [ -z "$APP_DIR" ] || [ ! -f "$APP_DIR/package.json" ]; then
  echo "Could not find app folder. Run:"
  echo "  bash scripts/setup-hostinger-persistent.sh /home/${HOST_USER}/path/to/youraiseller"
  exit 1
fi

echo "==> App dir:        $APP_DIR"
echo "==> Persistent dir: $PERSIST_ROOT"

mkdir -p "$PERSIST_ROOT/seller" "$PERSIST_ROOT/platform"

copy_if_exists() {
  local src="$1"
  local dest="$2"
  if [ -e "$src" ]; then
    echo "    copy $src -> $dest"
    mkdir -p "$(dirname "$dest")"
    cp -a "$src/." "$dest/" 2>/dev/null || cp -a "$src" "$dest"
  fi
}

echo "==> Migrating existing data (if any)..."
copy_if_exists "$APP_DIR/data/seller" "$PERSIST_ROOT/seller"
copy_if_exists "$APP_DIR/data/platform" "$PERSIST_ROOT/platform"
if [ -f "$APP_DIR/data/dev-users.json" ]; then
  cp -a "$APP_DIR/data/dev-users.json" "$PERSIST_ROOT/dev-users.json"
  echo "    copy dev-users.json"
fi

ENV_FILE="$APP_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$APP_DIR/.env.production.local"
fi
if [ ! -f "$ENV_FILE" ]; then
  touch "$ENV_FILE"
fi

upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

echo "==> Writing env vars to $ENV_FILE"
upsert_env "SELLER_DATA_DIR" "$PERSIST_ROOT/seller"
upsert_env "PLATFORM_DATA_DIR" "$PERSIST_ROOT/platform"
upsert_env "APP_DATA_DIR" "$PERSIST_ROOT"

echo ""
echo "==> DONE. Add the same 3 lines in Hostinger hPanel → Environment variables:"
echo "SELLER_DATA_DIR=$PERSIST_ROOT/seller"
echo "PLATFORM_DATA_DIR=$PERSIST_ROOT/platform"
echo "APP_DATA_DIR=$PERSIST_ROOT"
echo ""
echo "==> Restart Node app (pm2 restart youraiseller OR hPanel restart)"
echo ""
echo "Wallet files (auto-created on first use):"
echo "  $PERSIST_ROOT/seller/U-XXX/autocall-wallet.json"
echo "  $PERSIST_ROOT/seller/U-XXX/sms-wallet.json"
