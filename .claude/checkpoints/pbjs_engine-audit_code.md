# pbjs_engine Production Readiness Audit
**Date**: 2026-02-03
**Status**: COMPLETE

## Executive Summary

This audit identifies 5 CRITICAL, 8 HIGH, 6 MEDIUM, and 4 LOW priority issues that should be addressed before production deployment.

---

## CRITICAL ISSUES (Must fix before production)

### 1. SQLite Not Suitable for Production Multi-Server Deployment
**File**: `/apps/api/src/db/index.ts`
**Lines**: 7-24

SQLite is configured as the production database. While SQLite is excellent for development and single-server deployments, it has significant limitations for production:
- Single-writer limitation causes database locks under concurrent load
- WAL mode helps but doesn't solve multi-server scaling
- No native replication or high availability
- Database file is 1MB+ with 4MB WAL file already

**Evidence**:
```typescript
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'pbjs_engine.db');
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
```

**Remediation**:
- For single-server: Keep SQLite but implement backup strategy
- For multi-server: Migrate to PostgreSQL (schema already supports it)
- Add connection pooling for PostgreSQL
- Implement proper backup/restore procedures

### 2. Security Headers Disabled
**File**: `/apps/api/src/config/server-config.ts`
**Lines**: 60-71

The @fastify/helmet security headers plugin is commented out due to version mismatch:

```typescript
// Security headers - Temporarily disabled due to Fastify version mismatch
// TODO: Upgrade to Fastify 5.x or downgrade @fastify/helmet to compatible version
// await app.register(helmet, {
//   contentSecurityPolicy: {...},
// });
```

**Impact**: Missing X-Frame-Options, X-Content-Type-Options, HSTS, CSP headers
**Remediation**: Downgrade @fastify/helmet to v11.x for Fastify 4.x compatibility or add headers manually

### 3. Development Credentials in .env Files (In Repository)
**File**: `/apps/api/.env`
**Lines**: 6-7, 19-20

Production credentials and secrets are present:
```
JWT_SECRET=dev-jwt-secret-for-testing-only-change-in-production
COOKIE_SECRET=dev-cookie-secret-for-testing-only-change-in-production
SUPER_ADMIN_PASSWORD=ChangeMe123!
```

**Remediation**:
- Add .env to .gitignore immediately
- Rotate all secrets before production
- Use environment-specific secret management (AWS Secrets Manager, Vault)

### 4. No Graceful Shutdown Handling
**File**: `/apps/api/src/index.ts`

The server has no signal handlers for SIGTERM/SIGINT:
- Database connections may not close cleanly
- In-flight requests will be terminated abruptly
- Build processes may leave orphaned jobs

**Remediation**: Add graceful shutdown handler:
```typescript
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, starting graceful shutdown`);
  await app.close();
  sqlite.close();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 5. No Uncaught Exception Handler
**Files**: `/apps/api/src/index.ts`

No global error handlers for uncaught exceptions or unhandled promise rejections. Server will crash without logging.

**Remediation**:
```typescript
process.on('uncaughtException', (error) => {
  app.log.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  app.log.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});
```

---

## HIGH PRIORITY ISSUES (Fix within first week)

### 6. Build File Cleanup Not Automated
**File**: `/apps/api/src/services/prebid-build-service.ts`
**Lines**: 310-334

The `cleanupOldBuilds` function exists but is never called automatically:
```typescript
export async function cleanupOldBuilds(publisherId: string, keepCount: number = 5): Promise<void> {
  // ...cleanup logic
}
```

Build files accumulate in `/prebid-builds/output/` indefinitely.

**Remediation**: 
- Add periodic cleanup job (cron or setInterval)
- Implement build expiration based on `expiresAt` field
- Add disk space monitoring

### 7. Memory-Based Wrapper Cache Has No Upper Bound Enforcement
**File**: `/apps/api/src/utils/wrapper-generator.ts`
**Lines**: 14-37

Cache cleanup runs periodically but can still grow unbounded between intervals:
```typescript
const CACHE_MAX_SIZE = 1000;
// Cleanup only runs every 5 minutes
setInterval(() => { ... }, CLEANUP_INTERVAL);
```

**Remediation**: Implement LRU cache or check size on every insert

### 8. Build Process Uses setTimeout Instead of Job Queue
**File**: `/apps/api/src/utils/build-trigger.ts`
**Lines**: 152-218

Build jobs are queued with setTimeout:
```typescript
setTimeout(async () => {
  // Build logic
}, 100);
```

**Issues**:
- Jobs lost on server restart
- No retry mechanism
- No progress tracking
- No concurrency control

**Remediation**: Implement proper job queue (Bull/BullMQ with Redis)

### 9. SSE Connection Tracking Without Limits
**File**: `/apps/api/src/routes/analytics.ts`
**Lines**: 22-23

