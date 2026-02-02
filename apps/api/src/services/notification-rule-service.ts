import { randomUUID } from 'crypto';
import { db } from '../db';
import { notificationRules, escalationPolicies } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { safeJsonParseArray } from '../utils/safe-json';

export interface NotificationRule {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  eventType: string;
  conditions: any;
  channels: string[];
  severity: 'info' | 'warning' | 'critical';
  cooldownMinutes: number;
  enabled: boolean;
  escalationPolicyId: string | null;
  triggerCount: number;
  lastTriggered: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationPolicy {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  levels: Array<{ delayMinutes: number; channels: string[] }>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  eventType: string;
  conditions: any;
  channels: string[];
  severity: 'info' | 'warning' | 'critical';
  cooldownMinutes?: number;
  escalationPolicyId?: string;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  eventType?: string;
  conditions?: any;
  channels?: string[];
  severity?: 'info' | 'warning' | 'critical';
  cooldownMinutes?: number;
  enabled?: boolean;
  escalationPolicyId?: string;
}

export interface CreateEscalationPolicyInput {
  name: string;
  description?: string;
  levels: Array<{ delayMinutes: number; channels: string[] }>;
}

export interface UpdateEscalationPolicyInput {
  name?: string;
  description?: string;
  levels?: Array<{ delayMinutes: number; channels: string[] }>;
  enabled?: boolean;
}

export class NotificationRuleService {
  /**
   * List all notification rules for a publisher
   */
  listRules(publisherId: string): NotificationRule[] {
    const rules = db.select().from(notificationRules)
      .where(eq(notificationRules.publisherId, publisherId))
      .orderBy(desc(notificationRules.createdAt))
      .all();

    return rules.map(rule => ({
      ...rule,
      conditions: safeJsonParseArray(rule.conditions, []),
      channels: safeJsonParseArray(rule.channels, []),
      lastTriggered: rule.lastTriggered || null,
    }));
  }

  /**
   * Create a new notification rule
   */
  createRule(publisherId: string, input: CreateRuleInput): NotificationRule {
    const ruleId = randomUUID();
    const now = new Date().toISOString();

    db.insert(notificationRules).values({
      id: ruleId,
      publisherId,
      name: input.name,
      description: input.description || null,
      eventType: input.eventType,
      conditions: JSON.stringify(input.conditions),
      channels: JSON.stringify(input.channels),
      severity: input.severity,
      cooldownMinutes: input.cooldownMinutes || 60,
      enabled: true,
      escalationPolicyId: input.escalationPolicyId || null,
      triggerCount: 0,
      createdAt: now,
      updatedAt: now,
    } as any).run();

    const rule = db.select().from(notificationRules)
      .where(eq(notificationRules.id, ruleId))
      .get();

    if (!rule) {
      throw new Error('Failed to create rule');
    }

    return {
      ...rule,
      conditions: safeJsonParseArray(rule.conditions, []),
      channels: safeJsonParseArray(rule.channels, []),
      lastTriggered: rule.lastTriggered || null,
    };
  }

  /**
   * Update a notification rule
   */
  updateRule(
    publisherId: string,
    ruleId: string,
    input: UpdateRuleInput
  ): NotificationRule | null {
    const setValues: any = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) setValues.name = input.name;
    if (input.description !== undefined) setValues.description = input.description;
    if (input.eventType !== undefined) setValues.eventType = input.eventType;
    if (input.conditions !== undefined) setValues.conditions = JSON.stringify(input.conditions);
    if (input.channels !== undefined) setValues.channels = JSON.stringify(input.channels);
    if (input.severity !== undefined) setValues.severity = input.severity;
    if (input.cooldownMinutes !== undefined) setValues.cooldownMinutes = input.cooldownMinutes;
    if (input.enabled !== undefined) setValues.enabled = input.enabled;
    if (input.escalationPolicyId !== undefined) setValues.escalationPolicyId = input.escalationPolicyId;

