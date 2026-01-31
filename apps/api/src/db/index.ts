import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Database file location
const DB_PATH: string = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'pbjs_engine.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const sqlite: any = new Database(DB_PATH);

// Enable foreign keys
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export schema for use in other files
export * from './schema';

// Initialize database tables
export function initializeDatabase() {
  console.log('Initializing database...');

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

    CREATE TABLE IF NOT EXISTS ab_tests (
      id TEXT PRIMARY KEY,
      publisher_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'running', 'paused', 'completed')),
      start_date TEXT,
      end_date TEXT,
      parent_test_id TEXT,
      parent_variant_id TEXT,
      level INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ab_test_variants (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      name TEXT NOT NULL,
      traffic_percent INTEGER NOT NULL DEFAULT 50,
      is_control INTEGER NOT NULL DEFAULT 0,
      bidder_timeout INTEGER,
      price_granularity TEXT,
      enable_send_all_bids INTEGER,
      bidder_sequence TEXT,
      floors_config TEXT,
      bidder_overrides TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
    CREATE INDEX IF NOT EXISTS idx_ab_tests_publisher ON ab_tests(publisher_id);
    CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
    CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test ON ab_test_variants(test_id);
  `);

  // Run migrations for existing databases
  runMigrations();

  // Check if this is first run (no users exist)
  const userCount = db.select().from(schema.users).all().length;

  if (userCount === 0 && process.env.AUTO_SEED_ADMIN === 'true') {
    console.log('No users found, auto-seeding super admin...');
    import('./seed-admin').then(({ seedSuperAdmin }) => {
      seedSuperAdmin().catch(console.error);
    });
  }

  console.log('Database initialized');
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
    },
    {
      name: 'add_soft_delete_to_publishers',
      sql: `-- Add soft delete support to publishers`,
      columnCheck: {
        table: 'publishers',
        column: 'deleted_at',
        addSql: 'ALTER TABLE publishers ADD COLUMN deleted_at TEXT;'
      },
      postSql: `
        CREATE INDEX IF NOT EXISTS idx_publishers_deleted_at ON publishers(deleted_at);
      `
    },
    {
      name: 'add_ab_testing_tables',
      sql: `
        CREATE TABLE IF NOT EXISTS ab_tests (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'running', 'paused', 'completed')),
          start_date TEXT,
          end_date TEXT,
          parent_test_id TEXT,
          parent_variant_id TEXT,
          level INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ab_test_variants (
          id TEXT PRIMARY KEY,
          test_id TEXT NOT NULL,
          name TEXT NOT NULL,
          traffic_percent INTEGER NOT NULL DEFAULT 50,
          is_control INTEGER NOT NULL DEFAULT 0,
          bidder_timeout INTEGER,
          price_granularity TEXT,
          enable_send_all_bids INTEGER,
          bidder_sequence TEXT,
          floors_config TEXT,
          bidder_overrides TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `,
      postSql: `
        CREATE INDEX IF NOT EXISTS idx_ab_tests_publisher ON ab_tests(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
        CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test ON ab_test_variants(test_id);
      `
    },
    {
      name: 'add_additional_bidders_to_variants',
      sql: `-- Add additional_bidders column for A/B testing new bidders`,
      columnCheck: {
        table: 'ab_test_variants',
        column: 'additional_bidders',
        addSql: 'ALTER TABLE ab_test_variants ADD COLUMN additional_bidders TEXT;'
      }
    },
    {
      name: 'add_nested_ab_test_support',
      sql: `-- Add nested A/B test support`,
      columnCheck: {
        table: 'ab_tests',
        column: 'parent_test_id',
        addSql: `
          ALTER TABLE ab_tests ADD COLUMN parent_test_id TEXT;
          ALTER TABLE ab_tests ADD COLUMN parent_variant_id TEXT;
          ALTER TABLE ab_tests ADD COLUMN level INTEGER NOT NULL DEFAULT 0;
        `
      },
      postSql: `
        CREATE INDEX IF NOT EXISTS idx_ab_tests_parent ON ab_tests(parent_test_id);
        CREATE INDEX IF NOT EXISTS idx_ab_tests_level ON ab_tests(level);
      `
    },
    {
      name: 'add_optimization_rules',
      sql: `
        -- Optimization Rules table
        CREATE TABLE IF NOT EXISTS optimization_rules (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          rule_type TEXT NOT NULL CHECK(rule_type IN ('auto_disable_bidder', 'auto_adjust_timeout', 'auto_adjust_floor', 'auto_enable_bidder', 'alert_notification', 'traffic_allocation')),
          conditions TEXT NOT NULL,
          actions TEXT NOT NULL,
          schedule TEXT,
          enabled INTEGER NOT NULL DEFAULT 1,
          priority INTEGER NOT NULL DEFAULT 0,
          last_executed TEXT,
          execution_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Rule Executions history table
        CREATE TABLE IF NOT EXISTS rule_executions (
          id TEXT PRIMARY KEY,
          rule_id TEXT NOT NULL,
          publisher_id TEXT NOT NULL,
          conditions_met TEXT NOT NULL,
          actions_performed TEXT NOT NULL,
          result TEXT NOT NULL CHECK(result IN ('success', 'failure', 'skipped')),
          error_message TEXT,
          metrics_snapshot TEXT,
          executed_at TEXT NOT NULL,
          FOREIGN KEY (rule_id) REFERENCES optimization_rules(id) ON DELETE CASCADE,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_optimization_rules_publisher ON optimization_rules(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_optimization_rules_enabled ON optimization_rules(enabled);
        CREATE INDEX IF NOT EXISTS idx_rule_executions_rule ON rule_executions(rule_id);
        CREATE INDEX IF NOT EXISTS idx_rule_executions_publisher ON rule_executions(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_rule_executions_executed_at ON rule_executions(executed_at);
      `
    },
    {
      name: 'add_auction_debug_events',
      sql: `
        -- Auction Debug Events table for live inspector
        CREATE TABLE IF NOT EXISTS auction_debug_events (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          auction_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          event_type TEXT NOT NULL CHECK(event_type IN ('auction_init', 'bid_requested', 'bid_response', 'bid_timeout', 'bid_won', 'bid_error', 'auction_end')),
          ad_unit_code TEXT,
          bidder_code TEXT,
          bid_request TEXT,
          bid_response TEXT,
          latency_ms INTEGER,
          cpm TEXT,
          currency TEXT,
          page_url TEXT,
          domain TEXT,
          device_type TEXT,
          user_agent TEXT,
          error_message TEXT,
          status_code INTEGER,
          metadata TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_auction_debug_publisher ON auction_debug_events(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_auction_debug_auction_id ON auction_debug_events(auction_id);
        CREATE INDEX IF NOT EXISTS idx_auction_debug_timestamp ON auction_debug_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_auction_debug_event_type ON auction_debug_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_auction_debug_bidder ON auction_debug_events(bidder_code);
      `
    },
    {
      name: 'add_notification_system',
      sql: `
        -- Notification Channels table
        CREATE TABLE IF NOT EXISTS notification_channels (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('email', 'slack', 'discord', 'teams', 'sms', 'webhook', 'pagerduty')),
          config TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          verified INTEGER NOT NULL DEFAULT 0,
          last_test_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Notification Rules table
        CREATE TABLE IF NOT EXISTS notification_rules (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          event_type TEXT NOT NULL CHECK(event_type IN ('revenue_drop', 'revenue_spike', 'fill_rate_drop', 'timeout_spike', 'error_spike', 'bidder_failure', 'cpm_drop', 'impression_drop', 'custom_metric')),
          conditions TEXT NOT NULL,
          channels TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'warning' CHECK(severity IN ('info', 'warning', 'critical')),
          cooldown_minutes INTEGER NOT NULL DEFAULT 60,
          enabled INTEGER NOT NULL DEFAULT 1,
          escalation_policy_id TEXT,
          last_triggered TEXT,
          trigger_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
          FOREIGN KEY (escalation_policy_id) REFERENCES escalation_policies(id) ON DELETE SET NULL
        );

        -- Notifications table (history)
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          rule_id TEXT,
          channel_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'acknowledged')),
          error_message TEXT,
          acknowledged_by TEXT,
          acknowledged_at TEXT,
          sent_at TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
          FOREIGN KEY (rule_id) REFERENCES notification_rules(id) ON DELETE SET NULL,
          FOREIGN KEY (channel_id) REFERENCES notification_channels(id) ON DELETE CASCADE
        );

        -- Escalation Policies table
        CREATE TABLE IF NOT EXISTS escalation_policies (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          levels TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_notification_channels_publisher ON notification_channels(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(type);
        CREATE INDEX IF NOT EXISTS idx_notification_rules_publisher ON notification_rules(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_notification_rules_enabled ON notification_rules(enabled);
        CREATE INDEX IF NOT EXISTS idx_notification_rules_event_type ON notification_rules(event_type);
        CREATE INDEX IF NOT EXISTS idx_notifications_publisher ON notifications(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_rule ON notifications(rule_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        CREATE INDEX IF NOT EXISTS idx_escalation_policies_publisher ON escalation_policies(publisher_id);
      `
    },
    {
      name: 'add_custom_reports',
      sql: `
        -- Custom Reports table
        CREATE TABLE IF NOT EXISTS custom_reports (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          metrics TEXT NOT NULL,
          dimensions TEXT NOT NULL,
          filters TEXT,
          date_range TEXT NOT NULL,
          visualization TEXT,
          schedule TEXT,
          export_format TEXT DEFAULT 'csv',
          is_template INTEGER NOT NULL DEFAULT 0,
          is_public INTEGER NOT NULL DEFAULT 0,
          created_by TEXT,
          last_run_at TEXT,
          run_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Report Executions table
        CREATE TABLE IF NOT EXISTS report_executions (
          id TEXT PRIMARY KEY,
          report_id TEXT NOT NULL,
          publisher_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
          started_at TEXT NOT NULL,
          completed_at TEXT,
          duration INTEGER,
          row_count INTEGER,
          output_path TEXT,
          output_format TEXT,
          error_message TEXT,
          triggered_by TEXT,
          parameters TEXT,
          FOREIGN KEY (report_id) REFERENCES custom_reports(id) ON DELETE CASCADE,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_custom_reports_publisher ON custom_reports(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_custom_reports_template ON custom_reports(is_template);
        CREATE INDEX IF NOT EXISTS idx_report_executions_report ON report_executions(report_id);
        CREATE INDEX IF NOT EXISTS idx_report_executions_publisher ON report_executions(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);
        CREATE INDEX IF NOT EXISTS idx_report_executions_started_at ON report_executions(started_at);
      `
    },
    {
      name: 'add_yield_recommendations',
      sql: `
        -- Yield Recommendations table
        CREATE TABLE IF NOT EXISTS yield_recommendations (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('disable_bidder', 'adjust_timeout', 'adjust_floor_price', 'add_bidder', 'enable_bidder', 'run_ab_test', 'optimize_ad_unit', 'adjust_traffic_allocation')),
          priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          data_snapshot TEXT NOT NULL,
          estimated_impact TEXT,
          target_entity TEXT,
          recommended_action TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'implemented', 'dismissed', 'expired')),
          implemented_at TEXT,
          implemented_by TEXT,
          dismissed_at TEXT,
          dismissed_by TEXT,
          dismiss_reason TEXT,
          actual_impact TEXT,
          measurement_period TEXT,
          confidence TEXT NOT NULL DEFAULT 'medium',
          expires_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_yield_recommendations_publisher ON yield_recommendations(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_yield_recommendations_status ON yield_recommendations(status);
        CREATE INDEX IF NOT EXISTS idx_yield_recommendations_priority ON yield_recommendations(priority);
        CREATE INDEX IF NOT EXISTS idx_yield_recommendations_type ON yield_recommendations(type);
        CREATE INDEX IF NOT EXISTS idx_yield_recommendations_created_at ON yield_recommendations(created_at);
      `
    },
    {
      name: 'add_impersonation_sessions',
      sql: `
        -- Impersonation Sessions table for tracking super admin impersonation
        CREATE TABLE IF NOT EXISTS impersonation_sessions (
          id TEXT PRIMARY KEY,
          super_admin_id TEXT NOT NULL,
          impersonated_user_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          ip_address TEXT,
          user_agent TEXT,
          FOREIGN KEY (super_admin_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (impersonated_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_super_admin ON impersonation_sessions(super_admin_id);
        CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_impersonated_user ON impersonation_sessions(impersonated_user_id);
        CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_started_at ON impersonation_sessions(started_at);
      `
    },
    {
      name: 'add_wrapper_configs_and_targeting',
      sql: `
        -- Wrapper Configs table - Named wrapper configurations for traffic targeting
        CREATE TABLE IF NOT EXISTS wrapper_configs (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'paused', 'archived')),

          -- Complete wrapper config
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

          -- Config-specific bidders and ad units
          bidders TEXT,
          ad_units TEXT,

          -- Versioning and analytics
          version INTEGER DEFAULT 1,
          is_default INTEGER DEFAULT 0,
          impressions_served INTEGER DEFAULT 0,
          last_served_at TEXT,

          -- Audit
          created_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,

          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        );

        -- Config Targeting Rules table
        CREATE TABLE IF NOT EXISTS config_targeting_rules (
          id TEXT PRIMARY KEY,
          config_id TEXT NOT NULL,
          publisher_id TEXT NOT NULL,
          conditions TEXT NOT NULL,
          match_type TEXT NOT NULL DEFAULT 'all' CHECK(match_type IN ('all', 'any')),
          priority INTEGER NOT NULL DEFAULT 0,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,

          FOREIGN KEY (config_id) REFERENCES wrapper_configs(id) ON DELETE CASCADE,
          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
        );

        -- Config Serve Log table - Analytics tracking
        CREATE TABLE IF NOT EXISTS config_serve_log (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          config_id TEXT,
          geo TEXT,
          device TEXT,
          browser TEXT,
          os TEXT,
          domain TEXT,
          matched_rule_id TEXT,
          all_matching_rule_ids TEXT,
          session_id TEXT,
          timestamp TEXT NOT NULL,

          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
          FOREIGN KEY (config_id) REFERENCES wrapper_configs(id) ON DELETE SET NULL,
          FOREIGN KEY (matched_rule_id) REFERENCES config_targeting_rules(id) ON DELETE SET NULL
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_wrapper_configs_publisher ON wrapper_configs(publisher_id, status);
        CREATE INDEX IF NOT EXISTS idx_wrapper_configs_default ON wrapper_configs(publisher_id, is_default);
        CREATE INDEX IF NOT EXISTS idx_targeting_rules_config ON config_targeting_rules(config_id, enabled);
        CREATE INDEX IF NOT EXISTS idx_targeting_rules_priority ON config_targeting_rules(priority DESC);
        CREATE INDEX IF NOT EXISTS idx_serve_log_publisher ON config_serve_log(publisher_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_serve_log_config ON config_serve_log(config_id, timestamp);
      `
    },
    {
      name: 'add_publisher_custom_bidders',
      sql: `
        -- Publisher Custom Bidders table - Per-publisher custom bidder management
        CREATE TABLE IF NOT EXISTS publisher_custom_bidders (
          id TEXT PRIMARY KEY,
          publisher_id TEXT NOT NULL,
          bidder_code TEXT NOT NULL,
          bidder_name TEXT NOT NULL,
          is_client_side INTEGER NOT NULL DEFAULT 1,
          is_server_side INTEGER NOT NULL DEFAULT 0,
          description TEXT,
          documentation_url TEXT,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,

          FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
          UNIQUE (publisher_id, bidder_code)
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_custom_bidders_publisher ON publisher_custom_bidders(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_custom_bidders_enabled ON publisher_custom_bidders(enabled);
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
