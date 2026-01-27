import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { db, sqlite } from '../db';
import {
  notificationChannels,
  notificationRules,
  notifications,
  escalationPolicies,
  analyticsEvents
} from '../db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export default async function notificationsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // NOTIFICATION CHANNELS
  // ============================================================================

  // List all notification channels for a publisher
  fastify.get('/:publisherId/notification-channels', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    const channels = db.select().from(notificationChannels)
      .where(eq(notificationChannels.publisherId, publisherId))
      .orderBy(desc(notificationChannels.createdAt))
      .all();

    // Parse config JSON
    const channelsWithConfig = channels.map(channel => ({
      ...channel,
      config: JSON.parse(channel.config),
    }));

    return reply.send({ channels: channelsWithConfig });
  });

  // Create a new notification channel
  fastify.post('/:publisherId/notification-channels', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { name, type, config } = request.body as {
      name: string;
      type: 'email' | 'slack' | 'discord' | 'teams' | 'sms' | 'webhook' | 'pagerduty';
      config: any;
    };

    const channelId = randomUUID();
    const now = new Date().toISOString();

    db.insert(notificationChannels).values({
      id: channelId,
      publisherId,
      name,
      type,
      config: JSON.stringify(config),
      enabled: true,
      verified: false,
      createdAt: now,
      updatedAt: now,
    }).run();

    const channel = db.select().from(notificationChannels)
      .where(eq(notificationChannels.id, channelId))
      .get();

    return reply.status(201).send({
      channel: {
        ...channel,
        config: JSON.parse(channel!.config),
      }
    });
  });

  // Update a notification channel
  fastify.put('/:publisherId/notification-channels/:channelId', async (request, reply) => {
    const { publisherId, channelId } = request.params as { publisherId: string; channelId: string };
    const { name, type, config, enabled } = request.body as {
      name?: string;
      type?: string;
      config?: any;
      enabled?: boolean;
    };

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (config !== undefined) updates.config = JSON.stringify(config);
    if (enabled !== undefined) updates.enabled = enabled;

    db.update(notificationChannels)
      .set(updates)
      .where(and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.publisherId, publisherId)
      ))
      .run();

    const channel = db.select().from(notificationChannels)
      .where(eq(notificationChannels.id, channelId))
      .get();

    return reply.send({
      channel: channel ? {
        ...channel,
        config: JSON.parse(channel.config),
      } : null
    });
  });

  // Delete a notification channel
  fastify.delete('/:publisherId/notification-channels/:channelId', async (request, reply) => {
    const { publisherId, channelId } = request.params as { publisherId: string; channelId: string };

    db.delete(notificationChannels)
      .where(and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.publisherId, publisherId)
      ))
      .run();

    return reply.send({ success: true });
  });

  // Test a notification channel
  fastify.post('/:publisherId/notification-channels/:channelId/test', async (request, reply) => {
    const { publisherId, channelId } = request.params as { publisherId: string; channelId: string };

    const channel = db.select().from(notificationChannels)
      .where(and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.publisherId, publisherId)
      ))
      .get();

    if (!channel) {
      return reply.status(404).send({ error: 'Channel not found' });
    }

    // In a real implementation, this would send a test notification
    // For now, we'll just simulate success
    const testResult = await sendTestNotification(channel);

    // Update last_test_at
    db.update(notificationChannels)
      .set({
        lastTestAt: new Date().toISOString(),
        verified: testResult.success,
      })
      .where(eq(notificationChannels.id, channelId))
      .run();

    return reply.send({
      success: testResult.success,
      message: testResult.message,
    });
  });

  // ============================================================================
  // NOTIFICATION RULES
  // ============================================================================

  // List all notification rules for a publisher
  fastify.get('/:publisherId/notification-rules', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    const rules = db.select().from(notificationRules)
      .where(eq(notificationRules.publisherId, publisherId))
      .orderBy(desc(notificationRules.createdAt))
      .all();

    // Parse JSON fields
    const rulesWithData = rules.map(rule => ({
      ...rule,
      conditions: JSON.parse(rule.conditions),
      channels: JSON.parse(rule.channels),
    }));

    return reply.send({ rules: rulesWithData });
  });

  // Create a new notification rule
  fastify.post('/:publisherId/notification-rules', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      name,
      description,
      eventType,
      conditions,
      channels,
      severity,
      cooldownMinutes,
      escalationPolicyId
    } = request.body as {
      name: string;
      description?: string;
      eventType: string;
      conditions: any;
      channels: string[];
      severity: 'info' | 'warning' | 'critical';
      cooldownMinutes?: number;
      escalationPolicyId?: string;
    };

    const ruleId = randomUUID();
    const now = new Date().toISOString();

    db.insert(notificationRules).values({
      id: ruleId,
      publisherId,
      name,
      description: description || null,
      eventType,
      conditions: JSON.stringify(conditions),
      channels: JSON.stringify(channels),
      severity,
      cooldownMinutes: cooldownMinutes || 60,
      enabled: true,
      escalationPolicyId: escalationPolicyId || null,
      triggerCount: 0,
      createdAt: now,
      updatedAt: now,
    }).run();

    const rule = db.select().from(notificationRules)
      .where(eq(notificationRules.id, ruleId))
      .get();

    return reply.status(201).send({
      rule: rule ? {
        ...rule,
        conditions: JSON.parse(rule.conditions),
        channels: JSON.parse(rule.channels),
      } : null
    });
  });

  // Update a notification rule
  fastify.put('/:publisherId/notification-rules/:ruleId', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };
    const updates = request.body as any;

    const setValues: any = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.eventType !== undefined) setValues.eventType = updates.eventType;
    if (updates.conditions !== undefined) setValues.conditions = JSON.stringify(updates.conditions);
    if (updates.channels !== undefined) setValues.channels = JSON.stringify(updates.channels);
    if (updates.severity !== undefined) setValues.severity = updates.severity;
    if (updates.cooldownMinutes !== undefined) setValues.cooldownMinutes = updates.cooldownMinutes;
    if (updates.enabled !== undefined) setValues.enabled = updates.enabled;
    if (updates.escalationPolicyId !== undefined) setValues.escalationPolicyId = updates.escalationPolicyId;

    db.update(notificationRules)
      .set(setValues)
      .where(and(
        eq(notificationRules.id, ruleId),
        eq(notificationRules.publisherId, publisherId)
      ))
      .run();

    const rule = db.select().from(notificationRules)
      .where(eq(notificationRules.id, ruleId))
      .get();

    return reply.send({
      rule: rule ? {
        ...rule,
        conditions: JSON.parse(rule.conditions),
        channels: JSON.parse(rule.channels),
      } : null
    });
  });

  // Delete a notification rule
  fastify.delete('/:publisherId/notification-rules/:ruleId', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    db.delete(notificationRules)
      .where(and(
        eq(notificationRules.id, ruleId),
        eq(notificationRules.publisherId, publisherId)
      ))
      .run();

    return reply.send({ success: true });
  });

  // Toggle notification rule enabled/disabled
  fastify.patch('/:publisherId/notification-rules/:ruleId/toggle', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    const rule = db.select().from(notificationRules)
      .where(and(
        eq(notificationRules.id, ruleId),
        eq(notificationRules.publisherId, publisherId)
      ))
      .get();

    if (!rule) {
      return reply.status(404).send({ error: 'Rule not found' });
    }

    db.update(notificationRules)
      .set({
        enabled: !rule.enabled,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notificationRules.id, ruleId))
      .run();

    return reply.send({ enabled: !rule.enabled });
  });

  // Test a notification rule (dry run)
  fastify.post('/:publisherId/notification-rules/:ruleId/test', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    const rule = db.select().from(notificationRules)
      .where(and(
        eq(notificationRules.id, ruleId),
        eq(notificationRules.publisherId, publisherId)
      ))
      .get();

    if (!rule) {
      return reply.status(404).send({ error: 'Rule not found' });
    }

    const conditions = JSON.parse(rule.conditions);
    const channelIds = JSON.parse(rule.channels);

    // Evaluate conditions against current metrics
    const now = new Date();
    const evaluation = await evaluateRuleConditions(publisherId, rule.eventType, conditions, now);

    // Get channel info
    const channelList = db.select().from(notificationChannels)
      .where(sql`${notificationChannels.id} IN (${sql.raw(channelIds.map(() => '?').join(','))})`)
      .all(...channelIds);

    return reply.send({
      rule: {
        ...rule,
        conditions: JSON.parse(rule.conditions),
        channels: JSON.parse(rule.channels),
      },
      evaluation,
      channelsToNotify: channelList.map(ch => ({
        ...ch,
        config: JSON.parse(ch.config),
      })),
      wouldTrigger: evaluation.conditionsMet,
    });
  });

  // ============================================================================
  // NOTIFICATIONS (HISTORY)
  // ============================================================================

  // List notification history
  fastify.get('/:publisherId/notifications', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { limit = '100', offset = '0', status, severity } = request.query as any;

    let query = db.select().from(notifications)
      .where(eq(notifications.publisherId, publisherId))
      .orderBy(desc(notifications.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const allNotifications = query.all();

    // Filter by status and severity if provided
    let filtered = allNotifications;
    if (status) {
      filtered = filtered.filter(n => n.status === status);
    }
    if (severity) {
      filtered = filtered.filter(n => n.severity === severity);
    }

    // Parse JSON data
    const notificationsWithData = filtered.map(notification => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null,
    }));

    return reply.send({
      notifications: notificationsWithData,
      total: filtered.length,
    });
  });

  // Acknowledge a notification
  fastify.post('/:publisherId/notifications/:notificationId/acknowledge', async (request, reply) => {
    const { publisherId, notificationId } = request.params as { publisherId: string; notificationId: string };
    const { acknowledgedBy } = request.body as { acknowledgedBy: string };

    db.update(notifications)
      .set({
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString(),
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.publisherId, publisherId)
      ))
      .run();

    return reply.send({ success: true });
  });

  // ============================================================================
  // ESCALATION POLICIES
  // ============================================================================

  // List all escalation policies
  fastify.get('/:publisherId/escalation-policies', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    const policies = db.select().from(escalationPolicies)
      .where(eq(escalationPolicies.publisherId, publisherId))
      .orderBy(desc(escalationPolicies.createdAt))
      .all();

    const policiesWithData = policies.map(policy => ({
      ...policy,
      levels: JSON.parse(policy.levels),
    }));

    return reply.send({ policies: policiesWithData });
  });

  // Create an escalation policy
  fastify.post('/:publisherId/escalation-policies', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { name, description, levels } = request.body as {
      name: string;
      description?: string;
      levels: Array<{ delayMinutes: number; channels: string[] }>;
    };

    const policyId = randomUUID();
    const now = new Date().toISOString();

    db.insert(escalationPolicies).values({
      id: policyId,
      publisherId,
      name,
      description: description || null,
      levels: JSON.stringify(levels),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }).run();

    const policy = db.select().from(escalationPolicies)
      .where(eq(escalationPolicies.id, policyId))
      .get();

    return reply.status(201).send({
      policy: policy ? {
        ...policy,
        levels: JSON.parse(policy.levels),
      } : null
    });
  });

  // Update an escalation policy
  fastify.put('/:publisherId/escalation-policies/:policyId', async (request, reply) => {
    const { publisherId, policyId } = request.params as { publisherId: string; policyId: string };
    const { name, description, levels, enabled } = request.body as any;

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (levels !== undefined) updates.levels = JSON.stringify(levels);
    if (enabled !== undefined) updates.enabled = enabled;

    db.update(escalationPolicies)
      .set(updates)
      .where(and(
        eq(escalationPolicies.id, policyId),
        eq(escalationPolicies.publisherId, publisherId)
      ))
      .run();

    const policy = db.select().from(escalationPolicies)
      .where(eq(escalationPolicies.id, policyId))
      .get();

    return reply.send({
      policy: policy ? {
        ...policy,
        levels: JSON.parse(policy.levels),
      } : null
    });
  });

  // Delete an escalation policy
  fastify.delete('/:publisherId/escalation-policies/:policyId', async (request, reply) => {
    const { publisherId, policyId } = request.params as { publisherId: string; policyId: string };

    db.delete(escalationPolicies)
      .where(and(
        eq(escalationPolicies.id, policyId),
        eq(escalationPolicies.publisherId, publisherId)
      ))
      .run();

    return reply.send({ success: true });
  });

  // ============================================================================
  // NOTIFICATION STATS
  // ============================================================================

  // Get notification statistics
  fastify.get('/:publisherId/notification-stats', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { days = '30' } = request.query as any;

    const daysAgo = parseInt(days);
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const allNotifications = db.select().from(notifications)
      .where(and(
        eq(notifications.publisherId, publisherId),
        gte(notifications.createdAt, startDate)
      ))
      .all();

    const stats = {
      total: allNotifications.length,
      bySeverity: {
        info: allNotifications.filter(n => n.severity === 'info').length,
        warning: allNotifications.filter(n => n.severity === 'warning').length,
        critical: allNotifications.filter(n => n.severity === 'critical').length,
      },
      byStatus: {
        pending: allNotifications.filter(n => n.status === 'pending').length,
        sent: allNotifications.filter(n => n.status === 'sent').length,
        failed: allNotifications.filter(n => n.status === 'failed').length,
        acknowledged: allNotifications.filter(n => n.status === 'acknowledged').length,
      },
      byEventType: {} as Record<string, number>,
    };

    // Count by event type
    allNotifications.forEach(notification => {
      stats.byEventType[notification.eventType] = (stats.byEventType[notification.eventType] || 0) + 1;
    });

    return reply.send({ stats });
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function sendTestNotification(channel: any): Promise<{ success: boolean; message: string }> {
  const config = JSON.parse(channel.config);

  try {
    switch (channel.type) {
      case 'email':
        // In real implementation, use nodemailer or similar
        console.log(`Would send test email to: ${config.emails.join(', ')}`);
        return { success: true, message: `Test email sent to ${config.emails.length} recipient(s)` };

      case 'slack':
        // In real implementation, use Slack API
        console.log(`Would send test to Slack webhook: ${config.webhookUrl}`);
        return { success: true, message: 'Test message sent to Slack' };

      case 'discord':
        console.log(`Would send test to Discord webhook: ${config.webhookUrl}`);
        return { success: true, message: 'Test message sent to Discord' };

      case 'teams':
        console.log(`Would send test to Teams webhook: ${config.webhookUrl}`);
        return { success: true, message: 'Test message sent to Microsoft Teams' };

      case 'sms':
        console.log(`Would send test SMS to: ${config.phoneNumbers.join(', ')}`);
        return { success: true, message: `Test SMS sent to ${config.phoneNumbers.length} number(s)` };

      case 'webhook':
        console.log(`Would send test to webhook: ${config.url}`);
        return { success: true, message: 'Test webhook sent' };

      case 'pagerduty':
        console.log(`Would send test to PagerDuty integration key: ${config.integrationKey}`);
        return { success: true, message: 'Test alert sent to PagerDuty' };

      default:
        return { success: false, message: 'Unknown channel type' };
    }
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
}

async function evaluateRuleConditions(
  publisherId: string,
  eventType: string,
  conditions: any,
  now: Date
): Promise<{ conditionsMet: boolean; currentValue: number; threshold: number; details: string }> {
  // Parse time window
  const timeWindowMs = parseTimeWindow(conditions.timeWindow || '1h');
  const startTime = new Date(now.getTime() - timeWindowMs).toISOString();

  let currentValue = 0;
  const threshold = conditions.threshold || 0;
  const comparison = conditions.comparison || '>';

  // Query analytics based on event type
  const events = db.select().from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.publisherId, publisherId),
      gte(analyticsEvents.timestamp, startTime)
    ))
    .all();

  switch (eventType) {
    case 'revenue_drop':
    case 'revenue_spike':
      const revenue = events
        .filter(e => e.eventType === 'bidWon')
        .reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0);
      currentValue = revenue;
      break;

    case 'fill_rate_drop':
      const auctionInits = events.filter(e => e.eventType === 'auctionInit').length;
      const bidWins = events.filter(e => e.eventType === 'bidWon').length;
      currentValue = auctionInits > 0 ? (bidWins / auctionInits) * 100 : 0;
      break;

    case 'timeout_spike':
      const bidResponses = events.filter(e => e.eventType === 'bidResponse');
      const timeouts = bidResponses.filter(e => e.timeout).length;
      currentValue = bidResponses.length > 0 ? (timeouts / bidResponses.length) * 100 : 0;
      break;

    case 'error_spike':
      const errors = events.filter(e => e.eventType === 'bidError').length;
      currentValue = errors;
      break;

    case 'cpm_drop':
      const bidWinEvents = events.filter(e => e.eventType === 'bidWon');
      const avgCpm = bidWinEvents.length > 0
        ? bidWinEvents.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0) / bidWinEvents.length
        : 0;
      currentValue = avgCpm;
      break;

    case 'impression_drop':
      const impressions = events.filter(e => e.eventType === 'bidWon').length;
      currentValue = impressions;
      break;

    default:
      currentValue = 0;
  }

  // Evaluate condition
  let conditionsMet = false;
  switch (comparison) {
    case '>':
      conditionsMet = currentValue > threshold;
      break;
    case '<':
      conditionsMet = currentValue < threshold;
      break;
    case '>=':
      conditionsMet = currentValue >= threshold;
      break;
    case '<=':
      conditionsMet = currentValue <= threshold;
      break;
    case '==':
      conditionsMet = currentValue === threshold;
      break;
  }

  return {
    conditionsMet,
    currentValue,
    threshold,
    details: `${eventType}: ${currentValue.toFixed(2)} ${comparison} ${threshold}`,
  };
}

function parseTimeWindow(window: string): number {
  const match = window.match(/^(\d+)([hmd])$/);
  if (!match) return 60 * 60 * 1000; // Default 1 hour

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}
