# Production Deployment Guide - Sites Feature

## 🚀 Pre-Deployment Checklist

### Backend Requirements
- [ ] Node.js 20 LTS installed
- [ ] SQLite or PostgreSQL database
- [ ] Redis (optional, for distributed caching)
- [ ] SSL certificate for HTTPS
- [ ] CDN account (CloudFlare recommended)
- [ ] Monitoring tools (Sentry, DataDog, etc.)

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `API_PORT=3001` (or your preferred port)
- [ ] `JWT_SECRET` (secure random string, 64+ chars)
- [ ] `COOKIE_SECRET` (secure random string, 64+ chars)
- [ ] `DATABASE_URL` (production database)
- [ ] `REDIS_URL` (optional, for caching)

---

## 📦 Step 1: Build Production Assets

### 1.1 Build API Server

```bash
cd apps/api
npm install --production
npm run build

# Verify build
ls -lh dist/
```

### 1.2 Build Admin Portal

```bash
cd apps/admin
npm install --production
npm run build

# Verify build
ls -lh dist/
```

### 1.3 Build Wrapper

```bash
cd apps/wrapper
npm install --production
npm run build

# Verify build
ls -lh dist/pb.min.js
# Expected: ~5.6 KB minified
```

---

## 🗄️ Step 2: Database Migration

### 2.1 Backup Existing Database (if upgrading)

```bash
# SQLite backup
cp data/pbjs_engine.db data/pbjs_engine.db.backup-$(date +%Y%m%d)

# PostgreSQL backup
pg_dump pbjs_engine > backup-$(date +%Y%m%d).sql
```

### 2.2 Run Migrations

```bash
cd apps/api

# Set production environment
export NODE_ENV=production
export DATABASE_URL="your-production-db-url"

# Run migrations (automatic on server start)
npm start

# Or manually run migrations
npm run db:migrate
```

### 2.3 Verify New Tables

```bash
# SQLite
sqlite3 data/pbjs_engine.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%wrapper%';"

# Should show:
# - wrapper_configs
# - config_targeting_rules
# - config_serve_log
```

---

## 🌐 Step 3: Environment Configuration

### 3.1 Create Production .env File

```bash
cd apps/api
cat > .env.production << EOF
# Production Environment
NODE_ENV=production
API_PORT=3001

# Security (CHANGE THESE!)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
COOKIE_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Database
DATABASE_URL=file:./data/pbjs_engine.db
# Or PostgreSQL: postgresql://user:pass@host:5432/pbjs_engine

# Redis (optional)
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Logging
LOG_LEVEL=info

# Auto-seeding (disable in production)
AUTO_SEED_ADMIN=false
EOF
```

### 3.2 Set File Permissions

```bash
chmod 600 .env.production
chown www-data:www-data .env.production  # Adjust user as needed
```

---

## 🔧 Step 4: Process Manager Setup

### 4.1 Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cd apps/api
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'pbjs-engine-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions printed
```

### 4.2 Using systemd

```bash
# Create systemd service file
sudo cat > /etc/systemd/system/pbjs-engine.service << EOF
[Unit]
Description=PBJS Engine API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/pbjs-engine/apps/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable pbjs-engine
sudo systemctl start pbjs-engine

