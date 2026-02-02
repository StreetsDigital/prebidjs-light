/**
 * Polling and refresh intervals for frontend
 *
 * This file centralizes all polling, auto-refresh, and UI timing constants.
 * Using named constants makes it easier to tune performance and user experience.
 */

export const POLLING = {
  /**
   * Default polling interval in milliseconds (30 seconds)
   * Used for standard real-time data updates (analytics, notifications)
   */
  DEFAULT_INTERVAL: 30000,

  /**
   * Fast polling interval in milliseconds (5 seconds)
   * Used for high-frequency updates (active auctions, live monitoring)
   */
  FAST_INTERVAL: 5000,

  /**
   * Slow polling interval in milliseconds (1 minute)
   * Used for low-priority background updates
   */
  SLOW_INTERVAL: 60000,

  /**
   * Toast notification duration in milliseconds (5 seconds)
   * How long toast messages stay visible before auto-dismissing
   */
  TOAST_DURATION: 5000,

  /**
   * Debounce delay for search inputs in milliseconds (300ms)
   * Prevents excessive API calls while user is typing
   */
  SEARCH_DEBOUNCE: 300,

  /**
   * Auto-save delay in milliseconds (2 seconds)
   * Delay before auto-saving form changes
   */
  AUTO_SAVE_DELAY: 2000,
} as const;
