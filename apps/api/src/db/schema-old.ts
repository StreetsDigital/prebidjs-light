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

// Publishers table
export const publishers = sqliteTable('publishers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  apiKey: text('api_key').notNull().unique(),
  domains: text('domains'), // JSON array stored as text
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

// Websites table (sits between Publishers and Ad Units)
export const websites = sqliteTable('websites', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  status: text('status', { enum: ['active', 'paused', 'disabled'] }).notNull().default('active'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Ad units table
export const adUnits = sqliteTable('ad_units', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  websiteId: text('website_id'), // Optional reference to website (for new taxonomy)
  code: text('code').notNull(),
  name: text('name').notNull(),
  mediaTypes: text('media_types'), // JSON object stored as text
  floorPrice: text('floor_price'), // Using text for decimal
  targeting: text('targeting'), // JSON object stored as text
  sizeMapping: text('size_mapping'), // JSON object stored as text
  status: text('status', { enum: ['active', 'paused'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Publisher bidders table
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

// Publisher config table
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

// Config versions table (for rollback)
export const configVersions = sqliteTable('config_versions', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  version: integer('version').notNull(),
  configSnapshot: text('config_snapshot').notNull(), // JSON
  changedBy: text('changed_by'),
  changeSummary: text('change_summary'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Prebid modules table
export const prebidModules = sqliteTable('prebid_modules', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['bidder', 'userId', 'analytics', 'rtd', 'other'] }).notNull(),
  description: text('description'),
  paramsSchema: text('params_schema'), // JSON
  documentationUrl: text('documentation_url'),
  maintainer: text('maintainer'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Publisher builds table
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

// Audit logs table
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

// Sessions table (for refresh tokens)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  refreshToken: text('refresh_token').notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Scheduled reports table
export const scheduledReports = sqliteTable('scheduled_reports', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  reportType: text('report_type', { enum: ['revenue', 'latency', 'fill_rate', 'all'] }).notNull().default('all'),
  schedule: text('schedule', { enum: ['daily', 'weekly', 'monthly'] }).notNull().default('daily'),
  recipients: text('recipients').notNull(), // JSON array of email addresses
  publisherId: text('publisher_id'), // Optional filter by publisher
  dateRange: text('date_range', { enum: ['last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'last_month'] }).notNull().default('last_7_days'),
  format: text('format', { enum: ['csv', 'json', 'pdf'] }).notNull().default('csv'),
  status: text('status', { enum: ['active', 'paused'] }).notNull().default('active'),
  lastSentAt: text('last_sent_at'),
  nextSendAt: text('next_send_at'),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
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

// A/B Tests table for traffic splitting
export const abTests = sqliteTable('ab_tests', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'running', 'paused', 'completed'] }).notNull().default('draft'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// A/B Test Variants table
export const abTestVariants = sqliteTable('ab_test_variants', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull(),
  name: text('name').notNull(), // e.g., "Control", "Variant A", "Variant B"
  trafficPercent: integer('traffic_percent').notNull().default(50), // 0-100
  isControl: integer('is_control', { mode: 'boolean' }).notNull().default(false),
  // Config overrides (JSON - only the settings that differ from the base config)
  bidderTimeout: integer('bidder_timeout'),
  priceGranularity: text('price_granularity'),
  enableSendAllBids: integer('enable_send_all_bids', { mode: 'boolean' }),
  bidderSequence: text('bidder_sequence'),
  floorsConfig: text('floors_config'), // JSON
  bidderOverrides: text('bidder_overrides'), // JSON - bidder-specific overrides
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Analytics events table (simplified version of ClickHouse schema for development)
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  publisherId: text('publisher_id').notNull(),
  eventType: text('event_type').notNull(), // auctionInit, auctionEnd, bidRequested, bidResponse, bidWon, bidTimeout, noBid, adRenderSucceeded, adRenderFailed
  auctionId: text('auction_id'),
  adUnitCode: text('ad_unit_code'),
  bidderCode: text('bidder_code'),
  cpm: text('cpm'), // Stored as text for decimal precision
  currency: text('currency').default('USD'),
  latencyMs: integer('latency_ms'),
  timeout: integer('timeout', { mode: 'boolean' }).default(false),
  won: integer('won', { mode: 'boolean' }).default(false),
  rendered: integer('rendered', { mode: 'boolean' }).default(false),
  pageUrl: text('page_url'),
  domain: text('domain'),
  deviceType: text('device_type'),
  country: text('country'),
  timestamp: text('timestamp').notNull().$defaultFn(() => new Date().toISOString()),
  receivedAt: text('received_at').notNull().$defaultFn(() => new Date().toISOString()),
});