# Check status
sudo systemctl status pbjs-engine
```

---

## 🌍 Step 5: CDN Configuration

### 5.1 CloudFlare Setup (Recommended)

**DNS Configuration:**
```
A    api.yourdomain.com    → Your Server IP
A    cdn.yourdomain.com    → Your Server IP (proxied through CF)
```

**Page Rules:**
```
Pattern: cdn.yourdomain.com/pb/*.js
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 5 minutes
  - Browser Cache TTL: 5 minutes
  - Bypass Cache on Cookie: pb_debug=*
```

**Transform Rules (Vary Header Handling):**
```
Rule 1: Add CF-IPCountry to cache key
Rule 2: Add User-Agent (device type) to cache key
```

### 5.2 Wrapper Serving URLs

**Production URLs:**
```
# Generic wrapper
https://cdn.yourdomain.com/pb.min.js

# Publisher-specific wrapper (with embedded config)
https://cdn.yourdomain.com/pb/{publisherId}.js

# Wrapper info
https://cdn.yourdomain.com/pb/info
```

### 5.3 Cache Purge Script

```bash
#!/bin/bash
# purge-wrapper-cache.sh

PUBLISHER_ID=$1
CF_ZONE_ID="your-cloudflare-zone-id"
CF_API_TOKEN="your-api-token"

curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"files\":[\"https://cdn.yourdomain.com/pb/$PUBLISHER_ID.js\"]}"

echo "Cache purged for publisher: $PUBLISHER_ID"
```

---

## 🔍 Step 6: Monitoring Setup

### 6.1 Health Check Endpoints

```bash
# Basic health
curl https://api.yourdomain.com/health

# Detailed health (requires auth)
curl -H "Authorization: Bearer $TOKEN" \
  https://api.yourdomain.com/api/system/health

# Cache statistics
curl -H "Authorization: Bearer $TOKEN" \
  https://api.yourdomain.com/api/system/cache-stats
```

### 6.2 Uptime Monitoring

**UptimeRobot / Pingdom:**
- Monitor: `https://api.yourdomain.com/health`
- Interval: 1 minute
- Alert: Email/SMS on downtime

### 6.3 Application Monitoring

**Sentry Setup:**
```bash
npm install @sentry/node @sentry/tracing

# Add to apps/api/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**DataDog/New Relic:**
- APM monitoring
- Log aggregation
- Performance tracking
- Alert thresholds

### 6.4 Log Aggregation

```bash
# PM2 logs
pm2 logs pbjs-engine-api --lines 100

# systemd logs
journalctl -u pbjs-engine -f

# Log rotation
sudo cat > /etc/logrotate.d/pbjs-engine << EOF
/var/www/pbjs-engine/apps/api/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF
```

---

## 📊 Step 7: Performance Optimization

### 7.1 Enable Gzip Compression

**Nginx:**
```nginx
gzip on;
gzip_vary on;
gzip_types text/plain application/javascript text/css application/json;
gzip_min_length 1000;
```

### 7.2 Set Proper Cache Headers

**Already configured in wrapper.ts:**
```
Cache-Control: public, max-age=300
Vary: CF-IPCountry, User-Agent
```

### 7.3 Database Optimization

```sql
-- Add indexes (already in migration)
CREATE INDEX IF NOT EXISTS idx_wrapper_configs_publisher ON wrapper_configs(publisher_id, status);
CREATE INDEX IF NOT EXISTS idx_targeting_rules_priority ON config_targeting_rules(priority DESC);

-- Analyze tables
ANALYZE wrapper_configs;
ANALYZE config_targeting_rules;
ANALYZE config_serve_log;
```

### 7.4 Redis Caching (Optional)

```typescript
// apps/api/src/utils/redis-cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedWrapper(key: string) {
  return await redis.get(key);
}

export async function setCachedWrapper(key: string, value: string, ttl: number = 300) {
  await redis.setex(key, ttl, value);
}
```

---

## 🔒 Step 8: Security Hardening

### 8.1 Rate Limiting (Already Configured)

```typescript
// apps/api/src/index.ts
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
```

### 8.2 HTTPS Only

**Nginx Reverse Proxy:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.3 Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Restrict API access to CDN IPs only (optional)
# CloudFlare IPs: https://www.cloudflare.com/ips/
```

---

## 🔄 Step 9: Rollback Procedure

### 9.1 Database Rollback

```bash
# Restore from backup
cp data/pbjs_engine.db.backup-20260130 data/pbjs_engine.db

# Restart service
pm2 restart pbjs-engine-api
```

### 9.2 Application Rollback

```bash
# Git rollback
git log --oneline -10
git checkout <previous-commit-hash>

# Rebuild
npm run build

# Restart
pm2 restart pbjs-engine-api
```

### 9.3 CDN Cache Purge

```bash
# Purge all wrapper caches
./scripts/purge-all-wrapper-caches.sh
```

---

## ✅ Step 10: Post-Deployment Verification

### 10.1 Smoke Tests

```bash
# Health check
curl https://api.yourdomain.com/health

# Wrapper serving
curl https://cdn.yourdomain.com/pb/{publisherId}.js | head -5

# Config API
curl -H "Authorization: Bearer $TOKEN" \
  https://api.yourdomain.com/api/publishers/{publisherId}/configs
```

### 10.2 Performance Verification

```bash
# Measure wrapper load time
time curl -o /dev/null -s -w '%{time_total}\n' \
  https://cdn.yourdomain.com/pb/{publisherId}.js

# Expected: < 0.1s (100ms)
```

### 10.3 Monitoring Verification

- [ ] Sentry receiving events
- [ ] Logs being aggregated
- [ ] Metrics dashboard showing data
- [ ] Alerts configured and tested

---

## 📋 Production Deployment Checklist

### Pre-Deployment
- [ ] Code reviewed and tested
- [ ] Database backup created
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] CDN configured

### Deployment
- [ ] All assets built successfully
- [ ] Database migrations run
- [ ] Service started with process manager
- [ ] Health checks passing
- [ ] Logs monitoring active

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Performance metrics acceptable
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified

### Ongoing
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Review cache hit rates
- [ ] Check disk space
- [ ] Rotate logs

---

## 🚨 Troubleshooting

### Issue: Wrapper not loading

**Check:**
```bash
# Server logs
pm2 logs pbjs-engine-api --err

# Health check
curl https://api.yourdomain.com/health

# DNS resolution
dig cdn.yourdomain.com
```

### Issue: Wrong config being served

**Check:**
```bash
# Test targeting
curl -H "CF-IPCountry: GB" \
     -H "User-Agent: Mozilla/5.0 (iPhone)" \
     https://cdn.yourdomain.com/pb/{publisherId}.js | grep configName

# Check database
sqlite3 data/pbjs_engine.db "SELECT * FROM config_targeting_rules WHERE publisher_id = '{publisherId}';"
```

### Issue: Performance degradation

**Check:**
```bash
# Cache stats
curl -H "Authorization: Bearer $TOKEN" \
  https://api.yourdomain.com/api/system/cache-stats

# Database locks
sqlite3 data/pbjs_engine.db "PRAGMA wal_checkpoint;"

# Server resources
top
df -h
```

---

## 📞 Support

**Documentation:**
- Implementation: `/SITES_FEATURE_IMPLEMENTATION.md`
- Quick Start: `/QUICK_START_SITES.md`
- Verification: `/DEPLOYMENT_VERIFICATION.md`

**Monitoring:**
- Health: `https://api.yourdomain.com/health`
- Metrics: `https://api.yourdomain.com/api/system/health`

**Emergency Contacts:**
- DevOps: devops@yourdomain.com
- On-Call: +1-xxx-xxx-xxxx

---

**Deployment Date:** _____________________
**Deployed By:** _____________________
**Version:** Sites Feature v1.0 - Embedded Config Architecture
