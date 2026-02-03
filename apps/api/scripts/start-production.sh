#!/bin/bash

###############################################################################
# Production Startup Script for pbjs_engine API Server
#
# This script validates the environment, runs database migrations,
# and starts the server using PM2 for process management.
#
# Usage:
#   ./start-production.sh
#
# Prerequisites:
#   - Node.js 20+ installed
#   - PM2 installed globally (npm install -g pm2)
#   - .env file configured with production values
###############################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="pbjs-engine-api"
NODE_ENV="${NODE_ENV:-production}"

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Print banner
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  pbjs_engine API Server - Production Startup"
echo "═══════════════════════════════════════════════════════"
echo ""

# Step 1: Check Node.js version
log_step "1. Checking Node.js version..."
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="20.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    log_error "Node.js version $REQUIRED_VERSION or higher is required (found: $NODE_VERSION)"
    exit 1
fi
log_info "Node.js version: $NODE_VERSION ✓"

# Step 2: Check if PM2 is installed
log_step "2. Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed. Install it with: npm install -g pm2"
    echo ""
    echo "PM2 is a production process manager for Node.js applications."
    echo "It provides features like:"
    echo "  - Automatic restart on crash"
    echo "  - Log management"
    echo "  - Load balancing"
    echo "  - Zero-downtime reload"
    echo ""
    exit 1
fi
PM2_VERSION=$(pm2 -v)
log_info "PM2 version: $PM2_VERSION ✓"

# Step 3: Change to API directory
log_step "3. Navigating to API directory..."
cd "$API_DIR"
log_info "Working directory: $API_DIR ✓"

# Step 4: Check if .env file exists
log_step "4. Validating environment configuration..."
if [ ! -f .env ]; then
    log_error ".env file not found!"
    echo ""
    echo "Please create a .env file with your production configuration."
    echo "You can use .env.example as a template:"
    echo ""
    echo "  cp .env.example .env"
    echo "  nano .env  # Edit with your values"
    echo ""
    exit 1
fi
log_info "Environment file found ✓"

# Load environment variables
set -a
source .env
set +a

# Validate required environment variables
if [ -z "$JWT_SECRET" ]; then
    log_error "JWT_SECRET not set in .env file"
    exit 1
fi

if [ -z "$COOKIE_SECRET" ]; then
    log_error "COOKIE_SECRET not set in .env file"
    exit 1
fi

# Check for default secrets in production
if [ "$NODE_ENV" = "production" ]; then
    if [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
        log_error "JWT_SECRET must be changed from default value in production"
        exit 1
    fi
    if [ "$COOKIE_SECRET" = "your-super-secret-cookie-key-change-this-in-production" ]; then
        log_error "COOKIE_SECRET must be changed from default value in production"
        exit 1
    fi
fi

log_info "Environment variables validated ✓"

# Step 5: Check if dependencies are installed
log_step "5. Checking dependencies..."
if [ ! -d "node_modules" ]; then
    log_warn "node_modules not found. Running npm install..."
    npm install --production
else
    log_info "Dependencies installed ✓"
fi

# Step 6: Build TypeScript code
log_step "6. Building TypeScript code..."
if [ ! -d "dist" ] || [ "$1" = "--rebuild" ]; then
    log_info "Building application..."
    npm run build
else
    log_info "Using existing build (use --rebuild to force rebuild) ✓"
fi

# Step 7: Verify database exists and is accessible
log_step "7. Checking database..."
DB_PATH="${DATABASE_PATH:-./data/pbjs_engine.db}"
DB_DIR=$(dirname "$DB_PATH")

# Create data directory if it doesn't exist
if [ ! -d "$DB_DIR" ]; then
    log_info "Creating database directory: $DB_DIR"
    mkdir -p "$DB_DIR"
fi

if [ ! -f "$DB_PATH" ]; then
    log_warn "Database file not found at: $DB_PATH"
    log_info "Database will be created on first run"
else
    log_info "Database found at: $DB_PATH ✓"
    # Get database size
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    log_info "Database size: $DB_SIZE"
fi

# Step 8: Run database migrations (if needed)
log_step "8. Running database migrations..."
# Note: Drizzle migrations are run automatically on server startup
log_info "Migrations will run on server startup ✓"

# Step 9: Create required directories
log_step "9. Creating required directories..."
mkdir -p ./prebid-builds
mkdir -p ./data/backups
mkdir -p ./logs
log_info "Directories created ✓"

# Step 10: Stop existing PM2 process if running
log_step "10. Checking for existing process..."
if pm2 list | grep -q "$APP_NAME"; then
    log_info "Stopping existing process..."
    pm2 stop "$APP_NAME" || true
    pm2 delete "$APP_NAME" || true
fi

# Step 11: Start application with PM2
log_step "11. Starting application with PM2..."

# PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: '$NODE_ENV'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Step 12: Save PM2 process list
log_step "12. Saving PM2 configuration..."
pm2 save

log_info "PM2 startup saved ✓"
log_info "To make PM2 start on system boot, run: pm2 startup"

# Step 13: Display status
echo ""
log_step "13. Server Status"
echo ""
pm2 status

# Display logs location
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Server Started Successfully!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Logs are available at:"
echo "  - Error logs:    $API_DIR/logs/error.log"
echo "  - Output logs:   $API_DIR/logs/out.log"
echo "  - Combined logs: $API_DIR/logs/combined.log"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status         - Show process status"
echo "  pm2 logs $APP_NAME - View real-time logs"
echo "  pm2 restart $APP_NAME - Restart the server"
echo "  pm2 stop $APP_NAME - Stop the server"
echo "  pm2 monit          - Monitor resources"
echo ""
echo "API server is running on port: ${API_PORT:-3001}"
echo "Health check: curl http://localhost:${API_PORT:-3001}/health"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Optional: Run health check
sleep 2
log_step "14. Running health check..."
if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s http://localhost:${API_PORT:-3001}/health || echo "failed")
    if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
        log_info "Health check passed ✓"
    else
        log_warn "Health check failed. Check logs with: pm2 logs $APP_NAME"
    fi
else
    log_info "curl not available, skipping health check"
fi

echo ""
log_info "Startup complete! Server is running."
echo ""

exit 0