    db.update(notificationRules)
      .set(setValues)
      .where(and(
        eq(notificationRules.id, ruleId),
        eq(notificationRules.publisherId, publisherId)
      )).run();

    const rule = db.select().from(notificationRules)
      .where(eq(notificationRules.id, ruleId))
      .get();

    if (!rule) {
      return null;
    }

    return {
      ...rule,
      conditions: safeJsonParseArray(rule.conditions, []),
      channels: safeJsonParseArray(rule.channels, []),
      lastTriggered: rule.lastTriggered || null,
    };
  }

  /**
   * Delete a notification rule
   */
  deleteRule(publisherId: string, ruleId: string): void {
    db.delete(notificationRules)
      .where(and(
        eq(notificationRules.id, ruleId),
        eq(notificationRules.publisherId, publisherId)
      )).run();
  }

  /**
   * Get a single notification rule
   */
  getRule(publisherId: string, ruleId: string): NotificationRule | null {
    const rule = db.select().from(notificationRules)
      .where(and(
        eq(notificationRules.id, ruleId),
        eq(notificationRules.publisherId, publisherId)
      ))
      .get();

    if (!rule) {
      return null;
    }

    return {
      ...rule,
      conditions: safeJsonParseArray(rule.conditions, []),
      channels: safeJsonParseArray(rule.channels, []),
      lastTriggered: rule.lastTriggered || null,
    };
  }

  /**
   * Toggle a rule's enabled state
   */
  toggleRule(publisherId: string, ruleId: string): boolean {
    const rule = this.getRule(publisherId, ruleId);

    if (!rule) {
      throw new Error('Rule not found');
    }

    const newEnabled = !rule.enabled;

    db.update(notificationRules)
      .set({
        enabled: newEnabled,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notificationRules.id, ruleId)).run();

    return newEnabled;
  }

  /**
   * List all escalation policies for a publisher
   */
  listEscalationPolicies(publisherId: string): EscalationPolicy[] {
    const policies = db.select().from(escalationPolicies)
      .where(eq(escalationPolicies.publisherId, publisherId))
      .orderBy(desc(escalationPolicies.createdAt))
      .all();

    return policies.map(policy => ({
      ...policy,
      levels: safeJsonParseArray(policy.levels, []),
    }));
  }

  /**
   * Create an escalation policy
   */
  createEscalationPolicy(publisherId: string, input: CreateEscalationPolicyInput): EscalationPolicy {
    const policyId = randomUUID();
    const now = new Date().toISOString();

    db.insert(escalationPolicies).values({
      id: policyId,
      publisherId,
      name: input.name,
      description: input.description || null,
      levels: JSON.stringify(input.levels),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }).run();

    const policy = db.select().from(escalationPolicies)
      .where(eq(escalationPolicies.id, policyId))
      .get();

    if (!policy) {
      throw new Error('Failed to create escalation policy');
    }

    return {
      ...policy,
      levels: safeJsonParseArray(policy.levels, []),
    };
  }

  /**
   * Update an escalation policy
   */
  updateEscalationPolicy(
    publisherId: string,
    policyId: string,
    input: UpdateEscalationPolicyInput
  ): EscalationPolicy | null {
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.levels !== undefined) updates.levels = JSON.stringify(input.levels);
    if (input.enabled !== undefined) updates.enabled = input.enabled;

    db.update(escalationPolicies)
      .set(updates)
      .where(and(
        eq(escalationPolicies.id, policyId),
        eq(escalationPolicies.publisherId, publisherId)
      )).run();

    const policy = db.select().from(escalationPolicies)
      .where(eq(escalationPolicies.id, policyId))
      .get();

    if (!policy) {
      return null;
    }

    return {
      ...policy,
      levels: safeJsonParseArray(policy.levels, []),
    };
  }

  /**
   * Delete an escalation policy
   */
  deleteEscalationPolicy(publisherId: string, policyId: string): void {
    db.delete(escalationPolicies)
      .where(and(
        eq(escalationPolicies.id, policyId),
        eq(escalationPolicies.publisherId, publisherId)
      )).run();
  }
}
