import { db } from '../db/index.js';
import { componentParameters } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';

/**
 * Parameter definition interface
 */
interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

/**
 * Prebid Markdown Parser
 * Extracts parameter schemas from Prebid.org documentation
 *
 * In a production implementation, this would:
 * 1. Fetch markdown files from Prebid.org GitHub repo
 * 2. Parse markdown to extract parameter tables
 * 3. Extract parameter definitions from code examples
 * 4. Store schemas in the database
 *
 * For this implementation, we'll use predefined schemas for common bidders
 */

/**
 * Predefined parameter schemas for popular bidders
 * These are based on actual Prebid.org documentation
 */
const BIDDER_SCHEMAS: Record<string, ParameterDefinition[]> = {
  rubicon: [
    {
      name: 'accountId',
      type: 'number',
      required: true,
      description: 'The publisher account ID',
      validation: { min: 1 },
    },
    {
      name: 'siteId',
      type: 'number',
      required: true,
      description: 'The site ID',
      validation: { min: 1 },
    },
    {
      name: 'zoneId',
      type: 'number',
      required: false,
      description: 'The zone ID (optional for network-level targeting)',
      validation: { min: 1 },
    },
    {
      name: 'inventory',
      type: 'object',
      required: false,
      description: 'Inventory targeting object',
    },
    {
      name: 'visitor',
      type: 'object',
      required: false,
      description: 'Visitor targeting object',
    },
  ],
  appnexus: [
    {
      name: 'placementId',
      type: 'number',
      required: false,
      description: 'The placement ID from AppNexus',
      validation: { min: 1 },
    },
    {
      name: 'member',
      type: 'string',
      required: false,
      description: 'The member ID',
    },
    {
      name: 'invCode',
      type: 'string',
      required: false,
      description: 'The inventory code',
    },
    {
      name: 'keywords',
      type: 'object',
      required: false,
      description: 'Keyword targeting object',
    },
    {
      name: 'video',
      type: 'object',
      required: false,
      description: 'Video-specific parameters',
    },
  ],
  ix: [
    {
      name: 'siteId',
      type: 'string',
      required: true,
      description: 'The Index Exchange site ID',
      validation: { pattern: '^[0-9]+$' },
    },
    {
      name: 'size',
      type: 'array',
      required: false,
      description: 'Ad size as [width, height]',
    },
  ],
  pubmatic: [
    {
      name: 'publisherId',
      type: 'string',
      required: true,
      description: 'The PubMatic publisher ID',
    },
    {
      name: 'adSlot',
      type: 'string',
      required: true,
      description: 'The ad slot ID',
    },
    {
      name: 'pmzoneid',
      type: 'string',
      required: false,
      description: 'Zone ID for targeting',
    },
    {
      name: 'lat',
      type: 'string',
      required: false,
      description: 'Latitude for geo-targeting',
    },
    {
      name: 'lon',
      type: 'string',
      required: false,
      description: 'Longitude for geo-targeting',
    },
  ],
  openx: [
    {
      name: 'unit',
      type: 'string',
      required: true,
      description: 'The OpenX ad unit ID',
    },
    {
      name: 'delDomain',
      type: 'string',
      required: true,
      description: 'The delivery domain',
    },
    {
      name: 'customParams',
      type: 'object',
      required: false,
      description: 'Custom parameters object',
    },
    {
      name: 'customFloor',
      type: 'number',
      required: false,
      description: 'Custom floor price',
      validation: { min: 0 },
    },
  ],
};

/**
 * Predefined parameter schemas for modules
 */
const MODULE_SCHEMAS: Record<string, ParameterDefinition[]> = {
  consentManagement: [
    {
      name: 'gdpr',
      type: 'object',
      required: false,
      description: 'GDPR consent management configuration',
    },
    {
      name: 'usp',
      type: 'object',
      required: false,
      description: 'US Privacy (CCPA) configuration',
    },
  ],
  priceFloors: [
    {
      name: 'enabled',
      type: 'boolean',
      required: false,
      defaultValue: true,
      description: 'Enable price floors module',
    },
    {
      name: 'enforcement',
      type: 'object',
      required: false,
      description: 'Floor enforcement rules',
    },
    {
      name: 'data',
      type: 'object',
      required: false,
      description: 'Floor data configuration',
    },
  ],
  userId: [
    {
      name: 'auctionDelay',
      type: 'number',
      required: false,
      defaultValue: 50,
      description: 'Auction delay in milliseconds',
      validation: { min: 0, max: 5000 },
    },
    {
      name: 'userSync',
      type: 'object',
      required: false,
      description: 'User sync configuration',
    },
  ],
  schain: [
    {
      name: 'validation',
      type: 'string',
      required: false,
      defaultValue: 'strict',
      description: 'Validation mode for supply chain',
      validation: { enum: ['strict', 'relaxed', 'off'] },
    },
  ],
};

