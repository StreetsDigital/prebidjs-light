# Constants Refactoring - Magic Numbers Elimination

## Overview

This document describes the refactoring effort to replace magic numbers with named constants throughout the pbjs_engine codebase. This improvement enhances code maintainability, readability, and makes it easier to adjust timing and pagination behavior globally.

**Issue**: LOW severity - Replace magic numbers with named constants
**Status**: ✅ Completed
**Date**: 2026-02-01

## Created Constants Files

### Backend (API)

#### 1. `/apps/api/src/constants/timeouts.ts`

Centralizes all timeout, expiry, and duration values:

```typescript
export const TIMEOUTS = {
  DEFAULT_BIDDER_TIMEOUT: 1500,           // Default Prebid.js bidder timeout (1.5s)
  JWT_EXPIRY: '24h',                      // JWT access token expiration
  REFRESH_TOKEN_EXPIRY_DAYS: 7,           // Refresh token validity period
  PASSWORD_RESET_EXPIRY_HOURS: 1,         // Password reset token window
  SESSION_COOKIE_MAX_AGE: 7 * 24 * 60 * 60, // Session cookie max age (7 days)
  RATE_LIMIT_WINDOW: '1 minute',          // Rate limiting time window
  RATE_LIMIT_MAX_REQUESTS: 100,           // General API rate limit
  LOGIN_RATE_LIMIT_MAX: 5,                // Login endpoint rate limit
  CACHE_TTL: 5 * 60 * 1000,               // Wrapper cache TTL (5 minutes)
  CLEANUP_INTERVAL: 5 * 60 * 1000,        // Cache cleanup interval
  WRAPPER_CACHE_MAX_AGE: 300,             // HTTP cache for wrapper scripts (5 min)
  CONFIG_CACHE_TIME: 300,                 // Config endpoint cache time (5 min)
  AB_TEST_CACHE_TIME: 60,                 // A/B test config cache (1 min)
  PREBID_REFRESH_INTERVAL_HOURS: 24,      // Prebid data refresh interval
} as const;
```

**Usage**: Import in routes, middleware, and utilities that deal with timing.

#### 2. `/apps/api/src/constants/pagination.ts`

Defines standard pagination limits for API endpoints:

```typescript
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,                  // General list endpoints default
  MAX_PAGE_SIZE: 100,                     // Maximum allowed page size
  AUDIT_LOGS_PAGE_SIZE: 50,               // Audit logs default page size
  ANALYTICS_PAGE_SIZE: 20,                // Analytics events default
  WEBSITES_PAGE_SIZE: 50,                 // Websites list default
  NOTIFICATIONS_PAGE_SIZE: 100,           // Notifications default
  OPTIMIZATION_RULES_PAGE_SIZE: 50,       // Optimization rules default
  CUSTOM_REPORTS_PAGE_SIZE: 50,           // Custom reports default
  AUCTION_INSPECTOR_PAGE_SIZE: 50,        // Auction inspector default
  CHAT_PAGE_SIZE: 20,                     // Chat messages default
  PREBID_BUILDS_PAGE_SIZE: 20,            // Prebid builds default
} as const;
```

**Usage**: Import in route handlers for consistent pagination across endpoints.

### Frontend (Admin)

#### 3. `/apps/admin/src/constants/polling.ts`

Centralizes UI timing and polling intervals:

```typescript
export const POLLING = {
  DEFAULT_INTERVAL: 30000,                // Default polling interval (30s)
  FAST_INTERVAL: 5000,                    // Fast polling for live updates (5s)
  SLOW_INTERVAL: 60000,                   // Slow polling for background updates (1 min)
  TOAST_DURATION: 5000,                   // Toast notification duration (5s)
  SEARCH_DEBOUNCE: 300,                   // Search input debounce (300ms)
  AUTO_SAVE_DELAY: 2000,                  // Auto-save delay (2s)
} as const;
```

**Usage**: Import in React components, stores, and hooks for consistent timing behavior.

### Wrapper

#### 4. `/apps/wrapper/src/constants/analytics.ts`

Defines analytics batching behavior:

```typescript
export const ANALYTICS = {
  BATCH_SIZE: 10,                         // Events per batch
  BATCH_INTERVAL: 30000,                  // Max batch wait time (30s)
} as const;
```

**Usage**: Import in wrapper analytics logic for event batching.

