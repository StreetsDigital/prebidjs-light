import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['super_admin', 'admin', 'publisher'] }).notNull().default('publisher'),
  publisherId: text('publisher_id'),
  status: text('status', { enum: ['active', 'disabled'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  lastLoginAt: text('last_login_at'),
});

// Sessions table for refresh tokens
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  refreshToken: text('refresh_token').notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Password reset tokens table
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Publishers table - TOP LEVEL
export const publishers = sqliteTable('publishers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  apiKey: text('api_key').notNull().unique(),
  domains: text('domains'), // JSON array stored as text - allowed domains for CORS
  status: text('status', { enum: ['active', 'paused', 'disabled'] }).notNull().default('active'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: text('created_by'),
  deletedAt: text('deleted_at'), // Soft delete timestamp - null means not deleted
});

// Publisher admins (many-to-many relationship)
export const publisherAdmins = sqliteTable('publisher_admins', {
  publisherId: text('publisher_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Websites table - MIDDLE TIER (Publisher → Website)
export const websites = sqliteTable('websites', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(), // REQUIRED - every website must belong to a publisher
  name: text('name').notNull(), // Human-readable name: "The New York Times"
  domain: text('domain').notNull(), // Actual domain: "nytimes.com"
  status: text('status', { enum: ['active', 'paused', 'disabled'] }).notNull().default('active'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Ad units table - BOTTOM TIER (Website → Ad Unit)
// ⚠️ BREAKING CHANGE: Removed publisherId, websiteId is now REQUIRED
export const adUnits = sqliteTable('ad_units', {
  id: text('id').primaryKey(),
  websiteId: text('website_id').notNull(), // REQUIRED - every ad unit must belong to a website
  code: text('code').notNull(), // Unique identifier for this ad unit
  name: text('name').notNull(), // Human-readable name
  mediaTypes: text('media_types'), // JSON object stored as text
  floorPrice: text('floor_price'), // Using text for decimal
  targeting: text('targeting'), // JSON object stored as text
  sizeMapping: text('size_mapping'), // JSON object stored as text
  status: text('status', { enum: ['active', 'paused'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Publisher bidders table - PUBLISHER LEVEL (applies to all websites)
export const publisherBidders = sqliteTable('publisher_bidders', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  bidderCode: text('bidder_code').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  params: text('params'), // JSON object stored as text
  timeoutOverride: integer('timeout_override'),
  priority: integer('priority').default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Publisher config table - PUBLISHER LEVEL (applies to all websites)
export const publisherConfig = sqliteTable('publisher_config', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull().unique(),
  bidderTimeout: integer('bidder_timeout').default(1500),
  priceGranularity: text('price_granularity').default('medium'),
  customPriceBucket: text('custom_price_bucket'), // JSON
  enableSendAllBids: integer('enable_send_all_bids', { mode: 'boolean' }).default(true),
  bidderSequence: text('bidder_sequence').default('random'),
  userSync: text('user_sync'), // JSON
  targetingControls: text('targeting_controls'), // JSON
  currencyConfig: text('currency_config'), // JSON
  consentManagement: text('consent_management'), // JSON
  floorsConfig: text('floors_config'), // JSON
  userIdModules: text('user_id_modules'), // JSON
  videoConfig: text('video_config'), // JSON
  s2sConfig: text('s2s_config'), // JSON
  debugMode: integer('debug_mode', { mode: 'boolean' }).default(false),
  customConfig: text('custom_config'), // JSON for additional settings
  version: integer('version').default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Config versions table - tracks changes to publisher config
export const configVersions = sqliteTable('config_versions', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  version: integer('version').notNull(),
  configSnapshot: text('config_snapshot'), // JSON
  changedBy: text('changed_by'),
  changeSummary: text('change_summary'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Prebid modules table - global catalog
export const prebidModules = sqliteTable('prebid_modules', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['bidder', 'userId', 'analytics', 'rtd', 'other'] }).notNull(),
  description: text('description'),
  paramsSchema: text('params_schema'), // JSON
  documentationUrl: text('documentation_url'),
  maintainer: text('maintainer'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Publisher builds table - generated JS bundles
export const publisherBuilds = sqliteTable('publisher_builds', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  configHash: text('config_hash').notNull(),
  prebidVersion: text('prebid_version'),
  modulesIncluded: text('modules_included'), // JSON array
  buildPath: text('build_path'),
  fileSize: integer('file_size'),
  status: text('status', { enum: ['building', 'ready', 'failed'] }).notNull().default('building'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text('expires_at'),
});

// Audit logs table - tracks all system actions
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  oldValues: text('old_values'), // JSON
  newValues: text('new_values'), // JSON
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Scheduled reports table
export const scheduledReports = sqliteTable('scheduled_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  publisherId: text('publisher_id'), // Optional - null means all publishers
  name: text('name').notNull(),
  description: text('description'),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly'] }).notNull(),
  dayOfWeek: integer('day_of_week'), // 0-6 for weekly
  dayOfMonth: integer('day_of_month'), // 1-31 for monthly
  timeOfDay: text('time_of_day'), // HH:mm format
  recipients: text('recipients').notNull(), // JSON array of email addresses
  reportType: text('report_type').notNull(), // 'performance', 'revenue', 'fill_rate', etc.
  filters: text('filters'), // JSON object with report-specific filters
  format: text('format', { enum: ['pdf', 'csv', 'excel'] }).notNull().default('pdf'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: text('last_run_at'),
  nextRunAt: text('next_run_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// A/B testing tables
export const abTests = sqliteTable('ab_tests', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'running', 'paused', 'completed'] }).notNull().default('draft'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  // Nested test support
  parentTestId: text('parent_test_id'), // Reference to parent test (null for top-level tests)
  parentVariantId: text('parent_variant_id'), // Which variant of parent test this belongs to
  level: integer('level').notNull().default(0), // 0 = root, 1 = nested, 2 = nested within nested, etc.
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const abTestVariants = sqliteTable('ab_test_variants', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull(),
  name: text('name').notNull(),
  trafficPercent: integer('traffic_percent').notNull().default(50),
  isControl: integer('is_control', { mode: 'boolean' }).notNull().default(false),
  // Config overrides
  bidderTimeout: integer('bidder_timeout'),
  priceGranularity: text('price_granularity'),
  enableSendAllBids: integer('enable_send_all_bids', { mode: 'boolean' }),
  bidderSequence: text('bidder_sequence'),
  floorsConfig: text('floors_config'), // JSON
  bidderOverrides: text('bidder_overrides'), // JSON - modify existing bidders
  additionalBidders: text('additional_bidders'), // JSON - add new bidders to test
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Analytics events table - for tracking bidder performance
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  eventType: text('event_type').notNull(),
  auctionId: text('auction_id'),
  adUnitCode: text('ad_unit_code'),
  bidderCode: text('bidder_code'),
  cpm: text('cpm'),
  currency: text('currency').default('USD'),
  latencyMs: integer('latency_ms'),
  timeout: integer('timeout', { mode: 'boolean' }).default(false),
  won: integer('won', { mode: 'boolean' }).default(false),
  rendered: integer('rendered', { mode: 'boolean' }).default(false),
  pageUrl: text('page_url'),
  domain: text('domain'),
  deviceType: text('device_type'),
  country: text('country'),
  timestamp: text('timestamp').notNull(),
  receivedAt: text('received_at').notNull(),
});

// Optimization Rules - automated publisher configuration optimization
export const optimizationRules = sqliteTable('optimization_rules', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  ruleType: text('rule_type', {
    enum: [
      'auto_disable_bidder',
      'auto_adjust_timeout',
      'auto_adjust_floor',
      'auto_enable_bidder',
      'alert_notification',
      'traffic_allocation',
    ]
  }).notNull(),
  conditions: text('conditions').notNull(), // JSON: array of conditions to evaluate
  actions: text('actions').notNull(), // JSON: array of actions to take when conditions met
  schedule: text('schedule'), // JSON: optional schedule (days, hours)
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  priority: integer('priority').notNull().default(0), // Higher priority rules execute first
  lastExecuted: text('last_executed'),
  executionCount: integer('execution_count').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Rule Execution History - track when rules fire and what they do
export const ruleExecutions = sqliteTable('rule_executions', {
  id: text('id').primaryKey(),
  ruleId: text('rule_id').notNull(),
  publisherId: text('publisher_id').notNull(),
  conditionsMet: text('conditions_met').notNull(), // JSON: which conditions triggered
  actionsPerformed: text('actions_performed').notNull(), // JSON: what actions were taken
  result: text('result', { enum: ['success', 'failure', 'skipped'] }).notNull(),
  errorMessage: text('error_message'),
  metricsSnapshot: text('metrics_snapshot'), // JSON: metrics at time of execution
  executedAt: text('executed_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Auction Debug Events - detailed auction tracking for live inspector
export const auctionDebugEvents = sqliteTable('auction_debug_events', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  auctionId: text('auction_id').notNull(),
  timestamp: text('timestamp').notNull(),
  eventType: text('event_type', {
    enum: ['auction_init', 'bid_requested', 'bid_response', 'bid_timeout', 'bid_won', 'bid_error', 'auction_end']
  }).notNull(),
  adUnitCode: text('ad_unit_code'),
  bidderCode: text('bidder_code'),
  // Request/Response data
  bidRequest: text('bid_request'), // JSON - full bid request
  bidResponse: text('bid_response'), // JSON - full bid response
  // Performance metrics
  latencyMs: integer('latency_ms'),
  cpm: text('cpm'),
  currency: text('currency'),
  // Context
  pageUrl: text('page_url'),
  domain: text('domain'),
  deviceType: text('device_type'),
  userAgent: text('user_agent'),
  // Debug info
  errorMessage: text('error_message'),
  statusCode: integer('status_code'),
  // Metadata
  metadata: text('metadata'), // JSON - additional debug data
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Notification channels table - Store different notification endpoints
export const notificationChannels = sqliteTable('notification_channels', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['email', 'slack', 'discord', 'teams', 'sms', 'webhook', 'pagerduty']
  }).notNull(),
  config: text('config').notNull(), // JSON - channel-specific config (emails, webhook URL, etc.)
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  lastTestAt: text('last_test_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Notification rules table - Define when to send alerts
export const notificationRules = sqliteTable('notification_rules', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  eventType: text('event_type', {
    enum: [
      'revenue_drop',
      'revenue_spike',
      'fill_rate_drop',
      'timeout_spike',
      'error_spike',
      'bidder_failure',
      'cpm_drop',
      'impression_drop',
      'custom_metric'
    ]
  }).notNull(),
  conditions: text('conditions').notNull(), // JSON - threshold, comparison, timeWindow, etc.
  channels: text('channels').notNull(), // JSON - array of channel IDs to notify
  severity: text('severity', {
    enum: ['info', 'warning', 'critical']
  }).notNull().default('warning'),
  cooldownMinutes: integer('cooldown_minutes').notNull().default(60),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  escalationPolicyId: text('escalation_policy_id'),
  lastTriggered: text('last_triggered'),
  triggerCount: integer('trigger_count').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Notifications table - History of sent notifications
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  ruleId: text('rule_id'),
  channelId: text('channel_id').notNull(),
  eventType: text('event_type').notNull(),
  severity: text('severity', {
    enum: ['info', 'warning', 'critical']
  }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'), // JSON - metric values, links, etc.
  status: text('status', {
    enum: ['pending', 'sent', 'failed', 'acknowledged']
  }).notNull().default('pending'),
  errorMessage: text('error_message'),
  acknowledgedBy: text('acknowledged_by'),
  acknowledgedAt: text('acknowledged_at'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Escalation policies table - Define escalation paths
export const escalationPolicies = sqliteTable('escalation_policies', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  levels: text('levels').notNull(), // JSON - array of { delayMinutes, channels }
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Custom Reports table - Store report templates and configurations
export const customReports = sqliteTable('custom_reports', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  // Report configuration
  metrics: text('metrics').notNull(), // JSON - array of metrics to include (revenue, impressions, cpm, etc.)
  dimensions: text('dimensions').notNull(), // JSON - array of dimensions to group by (date, bidder, adUnit, etc.)
  filters: text('filters'), // JSON - array of filter conditions
  dateRange: text('date_range').notNull(), // JSON - { type: 'last_7_days' | 'last_30_days' | 'custom', start, end }
  visualization: text('visualization'), // JSON - chart type, settings
  // Scheduling
  schedule: text('schedule'), // JSON - { enabled, frequency, time, recipients }
  // Export settings
  exportFormat: text('export_format').default('csv'), // csv, excel, pdf
  // Metadata
  isTemplate: integer('is_template', { mode: 'boolean' }).notNull().default(false),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by'),
  lastRunAt: text('last_run_at'),
  runCount: integer('run_count').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Report Executions table - Track report runs
export const reportExecutions = sqliteTable('report_executions', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull(),
  publisherId: text('publisher_id').notNull(),
  status: text('status', {
    enum: ['running', 'completed', 'failed']
  }).notNull().default('running'),
  // Execution details
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  duration: integer('duration'), // milliseconds
  rowCount: integer('row_count'),
  // Output
  outputPath: text('output_path'), // Path to generated file
  outputFormat: text('output_format'),
  errorMessage: text('error_message'),
  // Metadata
  triggeredBy: text('triggered_by'), // 'manual' | 'scheduled' | userId
  parameters: text('parameters'), // JSON - date range, filters used for this run
});

// Yield Recommendations table - Store AI-generated optimization recommendations
export const yieldRecommendations = sqliteTable('yield_recommendations', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  type: text('type', {
    enum: [
      'disable_bidder',
      'adjust_timeout',
      'adjust_floor_price',
      'add_bidder',
      'enable_bidder',
      'run_ab_test',
      'optimize_ad_unit',
      'adjust_traffic_allocation'
    ]
  }).notNull(),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull().default('medium'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  // Analysis data
  dataSnapshot: text('data_snapshot').notNull(), // JSON - current metrics that led to this recommendation
  estimatedImpact: text('estimated_impact'), // JSON - { revenueChange, percentChange, confidence }
  // Recommendation details
  targetEntity: text('target_entity'), // bidder code, ad unit code, etc.
  recommendedAction: text('recommended_action').notNull(), // JSON - specific action to take
  // Implementation
  status: text('status', {
    enum: ['pending', 'implemented', 'dismissed', 'expired']
  }).notNull().default('pending'),
  implementedAt: text('implemented_at'),
  implementedBy: text('implemented_by'),
  dismissedAt: text('dismissed_at'),
  dismissedBy: text('dismissed_by'),
  dismissReason: text('dismiss_reason'),
  // Results tracking
  actualImpact: text('actual_impact'), // JSON - measured results after implementation
  measurementPeriod: text('measurement_period'), // JSON - start/end dates for measurement
  // Metadata
  confidence: text('confidence').notNull().default('medium'), // low, medium, high
  expiresAt: text('expires_at'), // Recommendations can expire if not acted upon
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Impersonation Sessions table - Track super admin impersonation sessions
export const impersonationSessions = sqliteTable('impersonation_sessions', {
  id: text('id').primaryKey(),
  superAdminId: text('super_admin_id').notNull(),
  impersonatedUserId: text('impersonated_user_id').notNull(),
  startedAt: text('started_at').notNull().$defaultFn(() => new Date().toISOString()),
  endedAt: text('ended_at'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// Wrapper Configs table - Named wrapper configurations for traffic targeting
export const wrapperConfigs = sqliteTable('wrapper_configs', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  websiteId: text('website_id'), // Optional - configs can be publisher-level or website-specific

  // Config metadata
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['draft', 'active', 'paused', 'archived']
  }).notNull().default('draft'),
  blockWrapper: integer('block_wrapper', { mode: 'boolean' }).default(false), // NEW: Don't initialize wrapper if true

  // Complete wrapper config (same structure as publisher_config)
  bidderTimeout: integer('bidder_timeout').default(1500),
  priceGranularity: text('price_granularity').default('medium'),
  customPriceBucket: text('custom_price_bucket'),
  enableSendAllBids: integer('enable_send_all_bids', { mode: 'boolean' }).default(true),
  bidderSequence: text('bidder_sequence').default('random'),
  userSync: text('user_sync'),
  targetingControls: text('targeting_controls'),
  currencyConfig: text('currency_config'),
  consentManagement: text('consent_management'),
  floorsConfig: text('floors_config'),
  userIdModules: text('user_id_modules'),
  videoConfig: text('video_config'),
  s2sConfig: text('s2s_config'),
  debugMode: integer('debug_mode', { mode: 'boolean' }).default(false),
  customConfig: text('custom_config'),

  // Config-specific bidders (JSON array of bidder configs)
  bidders: text('bidders'),

  // Config-specific ad units (optional override)
  adUnits: text('ad_units'),

  // Versioning
  version: integer('version').default(1),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),

  // Analytics
  impressionsServed: integer('impressions_served').default(0),
  lastServedAt: text('last_served_at'),

  // Audit
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Config Targeting Rules table - Traffic targeting rules
export const configTargetingRules = sqliteTable('config_targeting_rules', {
  id: text('id').primaryKey(),
  configId: text('config_id').notNull(),
  publisherId: text('publisher_id').notNull(),

  // Targeting conditions (JSON)
  conditions: text('conditions').notNull(),
  matchType: text('match_type', { enum: ['all', 'any'] }).notNull().default('all'),

  // Priority for overlap resolution
  priority: integer('priority').notNull().default(0),

  // Status
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),

  // Audit
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Config Serve Log table - Analytics tracking
export const configServeLog = sqliteTable('config_serve_log', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  configId: text('config_id'),

  // Request attributes
  geo: text('geo'),
  device: text('device'),
  browser: text('browser'),
  os: text('os'),
  domain: text('domain'),

  // Matching results
  matchedRuleId: text('matched_rule_id'),
  allMatchingRuleIds: text('all_matching_rule_ids'),

  // Session tracking
  sessionId: text('session_id'),
  timestamp: text('timestamp').notNull().$defaultFn(() => new Date().toISOString()),
});

// Publisher Custom Bidders table - Per-publisher custom bidder management
export const publisherCustomBidders = sqliteTable('publisher_custom_bidders', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  bidderCode: text('bidder_code').notNull(),
  bidderName: text('bidder_name').notNull(),
  isClientSide: integer('is_client_side', { mode: 'boolean' }).notNull().default(true),
  isServerSide: integer('is_server_side', { mode: 'boolean' }).notNull().default(false),
  description: text('description'),
  documentationUrl: text('documentation_url'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Export all tables for use in other files
export const schema = {
  users,
  publishers,
  publisherAdmins,
  websites,
  adUnits,
  publisherBidders,
  publisherConfig,
  configVersions,
  prebidModules,
  publisherBuilds,
  auditLogs,
  scheduledReports,
  abTests,
  abTestVariants,
  analyticsEvents,
  optimizationRules,
  ruleExecutions,
  auctionDebugEvents,
  notificationChannels,
  notificationRules,
  notifications,
  escalationPolicies,
  customReports,
  reportExecutions,
  yieldRecommendations,
  impersonationSessions,
  wrapperConfigs,
  configTargetingRules,
  configServeLog,
  publisherCustomBidders,
};
