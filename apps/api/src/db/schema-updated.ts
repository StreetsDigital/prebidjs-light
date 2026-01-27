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
};
