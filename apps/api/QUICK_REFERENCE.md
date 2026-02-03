# pbjs_engine Quick Reference

## NPM Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build            # Compile TypeScript to JavaScript

# Production
npm run start            # Start built server (basic)
npm run start:prod       # Start with PM2 (production)
npm run stop:prod        # Stop PM2 server

# Database
npm run db:migrate       # Run migrations
npm run db:generate      # Generate migration files
npm run db:seed          # Seed sample data
npm run db:seed-admin    # Create super admin user
npm run db:backup        # Backup database

# Testing
npm test                 # Run tests
```

## Production Scripts

```bash
# Startup
./scripts/start-production.sh           # Start with PM2
./scripts/start-production.sh --rebuild # Rebuild first

# Shutdown
./scripts/stop-production.sh            # Stop (keep in PM2)
./scripts/stop-production.sh --delete   # Stop & remove

# Backup
./scripts/backup-database.sh            # Backup database
```

## PM2 Commands

```bash
# Status & Logs
pm2 status                          # Show all processes
pm2 logs pbjs-engine-api           # Follow logs
pm2 logs pbjs-engine-api --lines 50 # Last 50 lines

# Control
pm2 restart pbjs-engine-api        # Restart server
pm2 reload pbjs-engine-api         # Zero-downtime reload
pm2 stop pbjs-engine-api           # Stop server
pm2 delete pbjs-engine-api         # Remove from PM2

# Monitoring
pm2 monit                          # Resource monitor
pm2 show pbjs-engine-api           # Detailed info

# Persistence
pm2 save                           # Save process list
pm2 startup                        # Configure startup
pm2 resurrect                      # Restore saved processes
```

## Health Check Endpoints

```bash
# Basic health
curl http://localhost:3001/health

# Detailed health
curl http://localhost:3001/api/health

# Readiness check
curl http://localhost:3001/api/health/ready

# Liveness check
curl http://localhost:3001/api/health/live
```

## Database Operations

```bash
# Backup
npm run db:backup

# Restore from backup
cd apps/api/data
gunzip -c backups/pbjs_engine_YYYYMMDD_HHMMSS.db.gz > pbjs_engine.db

# Direct SQL access
cd apps/api/data
sqlite3 pbjs_engine.db

# Common queries
SELECT COUNT(*) FROM publishers;
SELECT * FROM users WHERE role='super_admin';
.schema publishers
.tables
.quit
```

## Log Files

```bash
# PM2 logs location
apps/api/logs/error.log      # Error messages
apps/api/logs/out.log        # Standard output
apps/api/logs/combined.log   # All logs

# View logs
tail -f apps/api/logs/error.log
tail -f apps/api/logs/combined.log
pm2 logs pbjs-engine-api
```

## Environment Variables

```bash
# Required
JWT_SECRET              # JWT token secret (32+ chars)
COOKIE_SECRET           # Cookie secret (32+ chars)

# Server
NODE_ENV                # development | production
API_HOST                # Server host (0.0.0.0)
API_PORT                # Server port (3001)
LOG_LEVEL               # Log level (info)

# Database
DATABASE_PATH           # Path to SQLite DB

# CORS
ALLOWED_ORIGINS         # Comma-separated origins

# Admin
SUPER_ADMIN_EMAIL       # Admin email
SUPER_ADMIN_PASSWORD    # Admin password
AUTO_SEED_ADMIN         # Auto-create admin (false)

# Optional
REDIS_HOST              # Redis for caching
CLICKHOUSE_HOST         # ClickHouse for analytics
```

## Generate Secrets

```bash
# JWT & Cookie secrets (32+ characters)
openssl rand -base64 32
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Common Tasks

### First Time Setup
```bash
cd apps/api
npm install
cp .env.example .env
nano .env  # Edit configuration
npm run db:seed-admin
npm run start:prod
```

### Deploy Update
```bash
git pull
cd apps/api
npm install
npm run build
pm2 reload pbjs-engine-api
pm2 logs pbjs-engine-api
```

### Troubleshoot Startup
```bash
pm2 logs pbjs-engine-api --lines 100
cat apps/api/.env
node apps/api/dist/index.js
curl http://localhost:3001/api/health
```

### Reset Admin Password
```bash
cd apps/api
npm run db:seed-admin  # Creates/resets super admin
```

### View Real-time Metrics
```bash
pm2 monit
pm2 show pbjs-engine-api
watch -n 1 'pm2 jlist | jq ".[0].monit"'
```

## Port Reference

| Port | Service | Purpose |
|------|---------|---------|
| 3001 | API Server | Backend API (internal) |
| 5173 | Vite Dev | Frontend dev server |
| 3000 | Frontend | Frontend production build |

## File Permissions

```bash
# Secure sensitive files
chmod 600 .env                    # Owner read/write only
chmod 700 scripts/*.sh            # Owner execute only
chmod 640 data/*.db               # Owner read/write, group read

# Verify
ls -la .env
ls -la scripts/
ls -la data/
```

## Firewall Rules (UFW)

```bash
# Allow necessary ports
ufw allow 22/tcp       # SSH
ufw allow 80/tcp       # HTTP (for certbot)
ufw allow 443/tcp      # HTTPS
ufw deny 3001/tcp      # Block direct API access
ufw enable
ufw status
```

## Backup Schedule (Cron)

```bash
# Edit crontab
crontab -e

# Daily backup at 2am
0 2 * * * cd /path/to/pbjs_engine/apps/api && ./scripts/backup-database.sh >> /var/log/pbjs-backup.log 2>&1

# Weekly cleanup of old logs
0 3 * * 0 find /path/to/pbjs_engine/apps/api/logs -name "*.log" -mtime +30 -delete
```

## Emergency Procedures

### Server Unresponsive
```bash
pm2 restart pbjs-engine-api
pm2 logs pbjs-engine-api --lines 100
curl http://localhost:3001/api/health
```

### Database Corrupted
```bash
pm2 stop pbjs-engine-api
cd apps/api/data
mv pbjs_engine.db pbjs_engine.db.broken
gunzip -c backups/pbjs_engine_[latest].db.gz > pbjs_engine.db
cd ../..
pm2 start pbjs-engine-api
```

### Out of Disk Space
```bash
# Check space
df -h

# Clean old logs
find apps/api/logs -name "*.log" -mtime +7 -delete

# Clean old backups
find apps/api/data/backups -name "*.gz" -mtime +7 -delete

# Clean PM2 logs
pm2 flush
```

### Memory Leak
```bash
# Check memory
pm2 show pbjs-engine-api

# Restart
pm2 restart pbjs-engine-api

# Increase limit (ecosystem.config.js)
max_memory_restart: '1G'
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 | 1 minute |
| Wrapper Script | 100 | 1 minute |
| Build Files | 100 | 1 minute |
| Analytics Beacon | 500 | 1 minute |
| API (Authenticated) | 200 | 1 minute |

## Monitoring URLs

```bash
# Health checks
https://api.yourdomain.com/health          # Basic
https://api.yourdomain.com/api/health      # Detailed

# Configure in monitoring service
Uptime Robot: Check every 1 minute
Expected: 200 status code
Alert: Email/SMS on failure
```
