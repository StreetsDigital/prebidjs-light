# Database Management Guide

## Overview

pbjs_engine uses SQLite for data storage. This guide explains how database files are managed, deployed, and recovered.

## Database File Exclusion from Git

**⚠️ CRITICAL RULE**: Database files are **NEVER** tracked in git.

### Why?

- Database files contain production data (users, passwords, configurations)
- Committing database files would overwrite production data during deployments
- Credentials would be lost when `git pull` is executed on the server
- Sensitive information should never be in version control

### What's Excluded?

The following patterns are excluded in `.gitignore`:

```gitignore
apps/api/data/*.db           # SQLite database files
apps/api/data/*.db-shm       # Shared memory files
apps/api/data/*.db-wal       # Write-ahead log files
apps/api/data/*.backup*      # Backup files
apps/api/data/*.old*         # Old database files
```

### What's Included?

Only the directory structure is tracked:

```gitignore
!apps/api/data/.gitkeep      # Preserves directory in git
```

## Super Admin Management

### Creating Super Admin

The super admin user can be created using the seed script:

```bash
cd apps/api
npm run db:seed-admin
```

**What it does:**
- Checks if super admin already exists (idempotent)
- Creates super admin if not found
- Uses credentials from environment variables or defaults
- Outputs the email and password

### Environment Variables

Configure super admin credentials in `.env`:

```env
SUPER_ADMIN_EMAIL=admin@thenexusengine.com
SUPER_ADMIN_PASSWORD=SecurePassword123!
SUPER_ADMIN_NAME=Super Admin
```

**Security Note**: Use strong, unique passwords in production. Change the default password immediately after first login.

### Auto-Seeding (Optional)

Enable automatic super admin creation on first run:

```env
AUTO_SEED_ADMIN=true
```

When enabled, the system will automatically create a super admin if no users exist.

## Database Initialization

The database is initialized when the API server starts:

1. **Creates data directory** if it doesn't exist
2. **Creates database file** if it doesn't exist
3. **Creates tables** via SQL schema in `apps/api/src/db/index.ts`
4. **Runs migrations** to update existing databases
5. **Auto-seeds admin** (if enabled and no users exist)

## Migrations

The migration system tracks schema changes:

- Migrations are defined in `apps/api/src/db/index.ts`
- Each migration has a unique name
- Applied migrations are tracked in the `migrations` table
- Migrations are idempotent (safe to run multiple times)

### Adding a Migration

1. Add migration to the `migrations` array in `apps/api/src/db/index.ts`:

```typescript
{
  name: 'my_new_migration',
  sql: `
    CREATE TABLE IF NOT EXISTS my_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `,
  postSql: `
    CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);
  `
}
```

2. Migrations run automatically when the server starts

## Database Location

**Default**: `apps/api/data/pbjs_engine.db`

**Override via environment**:
```env
DATABASE_PATH=/custom/path/to/database.db
```

## Backup Strategies

### Manual Backup

Before deployments or major changes:

```bash
cd apps/api/data
cp pbjs_engine.db pbjs_engine.db.backup-$(date +%Y%m%d-%H%M%S)
```

### Automated Backups

Set up cron job for regular backups:

```bash
# Edit crontab
crontab -e

# Backup every 6 hours
0 */6 * * * cd /home/ubuntu/prebidjs-light/apps/api/data && cp pbjs_engine.db pbjs_engine.db.backup-$(date +\%Y\%m\%d-\%H\%M\%S)

# Clean up backups older than 7 days
0 1 * * * find /home/ubuntu/prebidjs-light/apps/api/data -name "*.backup-*" -mtime +7 -delete
```

### Backup Verification

Check backups exist:

```bash
ls -lh apps/api/data/*.backup-*
```

### Restoring from Backup

```bash
cd apps/api/data
cp pbjs_engine.db.backup-<timestamp> pbjs_engine.db
pm2 restart pbjs-api
```

## Database Operations

