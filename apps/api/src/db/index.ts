import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Database file location
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'pbjs_engine.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const sqlite = new Database(DB_PATH);

// Enable foreign keys
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export schema for use in other files
export * from './schema';

// Initialize database tables
export function initializeDatabase() {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'publisher' CHECK(role IN ('super_admin', 'admin', 'publisher')),
      publisher_id TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS publishers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      api_key TEXT NOT NULL UNIQUE,
      domains TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'disabled')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS publisher_admins (
      publisher_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (publisher_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS websites (
      id TEXT PRIMARY KEY,
      publisher_id TEXT NOT NULL,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'disabled')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ad_units (
      id TEXT PRIMARY KEY,
      publisher_id TEXT NOT NULL,
      website_id TEXT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      media_types TEXT,
      floor_price TEXT,
      targeting TEXT,
      size_mapping TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publisher_bidders (
      id TEXT PRIMARY KEY,
      publisher_id TEXT NOT NULL,
      bidder_code TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      params TEXT,
      timeout_override INTEGER,
      priority INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publisher_config (
      id TEXT PRIMARY KEY,
      publisher_id TEXT NOT NULL UNIQUE,
      bidder_timeout INTEGER DEFAULT 1500,
      price_granularity TEXT DEFAULT 'medium',
      custom_price_bucket TEXT,
      enable_send_all_bids INTEGER DEFAULT 1,
      bidder_sequence TEXT DEFAULT 'random',
      user_sync TEXT,
      targeting_controls TEXT,
      currency_config TEXT,
      consent_management TEXT,
      floors_config TEXT,
      user_id_modules TEXT,
      video_config TEXT,
      s2s_config TEXT,
      debug_mode INTEGER DEFAULT 0,
      custom_config TEXT,
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config_versions (
      id TEXT PRIMARY KEY,
      publisher_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      config_snapshot TEXT NOT NULL,
      changed_by TEXT,
      change_summary TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prebid_modules (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('bidder', 'userId', 'analytics', 'rtd', 'other')),
      description TEXT,
      params_schema TEXT,
      documentation_url TEXT,
      maintainer TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publisher_builds (
      id TEXT PRIMARY KEY,
      publisher_id TEXT NOT NULL,
      config_hash TEXT NOT NULL,
      prebid_version TEXT,
      modules_included TEXT,
      build_path TEXT,
      file_size INTEGER,
      status TEXT NOT NULL DEFAULT 'building' CHECK(status IN ('building', 'ready', 'failed')),
      created_at TEXT NOT NULL,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      ip_address TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      report_type TEXT NOT NULL DEFAULT 'all' CHECK(report_type IN ('revenue', 'latency', 'fill_rate', 'all')),
      schedule TEXT NOT NULL DEFAULT 'daily' CHECK(schedule IN ('daily', 'weekly', 'monthly')),
      recipients TEXT NOT NULL,
      publisher_id TEXT,
      date_range TEXT NOT NULL DEFAULT 'last_7_days' CHECK(date_range IN ('last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'last_month')),
      format TEXT NOT NULL DEFAULT 'csv' CHECK(format IN ('csv', 'json', 'pdf')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused')),
      last_sent_at TEXT,
      next_send_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      publisher_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      auction_id TEXT,
      ad_unit_code TEXT,
      bidder_code TEXT,
      cpm TEXT,
      currency TEXT DEFAULT 'USD',
      latency_ms INTEGER,
      timeout INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      rendered INTEGER DEFAULT 0,
      page_url TEXT,
      domain TEXT,
      device_type TEXT,
      country TEXT,
      timestamp TEXT NOT NULL,
      received_at TEXT NOT NULL
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_publishers_slug ON publishers(slug);
    CREATE INDEX IF NOT EXISTS idx_publishers_api_key ON publishers(api_key);
    CREATE INDEX IF NOT EXISTS idx_ad_units_publisher ON ad_units(publisher_id);
    CREATE INDEX IF NOT EXISTS idx_publisher_bidders_publisher ON publisher_bidders(publisher_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_reports_status ON scheduled_reports(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by ON scheduled_reports(created_by);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_publisher ON analytics_events(publisher_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
  `);

  // Run migrations for existing databases
  runMigrations();
}

// Migration system for schema updates
function runMigrations() {
  // Create migrations table if not exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  // Define migrations
  const migrations = [
    {
      name: 'add_websites_and_website_id',
      sql: `
        -- Create websites table if not exists
        CREATE TABLE IF NOT EXISTS websites (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          name TEXT NOT NULL,
          domain TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'disabled')),
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- Add website_id column to ad_units if it doesn't exist
        -- SQLite doesn't support IF NOT EXISTS for columns, so we check pragmatically
      `,
      columnCheck: {
        table: 'ad_units',
        column: 'website_id',
        addSql: 'ALTER TABLE ad_units ADD COLUMN website_id TEXT;'
      },
      postSql: `
        CREATE INDEX IF NOT EXISTS idx_websites_publisher ON websites(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_ad_units_website ON ad_units(website_id);
      `
    }
  ];

  // Run each migration if not already applied
  for (const migration of migrations) {
    const applied = sqlite.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migration.name);
    if (!applied) {
      try {
        // Run main SQL
        sqlite.exec(migration.sql);

        // Handle column additions (SQLite doesn't support IF NOT EXISTS for columns)
        if (migration.columnCheck) {
          const { table, column, addSql } = migration.columnCheck;
          const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
          const hasColumn = columns.some((col) => col.name === column);
          if (!hasColumn) {
            sqlite.exec(addSql);
          }
        }

        // Run post-migration SQL (like index creation)
        if ((migration as any).postSql) {
          sqlite.exec((migration as any).postSql);
        }

        // Mark migration as applied
        sqlite.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run(
          migration.name,
          new Date().toISOString()
        );
        console.log(`Migration applied: ${migration.name}`);
      } catch (err) {
        console.error(`Migration failed: ${migration.name}`, err);
        throw err;
      }
    }
  }
}

// Export raw sqlite for direct queries if needed
export { sqlite };
