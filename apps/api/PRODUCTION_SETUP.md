# Production Setup Guide for pbjs_engine

This guide covers the production-ready features and fixes implemented for the pbjs_engine API server.

## Overview

The following production enhancements have been implemented:

1. **Rate Limiting** - Protect API from abuse with configurable rate limits
2. **Database Backups** - Automated backup script with retention policy
3. **Health Checks** - Comprehensive health monitoring endpoints
4. **Environment Validation** - Strict validation of configuration
5. **Production Startup** - PM2-based startup with validation

## 1. Rate Limiting

### Implementation

Rate limiting has been configured at multiple levels to prevent abuse while allowing legitimate traffic.

**Files:**
- `/apps/api/src/middleware/rate-limit-configs.ts` - Rate limit configurations
- `/apps/api/src/config/server-config.ts` - Global rate limiter setup
- `/apps/api/src/routes/public-routes.ts` - Public endpoint limits
- `/apps/api/src/routes/prebid-builds.ts` - Build download limits

**Rate Limits:**

| Endpoint Type | Limit | Window | Purpose |
|--------------|-------|--------|---------|
| Login | 5 requests | 1 minute | Prevent brute force |
| Public Wrapper | 100 requests | 1 minute | CDN protection |
| Public Builds | 100 requests | 1 minute | CDN protection |
| Analytics Beacon | 500 requests | 1 minute | High-volume tracking |
| Authenticated API | 200 requests | 1 minute | General API protection |

**How It Works:**

```typescript
// Public endpoints use lower limits
fastify.get('/pb.js', {
  config: {
    rateLimit: {
      max: 100,
      timeWindow: '1 minute',
    },
  },
  handler: wrapperScriptHandler,
});

// Login has strict limits
fastify.post('/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        error: 'Too many login attempts',
        message: 'Please try again in a minute',
      }),
    },
  },
  handler: loginHandler,
});
```

**Configuration:**

Rate limits are tracked per IP address. For production with load balancers, ensure the real IP is passed through:

```nginx
# nginx configuration
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

**Customization:**

To adjust rate limits, edit `/apps/api/src/middleware/rate-limit-configs.ts`:

```typescript
export const publicWrapperRateLimit = {
  max: 200,  // Increase to 200 requests
  timeWindow: '1 minute',
};
```

## 2. Database Backups

### Backup Script

**File:** `/apps/api/scripts/backup-database.sh`

**Features:**
- Creates timestamped backups with SQLite's `.backup` command
- Compresses backups with gzip
- Maintains 7-day retention policy
- Safe to run while server is running
- Detailed logging and error handling

**Usage:**

```bash
# Manual backup
cd apps/api
./scripts/backup-database.sh

# Or via npm
npm run db:backup
```

**Automated Backups:**

Schedule daily backups with cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2am
0 2 * * * cd /path/to/pbjs_engine/apps/api && ./scripts/backup-database.sh >> /var/log/pbjs-backup.log 2>&1
```

**Backup Location:**

Backups are stored in `apps/api/data/backups/`:

```
pbjs_engine_20260203_020000.db.gz
pbjs_engine_20260202_020000.db.gz
pbjs_engine_20260201_020000.db.gz
...
```

**Restore from Backup:**

```bash
# Stop server
npm run stop:prod

# Navigate to data directory
cd apps/api/data

# Backup current database (just in case)
cp pbjs_engine.db pbjs_engine.db.before-restore

# Restore from backup
gunzip -c backups/pbjs_engine_20260203_020000.db.gz > pbjs_engine.db

# Start server
npm run start:prod

# Verify
curl http://localhost:3001/health
```

**Off-site Backups:**

For production, sync backups to remote storage:

```bash
# Example: Sync to S3 (add to backup script or cron)
aws s3 sync apps/api/data/backups/ s3://your-bucket/pbjs-backups/ \
  --exclude "*" --include "*.db.gz"
```

## 3. Health Check Endpoints

### Implementation

**File:** `/apps/api/src/routes/health.ts`

**Endpoints:**

#### Basic Health Check
```
GET /health
```

Fast endpoint for load balancers. Returns immediately.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

#### Detailed Health Check
```
GET /api/health
```