```typescript
analyticsEmitter.setMaxListeners(100);
const activeConnections = new Map<string, { reply: any; cleanup: () => void }>();
```

No enforcement of the 100 connection limit - just sets EventEmitter warning threshold.

**Remediation**: Add connection limit enforcement and reject new connections when full

### 10. Synchronous File Reads on High-Traffic Endpoints
**File**: `/apps/api/src/routes/wrapper.ts`
**Lines**: 36-43, 65-70

```typescript
const content = fs.readFileSync(WRAPPER_PATH, 'utf-8');
```

Synchronous file reads on every request block the event loop.

**Remediation**: 
- Use fs.promises.readFile() 
- Cache file content in memory
- Implement file watching for cache invalidation

### 11. Analytics Beacon Endpoint Validates Publisher on Every Event
**File**: `/apps/api/src/routes/public-routes.ts`
**Lines**: 449-465

Each event in a batch triggers a database query:
```typescript
for (const event of body.events) {
  const publisherExists = db.select()
    .from(publishers)
    .where(and(...))
    .get();
}
```

**Remediation**: 
- Cache publisher validation results
- Batch validate unique publisher IDs
- Consider async event processing via queue

### 12. Password Reset Token Logged to Console
**File**: `/apps/api/src/routes/auth.ts`
**Lines**: 276-282

Password reset tokens are logged even though guarded by environment check:
```typescript
if (process.env.NODE_ENV !== 'production') {
  console.log('Reset link: http://localhost:5173/reset-password?token=${resetToken}');
}
```

**Risk**: If NODE_ENV is misconfigured, tokens leak to logs.

**Remediation**: Remove console.log entirely, use proper email service

### 13. CORS Allows Credentials with Wildcard Origins Possible
**File**: `/apps/api/src/routes/wrapper.ts`

```typescript
.header('Access-Control-Allow-Origin', '*')
```

Combined with credentials on other routes could lead to security issues.

**Remediation**: Use specific origins for credentialed requests

---

## MEDIUM PRIORITY ISSUES (Fix within first month)

### 14. Missing Database Indexes for Analytics Queries
**File**: `/apps/api/src/db/index.ts`

Analytics queries aggregate by bidder_code, timestamp, publisher_id but missing compound indexes:
- No index on `(publisher_id, timestamp)` for time-range queries
- No index on `(bidder_code, timestamp)` for bidder performance

### 15. Duplicate preHandler in Route Definition
**File**: `/apps/api/src/routes/system.ts`
**Lines**: 177-179

```typescript
fastify.post('/rebuild-wrapper', {
  preHandler: requireSuperAdmin,
  preHandler: requireSuperAdmin, // Duplicate
}, ...
```

### 16. No Rate Limiting on Public Config Endpoint
**File**: `/apps/api/src/routes/public-routes.ts`

The `/c/:publisherSlug` config endpoint has no rate limiting - potential for abuse.

### 17. Build Process Doesn't Validate Prebid Source Exists
**File**: `/apps/api/src/services/prebid-build-service.ts`

If prebid-source directory is missing, builds fail silently with unhelpful errors.

### 18. Expired Sessions Not Cleaned Up
**File**: `/apps/api/src/routes/auth.ts`

Sessions table has `expires_at` but no cleanup job removes expired sessions.

### 19. Config Serve Log Table Grows Unboundedly
**File**: `/apps/api/src/routes/wrapper.ts`

Every wrapper request logs to `config_serve_log` with no retention policy.

---

## LOW PRIORITY ISSUES (Nice to have)

### 20. No Request ID for Tracing
Missing correlation IDs for request tracing across logs.

### 21. Missing Health Check Dependencies
Health endpoint doesn't check external dependencies (Redis, if used).

### 22. No API Versioning
Routes don't include version prefix (/api/v1/).

### 23. Hardcoded Prebid Version
**File**: `/apps/api/src/utils/build-trigger.ts`
**Line**: 119
```typescript
prebidVersion: '9.0.0', // Latest Prebid.js version
```

---

## Completed Sections
- [x] Server Configuration
- [x] Database Layer
- [x] Authentication/Authorization
- [x] Wrapper Routes (High Traffic)
- [x] Build System
- [x] Analytics Routes
- [x] Public Routes
- [x] Error Handling
- [x] Resource Management

## Security Scan Summary
- Secrets in .env files: FOUND (Critical)
- SQL Injection: NONE FOUND (Drizzle ORM parameterizes)
- Command Injection: PROTECTED (validateModuleName function)
- Path Traversal: NONE FOUND (filenames validated)
- XSS: MITIGATED (JSON responses, CSP recommended)

## Next Steps
1. Fix all CRITICAL issues before any production deployment
2. Implement monitoring/alerting infrastructure
3. Set up automated backups
4. Configure proper secret management
5. Run load testing before launch
