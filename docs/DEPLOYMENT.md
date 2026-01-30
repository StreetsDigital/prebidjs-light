# Deployment Guide

## Important: Database Management

**⚠️ CRITICAL**: The SQLite database file is NOT tracked in git and should never be committed.

### First Deployment

1. Pull latest code:
   ```bash
   cd ~/prebidjs-light
   git pull origin master
   ```

2. Install dependencies:
   ```bash
   cd apps/api
   npm install

   cd ../admin
   npm install
   ```

3. Create super admin (if database is empty):
   ```bash
   cd apps/api
   npm run db:seed-admin
   ```

4. Build and start:
   ```bash
   # Build API
   cd apps/api
   npm run build
   pm2 start ecosystem.config.js --only pbjs-api

   # Build admin
   cd ../admin
   npm run build
   ```

### Subsequent Deployments

1. **Backup database first** (IMPORTANT):
   ```bash
   cd ~/prebidjs-light/apps/api/data
   cp pbjs_engine.db pbjs_engine.db.backup-$(date +%Y%m%d-%H%M%S)
   ```

2. Pull code (database will NOT be overwritten):
   ```bash
   cd ~/prebidjs-light
   git pull origin master
   ```

3. Install dependencies (if package.json changed):
   ```bash
   cd apps/api
   npm install

   cd ../admin
   npm install
   ```

4. Rebuild and restart:
   ```bash
   # Build and restart API
   cd apps/api
   npm run build
   pm2 restart pbjs-api

   # Build admin
   cd ../admin
   npm run build
   ```

### Database Recovery

If database is corrupted or credentials are lost:

1. **Option A: Restore from backup**:
   ```bash
   cd ~/prebidjs-light/apps/api/data
   cp pbjs_engine.db.backup-<timestamp> pbjs_engine.db
   pm2 restart pbjs-api
   ```

2. **Option B: Recreate super admin**:
   ```bash
   cd ~/prebidjs-light/apps/api
   npm run db:seed-admin
   ```

### Environment Configuration

Create a `.env` file in `apps/api/` with secure credentials:

```env
NODE_ENV=production
API_PORT=3001

# Authentication (use strong random secrets)
JWT_SECRET=<secure-random-secret>
COOKIE_SECRET=<secure-random-secret>

# Super Admin Credentials
SUPER_ADMIN_EMAIL=admin@thenexusengine.com
SUPER_ADMIN_PASSWORD=<secure-password-here>
SUPER_ADMIN_NAME=Super Admin

# Database
DATABASE_PATH=/home/ubuntu/prebidjs-light/apps/api/data/pbjs_engine.db

# CORS (production URLs)
CORS_ORIGINS=https://app.thenexusengine.com,https://thenexusengine.com
```

**IMPORTANT**: Never commit the `.env` file to git. Use strong passwords and random secrets.

### Backup Strategy

**Manual backups** (before each deployment):
```bash
cd ~/prebidjs-light/apps/api/data
cp pbjs_engine.db pbjs_engine.db.backup-$(date +%Y%m%d-%H%M%S)
```

**Automated backups** (optional - add to cron):
```bash
# Edit crontab
crontab -e

# Add this line to backup every 6 hours
0 */6 * * * cd /home/ubuntu/prebidjs-light/apps/api/data && cp pbjs_engine.db pbjs_engine.db.backup-$(date +\%Y\%m\%d-\%H\%M\%S)

# Add this line to keep only last 7 days of backups
0 1 * * * find /home/ubuntu/prebidjs-light/apps/api/data -name "*.backup-*" -mtime +7 -delete
```

### Verifying Deployment

1. **Check API health**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check database**:
   ```bash
   cd ~/prebidjs-light/apps/api/data
   sqlite3 pbjs_engine.db "SELECT email, role FROM users WHERE role='super_admin';"
   ```

3. **Check PM2 status**:
   ```bash
   pm2 status
   pm2 logs pbjs-api --lines 50
   ```

4. **Test login** at https://app.thenexusengine.com

### Troubleshooting

**Problem**: Cannot login after deployment

**Solution**:
1. Check if database file exists:
   ```bash
   ls -lh ~/prebidjs-light/apps/api/data/pbjs_engine.db
   ```

2. Verify super admin exists:
   ```bash
   cd ~/prebidjs-light/apps/api/data
   sqlite3 pbjs_engine.db "SELECT * FROM users WHERE role='super_admin';"
   ```

3. If no super admin, create one:
   ```bash
   cd ~/prebidjs-light/apps/api
   npm run db:seed-admin
   ```

**Problem**: Database was overwritten

**Solution**:
1. Check if backup exists:
   ```bash
   ls -lh ~/prebidjs-light/apps/api/data/*.backup-*
   ```

2. Restore latest backup:
   ```bash
   cd ~/prebidjs-light/apps/api/data
   cp pbjs_engine.db.backup-<latest-timestamp> pbjs_engine.db
   pm2 restart pbjs-api
   ```

**Problem**: API won't start

**Solution**:
1. Check logs:
   ```bash
   pm2 logs pbjs-api --lines 100
   ```

2. Check .env file exists and has correct values:
   ```bash
   cat ~/prebidjs-light/apps/api/.env
   ```

3. Try starting manually to see errors:
   ```bash
   cd ~/prebidjs-light/apps/api
   npm run start
   ```

### Security Best Practices

1. **Never commit database files** - Contains sensitive data including passwords
2. **Use strong passwords** - Change default password immediately after first login
3. **Secure .env files** - Ensure they're listed in .gitignore
4. **Regular backups** - Automate with cron for peace of mind
5. **Backup retention** - Delete old backups to save disk space
6. **Monitor logs** - Check PM2 logs regularly for errors
7. **Update dependencies** - Run `npm audit` periodically

### Quick Reference

```bash
# Backup database
cd ~/prebidjs-light/apps/api/data
cp pbjs_engine.db pbjs_engine.db.backup-$(date +%Y%m%d-%H%M%S)

# Deploy latest code
cd ~/prebidjs-light
git pull origin master
cd apps/api && npm run build && pm2 restart pbjs-api
cd ../admin && npm run build

# Create super admin
cd ~/prebidjs-light/apps/api
npm run db:seed-admin

# View logs
pm2 logs pbjs-api

# Check status
pm2 status
curl http://localhost:3001/health
```
