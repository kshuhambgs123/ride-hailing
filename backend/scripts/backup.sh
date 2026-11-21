#!/bin/sh

# Volo DB Backup Script
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/volo_db_$TIMESTAMP.sql"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Perform dump
echo "Starting database backup at $TIMESTAMP..."
pg_dump -h db -U postgres blablaride > $BACKUP_FILE

# Keep only the last 7 days of backups
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