### Viewing Data

```bash
cd apps/api/data
sqlite3 pbjs_engine.db

# List tables
.tables

# Show schema
.schema users

# Query data
SELECT * FROM users;

# Exit
.quit
```

### Database Statistics

```bash
# File size
ls -lh apps/api/data/pbjs_engine.db

# Table counts
sqlite3 pbjs_engine.db "SELECT COUNT(*) FROM users;"
sqlite3 pbjs_engine.db "SELECT COUNT(*) FROM publishers;"
```

### Checking Database Integrity

```bash
sqlite3 pbjs_engine.db "PRAGMA integrity_check;"
```

## Deployment Workflow

### First Deployment

1. Pull code
2. Install dependencies
3. **Database is created automatically** on first API start
4. Run seed script to create super admin
5. Start services

### Subsequent Deployments

1. **Backup database** (critical!)
2. Pull code (database files not affected)
3. Rebuild application
4. Restart services
5. Verify database still has data

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed steps.**

## Recovery Scenarios

### Lost Super Admin Password

**Solution 1**: Run seed script
```bash
cd apps/api
npm run db:seed-admin
```

This creates a new super admin if one doesn't exist.

**Solution 2**: Restore from backup
```bash
cd apps/api/data
cp pbjs_engine.db.backup-<recent-timestamp> pbjs_engine.db
pm2 restart pbjs-api
```

### Database Corruption

**Solution**: Restore from backup
```bash
cd apps/api/data
cp pbjs_engine.db.backup-<recent-timestamp> pbjs_engine.db
pm2 restart pbjs-api

# Verify integrity
sqlite3 pbjs_engine.db "PRAGMA integrity_check;"
```

### Database Accidentally Deleted

**Solution**: Restore from backup or start fresh
```bash
# Option 1: Restore from backup
cp pbjs_engine.db.backup-<timestamp> pbjs_engine.db

# Option 2: Start fresh (will auto-create on API start)
cd apps/api
npm run start  # Database created automatically
npm run db:seed-admin  # Create super admin
```

### Database Overwritten by Git Pull

**This should never happen** because database files are in `.gitignore`.

If it does happen:
1. Database files should not be in git - check `.gitignore`
2. Run `git rm --cached apps/api/data/*.db` to untrack
3. Restore from backup

## Security Best Practices

1. **Never commit database files** to git
2. **Use strong passwords** for super admin
3. **Secure .env files** - ensure they're in `.gitignore`
4. **Regular backups** - automate with cron
5. **Test backups** - verify they can be restored
6. **Limit access** - restrict SSH access to server
7. **Monitor logs** - check for unauthorized access attempts

## Troubleshooting

### Database locked error

**Cause**: SQLite allows only one writer at a time

**Solution**:
- Check for long-running queries
- Ensure WAL mode is enabled (it is by default)
- Restart API server if needed

### Cannot create database

**Cause**: Permission issues or disk full

**Solution**:
```bash
# Check permissions
ls -ld apps/api/data

# Check disk space
df -h

# Fix permissions
chmod 755 apps/api/data
```

### Migration failed

**Cause**: SQL error in migration script

**Solution**:
1. Check API logs for error details
2. Fix migration SQL
3. Remove migration record: `DELETE FROM migrations WHERE name='failed_migration_name';`
4. Restart API to retry

## Development vs Production

### Development
- Database: `apps/api/data/pbjs_engine.db` (local)
- Auto-seed: Can be enabled for convenience
- Backups: Optional (git history provides rollback)

### Production
- Database: `/home/ubuntu/prebidjs-light/apps/api/data/pbjs_engine.db`
- Auto-seed: Should be disabled
- Backups: **MANDATORY** (automated with cron)
- .env: Contains production credentials (never committed)

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [CLAUDE.md](../CLAUDE.md) - Development guidelines
- API schema: `apps/api/src/db/schema.ts`
- Database initialization: `apps/api/src/db/index.ts`
