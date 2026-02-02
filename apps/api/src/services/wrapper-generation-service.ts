import { db, configTargetingRules } from '../db';
import { eq, and } from 'drizzle-orm';
import { testMatch, RequestAttributes } from '../utils/targeting';
import { safeJsonParseArray } from '../utils/safe-json';

export interface TestMatchRequest {
  geo?: string;
  device?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
}

export interface TestMatchResult {
  matches: boolean;
  rules?: Array<{
    ruleId: string;
    priority: number;
    matchType: string;
    matches: boolean;
    details?: any;
  }>;
  attributes?: RequestAttributes;
  message?: string;
}

/**
 * Test if a config's targeting rules match given attributes
 */
export async function testConfigMatch(
  publisherId: string,
  configId: string,
  testRequest: TestMatchRequest
): Promise<TestMatchResult> {
  const attributes: RequestAttributes = {
    geo: testRequest.geo || null,
    device: testRequest.device || 'desktop',
    browser: testRequest.browser || null,
    os: testRequest.os || null,
  };

  const rules = await db
    .select()
    .from(configTargetingRules)
    .where(
      and(
        eq(configTargetingRules.configId, configId),
        eq(configTargetingRules.publisherId, publisherId)
      )
    )
    .all();

  if (rules.length === 0) {
    return {
      matches: false,
      message: 'No targeting rules configured',
    };
  }

  // Test each rule
  const ruleResults = rules.map(rule => {
    const conditions = safeJsonParseArray(rule.conditions, []);
    const result = testMatch(conditions, rule.matchType, attributes);

    return {
      ruleId: rule.id,
      priority: rule.priority,
      matchType: rule.matchType,
      ...result,
    };
  });

  // Check if any rule matches
  const anyMatch = ruleResults.some(r => r.matches);

  return {
    matches: anyMatch,
    rules: ruleResults,
    attributes,
  };
}
