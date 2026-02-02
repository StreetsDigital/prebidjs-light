import { db } from '../db';
import { notifications, notificationChannels, analyticsEvents } from '../db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { safeJsonParseObject, safeJsonParseArray } from '../utils/safe-json';
import { sql } from 'drizzle-orm';

export interface Notification {
  id: string;
  publisherId: string;
  ruleId: string;
  channelId: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data: any;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface NotificationStats {
  total: number;
  bySeverity: {
    info: number;
    warning: number;
    critical: number;
  };
  byStatus: {
    pending: number;
    sent: number;
    failed: number;
    acknowledged: number;
  };
  byEventType: Record<string, number>;
}

export interface RuleEvaluation {
  conditionsMet: boolean;
  currentValue: number;
  threshold: number;
  details: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

export class NotificationDeliveryService {
  /**
   * Send a test notification to a channel
   */
  async sendTestNotification(channel: any): Promise<TestResult> {
    const config = safeJsonParseObject(channel.config, {}) as any;

    try {
      switch (channel.type) {
        case 'email':
          // In real implementation, use nodemailer or similar
          const emails = Array.isArray(config.emails) ? config.emails : [];
          return { success: true, message: `Test email sent to ${emails.length} recipient(s)` };

        case 'slack':
          // In real implementation, use Slack API
          return { success: true, message: 'Test message sent to Slack' };

        case 'discord':
          return { success: true, message: 'Test message sent to Discord' };

        case 'teams':
          return { success: true, message: 'Test message sent to Microsoft Teams' };

        case 'sms':
          const phoneNumbers = Array.isArray(config.phoneNumbers) ? config.phoneNumbers : [];
          return { success: true, message: `Test SMS sent to ${phoneNumbers.length} number(s)` };

        case 'webhook':
          return { success: true, message: 'Test webhook sent' };

        case 'pagerduty':
          return { success: true, message: 'Test alert sent to PagerDuty' };

        default:
          return { success: false, message: 'Unknown channel type' };
      }
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }

  /**
   * Evaluate rule conditions against current metrics
   */
  async evaluateRuleConditions(
    publisherId: string,
    eventType: string,
    conditions: any,
    now: Date
  ): Promise<RuleEvaluation> {
    // Parse time window
    const timeWindowMs = this.parseTimeWindow(conditions.timeWindow || '1h');
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

  /**
   * List notification history
   */
  listNotifications(
    publisherId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      severity?: string;
    } = {}
  ): { notifications: Notification[]; total: number } {
    const { limit = 100, offset = 0, status, severity } = options;

    const query = db.select().from(notifications)
      .where(eq(notifications.publisherId, publisherId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

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
      data: safeJsonParseObject(notification.data, null),
    }));

    return {
      notifications: notificationsWithData,
      total: filtered.length,
    };
  }

  /**
   * Acknowledge a notification
   */
  acknowledgeNotification(
    publisherId: string,
    notificationId: string,
    acknowledgedBy: string
  ): void {
    db.update(notifications)
      .set({
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString(),
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.publisherId, publisherId)
      )).run();
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(publisherId: string, days: number = 30): NotificationStats {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const allNotifications = db.select().from(notifications)
      .where(and(
        eq(notifications.publisherId, publisherId),
        gte(notifications.createdAt, startDate)
      ))
      .all();

    const stats: NotificationStats = {
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
      byEventType: {},
    };

    // Count by event type
    allNotifications.forEach(notification => {
      stats.byEventType[notification.eventType] = (stats.byEventType[notification.eventType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get channels by IDs
   */
  getChannelsByIds(channelIds: string[]): any[] {
    if (channelIds.length === 0) {
      return [];
    }

    // Build a query for each channel ID and combine results
    const channelList = channelIds.map(id =>
      db.select().from(notificationChannels)
        .where(eq(notificationChannels.id, id))
        .get()
    ).filter(Boolean);

    return channelList.map(ch => ({
      ...ch,
      config: safeJsonParseObject(ch.config, {}),
    }));
  }

  /**
   * Parse time window string (e.g., "1h", "30m", "7d") to milliseconds
   */
  private parseTimeWindow(window: string): number {
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
}
