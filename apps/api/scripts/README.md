# pbjs_engine API Scripts

This directory contains production scripts for managing the pbjs_engine API server.

## Available Scripts

### 1. Production Startup Script

**File:** `start-production.sh`

**Purpose:** Validates environment, runs migrations, and starts the server with PM2.

**Usage:**
```bash
# Start server
./scripts/start-production.sh

# Start with full rebuild
./scripts/start-production.sh --rebuild

# Or via npm
npm run start:prod
```

**What it does:**
1. Validates Node.js version (requires 20+)
2. Checks PM2 installation
3. Validates environment variables
4. Checks/installs dependencies
5. Builds TypeScript code
6. Verifies database
7. Creates required directories
8. Starts server with PM2
9. Runs health check

**Prerequisites:**
- Node.js 20+
- PM2 installed globally: `npm install -g pm2`
- `.env` file configured

### 2. Production Stop Script

**File:** `stop-production.sh`

**Purpose:** Gracefully stops the PM2-managed server.

**Usage:**
```bash
# Stop server (keeps in PM2 list)
./scripts/stop-production.sh

# Stop and remove from PM2
./scripts/stop-production.sh --delete

# Or via npm
npm run stop:prod
```

### 3. Database Backup Script

**File:** `backup-database.sh`

**Purpose:** Creates timestamped backups of the SQLite database and maintains retention policy.

**Usage:**
```bash
# Manual backup
./scripts/backup-database.sh

# Or via npm
npm run db:backup
```

**Features:**
- Creates timestamped backup files
- Compresses backups with gzip
- Keeps last 7 days of backups
- Uses SQLite's `.backup` command for consistency
- Safe to run while server is running

**Schedule with cron:**
```bash
# Daily backup at 2am
0 2 * * * cd /path/to/pbjs_engine/apps/api && ./scripts/backup-database.sh >> /var/log/pbjs-backup.log 2>&1
```

**Restore from backup:**
```bash
# Stop server first
npm run stop:prod

# Restore backup
cd apps/api/data
gunzip -c backups/pbjs_engine_20260203_020000.db.gz > pbjs_engine.db

# Start server
npm run start:prod
```

## PM2 Management

After starting with the production script, you can manage the server with PM2:

```bash
# View status
pm2 status

# View logs (real-time)
pm2 logs pbjs-engine-api

# Restart server
pm2 restart pbjs-engine-api

# Reload server (zero-downtime)
pm2 reload pbjs-engine-api

# Monitor resources
pm2 monit

# View detailed info
pm2 show pbjs-engine-api
```

### PM2 Startup on Boot

To make the server start automatically on system boot:

```bash
# Generate startup script
pm2 startup

# Follow the instructions, then save current process list
pm2 save
```

### PM2 Logs

Logs are stored in `apps/api/logs/`:
- `error.log` - Error messages only
- `out.log` - Standard output
- `combined.log` - All logs

Rotate logs with PM2:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Production Checklist

Before deploying to production:

- [ ] Copy `.env.example` to `.env`
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Generate strong secrets:
  ```bash
  openssl rand -base64 32  # For JWT_SECRET
  openssl rand -base64 32  # For COOKIE_SECRET
  ```
- [ ] Update `ALLOWED_ORIGINS` with your frontend domain
- [ ] Change `SUPER_ADMIN_PASSWORD` from default
- [ ] Install PM2 globally: `npm install -g pm2`
- [ ] Set up database backups (cron job)
- [ ] Configure firewall rules
- [ ] Set up reverse proxy (nginx/Apache) with SSL
- [ ] Configure monitoring/alerting
- [ ] Test startup script: `./scripts/start-production.sh`

## Monitoring

### Health Checks

The server provides multiple health check endpoints:

```bash
# Basic health check (fast)
curl http://localhost:3001/health

# Detailed health check
curl http://localhost:3001/api/health

# Readiness check
curl http://localhost:3001/api/health/ready

# Liveness check
curl http://localhost:3001/api/health/live
```

### Performance Monitoring

Monitor the server with PM2:
```bash
# CPU and memory usage
pm2 monit

# Process metrics
pm2 show pbjs-engine-api

# Custom metrics (if configured)
pm2 web
```

## Troubleshooting

### Server won't start

1. Check environment variables:
   ```bash
   cd apps/api
   cat .env  # Verify all required vars are set
   ```

2. Check logs:
   ```bash
   pm2 logs pbjs-engine-api --lines 100
   ```

3. Validate environment manually:
   ```bash
   npm run build
   node dist/index.js  # See error directly
   ```

### Database issues

1. Check database file exists:
   ```bash
   ls -lh apps/api/data/pbjs_engine.db
   ```

2. Test database connectivity:
   ```bash
   sqlite3 apps/api/data/pbjs_engine.db "SELECT 1;"
   ```

3. Restore from backup if corrupted:
   ```bash
   cd apps/api/data
   mv pbjs_engine.db pbjs_engine.db.broken
   gunzip -c backups/pbjs_engine_[latest].db.gz > pbjs_engine.db
   ```

### High memory usage

1. Check process stats:
   ```bash
   pm2 show pbjs-engine-api
   ```

2. Adjust memory limit in `ecosystem.config.js`:
   ```javascript
   max_memory_restart: '1G'  // Increase if needed
   ```

3. Restart server:
   ```bash
   pm2 restart pbjs-engine-api
   ```

### Port already in use

1. Check what's using the port:
   ```bash
   lsof -i :3001
   ```

2. Kill the process or change `API_PORT` in `.env`

## Security Best Practices

1. **Secrets Management**
   - Never commit `.env` files
   - Use strong random secrets (32+ characters)
   - Rotate secrets regularly

2. **File Permissions**
   ```bash
   chmod 600 .env              # Only owner can read
   chmod 700 scripts/*.sh      # Only owner can execute
   chmod 640 data/*.db         # Database read by owner/group
   ```

3. **Firewall**
   ```bash
   # Only allow API port from trusted sources
   ufw allow from trusted-ip to any port 3001
   ```

4. **Reverse Proxy**
   - Use nginx/Apache with SSL
   - Don't expose API port directly
   - Configure rate limiting at proxy level

5. **Backups**
   - Store backups off-server
   - Encrypt sensitive backups
   - Test restore procedures regularly

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [SQLite Backup Best Practices](https://www.sqlite.org/backup.html)
