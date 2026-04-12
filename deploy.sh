#!/bin/bash
set -e

SSH_KEY="/tmp/hetzner_key"
SSH_OPTS="-i $SSH_KEY -o PasswordAuthentication=no -o PreferredAuthentications=publickey"
SERVER="root@46.225.218.211"
APP_DIR="/opt/korrektur-app/backend"

echo "=== Building backend ==="
cd "$(dirname "$0")/backend"
npm run build

echo "=== Packaging ==="
tar czf /tmp/backend.tar.gz --exclude=node_modules --exclude=.env --exclude=tests --exclude=src .

echo "=== Uploading ==="
scp $SSH_OPTS /tmp/backend.tar.gz $SERVER:$APP_DIR/backend.tar.gz

echo "=== Deploying ==="
ssh $SSH_OPTS $SERVER "cd $APP_DIR && tar xzf backend.tar.gz && rm backend.tar.gz && npm install --production 2>&1 | tail -3 && systemctl restart korrektur-app && sleep 1 && systemctl status korrektur-app --no-pager | head -8"

echo "=== Done ==="
