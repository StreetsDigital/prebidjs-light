/**
 * API timeout and duration constants
 *
 * This file centralizes all timeout, expiry, and duration values used across the API.
 * Using named constants instead of magic numbers improves code maintainability and
 * makes it easier to adjust timing behavior globally.
 */

export const TIMEOUTS = {
  /**
   * Default bidder timeout in milliseconds
   * Used when no publisher-specific timeout is configured
   * Standard Prebid.js recommendation is 1000-2000ms
   */
  DEFAULT_BIDDER_TIMEOUT: 1500,

  /**
   * JWT access token expiration time
   * 24 hours provides good balance between security and user experience
   */
  JWT_EXPIRY: '24h',

  /**
   * Refresh token expiration in days
   * Allows users to stay logged in for a week without re-authenticating
   */
  REFRESH_TOKEN_EXPIRY_DAYS: 7,

  /**
   * Password reset token expiration in hours
   * Short window reduces security risk if reset link is intercepted
   */
  PASSWORD_RESET_EXPIRY_HOURS: 1,

  /**
   * Session cookie max age in seconds (7 days)
   * Calculated as: 7 days * 24 hours * 60 minutes * 60 seconds
   */
  SESSION_COOKIE_MAX_AGE: 7 * 24 * 60 * 60,

  /**
   * Rate limit time window
   * Sliding window for rate limiting requests
   */
  RATE_LIMIT_WINDOW: '1 minute',

  /**
   * Maximum requests per rate limit window
   * General API endpoints allow 100 requests per minute
   */
  RATE_LIMIT_MAX_REQUESTS: 100,

  /**
   * Login endpoint rate limit
   * Stricter limit to prevent brute force attacks
   */
  LOGIN_RATE_LIMIT_MAX: 5,

  /**
   * Wrapper script cache TTL in milliseconds (5 minutes)
   * Balances freshness with reduced regeneration overhead
   */
  CACHE_TTL: 5 * 60 * 1000,

  /**
   * Cache cleanup interval in milliseconds (5 minutes)
   * Periodic cleanup prevents unbounded memory growth
   */
  CLEANUP_INTERVAL: 5 * 60 * 1000,

  /**
   * Wrapper script HTTP cache max-age in seconds (5 minutes)
   * CDN and browser cache duration for wrapper scripts
   */
  WRAPPER_CACHE_MAX_AGE: 300,

  /**
   * Config endpoint cache time in seconds (5 minutes)
   * Default cache time for publisher config endpoint
   */
  CONFIG_CACHE_TIME: 300,

  /**
   * A/B test config cache time in seconds (1 minute)
   * Shorter cache for A/B tests to allow variant switching
   */
  AB_TEST_CACHE_TIME: 60,

  /**
   * Prebid data refresh interval in hours (24 hours)
   * How often to refresh Prebid component data from GitHub
   */
  PREBID_REFRESH_INTERVAL_HOURS: 24,
} as const;
