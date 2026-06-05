#!/bin/bash
set -e

# Adelphos Deploy Script
# Usage: ./deploy.sh
# Requires: ssh access to root@156.67.105.64

SERVER="root@156.67.105.64"
REMOTE_PATH="/var/www/adelphos_frontend"
LOCAL_PATH="$(dirname "$0")"

echo "=== Adelphos Deploy ==="
echo "Server: $SERVER"
echo "Path:   $REMOTE_PATH"
echo ""

# 1. Sync files (exclude node_modules, logs, .git, data)
echo "[1/4] Syncing files to server..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='.git' \
  --exclude='data' \
  --exclude='.DS_Store' \
  --exclude='deploy.sh' \
  --exclude='nohup.out' \
  --exclude='server.log' \
  "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/"

# 2. Install dependencies on server
echo "[2/4] Installing dependencies..."
ssh "$SERVER" "cd $REMOTE_PATH && npm install --production"

# 3. Ensure PM2 ecosystem is running
echo "[3/4] Starting/Reloading PM2..."
ssh "$SERVER" "cd $REMOTE_PATH && pm2 startOrReload ecosystem.config.js --env production"

# 4. Save PM2 config
echo "[4/4] Saving PM2 config..."
ssh "$SERVER" "pm2 save"

echo ""
echo "=== Deploy Complete ==="
echo "Website: https://adelphostech.com"
echo "Admin:   https://adelphostech.com/admin"