Comprehensive system status with multiple checks.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T12:00:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database connection successful"
    },
    "prebidSource": {
      "status": "pass",
      "message": "Prebid.js source found",
      "details": {
        "version": "8.32.0",
        "path": "/path/to/prebid-source"
      }
    },
    "buildDirectory": {
      "status": "pass",
      "message": "Build directory is writable",
      "details": {
        "path": "/path/to/prebid-builds",
        "buildCount": 5
      }
    },
    "diskSpace": {
      "status": "pass",
      "message": "Data directory accessible"
    }
  },
  "version": "1.0.0",
  "environment": "production"
}
```

**Status Codes:**
- `200` - Healthy or degraded (some warnings)
- `503` - Unhealthy (critical failures)

#### Readiness Check
```
GET /api/health/ready
```

Indicates if service can accept traffic. Checks database and build directory.

**Response:**
```json
{
  "ready": true,
  "checks": {
    "database": { "status": "pass", "message": "..." },
    "buildDirectory": { "status": "pass", "message": "..." }
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

#### Liveness Check
```
GET /api/health/live
```

Simple check that service is running (for Kubernetes).

**Response:**
```json
{
  "alive": true,
  "timestamp": "2026-02-03T12:00:00.000Z",
  "uptime": 86400
}
```

### Monitoring Integration

**Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

**Docker Compose:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 40s
```

**Uptime Monitoring:**
```bash
# Uptime Robot, Pingdom, etc.
Monitor URL: https://api.yourdomain.com/health
Expected Response: 200
Check Interval: 1 minute
```

## 4. Environment Variable Validation

### Enhanced Validation

**File:** `/apps/api/src/config/server-config.ts`

**Features:**
- Validates all required variables on startup
- Checks for weak default secrets in production
- Enforces minimum secret length (32 characters)
- Provides helpful error messages with solutions

**Example Output:**

```
[ERROR] Environment validation failed:
  - JWT_SECRET is required (generate with: openssl rand -base64 32)
  - COOKIE_SECRET must be at least 32 characters long
  - JWT_SECRET must be changed from default value in production

Please check your .env file. See .env.example for reference.
```

**Warnings:**
```
[WARN] Default super admin password detected. Change it immediately after first login!
[WARN] REDIS_HOST not configured. In-memory caching will be used (not recommended for production)
```

### Environment File

**File:** `/apps/api/.env.example`

Comprehensive example with all available options and documentation.

**Key Sections:**
- Server Configuration (port, host, log level)
- Authentication & Security (secrets)
- Database Configuration
- CORS Origins
- Super Admin Credentials
- Prebid.js Build System
- Analytics & Monitoring (ClickHouse)
- Redis Configuration
- Feature Flags
- External Services (SMTP)
- Performance & Limits

**Production Setup:**

```bash
# Copy example
cp .env.example .env

# Generate secrets
openssl rand -base64 32  # Copy for JWT_SECRET
openssl rand -base64 32  # Copy for COOKIE_SECRET

# Edit configuration
nano .env

# Set at minimum:
# - NODE_ENV=production
# - JWT_SECRET=<strong-secret>
# - COOKIE_SECRET=<strong-secret>
# - ALLOWED_ORIGINS=https://yourdomain.com
# - SUPER_ADMIN_PASSWORD=<strong-password>
```

## 5. Production Startup Script

### PM2-based Startup

**File:** `/apps/api/scripts/start-production.sh`

**Features:**
- Validates Node.js version (requires 20+)
- Checks PM2 installation
- Validates all environment variables
- Builds TypeScript code
- Creates required directories
- Starts server with PM2 process manager
- Runs health check after startup
- Detailed step-by-step logging

**Usage:**

```bash
# First time setup
cd apps/api
npm install
cp .env.example .env
nano .env  # Configure environment

# Install PM2 globally
npm install -g pm2

# Start server
./scripts/start-production.sh

# Or via npm
npm run start:prod

# Force rebuild
./scripts/start-production.sh --rebuild
```

**PM2 Features:**
- Automatic restart on crash
- Log management
- Cluster mode support
- Zero-downtime reload
- Process monitoring
- Startup on system boot

**PM2 Commands:**

```bash
# View status
pm2 status

# View logs (real-time)
pm2 logs pbjs-engine-api

# View last 100 lines
pm2 logs pbjs-engine-api --lines 100

# Restart server
pm2 restart pbjs-engine-api

# Reload (zero-downtime)
pm2 reload pbjs-engine-api

# Stop server
pm2 stop pbjs-engine-api

# Monitor resources
pm2 monit

# Show detailed info
pm2 show pbjs-engine-api
```

**Configure Startup on Boot:**

```bash
# Generate startup script
pm2 startup

# Follow the instructions shown, then:
pm2 save
```

### Companion Scripts

**Stop Script:** `/apps/api/scripts/stop-production.sh`

```bash
# Stop server (keep in PM2 list)
./scripts/stop-production.sh

# Stop and remove from PM2
./scripts/stop-production.sh --delete

# Or via npm
npm run stop:prod
```

**Build Script:** `/apps/api/scripts/build-all-publishers.ts`

Pre-builds Prebid.js bundles for all publishers.

## Production Deployment Checklist

### Pre-deployment

- [ ] Copy `.env.example` to `.env`
- [ ] Generate strong secrets (32+ characters each)
  ```bash
  openssl rand -base64 32  # JWT_SECRET
  openssl rand -base64 32  # COOKIE_SECRET
  ```
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` with actual domains
- [ ] Set strong `SUPER_ADMIN_PASSWORD`
- [ ] Install PM2: `npm install -g pm2`
- [ ] Install dependencies: `npm install --production`
- [ ] Build code: `npm run build`

### Server Setup

- [ ] Configure firewall rules
  ```bash
  ufw allow 22/tcp      # SSH
  ufw allow 80/tcp      # HTTP (for certbot)
  ufw allow 443/tcp     # HTTPS
  ufw deny 3001/tcp     # Block direct API access
  ufw enable
  ```
- [ ] Set up reverse proxy (nginx/Apache) with SSL
- [ ] Configure SSL certificates (Let's Encrypt)
- [ ] Set correct file permissions
  ```bash
  chmod 600 .env
  chmod 700 scripts/*.sh
  chmod 640 data/*.db
  ```

### Monitoring & Backups

- [ ] Test backup script: `./scripts/backup-database.sh`
- [ ] Schedule daily backups via cron
- [ ] Configure off-site backup sync (S3, etc.)
- [ ] Set up health check monitoring (UptimeRobot, etc.)
- [ ] Configure log rotation
- [ ] Set up error alerting

### First Run

- [ ] Start server: `./scripts/start-production.sh`
- [ ] Verify health: `curl http://localhost:3001/health`
- [ ] Check logs: `pm2 logs pbjs-engine-api`
- [ ] Test admin login
- [ ] Change admin password immediately
- [ ] Verify rate limiting works
- [ ] Test from external domain

### Post-deployment

- [ ] Configure PM2 startup: `pm2 startup && pm2 save`
- [ ] Document server credentials securely
- [ ] Create runbook for common issues
- [ ] Train team on PM2 commands
- [ ] Schedule regular security reviews

## Troubleshooting

### Server Won't Start

**Check environment:**
```bash
cat .env  # Verify all required variables
node dist/index.js  # Run directly to see errors
```

**Check logs:**
```bash
pm2 logs pbjs-engine-api --lines 100
tail -f logs/error.log
```

### Database Issues

**Check database:**
```bash
ls -lh data/pbjs_engine.db
sqlite3 data/pbjs_engine.db "SELECT 1;"
```

**Restore from backup:**
```bash
npm run stop:prod
cd data
gunzip -c backups/pbjs_engine_[latest].db.gz > pbjs_engine.db
cd ../..
npm run start:prod
```

### Rate Limiting Too Strict

**Adjust limits:**
Edit `/apps/api/src/middleware/rate-limit-configs.ts`:
```typescript
export const publicWrapperRateLimit = {
  max: 200,  // Increase
  timeWindow: '1 minute',
};
```

**Rebuild and restart:**
```bash
npm run build
pm2 restart pbjs-engine-api
```

### High Memory Usage

**Check usage:**
```bash
pm2 show pbjs-engine-api
pm2 monit
```

**Adjust memory limit:**
Edit `ecosystem.config.js`:
```javascript
max_memory_restart: '1G'  // Increase if needed
```

**Restart:**
```bash
pm2 restart pbjs-engine-api
```

## Security Best Practices

1. **Secrets Management**
   - Use strong random secrets (32+ chars)
   - Never commit `.env` files
   - Rotate secrets regularly
   - Use environment-specific secrets

2. **Network Security**
   - Use reverse proxy (nginx) with SSL
   - Don't expose API port publicly
   - Configure firewall rules
   - Use fail2ban for SSH protection

3. **Database Security**
   - Regular backups (automated)
   - Off-site backup storage
   - Encrypted backups for sensitive data
   - Test restore procedures

4. **Monitoring**
   - Health check monitoring
   - Log aggregation
   - Error alerting
   - Performance monitoring

5. **Updates**
   - Regular security updates
   - Dependency vulnerability scanning
   - Keep Node.js updated
   - Monitor CVE databases

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [SQLite Backup Guide](https://www.sqlite.org/backup.html)
- [Fastify Production Tips](https://www.fastify.io/docs/latest/Guides/Recommendations/)

## Support

For issues or questions:
1. Check this documentation
2. Review logs: `pm2 logs pbjs-engine-api`
3. Check health endpoint: `curl http://localhost:3001/api/health`
4. Consult the troubleshooting section above
