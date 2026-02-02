import { randomUUID } from 'crypto';
import { db } from '../db';
import { notificationChannels } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { safeJsonParseObject } from '../utils/safe-json';

export interface NotificationChannel {
  id: string;
  publisherId: string;
  name: string;
  type: 'email' | 'slack' | 'discord' | 'teams' | 'sms' | 'webhook' | 'pagerduty';
  config: any;
  enabled: boolean;
  verified: boolean;
  lastTestAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelInput {
  name: string;
  type: 'email' | 'slack' | 'discord' | 'teams' | 'sms' | 'webhook' | 'pagerduty';
  config: any;
}

export interface UpdateChannelInput {
  name?: string;
  type?: string;
  config?: any;
  enabled?: boolean;
}

export class NotificationService {
  /**
   * List all notification channels for a publisher
   */
  listChannels(publisherId: string): NotificationChannel[] {
    const channels = db.select().from(notificationChannels)
      .where(eq(notificationChannels.publisherId, publisherId))
      .orderBy(desc(notificationChannels.createdAt))
      .all();

    return channels.map(channel => ({
      ...channel,
      config: safeJsonParseObject(channel.config, {}),
    }));
  }

  /**
   * Create a new notification channel
   */
  createChannel(publisherId: string, input: CreateChannelInput): NotificationChannel {
    const channelId = randomUUID();
    const now = new Date().toISOString();

    db.insert(notificationChannels).values({
      id: channelId,
      publisherId,
      name: input.name,
      type: input.type,
      config: JSON.stringify(input.config),
      enabled: true,
      verified: false,
      createdAt: now,
      updatedAt: now,
    }).run();

    const channel = db.select().from(notificationChannels)
      .where(eq(notificationChannels.id, channelId))
      .get();

    if (!channel) {
      throw new Error('Failed to create channel');
    }

    return {
      ...channel,
      config: safeJsonParseObject(channel.config, {}),
    };
  }

  /**
   * Update a notification channel
   */
  updateChannel(
    publisherId: string,
    channelId: string,
    input: UpdateChannelInput
  ): NotificationChannel | null {
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.type !== undefined) updates.type = input.type;
    if (input.config !== undefined) updates.config = JSON.stringify(input.config);
    if (input.enabled !== undefined) updates.enabled = input.enabled;

    db.update(notificationChannels)
      .set(updates)
      .where(and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.publisherId, publisherId)
      )).run();

    const channel = db.select().from(notificationChannels)
      .where(eq(notificationChannels.id, channelId))
      .get();

    if (!channel) {
      return null;
    }

    return {
      ...channel,
      config: safeJsonParseObject(channel.config, {}),
    };
  }

  /**
   * Delete a notification channel
   */
  deleteChannel(publisherId: string, channelId: string): void {
    db.delete(notificationChannels)
      .where(and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.publisherId, publisherId)
      )).run();
  }

  /**
   * Get a single notification channel
   */
  getChannel(publisherId: string, channelId: string): NotificationChannel | null {
    const channel = db.select().from(notificationChannels)
      .where(and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.publisherId, publisherId)
      ))
      .get();

    if (!channel) {
      return null;
    }

    return {
      ...channel,
      config: safeJsonParseObject(channel.config, {}),
    };
  }

  /**
   * Update channel test timestamp and verification status
   */
  updateChannelTestStatus(channelId: string, success: boolean): void {
    db.update(notificationChannels)
      .set({
        lastTestAt: new Date().toISOString(),
        verified: success,
      })
      .where(eq(notificationChannels.id, channelId)).run();
  }
}
