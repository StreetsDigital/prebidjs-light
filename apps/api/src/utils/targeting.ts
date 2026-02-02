import { FastifyRequest } from 'fastify';
import UAParser from 'ua-parser-js';

// Request attribute types
export interface RequestAttributes {
  geo: string | null;
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string | null;
  os: string | null;
  domain?: string | null;
}

// Targeting condition types
export interface TargetingCondition {
  attribute: 'geo' | 'device' | 'browser' | 'os' | 'domain';
  operator: 'equals' | 'in' | 'contains' | 'not_in';
  value: string | string[];
}

export interface TargetingRule {
  id: string;
  configId: string;
  conditions: TargetingCondition[];
  matchType: 'all' | 'any';
  priority: number;
  enabled: boolean;
}

export interface WrapperConfig {
  id: string;
  publisherId: string;
  name: string;
  status: string;
  bidderTimeout?: number;
  priceGranularity?: string;
  customPriceBucket?: string;
  enableSendAllBids?: boolean;
  bidderSequence?: string;
  userSync?: string;
  targetingControls?: string;
  currencyConfig?: string;
  consentManagement?: string;
  floorsConfig?: string;
  userIdModules?: string;
  videoConfig?: string;
  s2sConfig?: string;
  debugMode?: boolean;
  customConfig?: string;
  bidders?: string;
  adUnits?: string;
  version?: number;
  isDefault?: boolean;
  blockWrapper?: boolean;
}

/**
 * Detect request attributes from HTTP headers
 */
export function detectAttributes(request: FastifyRequest): RequestAttributes {
  const headers = request.headers;
  const userAgentString = headers['user-agent'] as string || '';

  // Parse User-Agent
  const parser = new UAParser();
  const ua = parser.setUA(userAgentString).getResult();

  // Get GEO from CloudFlare header or default to null
  const geo = (headers['cf-ipcountry'] as string) || null;

  // Determine device type
  let device: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (ua.device.type === 'mobile') {
    device = 'mobile';
  } else if (ua.device.type === 'tablet') {
    device = 'tablet';
  }

  // Get browser name (lowercase)
  const browser = ua.browser.name?.toLowerCase() || null;

  // Get OS name (lowercase)
  const os = ua.os.name?.toLowerCase() || null;

  return {
    geo,
    device,
    browser,
    os,
  };
}

/**
 * Evaluate a single condition against request attributes
 */
function evaluateCondition(
  condition: TargetingCondition,
  attributes: RequestAttributes
): boolean {
  const attrValue = attributes[condition.attribute];

  if (!attrValue) {
    return false;
  }

  switch (condition.operator) {
    case 'equals':
      return attrValue === condition.value;

    case 'in':
      return Array.isArray(condition.value) &&
             condition.value.includes(attrValue);

    case 'contains':
      return String(attrValue).includes(String(condition.value));

    case 'not_in':
      return Array.isArray(condition.value) &&
             !condition.value.includes(attrValue);

    default:
      return false;
  }
}

/**
 * Check if all/any conditions match based on matchType
 */
export function matchesConditions(
  rule: TargetingRule,
  attributes: RequestAttributes
): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return false;
  }

  const results = rule.conditions.map(condition =>
    evaluateCondition(condition, attributes)
  );

  return rule.matchType === 'all'
    ? results.every(r => r)  // ALL conditions must match
    : results.some(r => r);   // ANY condition must match
}

/**
 * Evaluate targeting rules and return matching config
 * Rules are already sorted by priority DESC
 */
export function evaluateRules(
  configsWithRules: Array<{ config: WrapperConfig; rule: TargetingRule }>,
  attributes: RequestAttributes
): WrapperConfig | null {
  // Find first matching rule (highest priority)
  for (const item of configsWithRules) {
    if (item.rule.enabled && matchesConditions(item.rule, attributes)) {
      return item.config;
    }
  }

  return null;
}

/**
 * Find default config for publisher
 */
export function findDefaultConfig(
  configs: WrapperConfig[]
): WrapperConfig | null {
  return configs.find(c => c.isDefault && c.status === 'active') || null;
}

/**
 * Test if attributes would match a set of conditions (for test-match API)
 */
export function testMatch(
  conditions: TargetingCondition[],
  matchType: 'all' | 'any',
  attributes: RequestAttributes
): {
  matches: boolean;
  results: Array<{ condition: TargetingCondition; matched: boolean }>;
} {
  const results = conditions.map(condition => ({
    condition,
    matched: evaluateCondition(condition, attributes)
  }));

  const matches = matchType === 'all'
    ? results.every(r => r.matched)
    : results.some(r => r.matched);

  return { matches, results };
}
