/**
 * Rate limit configurations for different endpoint types
 */

import { TIMEOUTS } from '../constants/timeouts';

/**
 * Rate limit config for public wrapper endpoints
 * Lower limit to prevent abuse while allowing legitimate traffic
 */
export const publicWrapperRateLimit = {
  max: 100,
  timeWindow: '1 minute',
};

/**
 * Rate limit config for public build file endpoints
 * Same as wrapper to prevent CDN abuse
 */
export const publicBuildRateLimit = {
  max: 100,
  timeWindow: '1 minute',
};

/**
 * Rate limit config for authenticated API endpoints
 * Higher limit for authenticated users
 */
export const authenticatedApiRateLimit = {
  max: 200,
  timeWindow: '1 minute',
};

/**
 * Rate limit config for analytics beacon endpoint
 * Higher limit since this receives frequent tracking requests
 */
export const analyticsBeaconRateLimit = {
  max: 500,
  timeWindow: '1 minute',
};

/**
 * Rate limit config for login endpoint
 * Strict limit to prevent brute force attacks
 */
export const loginRateLimit = {
  max: TIMEOUTS.LOGIN_RATE_LIMIT_MAX,
  timeWindow: TIMEOUTS.RATE_LIMIT_WINDOW,
  errorResponseBuilder: () => ({
    error: 'Too many login attempts',
    message: 'Please try again in a minute',
  }),
};
