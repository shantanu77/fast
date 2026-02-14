# PowerShell Deploy script for fast.omnihire.in

$SERVER = "root@fast.omnihire.in"
$KEY = "$env:USERPROFILE\.ssh\omnihire_fast"
$REMOTE_DIR = "/var/www/fast"
$LOCAL_DIR = $PSScriptRoot

# Ensure Node.js and MSYS2 (for rsync) are in the path
$NODE_PATH = "C:\Program Files\nodejs"
$MSYS_PATH = "C:\msys64\usr\bin"
if ($env:PATH -notlike "*$NODE_PATH*") {
    $env:PATH = "$NODE_PATH;$env:PATH"
}
if ($env:PATH -notlike "*$MSYS_PATH*") {
    $env:PATH = "$MSYS_PATH;$env:PATH"
}

Write-Host "=== Deploying Fast App ===" -ForegroundColor Cyan

# Check if key exists
if (-not (Test-Path $KEY)) {
    Write-Error "SSH Key not found at $KEY"
    exit 1
}

# 1. Build frontend
Write-Host "[1/4] Building frontend..." -ForegroundColor Yellow
Push-Location "$LOCAL_DIR\frontend"
npm run build
Pop-Location

# 2. Deploy frontend
Write-Host "[2/4] Deploying frontend..." -ForegroundColor Yellow
# Using rsync if available, else scp
if (Get-Command rsync -ErrorAction SilentlyContinue) {
    # Convert paths to MSYS2 style for rsync
    $RSYNC_SRC = "$LOCAL_DIR/frontend/build/".Replace('\', '/').Replace('C:', '/c').Replace('c:', '/c')
    $RSYNC_KEY = $KEY.Replace('\', '/').Replace('C:', '/c').Replace('c:', '/c')
    # Set RSYNC_RSH to use MSYS2 ssh
    $env:RSYNC_RSH = "ssh -i '$RSYNC_KEY' -o StrictHostKeyChecking=no"
    rsync -az "$RSYNC_SRC" "$SERVER`:$REMOTE_DIR/frontend/"
} else {
    Write-Host "rsync not found, using scp (slower)..." -ForegroundColor Magenta
    scp -r -i "$KEY" "$LOCAL_DIR\frontend\build\*" "$SERVER`:$REMOTE_DIR\frontend\"
}

# 3. Deploy backend
Write-Host "[3/4] Deploying backend..." -ForegroundColor Yellow
if (Get-Command rsync -ErrorAction SilentlyContinue) {
    # Convert paths to MSYS2 style for rsync
    $RSYNC_SRC = "$LOCAL_DIR/backend/".Replace('\', '/').Replace('C:', '/c').Replace('c:', '/c')
    $RSYNC_KEY = $KEY.Replace('\', '/').Replace('C:', '/c').Replace('c:', '/c')
    $env:RSYNC_RSH = "ssh -i '$RSYNC_KEY' -o StrictHostKeyChecking=no"
    rsync -az --exclude='venv' --exclude='__pycache__' --exclude='.env' "$RSYNC_SRC" "$SERVER`:$REMOTE_DIR/backend/"
} else {
    scp -r -i "$KEY" "$LOCAL_DIR\backend\*" "$SERVER`:$REMOTE_DIR\backend\"
}

# 4. Install dependencies and restart services
Write-Host "[4/4] Installing dependencies & restarting services..." -ForegroundColor Yellow
$SSH_COMMAND_RAW = @"
    cd $REMOTE_DIR/backend
    if [ -d "venv" ]; then
        venv/bin/pip install -q -r requirements.txt
    else
        pip install -q -r requirements.txt
    fi
    chown -R www-data:www-data $REMOTE_DIR
    systemctl restart fast-backend
    systemctl reload nginx
    echo 'Checking services...'
    systemctl is-active fast-backend
    systemctl is-active nginx
"@

# Fix CRLF issue for Linux
$SSH_COMMAND = $SSH_COMMAND_RAW -replace "`r", ""

ssh -i $KEY -o StrictHostKeyChecking=no $SERVER $SSH_COMMAND

Write-Host "=== Deployment complete! ===" -ForegroundColor Green
Write-Host "Site: http://fast.omnihire.in"
