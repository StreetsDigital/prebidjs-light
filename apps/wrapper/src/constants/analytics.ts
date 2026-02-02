/**
 * Analytics batching constants for wrapper
 *
 * This file defines constants for analytics event batching behavior.
 * Batching reduces network overhead and server load by aggregating events.
 */

export const ANALYTICS = {
  /**
   * Analytics batch size (number of events)
   * Send batch when this many events have been collected
   */
  BATCH_SIZE: 10,

  /**
   * Analytics batch interval in milliseconds (30 seconds)
   * Maximum time to wait before sending a partial batch
   */
  BATCH_INTERVAL: 30000,
} as const;
