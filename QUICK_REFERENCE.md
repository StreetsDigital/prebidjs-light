# Quick Reference Card

## Common Commands

### Development

```bash
# Start API server
cd apps/api && npm run dev

# Start admin UI
cd apps/admin && npm run dev

# Create super admin
cd apps/api && npm run db:seed-admin
```

### Database

```bash
# View database
cd apps/api/data
sqlite3 pbjs_engine.db
.tables
SELECT * FROM users;
.quit

# Backup database
cp apps/api/data/pbjs_engine.db apps/api/data/pbjs_engine.db.backup-$(date +%Y%m%d-%H%M%S)

# Check super admin
sqlite3 apps/api/data/pbjs_engine.db "SELECT email, role FROM users WHERE role='super_admin';"
```

### Deployment (Production)

```bash
# 1. SSH to server
ssh -i ~/downloads/tne_key.pem ubuntu@63.32.100.39

# 2. Backup database
cd ~/prebidjs-light/apps/api/data
cp pbjs_engine.db pbjs_engine.db.backup-$(date +%Y%m%d-%H%M%S)

# 3. Pull latest code
cd ~/prebidjs-light
git pull origin master

# 4. Install dependencies (if needed)
cd apps/api && npm install
cd ../admin && npm install

# 5. Rebuild
cd apps/api && npm run build
cd ../admin && npm run build

# 6. Restart
pm2 restart pbjs-api

# 7. Verify
pm2 logs pbjs-api --lines 20
curl http://localhost:3001/health
```

### Recovery

```bash
# Restore from backup
cd ~/prebidjs-light/apps/api/data
cp pbjs_engine.db.backup-<timestamp> pbjs_engine.db
pm2 restart pbjs-api

# Recreate super admin
cd ~/prebidjs-light/apps/api
npm run db:seed-admin

# Check if database exists
ls -lh ~/prebidjs-light/apps/api/data/pbjs_engine.db
```

### PM2 Management

```bash
# Check status
pm2 status

# View logs
pm2 logs pbjs-api
pm2 logs pbjs-api --lines 50

# Restart
pm2 restart pbjs-api

# Stop
pm2 stop pbjs-api

# Start
pm2 start pbjs-api
```

## URLs

| Environment | Admin UI | API |
|------------|----------|-----|
| Local | http://localhost:5173 | http://localhost:3001 |
| Production | https://app.thenexusengine.com | https://api.thenexusengine.com |

## Default Credentials

**Email**: admin@thenexusengine.com
**Password**: (from .env or default: ChangeMe123!)

⚠️ Change password after first login!

## File Locations

| Item | Path |
|------|------|
| Database | `apps/api/data/pbjs_engine.db` |
| API .env | `apps/api/.env` |
| Admin .env | `apps/admin/.env` |
| API source | `apps/api/src/` |
| Admin source | `apps/admin/src/` |

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Development guidelines |
| [README.md](./README.md) | Project overview |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Deployment procedures |
| [docs/DATABASE_MANAGEMENT.md](./docs/DATABASE_MANAGEMENT.md) | Database guide |
| [docs/IMMEDIATE_RECOVERY.md](./docs/IMMEDIATE_RECOVERY.md) | Emergency recovery |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't login | Run `npm run db:seed-admin` |
| Database missing | Check backups in `apps/api/data/*.backup-*` |
| API won't start | Check logs: `pm2 logs pbjs-api` |
| Build errors | Run `npm install` in apps/api and apps/admin |
| Port in use | Check if API already running: `pm2 status` |

## Environment Variables

### API (.env in apps/api/)

```env
NODE_ENV=production
API_PORT=3001
JWT_SECRET=<secure-secret>
COOKIE_SECRET=<secure-secret>
SUPER_ADMIN_EMAIL=admin@thenexusengine.com
SUPER_ADMIN_PASSWORD=<secure-password>
DATABASE_PATH=./data/pbjs_engine.db
CORS_ORIGINS=https://app.thenexusengine.com
```

### Admin (.env in apps/admin/)

```env
VITE_API_URL=https://api.thenexusengine.com
```

## Git Workflow

```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: description"

# Push
git push origin master

# Pull
git pull origin master
```

## Safety Checklist

Before deployment:
- ✅ Backup database
- ✅ Verify backups exist
- ✅ Check git status
- ✅ Review changes
- ✅ Test locally first

After deployment:
- ✅ Check PM2 status
- ✅ Check API logs
- ✅ Test health endpoint
- ✅ Test login
- ✅ Verify database intact

## Emergency Contacts

- Server IP: 63.32.100.39
- SSH Key: ~/downloads/tne_key.pem
- PM2 Config: ~/prebidjs-light/ecosystem.config.js (if exists)

## Automated Backup Setup

```bash
# Edit crontab
crontab -e

# Add these lines:
0 */6 * * * cd /home/ubuntu/prebidjs-light/apps/api/data && cp pbjs_engine.db pbjs_engine.db.backup-$(date +\%Y\%m\%d-\%H\%M\%S)
0 1 * * * find /home/ubuntu/prebidjs-light/apps/api/data -name "*.backup-*" -mtime +7 -delete
```
