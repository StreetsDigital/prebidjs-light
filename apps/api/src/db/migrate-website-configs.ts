/**
 * Migration Script: Add website_id and block_wrapper to wrapper_configs
 *
 * This script adds:
 * 1. website_id column (nullable) to support website-specific configs
 * 2. block_wrapper column (default false) to support geo-blocking
 */

import Database from 'better-sqlite3';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'apps/api/data/pbjs_engine.db');

function runMigration() {
  console.log('🚀 Starting wrapper_configs migration...\n');

  const db = new Database(DB_PATH);

  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // STEP 1: Add website_id column
    console.log('📊 Step 1: Adding website_id column...');
    db.exec(`
      ALTER TABLE wrapper_configs
      ADD COLUMN website_id TEXT;
    `);
    console.log('   ✅ website_id column added\n');

    // STEP 2: Add block_wrapper column
    console.log('🚫 Step 2: Adding block_wrapper column...');
    db.exec(`
      ALTER TABLE wrapper_configs
      ADD COLUMN block_wrapper INTEGER DEFAULT 0;
    `);
    console.log('   ✅ block_wrapper column added\n');

    // STEP 3: Create index for website_id lookups
    console.log('🔍 Step 3: Creating indexes...');
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_wrapper_configs_website ON wrapper_configs(website_id);
    `);
    console.log('   ✅ Indexes created\n');

    // STEP 4: Verify changes
    console.log('✅ Step 4: Verifying changes...');
    const columns = db.prepare(`
      PRAGMA table_info(wrapper_configs)
    `).all() as Array<{ name: string }>;

    const hasWebsiteId = columns.some(col => col.name === 'website_id');
    const hasBlockWrapper = columns.some(col => col.name === 'block_wrapper');

    if (!hasWebsiteId || !hasBlockWrapper) {
      throw new Error('Migration verification failed: columns not added');
    }
    console.log('   ✅ Migration verified\n');

    // Commit transaction
    db.exec('COMMIT');
    console.log('✅ Migration completed successfully!\n');

    // Print summary
    console.log('📋 SUMMARY:');
    console.log('   - Added website_id column (nullable)');
    console.log('   - Added block_wrapper column (default 0)');
    console.log('   - Created index on website_id\n');

    console.log('🎉 wrapper_configs table now supports website-level configs and blocking!\n');

  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    console.error('   Database has been rolled back to previous state\n');
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration if executed directly
if (require.main === module) {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  pbjs_engine - Wrapper Configs Migration             ║');
  console.log('║  Add website_id and block_wrapper columns            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('⚠️  This will modify the wrapper_configs table. Continue? (yes/no): ', (answer: string) => {
    if (answer.toLowerCase() === 'yes') {
      readline.close();
      runMigration();
    } else {
      console.log('Migration cancelled.');
      readline.close();
      process.exit(0);
    }
  });
}

export { runMigration };
