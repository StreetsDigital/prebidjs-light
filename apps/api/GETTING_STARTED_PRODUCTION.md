# Getting Started with Production Deployment

This guide will get your pbjs_engine API server running in production in under 10 minutes.

## Prerequisites

- Ubuntu/Debian server or macOS
- Node.js 20+ installed
- Root or sudo access
- Domain name (optional, for SSL)

## Step-by-Step Setup

### 1. Install Node.js (if needed)

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v  # Should be v20.x or higher
npm -v
```

### 2. Install PM2 Process Manager

```bash
# Install globally
sudo npm install -g pm2

# Verify
pm2 -v
```

### 3. Clone or Update Repository

```bash
# If cloning for first time
git clone <your-repo-url> pbjs_engine
cd pbjs_engine/apps/api

# If updating existing
cd pbjs_engine
git pull
cd apps/api
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Generate strong secrets
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "COOKIE_SECRET=$(openssl rand -base64 32)"

# Edit configuration
nano .env
```

**Minimum required changes in .env:**
```bash
NODE_ENV=production
JWT_SECRET=<paste-generated-secret>
COOKIE_SECRET=<paste-generated-secret>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SUPER_ADMIN_PASSWORD=<your-strong-password>
```

### 6. Create Super Admin User

```bash
npm run db:seed-admin
```

**Output:**
```
Super admin user created:
Email: admin@thenexusengine.com
Password: <your-password>
```

### 7. Start Production Server

```bash
npm run start:prod
```

**Expected output:**
```
═══════════════════════════════════════════════════════
  pbjs_engine API Server - Production Startup
═══════════════════════════════════════════════════════

[STEP] 1. Checking Node.js version...
[INFO] Node.js version: 20.11.0 ✓

[STEP] 2. Checking PM2 installation...
[INFO] PM2 version: 5.3.0 ✓

... (continues through 14 steps)

[INFO] Health check passed ✓
[INFO] Startup complete! Server is running.

API server is running on port: 3001
```

### 8. Verify Server is Running

```bash
# Check PM2 status
pm2 status

# Test health endpoint
curl http://localhost:3001/health

# View logs
pm2 logs pbjs-engine-api --lines 20
```

### 9. Configure Auto-start on Boot

```bash
# Generate startup script
pm2 startup

# Follow the instructions shown (usually requires sudo)
# Then save current process list
pm2 save
```

### 10. Schedule Database Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2am
0 2 * * * cd /path/to/pbjs_engine/apps/api && ./scripts/backup-database.sh >> /var/log/pbjs-backup.log 2>&1
```

## Next Steps

### Configure Reverse Proxy (Recommended)

#### Option 1: Nginx with SSL (Recommended)

```bash
# Install nginx and certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/pbjs-engine
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pbjs-engine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

#### Option 2: Apache with SSL

```bash
# Install Apache
sudo apt-get install -y apache2

# Enable required modules
sudo a2enmod proxy proxy_http ssl

# Create Apache config
sudo nano /etc/apache2/sites-available/pbjs-engine.conf
```

**Apache configuration:**
```apache
<VirtualHost *:80>
    ServerName api.yourdomain.com

    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/

    <Proxy *>
        Order deny,allow
        Allow from all
    </Proxy>
</VirtualHost>
```

```bash
# Enable site
sudo a2ensite pbjs-engine
sudo systemctl restart apache2

# Get SSL certificate
sudo certbot --apache -d api.yourdomain.com
```

### Configure Firewall

```bash
# Install UFW (Ubuntu/Debian)
sudo apt-get install -y ufw

# Allow necessary ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (for certbot)
sudo ufw allow 443/tcp     # HTTPS

# Block direct API port access
sudo ufw deny 3001/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### Set Up Monitoring

1. **Health Check Monitoring:**
   - Sign up for UptimeRobot, Pingdom, or similar
   - Monitor: `https://api.yourdomain.com/health`
   - Check interval: 1 minute
   - Alert on: HTTP status != 200

2. **Server Monitoring:**
   ```bash
   # Install pm2-monit
   pm2 install pm2-monit

   # View metrics
   pm2 monit
   ```

3. **Log Monitoring:**
   ```bash
   # Install pm2-logrotate
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

## Common Tasks

### View Server Status
```bash
pm2 status
```

### View Logs
```bash
# Real-time logs
pm2 logs pbjs-engine-api

