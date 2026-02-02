/**
 * Pagination constants
 *
 * This file defines standard pagination limits used across API endpoints.
 * Consistent pagination limits improve API usability and prevent performance issues
 * from overly large result sets.
 */

export const PAGINATION = {
  /**
   * Default page size for general list endpoints
   * Conservative default balances response size with number of requests
   */
  DEFAULT_PAGE_SIZE: 10,

  /**
   * Maximum allowed page size for any endpoint
   * Prevents excessive database load and response payload size
   */
  MAX_PAGE_SIZE: 100,

  /**
   * Default page size for audit logs
   * Larger default since audit logs are typically browsed in bulk
   */
  AUDIT_LOGS_PAGE_SIZE: 50,

  /**
   * Default page size for analytics events
   * Moderate size for time-series data viewing
   */
  ANALYTICS_PAGE_SIZE: 20,

  /**
   * Default page size for websites list
   * Moderate size for nested resource listings
   */
  WEBSITES_PAGE_SIZE: 50,

  /**
   * Default page size for notifications
   * Large default since users may want to see many notifications at once
   */
  NOTIFICATIONS_PAGE_SIZE: 100,

  /**
   * Default page size for optimization rules
   * Large default for configuration management interfaces
   */
  OPTIMIZATION_RULES_PAGE_SIZE: 50,

  /**
   * Default page size for custom reports
   * Large default for report listings
   */
  CUSTOM_REPORTS_PAGE_SIZE: 50,

  /**
   * Default page size for auction inspector
   * Moderate size for detailed auction debugging
   */
  AUCTION_INSPECTOR_PAGE_SIZE: 50,

  /**
   * Default page size for chat messages
   * Standard chat pagination size
   */
  CHAT_PAGE_SIZE: 20,

  /**
   * Default page size for prebid builds
   * Standard build history pagination
   */
  PREBID_BUILDS_PAGE_SIZE: 20,
} as const;
