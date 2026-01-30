# Immediate Recovery Steps

## Problem

The production database (and super_admin credentials) will be overwritten when `git pull` is executed because the database file was tracked in git.

## Solution Implemented

1. ✅ Database files excluded from git (`.gitignore` updated)
2. ✅ Database files removed from git tracking
3. ✅ Super admin seed script created (`db:seed-admin`)
4. ✅ Environment-based configuration added
5. ✅ Deployment procedures documented

## Next Steps on Production Server

SSH to the server and execute these commands:

```bash
# 1. SSH to server
ssh -i ~/downloads/tne_key.pem ubuntu@63.32.100.39

# 2. Navigate to project
cd ~/prebidjs-light

# 3. BACKUP DATABASE FIRST (critical!)
cd apps/api/data
cp pbjs_engine.db pbjs_engine.db.backup-before-fix-$(date +%Y%m%d-%H%M%S)

# 4. Pull latest code (this will now be safe - database won't be overwritten)
cd ~/prebidjs-light
git pull origin master

# 5. Install dependencies (in case package.json changed)
cd apps/api
npm install

# 6. Rebuild API
npm run build

# 7. Recreate super admin (if needed)
npm run db:seed-admin

# 8. Restart API server
pm2 restart pbjs-api

# 9. Verify super admin exists
cd data
sqlite3 pbjs_engine.db "SELECT email, role FROM users WHERE role='super_admin';"

# 10. Test login at https://app.thenexusengine.com
# Email: admin@thenexusengine.com
# Password: (from .env or default: ChangeMe123!)
```

## Creating Production .env File

The seed script uses environment variables for super admin credentials. Create `.env` file:

```bash
cd ~/prebidjs-light/apps/api

# Create .env file (or edit if it exists)
nano .env
```

Add these contents (with secure password):

```env
NODE_ENV=production
API_PORT=3001

# Authentication
JWT_SECRET=<existing-or-new-secure-secret>
COOKIE_SECRET=<existing-or-new-secure-secret>

# Super Admin Credentials
SUPER_ADMIN_EMAIL=admin@thenexusengine.com
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
SUPER_ADMIN_NAME=Super Admin

# Database
DATABASE_PATH=/home/ubuntu/prebidjs-light/apps/api/data/pbjs_engine.db

# CORS
CORS_ORIGINS=https://app.thenexusengine.com,https://thenexusengine.com
```

Save and exit (Ctrl+X, Y, Enter).

## Verification Steps

1. **Check database exists and has data:**
   ```bash
   cd ~/prebidjs-light/apps/api/data
   ls -lh pbjs_engine.db
   sqlite3 pbjs_engine.db "SELECT COUNT(*) FROM users;"
   sqlite3 pbjs_engine.db "SELECT COUNT(*) FROM publishers;"
   ```

2. **Check super admin:**
   ```bash
   sqlite3 pbjs_engine.db "SELECT email, role, name FROM users WHERE role='super_admin';"
   ```

3. **Check API is running:**
   ```bash
   pm2 status
   pm2 logs pbjs-api --lines 20
   curl http://localhost:3001/health
   ```

4. **Test login:**
   - Go to https://app.thenexusengine.com
   - Login with admin@thenexusengine.com
   - If it works, change password immediately via UI

## Setup Automated Backups (Recommended)

```bash
# Edit crontab
crontab -e

# Add these lines:
# Backup every 6 hours
0 */6 * * * cd /home/ubuntu/prebidjs-light/apps/api/data && cp pbjs_engine.db pbjs_engine.db.backup-$(date +\%Y\%m\%d-\%H\%M\%S)

# Clean up backups older than 7 days (keeps last ~28 backups)
0 1 * * * find /home/ubuntu/prebidjs-light/apps/api/data -name "*.backup-*" -mtime +7 -delete
```

Save and exit. Cron will now automatically backup the database.

## Future Deployments

From now on, deployments are safe:

```bash
# 1. Backup (still recommended as best practice)
cd ~/prebidjs-light/apps/api/data
cp pbjs_engine.db pbjs_engine.db.backup-$(date +%Y%m%d-%H%M%S)

# 2. Pull code (safe - won't overwrite database)
cd ~/prebidjs-light
git pull origin master

# 3. Rebuild and restart
cd apps/api
npm run build
pm2 restart pbjs-api

cd ../admin
npm run build
```

The database will **never** be overwritten by `git pull` because it's excluded from git tracking.

## What Changed?

### Files Modified
- `.gitignore` - Added database file exclusions
- `apps/api/package.json` - Added `db:seed-admin` script
- `apps/api/src/db/index.ts` - Added auto-seeding support (optional)

### Files Created
- `apps/api/.env.example` - Environment variable template
- `apps/api/src/db/seed-admin.ts` - Super admin seed script
- `apps/api/data/.gitkeep` - Preserves directory in git
- `docs/DEPLOYMENT.md` - Deployment procedures
- `docs/DATABASE_MANAGEMENT.md` - Database guide
- `docs/IMMEDIATE_RECOVERY.md` - This file

### Files Untracked from Git
- `apps/api/data/pbjs_engine.db`
- `apps/api/data/pbjs_engine.db-shm`
- `apps/api/data/pbjs_engine.db-wal`

These files still exist on disk but are no longer tracked by git.

## Rollback Plan

If something goes wrong, restore from backup:

```bash
cd ~/prebidjs-light/apps/api/data
cp pbjs_engine.db.backup-<timestamp> pbjs_engine.db
pm2 restart pbjs-api
```

## Questions?

See detailed documentation:
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [DATABASE_MANAGEMENT.md](./DATABASE_MANAGEMENT.md)