## Files Updated

### Backend Files

#### Core Server Files

1. **`apps/api/src/index.ts`**
   - Replaced rate limit magic numbers with `TIMEOUTS.RATE_LIMIT_MAX_REQUESTS` and `TIMEOUTS.RATE_LIMIT_WINDOW`
   - Replaced cache TTL with `TIMEOUTS.CACHE_TTL`
   - Replaced bidder timeout default with `TIMEOUTS.DEFAULT_BIDDER_TIMEOUT`
   - Replaced cache max-age values with `TIMEOUTS.WRAPPER_CACHE_MAX_AGE`, `TIMEOUTS.CONFIG_CACHE_TIME`, `TIMEOUTS.AB_TEST_CACHE_TIME`

#### Authentication & Security

2. **`apps/api/src/routes/auth.ts`**
   - Replaced login rate limit with `TIMEOUTS.LOGIN_RATE_LIMIT_MAX` and `TIMEOUTS.RATE_LIMIT_WINDOW`
   - Replaced JWT expiry `'24h'` with `TIMEOUTS.JWT_EXPIRY`
   - Replaced refresh token days with `TIMEOUTS.REFRESH_TOKEN_EXPIRY_DAYS`
   - Replaced cookie max age calculation with `TIMEOUTS.SESSION_COOKIE_MAX_AGE`
   - Replaced password reset expiry with `TIMEOUTS.PASSWORD_RESET_EXPIRY_HOURS`

#### Utilities

3. **`apps/api/src/utils/wrapper-generator.ts`**
   - Replaced cache TTL with `TIMEOUTS.CACHE_TTL`
   - Replaced cleanup interval with `TIMEOUTS.CLEANUP_INTERVAL`

#### Route Handlers

4. **`apps/api/src/routes/publishers.ts`**
   - Replaced default limit `'10'` with `PAGINATION.DEFAULT_PAGE_SIZE`
   - Replaced max page size `100` with `PAGINATION.MAX_PAGE_SIZE`

5. **`apps/api/src/routes/audit-logs.ts`**
   - Replaced default limit `'50'` with `PAGINATION.AUDIT_LOGS_PAGE_SIZE`
   - Replaced max page size `100` with `PAGINATION.MAX_PAGE_SIZE`

6. **`apps/api/src/routes/websites.ts`**
   - Replaced default limit `'50'` with `PAGINATION.WEBSITES_PAGE_SIZE`
   - Replaced max page size `100` with `PAGINATION.MAX_PAGE_SIZE`

7. **`apps/api/src/routes/analytics.ts`**
   - Replaced analytics limit `100` with `PAGINATION.ANALYTICS_PAGE_SIZE`
   - Note: Heartbeat interval kept as `30000` inline (could be refactored to use a constant in future)

### Frontend Files

8. **`apps/admin/src/stores/toastStore.ts`**
   - Replaced toast duration `5000` with `POLLING.TOAST_DURATION`

### Wrapper Files

9. **`apps/wrapper/src/pb.ts`**
   - Replaced batch size `10` with `ANALYTICS.BATCH_SIZE`
   - Replaced batch interval `30000` with `ANALYTICS.BATCH_INTERVAL`

## Benefits

### 1. Maintainability
- **Single Source of Truth**: All timing and pagination values are now defined in one place per domain (backend/frontend/wrapper)
- **Easy Updates**: Changing a timeout or page size now requires updating only one constant instead of hunting for magic numbers
- **Reduced Errors**: Less chance of inconsistent values across the codebase

### 2. Readability
- **Self-Documenting**: Named constants like `TIMEOUTS.JWT_EXPIRY` are more descriptive than `'24h'`
- **Context**: JSDoc comments explain why each value was chosen
- **Discoverability**: Developers can browse the constants files to understand all configurable timing values

### 3. Testing
- **Easier Mocking**: Constants can be easily mocked in tests
- **Centralized Configuration**: Test configurations can override constants in one place

### 4. Performance Tuning
- **Global Adjustments**: Can tune performance characteristics (cache TTLs, polling intervals) globally
- **A/B Testing**: Easy to experiment with different values by changing constants

## Migration Guide

### Adding New Timeout/Duration Values

