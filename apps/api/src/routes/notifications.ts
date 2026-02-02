import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../middleware/auth';
import { NotificationService } from '../services/notification-service';
import { NotificationRuleService } from '../services/notification-rule-service';
import { NotificationDeliveryService } from '../services/notification-delivery-service';
import { safeJsonParseArray } from '../utils/safe-json';

// Initialize services
const notificationService = new NotificationService();
const ruleService = new NotificationRuleService();
const deliveryService = new NotificationDeliveryService();

export default async function notificationsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // NOTIFICATION CHANNELS
  // ============================================================================

  // List all notification channels for a publisher
  fastify.get('/:publisherId/notification-channels', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const channels = notificationService.listChannels(publisherId);
    return reply.send({ channels });
  });

  // Create a new notification channel
  fastify.post('/:publisherId/notification-channels', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { name, type, config } = request.body as {
      name: string;
      type: 'email' | 'slack' | 'discord' | 'teams' | 'sms' | 'webhook' | 'pagerduty';
      config: any;
    };

    const channel = notificationService.createChannel(publisherId, { name, type, config });
    return reply.status(201).send({ channel });
  });

  // Update a notification channel
  fastify.put('/:publisherId/notification-channels/:channelId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, channelId } = request.params as { publisherId: string; channelId: string };
    const { name, type, config, enabled } = request.body as {
      name?: string;
      type?: string;
      config?: any;
      enabled?: boolean;
    };

    const channel = notificationService.updateChannel(publisherId, channelId, {
      name,
      type,
      config,
      enabled,
    });

    return reply.send({ channel });
  });

  // Delete a notification channel
  fastify.delete('/:publisherId/notification-channels/:channelId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, channelId } = request.params as { publisherId: string; channelId: string };
    notificationService.deleteChannel(publisherId, channelId);
    return reply.send({ success: true });
  });

  // Test a notification channel
  fastify.post('/:publisherId/notification-channels/:channelId/test', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, channelId } = request.params as { publisherId: string; channelId: string };

    const channel = notificationService.getChannel(publisherId, channelId);

    if (!channel) {
      return reply.status(404).send({ error: 'Channel not found' });
    }

    const testResult = await deliveryService.sendTestNotification(channel);
    notificationService.updateChannelTestStatus(channelId, testResult.success);

    return reply.send({
      success: testResult.success,
      message: testResult.message,
    });
  });

  // ============================================================================
  // NOTIFICATION RULES
  // ============================================================================

  // List all notification rules for a publisher
  fastify.get('/:publisherId/notification-rules', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const rules = ruleService.listRules(publisherId);
    return reply.send({ rules });
  });

  // Create a new notification rule
  fastify.post('/:publisherId/notification-rules', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
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

    const rule = ruleService.createRule(publisherId, {
      name,
      description,
      eventType,
      conditions,
      channels,
      severity,
      cooldownMinutes,
      escalationPolicyId,
    });

    return reply.status(201).send({ rule });
  });

  // Update a notification rule
  fastify.put('/:publisherId/notification-rules/:ruleId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };
    const updates = request.body as any;

    const rule = ruleService.updateRule(publisherId, ruleId, updates);
    return reply.send({ rule });
  });

  // Delete a notification rule
  fastify.delete('/:publisherId/notification-rules/:ruleId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };
    ruleService.deleteRule(publisherId, ruleId);
    return reply.send({ success: true });
  });

  // Toggle notification rule enabled/disabled
  fastify.patch('/:publisherId/notification-rules/:ruleId/toggle', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    try {
      const enabled = ruleService.toggleRule(publisherId, ruleId);
      return reply.send({ enabled });
    } catch (error) {
      return reply.status(404).send({ error: 'Rule not found' });
    }
  });

  // Test a notification rule (dry run)
  fastify.post('/:publisherId/notification-rules/:ruleId/test', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    const rule = ruleService.getRule(publisherId, ruleId);

    if (!rule) {
      return reply.status(404).send({ error: 'Rule not found' });
    }

    const conditions = rule.conditions;
    const channelIds = Array.isArray(rule.channels) ? rule.channels : [];

    // Evaluate conditions against current metrics
    const now = new Date();
    const evaluation = await deliveryService.evaluateRuleConditions(
      publisherId,
      rule.eventType,
      conditions,
      now
    );

    // Get channel info
    const channelList = deliveryService.getChannelsByIds(channelIds);

    return reply.send({
      rule,
      evaluation,
      channelsToNotify: channelList,
      wouldTrigger: evaluation.conditionsMet,
    });
  });

  // ============================================================================
  // NOTIFICATIONS (HISTORY)
  // ============================================================================

  // List notification history
  fastify.get('/:publisherId/notifications', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { limit = '100', offset = '0', status, severity } = request.query as any;

    const result = deliveryService.listNotifications(publisherId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      severity,
    });

    return reply.send(result);
  });

  // Acknowledge a notification
  fastify.post('/:publisherId/notifications/:notificationId/acknowledge', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, notificationId } = request.params as { publisherId: string; notificationId: string };
    const { acknowledgedBy } = request.body as { acknowledgedBy: string };

    deliveryService.acknowledgeNotification(publisherId, notificationId, acknowledgedBy);
    return reply.send({ success: true });
  });

  // ============================================================================
  // ESCALATION POLICIES
  // ============================================================================

  // List all escalation policies
  fastify.get('/:publisherId/escalation-policies', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const policies = ruleService.listEscalationPolicies(publisherId);
    return reply.send({ policies });
  });

  // Create an escalation policy
  fastify.post('/:publisherId/escalation-policies', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { name, description, levels } = request.body as {
      name: string;
      description?: string;
      levels: Array<{ delayMinutes: number; channels: string[] }>;
    };

    const policy = ruleService.createEscalationPolicy(publisherId, {
      name,
      description,
      levels,
    });

    return reply.status(201).send({ policy });
  });

  // Update an escalation policy
  fastify.put('/:publisherId/escalation-policies/:policyId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, policyId } = request.params as { publisherId: string; policyId: string };
    const { name, description, levels, enabled } = request.body as any;

    const policy = ruleService.updateEscalationPolicy(publisherId, policyId, {
      name,
      description,
      levels,
      enabled,
    });

    return reply.send({ policy });
  });

  // Delete an escalation policy
  fastify.delete('/:publisherId/escalation-policies/:policyId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, policyId } = request.params as { publisherId: string; policyId: string };
    ruleService.deleteEscalationPolicy(publisherId, policyId);
    return reply.send({ success: true });
  });

  // ============================================================================
  // NOTIFICATION STATS
  // ============================================================================

  // Get notification statistics
  fastify.get('/:publisherId/notification-stats', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { days = '30' } = request.query as any;

    const stats = deliveryService.getNotificationStats(publisherId, parseInt(days));
    return reply.send({ stats });
  });
}
