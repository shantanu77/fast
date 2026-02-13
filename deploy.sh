#!/bin/bash
set -euo pipefail

# Deploy script for fast.omnihire.in
SERVER="root@fast.omnihire.in"
KEY="/home/shantanu/resume-work/mykey.key"
SSH="ssh -i $KEY $SERVER"
RSYNC="rsync -az -e 'ssh -i $KEY'"
REMOTE_DIR="/var/www/fast"
LOCAL_DIR="/home/shantanu/fast"

echo "=== Deploying Fast App ==="

# Build frontend
echo "[1/4] Building frontend..."
cd "$LOCAL_DIR/frontend"
npm run build --silent

# Deploy frontend
echo "[2/4] Deploying frontend..."
eval $RSYNC "$LOCAL_DIR/frontend/build/" "$SERVER:$REMOTE_DIR/frontend/"

# Deploy backend
echo "[3/4] Deploying backend..."
eval $RSYNC --exclude='venv' --exclude='__pycache__' --exclude='.env' \
    "$LOCAL_DIR/backend/" "$SERVER:$REMOTE_DIR/backend/"

# Install any new dependencies and restart backend
echo "[4/4] Installing dependencies & restarting services..."
$SSH "
    cd $REMOTE_DIR/backend
    venv/bin/pip install -q -r requirements.txt
    chown -R www-data:www-data $REMOTE_DIR
    systemctl restart fast-backend
    systemctl reload nginx
    echo 'Checking services...'
    systemctl is-active fast-backend
    systemctl is-active nginx
"

echo "=== Deployment complete! ==="
echo "Site: http://fast.omnihire.in"