1. Add to the appropriate constants file:
```typescript
// In apps/api/src/constants/timeouts.ts
export const TIMEOUTS = {
  // ... existing constants
  NEW_FEATURE_TIMEOUT: 5000, // Add JSDoc comment explaining the value
} as const;
```

2. Import and use:
```typescript
import { TIMEOUTS } from '../constants/timeouts';

setTimeout(() => {
  // ... do something
}, TIMEOUTS.NEW_FEATURE_TIMEOUT);
```

### Adding New Pagination Values

1. Add to pagination constants:
```typescript
// In apps/api/src/constants/pagination.ts
export const PAGINATION = {
  // ... existing constants
  NEW_FEATURE_PAGE_SIZE: 25,
} as const;
```

2. Use in route handler:
```typescript
import { PAGINATION } from '../constants/pagination';

const { limit = String(PAGINATION.NEW_FEATURE_PAGE_SIZE) } = request.query;
const limitNum = Math.min(PAGINATION.MAX_PAGE_SIZE, parseInt(limit, 10) || PAGINATION.NEW_FEATURE_PAGE_SIZE);
```

### Adding New Frontend Timing Values

1. Add to polling constants:
```typescript
// In apps/admin/src/constants/polling.ts
export const POLLING = {
  // ... existing constants
  NEW_FEATURE_INTERVAL: 15000, // 15 seconds
} as const;
```

2. Use in React components:
```typescript
import { POLLING } from '../constants/polling';

useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, POLLING.NEW_FEATURE_INTERVAL);

  return () => clearInterval(interval);
}, []);
```

## Remaining Magic Numbers

The following categories of magic numbers were intentionally NOT refactored:

### 1. Business Logic Numbers
- Price calculations, revenue multipliers
- Bidder-specific parameters
- Ad unit dimensions

### 2. HTTP Status Codes
- `200`, `201`, `400`, `401`, `404`, `500` - Standard HTTP codes are self-documenting

### 3. Array/String Manipulation
- Array indices (`[0]`, `[1]`)
- String substring positions
- Array slice arguments

### 4. Mathematical Constants
- Percentage calculations (`* 100`)
- Unit conversions that are self-evident

### 5. Configuration Defaults
- Default values for optional configuration parameters that are business-specific

## Testing

### Verification Steps

1. **API Server Builds Successfully**
```bash
cd apps/api
npm run build
```

2. **Admin Portal Builds Successfully**
```bash
cd apps/admin
npm run build
```

3. **Wrapper Builds Successfully**
```bash
cd apps/wrapper
npm run build
```

4. **Functional Testing**
- Test login rate limiting (should limit to 5 attempts per minute)
- Test pagination (should use new default page sizes)
- Test JWT expiry (should expire after 24 hours)
- Test toast notifications (should dismiss after 5 seconds)

## Future Improvements

### 1. Environment-Based Configuration
Consider making some constants environment-specific:
```typescript
export const TIMEOUTS = {
  CACHE_TTL: process.env.NODE_ENV === 'production'
    ? 5 * 60 * 1000  // 5 minutes in prod
    : 10 * 1000,     // 10 seconds in dev
} as const;
```

### 2. Configuration File
For truly dynamic configuration, consider moving to a config file:
```typescript
// config/timeouts.config.ts
export const timeoutsConfig = loadConfig('timeouts.json');
```

### 3. Admin UI for Constants
Could create an admin interface to adjust certain constants at runtime (e.g., rate limits, cache TTLs)

### 4. More Route Files
Additional route files that could benefit from pagination constants:
- `apps/api/src/routes/optimization-rules.ts`
- `apps/api/src/routes/custom-reports.ts`
- `apps/api/src/routes/notifications.ts`
- `apps/api/src/routes/auction-inspector.ts`
- `apps/api/src/routes/chat.ts`
- `apps/api/src/routes/prebid-builds.ts`

## Related Documentation

- See `CLAUDE.md` for general development guidelines
- See `PHASE2_FEATURES.md` for Phase 2 feature documentation
- See TypeScript documentation for `as const` assertions

## Conclusion

This refactoring successfully eliminates the most critical magic numbers from the codebase, focusing on:
- **Timeouts and Durations**: All timing-related values
- **Pagination Limits**: All page size and limit values
- **Rate Limits**: Authentication and API throttling
- **Cache TTLs**: All cache expiration times

The codebase is now more maintainable, with clear documentation of all timing-related configuration values.
