#!/usr/bin/env bash
# Run ON the production server (182.48.90.163) after copying the project + data folder.
set -euo pipefail

APP_DIR="${1:-$HOME/youraiseller}"
PORT="${PORT:-3000}"

echo "==> Deploying YourAI Seller from $APP_DIR on port $PORT"

cd "$APP_DIR"

if [ ! -f package.json ]; then
  echo "Error: package.json not found in $APP_DIR"
  exit 1
fi

if [ ! -f .env.local ] && [ ! -f .env.production.local ]; then
  echo "Warning: no .env.local — copy env from dev machine first"
fi

npm ci
npm run build

# Ensure data dir exists (uploaded seller audio lives here)
mkdir -p data/seller data/platform

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete youraiseller 2>/dev/null || true
  pm2 start npm --name youraiseller -- start -- -p "$PORT"
  pm2 save
  echo "==> Started with pm2 on port $PORT"
else
  echo "==> pm2 not found. Run manually: PORT=$PORT npm run start"
  echo "    Or install pm2: npm i -g pm2"
fi

echo "==> Test audio route (replace U-002/file.wav with your file):"
echo "    curl -I http://127.0.0.1:$PORT/api/auto-call/audio/U-002/example.wav"
