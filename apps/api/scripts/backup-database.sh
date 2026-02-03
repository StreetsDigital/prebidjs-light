#!/bin/bash

###############################################################################
# Database Backup Script for pbjs_engine
#
# This script creates timestamped backups of the SQLite database and maintains
# the last 7 daily backups. It can be run manually or scheduled via cron.
#
# Usage:
#   ./backup-database.sh
#
# Cron example (daily at 2am):
#   0 2 * * * /path/to/pbjs_engine/apps/api/scripts/backup-database.sh >> /var/log/pbjs-backup.log 2>&1
###############################################################################

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"
DB_DIR="$API_DIR/data"
DB_FILE="$DB_DIR/pbjs_engine.db"
BACKUP_DIR="$DB_DIR/backups"
RETENTION_DAYS=7

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    log_error "Database file not found: $DB_FILE"
    exit 1
fi

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Generate timestamp for backup file
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/pbjs_engine_${TIMESTAMP}.db"

# Perform backup using SQLite's .backup command for consistency
log_info "Starting database backup..."
log_info "Source: $DB_FILE"
log_info "Destination: $BACKUP_FILE"

# Use sqlite3 .backup command for online backup (doesn't lock the database)
if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

    if [ $? -eq 0 ]; then
        # Get file size
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_info "Backup completed successfully (Size: $BACKUP_SIZE)"
    else
        log_error "Backup failed"
        exit 1
    fi
else
    # Fallback to simple copy if sqlite3 command not available
    log_warn "sqlite3 command not found, using cp instead"
    log_warn "Note: This may cause inconsistencies if database is being written to"
    cp "$DB_FILE" "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_info "Backup completed successfully (Size: $BACKUP_SIZE)"
    else
        log_error "Backup failed"
        exit 1
    fi
fi

# Compress backup to save space
log_info "Compressing backup..."
gzip "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    log_info "Backup compressed successfully (Compressed size: $COMPRESSED_SIZE)"
else
    log_warn "Compression failed, keeping uncompressed backup"
fi

# Clean up old backups (keep last RETENTION_DAYS days)
log_info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

# Count backups before cleanup
BACKUP_COUNT_BEFORE=$(find "$BACKUP_DIR" -name "pbjs_engine_*.db.gz" -o -name "pbjs_engine_*.db" | wc -l | tr -d ' ')

# Delete backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "pbjs_engine_*.db.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "pbjs_engine_*.db" -mtime +$RETENTION_DAYS -delete

# Count backups after cleanup
BACKUP_COUNT_AFTER=$(find "$BACKUP_DIR" -name "pbjs_engine_*.db.gz" -o -name "pbjs_engine_*.db" | wc -l | tr -d ' ')

DELETED_COUNT=$((BACKUP_COUNT_BEFORE - BACKUP_COUNT_AFTER))
if [ $DELETED_COUNT -gt 0 ]; then
    log_info "Deleted $DELETED_COUNT old backup(s)"
fi

# List current backups
log_info "Current backups ($BACKUP_COUNT_AFTER):"
ls -lh "$BACKUP_DIR"/pbjs_engine_*.db* 2>/dev/null | awk '{print $9, "-", $5}' || log_info "No backups found"

log_info "Backup process completed successfully"

# Print backup statistics
echo ""
echo "═══════════════════════════════════════════════════════"
echo "Backup Summary"
echo "═══════════════════════════════════════════════════════"
echo "Backup Location: $BACKUP_DIR"
echo "Total Backups: $BACKUP_COUNT_AFTER"
echo "Retention: $RETENTION_DAYS days"
echo "Latest Backup: $(basename "${BACKUP_FILE}.gz")"
echo "═══════════════════════════════════════════════════════"

exit 0
