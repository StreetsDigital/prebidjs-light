#!/bin/bash

###############################################################################
# Production Stop Script for pbjs_engine API Server
#
# This script gracefully stops the PM2-managed server process.
#
# Usage:
#   ./stop-production.sh [--delete]
#
# Options:
#   --delete    Also remove the process from PM2 process list
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_NAME="pbjs-engine-api"
DELETE_PROCESS=false

# Parse arguments
if [ "$1" = "--delete" ]; then
    DELETE_PROCESS=true
fi

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Stopping pbjs_engine API Server"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed"
    exit 1
fi

# Check if process exists
if ! pm2 list | grep -q "$APP_NAME"; then
    log_warn "Process '$APP_NAME' is not running"
    exit 0
fi

# Stop the process
log_info "Stopping $APP_NAME..."
pm2 stop "$APP_NAME"

if [ "$DELETE_PROCESS" = true ]; then
    log_info "Removing process from PM2..."
    pm2 delete "$APP_NAME"
    pm2 save
    log_info "Process removed from PM2"
else
    log_info "Process stopped (use --delete to remove from PM2)"
fi

echo ""
log_info "Server stopped successfully"
echo ""

exit 0
