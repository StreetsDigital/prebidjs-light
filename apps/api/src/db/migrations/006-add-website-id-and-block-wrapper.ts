import { Database } from 'better-sqlite3';

export function up(db: Database) {
  console.log('Running migration 006: Add website_id and block_wrapper to wrapper_configs');

  // Add website_id column (nullable to support both publisher-level and website-specific configs)
  db.exec(`
    ALTER TABLE wrapper_configs
    ADD COLUMN website_id TEXT;
  `);

  // Add block_wrapper column (default false for existing configs)
  db.exec(`
    ALTER TABLE wrapper_configs
    ADD COLUMN block_wrapper INTEGER DEFAULT 0;
  `);

  // Create index for website_id lookups
  db.exec(`
    CREATE INDEX idx_wrapper_configs_website ON wrapper_configs(website_id);
  `);

  console.log('Migration 006 completed successfully');
}

export function down(db: Database) {
  console.log('Rolling back migration 006');

  // SQLite doesn't support DROP COLUMN directly
  // Would need to recreate table without these columns
  // For now, we'll keep the columns but could add rollback logic if needed

  console.log('Rollback not implemented - columns will remain');
}