/**
 * Predefined parameter schemas for analytics adapters
 */
const ANALYTICS_SCHEMAS: Record<string, ParameterDefinition[]> = {
  ga: [
    {
      name: 'trackerName',
      type: 'string',
      required: false,
      description: 'Google Analytics tracker name',
    },
    {
      name: 'enableDistribution',
      type: 'boolean',
      required: false,
      defaultValue: false,
      description: 'Enable distribution tracking',
    },
  ],
  pubstack: [
    {
      name: 'scopeId',
      type: 'string',
      required: true,
      description: 'PubStack scope ID',
    },
  ],
};

/**
 * Store parameter schemas in database
 */
export async function seedParameterSchemas(): Promise<void> {
  const now = new Date().toISOString();

  // Seed bidder schemas
  for (const [bidderCode, params] of Object.entries(BIDDER_SCHEMAS)) {
    await storeComponentSchema('bidder', bidderCode, params, now);
  }

  // Seed module schemas
  for (const [moduleCode, params] of Object.entries(MODULE_SCHEMAS)) {
    await storeComponentSchema('module', moduleCode, params, now);
  }

  // Seed analytics schemas
  for (const [analyticsCode, params] of Object.entries(ANALYTICS_SCHEMAS)) {
    await storeComponentSchema('analytics', analyticsCode, params, now);
  }

  console.log('Parameter schemas seeded successfully');
}

/**
 * Store component schema in database
 */
async function storeComponentSchema(
  componentType: 'bidder' | 'module' | 'analytics',
  componentCode: string,
  parameters: ParameterDefinition[],
  timestamp: string
): Promise<void> {
  for (const param of parameters) {
    // Check if parameter already exists
    const existing = db
      .select()
      .from(componentParameters)
      .where(
        and(
          eq(componentParameters.componentType, componentType),
          eq(componentParameters.componentCode, componentCode),
          eq(componentParameters.parameterName, param.name)
        )
      )
      .get();

    if (existing) {
      // Update existing parameter
      db.update(componentParameters)
        .set({
          parameterType: param.type,
          required: param.required,
          defaultValue: param.defaultValue !== undefined ? JSON.stringify(param.defaultValue) : null,
          description: param.description,
          validationPattern: param.validation?.pattern || null,
          minValue: param.validation?.min || null,
          maxValue: param.validation?.max || null,
          enumValues: param.validation?.enum ? JSON.stringify(param.validation.enum) : null,
          updatedAt: timestamp,
        })
        .where(eq(componentParameters.id, existing.id))
        .run();
    } else {
      // Insert new parameter
      db.insert(componentParameters)
        .values({
          id: uuidv4(),
          componentType,
          componentCode,
          parameterName: param.name,
          parameterType: param.type,
          required: param.required,
          defaultValue: param.defaultValue !== undefined ? JSON.stringify(param.defaultValue) : null,
          description: param.description,
          validationPattern: param.validation?.pattern || null,
          minValue: param.validation?.min || null,
          maxValue: param.validation?.max || null,
          enumValues: param.validation?.enum ? JSON.stringify(param.validation.enum) : null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    }
  }
}

/**
 * Parse markdown from Prebid.org repository
 * This is a placeholder for the actual implementation
 */
export async function parseMarkdownFromPrebidOrg(
  componentType: 'bidder' | 'module' | 'analytics',
  componentCode: string
): Promise<ParameterDefinition[]> {
  // In production, this would:
  // 1. Fetch markdown file from GitHub
  // 2. Parse tables and code blocks
  // 3. Extract parameter definitions
  // 4. Return structured parameter list

  // For now, return empty array if not in our predefined schemas
  const schemas = {
    bidder: BIDDER_SCHEMAS,
    module: MODULE_SCHEMAS,
    analytics: ANALYTICS_SCHEMAS,
  };

  return schemas[componentType][componentCode] || [];
}

/**
 * Refresh parameter schemas from Prebid.org
 * Should be run periodically (e.g., weekly via cron job)
 */
export async function refreshParameterSchemas(): Promise<void> {
  console.log('Refreshing parameter schemas from Prebid.org...');

  // In production, this would fetch latest docs from Prebid.org
  // For now, just re-seed with our predefined schemas
  await seedParameterSchemas();

  console.log('Parameter schemas refreshed successfully');
}
