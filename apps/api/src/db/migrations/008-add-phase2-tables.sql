-- Phase 2 Database Migration
-- Creates tables for:
-- 1. Parameter Configuration (Feature 1)
-- 2. Enhanced Analytics (Feature 2)
-- 3. Prebid.js Build System (Feature 3)
-- 4. Templates & Bulk Operations (Feature 4)

-- ============================================================================
-- Feature 1: Parameter Configuration
-- ============================================================================

-- Component parameter schemas - stores parameter definitions from Prebid.org
CREATE TABLE IF NOT EXISTS component_parameters (
  id TEXT PRIMARY KEY,
  component_type TEXT NOT NULL CHECK(component_type IN ('bidder', 'module', 'analytics')),
  component_code TEXT NOT NULL,
  parameter_name TEXT NOT NULL,
  parameter_type TEXT NOT NULL CHECK(parameter_type IN ('string', 'number', 'boolean', 'object', 'array')),
  required INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  description TEXT,
  validation_pattern TEXT,
  min_value REAL,
  max_value REAL,
  enum_values TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(component_type, component_code, parameter_name)
);

CREATE INDEX IF NOT EXISTS idx_component_params_type_code ON component_parameters(component_type, component_code);

-- Component parameter values - stores user-configured parameter values
CREATE TABLE IF NOT EXISTS component_parameter_values (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL,
  component_type TEXT NOT NULL CHECK(component_type IN ('bidder', 'module', 'analytics')),
  component_code TEXT NOT NULL,
  website_id TEXT,
  ad_unit_id TEXT,
  parameter_name TEXT NOT NULL,
  parameter_value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  FOREIGN KEY (ad_unit_id) REFERENCES ad_units(id) ON DELETE CASCADE,
  UNIQUE(publisher_id, component_type, component_code, website_id, ad_unit_id, parameter_name)
);

CREATE INDEX IF NOT EXISTS idx_param_values_publisher ON component_parameter_values(publisher_id);
CREATE INDEX IF NOT EXISTS idx_param_values_component ON component_parameter_values(component_type, component_code);
CREATE INDEX IF NOT EXISTS idx_param_values_website ON component_parameter_values(website_id);
CREATE INDEX IF NOT EXISTS idx_param_values_ad_unit ON component_parameter_values(ad_unit_id);

-- ============================================================================
-- Feature 2: Enhanced Analytics
-- ============================================================================

-- Bidder metrics - time-series performance data
CREATE TABLE IF NOT EXISTS bidder_metrics (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL,
  bidder_code TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  metric_hour INTEGER CHECK(metric_hour IS NULL OR (metric_hour >= 0 AND metric_hour <= 23)),
  impressions INTEGER NOT NULL DEFAULT 0,
  bids INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  avg_cpm REAL NOT NULL DEFAULT 0,
  avg_latency REAL NOT NULL DEFAULT 0,
  p95_latency REAL,
  p99_latency REAL,
  timeout_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  fill_rate REAL,
  win_rate REAL,
  country_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
  UNIQUE(publisher_id, bidder_code, metric_date, metric_hour, country_code)
);

CREATE INDEX IF NOT EXISTS idx_bidder_metrics_publisher ON bidder_metrics(publisher_id);
CREATE INDEX IF NOT EXISTS idx_bidder_metrics_date ON bidder_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_bidder_metrics_bidder ON bidder_metrics(bidder_code);
CREATE INDEX IF NOT EXISTS idx_bidder_metrics_country ON bidder_metrics(country_code);
CREATE INDEX IF NOT EXISTS idx_bidder_metrics_publisher_date ON bidder_metrics(publisher_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_bidder_metrics_publisher_bidder ON bidder_metrics(publisher_id, bidder_code);

-- ============================================================================
-- Feature 3: Prebid.js Build System
-- ============================================================================

-- Prebid builds - custom build tracking
CREATE TABLE IF NOT EXISTS prebid_builds (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL,
  version TEXT NOT NULL,
  build_status TEXT NOT NULL CHECK(build_status IN ('pending', 'building', 'success', 'failed')) DEFAULT 'pending',
  cdn_url TEXT,
  file_size INTEGER,
  components_hash TEXT,
  bidders_included TEXT,
  modules_included TEXT,
  analytics_included TEXT,
  error_message TEXT,
  build_duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  activated_at TEXT,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prebid_builds_publisher ON prebid_builds(publisher_id);
CREATE INDEX IF NOT EXISTS idx_prebid_builds_status ON prebid_builds(build_status);
CREATE INDEX IF NOT EXISTS idx_prebid_builds_active ON prebid_builds(publisher_id, is_active);
CREATE INDEX IF NOT EXISTS idx_prebid_builds_created ON prebid_builds(created_at DESC);

-- ============================================================================
-- Feature 4A: Configuration Templates
-- ============================================================================

-- Configuration templates - preset and custom templates
CREATE TABLE IF NOT EXISTS configuration_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK(template_type IN ('preset', 'custom', 'community')) DEFAULT 'custom',
  creator_publisher_id TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (creator_publisher_id) REFERENCES publishers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON configuration_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_public ON configuration_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_creator ON configuration_templates(creator_publisher_id);

-- ============================================================================
-- Feature 4B: Bulk Operations
-- ============================================================================

-- Bulk operations - track bulk component operations
CREATE TABLE IF NOT EXISTS bulk_operations (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK(operation_type IN ('add', 'remove', 'enable', 'disable', 'update')),
  component_type TEXT NOT NULL CHECK(component_type IN ('bidder', 'module', 'analytics')),
  component_codes TEXT NOT NULL,
  target_sites TEXT NOT NULL,
  parameters TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  total_count INTEGER NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bulk_ops_publisher ON bulk_operations(publisher_id);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_created ON bulk_operations(created_at DESC);