# Last 50 lines
pm2 logs pbjs-engine-api --lines 50

# Error logs only
pm2 logs pbjs-engine-api --err
```

### Restart Server
```bash
pm2 restart pbjs-engine-api
```

### Deploy Updates
```bash
cd /path/to/pbjs_engine
git pull
cd apps/api
npm install
npm run build
pm2 reload pbjs-engine-api  # Zero-downtime reload
```

### Backup Database Manually
```bash
npm run db:backup
```

### Restore from Backup
```bash
npm run stop:prod
cd apps/api/data
gunzip -c backups/pbjs_engine_YYYYMMDD_HHMMSS.db.gz > pbjs_engine.db
cd ../..
npm run start:prod
```

### Change Admin Password
```bash
# Login to admin panel: https://yourdomain.com
# Navigate to: Settings > Profile
# Or reset via CLI:
npm run db:seed-admin
```

## Troubleshooting

### Server won't start

**Check logs:**
```bash
pm2 logs pbjs-engine-api --lines 100
```

**Verify environment:**
```bash
cat .env
node dist/index.js  # Run directly to see errors
```

**Common issues:**
- Missing JWT_SECRET or COOKIE_SECRET
- Database file permissions
- Port 3001 already in use

### Health check fails

**Test locally:**
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/health
```

**Check system status:**
```bash
pm2 show pbjs-engine-api
```

**Verify database:**
```bash
ls -lh data/pbjs_engine.db
sqlite3 data/pbjs_engine.db "SELECT 1;"
```

### Can't connect from browser

**Check firewall:**
```bash
sudo ufw status
```

**Verify nginx/Apache:**
```bash
sudo nginx -t
sudo systemctl status nginx

# Or for Apache
sudo apache2ctl configtest
sudo systemctl status apache2
```

**Check SSL certificate:**
```bash
sudo certbot certificates
```

### High memory usage

**Check current usage:**
```bash
pm2 show pbjs-engine-api
```

**Restart server:**
```bash
pm2 restart pbjs-engine-api
```

**Increase memory limit:**
Edit `apps/api/ecosystem.config.js`:
```javascript
max_memory_restart: '1G'  // Increase from 500M
```

## Security Checklist

- [ ] Strong JWT_SECRET and COOKIE_SECRET (32+ characters)
- [ ] Changed SUPER_ADMIN_PASSWORD from default
- [ ] Configured ALLOWED_ORIGINS with actual domains
- [ ] Firewall enabled (SSH, HTTP, HTTPS only)
- [ ] Direct API port (3001) blocked from internet
- [ ] SSL certificate installed and auto-renewing
- [ ] Database backups scheduled
- [ ] Health monitoring configured
- [ ] PM2 auto-start on boot enabled
- [ ] Server OS and packages up to date

## Performance Tuning

### Enable Cluster Mode

Edit `apps/api/ecosystem.config.js`:
```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

Restart:
```bash
pm2 reload ecosystem.config.js
```

### Configure Redis (Optional)

For distributed rate limiting and caching:

```bash
# Install Redis
sudo apt-get install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Update .env
echo "REDIS_HOST=localhost" >> .env
echo "REDIS_PORT=6379" >> .env

# Restart server
pm2 restart pbjs-engine-api
```

### Configure ClickHouse (Optional)

For advanced analytics:

See [ClickHouse installation guide](https://clickhouse.com/docs/en/install)

## Support

For help:
1. Check `/apps/api/PRODUCTION_SETUP.md` - Comprehensive guide
2. Check `/apps/api/QUICK_REFERENCE.md` - Command reference
3. Review logs: `pm2 logs pbjs-engine-api`
4. Check health: `curl http://localhost:3001/api/health`

## What's Next?

Once your server is running:

1. **Test the API:** Visit `https://api.yourdomain.com/api/health`
2. **Access Admin Panel:** Visit `https://yourdomain.com` (frontend)
3. **Create Publishers:** Use admin panel to add publishers
4. **Generate Wrapper:** Each publisher gets a unique wrapper script
5. **Monitor:** Set up external monitoring for uptime

Congratulations! Your pbjs_engine API server is now running in production!
