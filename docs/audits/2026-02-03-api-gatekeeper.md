# pbjs_engine API Security Audit Report

**Date:** 2026-02-03
**Auditor:** API Gatekeeper (Claude Opus 4.5)
**Scope:** HTTP endpoints, middleware, authentication, and API security

---

## Executive Summary

This audit examined the pbjs_engine API server for security vulnerabilities across authentication, rate limiting, input validation, CORS, admin endpoints, and sensitive data exposure. The codebase demonstrates solid foundational security practices but has several issues requiring attention before production deployment.

**Overall Risk Level:** Medium-High

**Critical Issues:** 3
**High Issues:** 4
**Medium Issues:** 5
**Low Issues:** 3

---

## Findings

### 1. CORS Configuration - CRITICAL

**Severity:** Critical
**Exploitability:** High
**Impact:** High

**Location:**
- `/Users/andrewstreets/prebidjs-light/apps/api/src/routes/wrapper.ts` (lines 48, 71, 104, 219, 254)
- `/Users/andrewstreets/prebidjs-light/apps/api/src/routes/builds.ts` (lines 222, 297)
- `/Users/andrewstreets/prebidjs-light/apps/api/src/routes/analytics.ts` (line 36)

**Issue:**
Public endpoints use `Access-Control-Allow-Origin: *` which allows any website to make requests to these endpoints. While this may be intentional for CDN/wrapper delivery, it creates risks:

```typescript
// wrapper.ts:48
.header('Access-Control-Allow-Origin', '*') // CORS for CDN usage

// analytics.ts:36 - SSE endpoint
'Access-Control-Allow-Origin': '*',
```

**Risk:**
- The analytics SSE endpoint (`/api/analytics/stream`) with wildcard CORS allows any site to read real-time analytics data (if they have a valid auth token)
- Combined with other vulnerabilities, could enable cross-origin data exfiltration

**PoC:**
```html
<!-- Attacker's website -->
<script>
// If attacker has stolen a JWT token, they can connect to the SSE endpoint
const evtSource = new EventSource('https://victim-api.com/api/analytics/stream', {
  headers: { 'Authorization': 'Bearer STOLEN_TOKEN' }
});
evtSource.onmessage = e => console.log('Stolen data:', e.data);
</script>
```

**Recommendation:**
1. For wrapper/builds endpoints that must be public, keep wildcard but document the security model
2. For SSE endpoint, respect the CORS configuration from server-config.ts:
```typescript
// In analytics.ts, remove wildcard and rely on fastify cors plugin
// Do NOT set manual Access-Control headers
```

---

### 2. Security Headers Disabled - CRITICAL

**Severity:** Critical
**Exploitability:** Medium
**Impact:** High

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/config/server-config.ts` (lines 60-71)

**Issue:**
The Helmet security headers middleware is completely commented out:

```typescript
// Security headers - Temporarily disabled due to Fastify version mismatch
// TODO: Upgrade to Fastify 5.x or downgrade @fastify/helmet to compatible version
// await app.register(helmet, {
//   contentSecurityPolicy: {
//     directives: {...}
//   },
// });
```

**Risk:**
Missing security headers leave the application vulnerable to:
- Clickjacking attacks (no X-Frame-Options)
- MIME type sniffing attacks (no X-Content-Type-Options)
- XSS via inline script injection (no CSP)
- Protocol downgrade attacks (no HSTS)

**Recommendation:**
Fix the Fastify/Helmet version mismatch immediately. Either:
1. Upgrade to Fastify 5.x
2. Downgrade @fastify/helmet to a compatible version
3. Manually set critical headers:
```typescript
app.addHook('onSend', (request, reply, payload, done) => {
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  done();
});
```

---

### 3. Hardcoded Development Secrets - CRITICAL

**Severity:** Critical
**Exploitability:** High (if .env committed to repo)
**Impact:** Critical

**Location:**
- `/Users/andrewstreets/prebidjs-light/apps/api/.env` (lines 6-7, 19-20)
- `/Users/andrewstreets/prebidjs-light/apps/api/src/db/seed.ts` (lines 20, 86, 111)

**Issue:**
The `.env` file contains hardcoded development secrets and is present in the repository:

```bash
# .env file
JWT_SECRET=dev-jwt-secret-for-testing-only-change-in-production
COOKIE_SECRET=dev-cookie-secret-for-testing-only-change-in-production
SUPER_ADMIN_PASSWORD=ChangeMe123!

# seed.ts - hardcoded passwords
const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
const publisherPasswordHash = await bcrypt.hash('Publisher123!', 10);
const staffPasswordHash = await bcrypt.hash('Staff123!', 10);
```

**Risk:**
- If deployed with these values, attackers can forge JWT tokens
- Known seed passwords allow unauthorized access
- Git history will retain these values even if changed

**Recommendation:**
1. Add `.env` to `.gitignore` immediately
2. Rotate all secrets in production
3. Use environment-specific .env files (.env.production) with placeholder values
4. Remove hardcoded passwords from seed.ts; require them from environment variables

---

### 4. Missing Rate Limiting on Public Endpoints - HIGH

**Severity:** High
**Exploitability:** High
**Impact:** Medium-High

**Location:**
- `/Users/andrewstreets/prebidjs-light/apps/api/src/routes/wrapper.ts` (all routes)
- `/Users/andrewstreets/prebidjs-light/apps/api/src/routes/builds.ts` (public routes)
- `/Users/andrewstreets/prebidjs-light/apps/api/src/routes/public-routes.ts` (all routes)

**Issue:**
While global rate limiting exists (100 requests/minute per `server-config.ts`), high-traffic public endpoints should have their own limits:

```typescript
// These endpoints have NO explicit rate limiting:
GET /pb/:publisherId.js     // Wrapper script (CDN traffic)
GET /:publisherId/prebid.js // Prebid build files
POST /b                     // Analytics beacon (could be hammered)
GET /c/:publisherSlug       // Config endpoint
```

The global limit of 100 requests/minute is easily exhausted by legitimate CDN/wrapper traffic.

**Risk:**
- DoS via analytics beacon flooding
- Resource exhaustion on build/wrapper endpoints
- Database load from repeated config lookups

**Recommendation:**
Add per-endpoint rate limits:
```typescript
// For analytics beacon - stricter limits
fastify.post('/b', {
  config: {
    rateLimit: {
      max: 1000,
      timeWindow: '1 minute',
      keyGenerator: (req) => req.ip
    }
  }
}, analyticsBeaconHandler);

// For wrapper endpoints - higher limits for legitimate CDN traffic
fastify.get('/pb/:publisherId.js', {
  config: {
    rateLimit: {
      max: 500,
      timeWindow: '1 minute',
      keyGenerator: (req) => `${req.ip}-${req.params.publisherId}`
    }
  }
}, handler);
```

---

### 5. Information Leakage in Error Responses - HIGH

**Severity:** High
**Exploitability:** Medium
**Impact:** Medium

**Location:**
- `/Users/andrewstreets/prebidjs-light/apps/api/src/utils/error-handler.ts` (lines 143-154)
- Multiple route files exposing detailed errors

**Issue:**
Error handling exposes implementation details in development mode, and some routes leak details in all modes:

```typescript
// error-handler.ts
if (isError(error)) {
  console.error('Unexpected error:', error);
  return reply.code(500).send({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
}

// system.ts:218 - exposes error message in production
return reply.code(500).send({
  error: 'Failed to rebuild wrapper',
  message: err.message,  // Leaks in all environments
});
```

**Risk:**
- Stack traces expose internal paths and library versions
- Error messages can reveal SQL structure, file paths, or logic
- Helps attackers fingerprint the application

**Recommendation:**
1. Never expose `err.message` in production responses
2. Log detailed errors server-side only
3. Return generic messages to clients:
```typescript
return reply.code(500).send({
  error: 'Internal server error',
  requestId: uuidv4() // For support reference
});
```

---

### 6. Command Injection Prevention in Build Service - HIGH (Mitigated)

**Severity:** High (but mitigated)
**Exploitability:** Low (due to existing validation)
**Impact:** Critical (if bypass found)

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/services/prebid-build-service.ts` (lines 14-17, 136-144, 161-165)

**Issue:**
The build service spawns child processes with user-controlled module names. However, good validation exists:

```typescript
// Validation function
function validateModuleName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

// Validation is applied
for (const module of modules) {
  if (!validateModuleName(module)) {
    return { success: false, errorMessage: `Invalid module name: ${module}` };
  }
}

// shell: true is NOT used (good!)
const buildProcess = spawn('npx', ['gulp', ...args], {
  cwd: PREBID_SOURCE_DIR,
  env: { ...process.env },
  // shell: true removed for security - prevents command injection
});
```

**Status:** MITIGATED
The code correctly:
1. Validates module names with strict regex
2. Does NOT use `shell: true` in spawn
3. Passes arguments as array (not string)

**Recommendation:**
- Add this pattern to security documentation as best practice
- Add unit tests for validation edge cases (unicode, special chars)

---

### 7. Path Traversal in Build File Serving - HIGH

**Severity:** High
**Exploitability:** Medium
**Impact:** High

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/prebid-builds.ts` (lines 416-438)

**Issue:**
While validation exists, there's defense-in-depth opportunity:

```typescript
fastify.get('/builds/:filename', async (request, reply) => {
  const { filename } = request.params as { filename: string };

  // Security: Use basename to prevent path traversal and validate format
  const safeFilename = filename.split('/').pop() || '';

  // Validate filename format
  if (!safeFilename.endsWith('.js') || !/^prebid-[a-f0-9-]+-\d+\.js$/.test(safeFilename)) {
    return reply.code(400).send({ error: 'Invalid filename' });
  }
  // ...
});
```

**PoC Attempt (blocked):**
```bash
# These should all be blocked by the regex:
curl https://api.example.com/builds/../../../etc/passwd  # Blocked
curl https://api.example.com/builds/..%2F..%2Fetc/passwd # Blocked by regex
curl https://api.example.com/builds/prebid-evil.sh       # Blocked - wrong extension
```

**Status:** Partially Mitigated

**Recommendation:**
Add additional hardening:
```typescript
const path = require('path');

// Resolve to absolute path and verify it's within builds directory
const absolutePath = path.resolve(BUILDS_OUTPUT_DIR, safeFilename);
if (!absolutePath.startsWith(path.resolve(BUILDS_OUTPUT_DIR))) {
  return reply.code(403).send({ error: 'Access denied' });
}
```

---

### 8. Missing UUID Validation on Some Endpoints - MEDIUM

**Severity:** Medium
**Exploitability:** Low
**Impact:** Low-Medium

**Location:**
- `/Users/andrewstreets/prebidjs-light/apps/api/src/routes/wrapper.ts` (line 88)
- `/Users/andrewstreets/prebidjs-light/apps/api/src/routes/publisher-modules.ts` (line 89)
- Multiple other routes

**Issue:**
Some routes don't validate UUID format for path parameters:

```typescript
// wrapper.ts - no validation
fastify.get<{ Params: { publisherId: string } }>('/pb/:publisherId.js', async (request, reply) => {
  const { publisherId } = request.params;
  // Used directly in database query without validation
  const publisher = await db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
});

// Contrast with prebid-builds.ts which does validate
try {
  validateUUID(buildId, 'Build ID');
} catch (err) {
  return reply.code(400).send({ error: err.message });
}
```

**Risk:**
- Malformed input could cause unexpected behavior
- Inconsistent error responses (404 vs 400)
- Minor SQLite query overhead

**Recommendation:**
Use Fastify schema validation:
```typescript
fastify.get('/pb/:publisherId.js', {
  schema: {
    params: {
      type: 'object',
      properties: {
        publisherId: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' }
      },
      required: ['publisherId']
    }
  }
}, handler);
```

---

### 9. Inconsistent Module Code Validation - MEDIUM

**Severity:** Medium
**Exploitability:** Low
**Impact:** Medium

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/publisher-modules.ts` (lines 83-89)

**Issue:**
Module code validation is minimal compared to bidder code validation:

```typescript
// publisher-modules.ts - minimal validation
if (!moduleCode) {
  return reply.status(400).send({ error: 'Module code is required' });
}
const normalizedCode = moduleCode.toLowerCase().trim();
// Stored directly without format validation

// custom-bidders.ts - proper validation
if (!bidderCode || !isValidBidderCode(bidderCode)) {
  return reply.status(400).send({
    error: 'Invalid bidder code. Must be 2-50 characters, alphanumeric with hyphens/underscores only.'
  });
}
```

**Risk:**
- Inconsistent validation allows unexpected characters
- Could cause issues in downstream build process
- Potential for stored XSS if displayed in admin UI

**Recommendation:**
Apply consistent validation:
```typescript
function isValidModuleCode(code: string): boolean {
  return /^[a-zA-Z0-9_-]{2,50}$/.test(code);
}
```

---

### 10. Admin Impersonation Token Duration - MEDIUM

**Severity:** Medium
**Exploitability:** Low
**Impact:** Medium

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/impersonation.ts` (line 101)

**Issue:**
Impersonation tokens have a 1-hour expiry, which is reasonable but should be configurable:

```typescript
// Token expires in 1 hour for impersonation
const token = fastify.jwt.sign(impersonationToken, { expiresIn: '1h' });
```

**Positive Security Notes:**
- Cannot impersonate super_admin (line 43)
- Cannot impersonate yourself (line 26)
- Sessions are logged in audit_logs (lines 59-74)
- Session can be terminated (stop-impersonation endpoint)

**Recommendation:**
1. Make timeout configurable via environment variable
2. Consider shorter timeout (15-30 minutes) for sensitive operations
3. Add session heartbeat to detect idle impersonation

---

### 11. Debug Wrapper Endpoint Exposed - MEDIUM

**Severity:** Medium
**Exploitability:** Low
**Impact:** Low

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/wrapper.ts` (lines 266-299)

**Issue:**
The `/pb/info` endpoint exposes build information without authentication:

```typescript
fastify.get('/pb/info', async (request, reply) => {
  // Returns:
  // - version
  // - fileSize
  // - lastModified
  // - hasSourceMap
  // - endpoints
});
```

**Risk:**
- Information disclosure about build timing and size
- Reveals available endpoints
- Helps attackers fingerprint the application

**Recommendation:**
Either:
1. Require authentication for this endpoint
2. Limit information in production mode
3. Rate limit to prevent enumeration

---

### 12. Source Map Exposure - MEDIUM

**Severity:** Medium
**Exploitability:** Low
**Impact:** Low

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/wrapper.ts` (lines 60-77)

**Issue:**
Source maps are served publicly:

```typescript
fastify.get('/pb.min.js.map', async (request, reply) => {
  const content = fs.readFileSync(WRAPPER_SOURCE_MAP_PATH, 'utf-8');
  reply
    .header('Access-Control-Allow-Origin', '*')
    .send(content);
});
```

**Risk:**
- Source maps reveal original TypeScript source code
- Helps attackers understand application logic
- May reveal comments with security notes

**Recommendation:**
Disable source maps in production:
```typescript
if (process.env.NODE_ENV === 'production') {
  return reply.code(404).send({ error: 'Not found' });
}
```

---

### 13. SSE Connection Management - LOW

**Severity:** Low
**Exploitability:** Low
**Impact:** Low

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/analytics.ts` (lines 22, 49)

**Issue:**
SSE connections are tracked and cleaned up properly, but the 100-listener limit could be a concern:

```typescript
analyticsEmitter.setMaxListeners(100); // Support many SSE clients

const heartbeatInterval = setInterval(() => {
  // 30 second heartbeat
}, 30000);
```

**Positive Notes:**
- Connections are tracked in Map
- Cleanup on close/error
- Heartbeat prevents connection timeouts

**Recommendation:**
- Consider connection limits per user
- Add monitoring for connection count
- Document expected concurrent connection count

---

### 14. Cookie Security Configuration - LOW

**Severity:** Low
**Exploitability:** Low
**Impact:** Medium

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/auth.ts` (lines 104-110)

**Issue:**
Refresh token cookie configuration is correct but relies on NODE_ENV:

```typescript
reply.setCookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: TIMEOUTS.SESSION_COOKIE_MAX_AGE,
});
```

**Positive Notes:**
- httpOnly prevents XSS access
- secure flag in production
- sameSite provides CSRF protection
- Path is restrictive

**Recommendation:**
Consider `sameSite: 'strict'` if cross-site authentication is not needed.

---

### 15. Logging of Sensitive Data - LOW

**Severity:** Low
**Exploitability:** N/A
**Impact:** Low

**Location:**
`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/auth.ts` (lines 276-282)

**Issue:**
Password reset tokens are logged in development:

```typescript
if (process.env.NODE_ENV !== 'production') {
  console.log('\n=== PASSWORD RESET LINK ===');
  console.log(`User: ${user.email}`);
  console.log(`Reset link: http://localhost:5173/reset-password?token=${resetToken}`);
}
```

**Risk:**
- If log aggregation is misconfigured, tokens could leak
- However, this is properly gated by NODE_ENV

**Status:** Acceptable for development, but add warning comment.

---

## Authentication & Authorization Summary

### Positive Findings

1. **JWT Implementation** (`/Users/andrewstreets/prebidjs-light/apps/api/src/middleware/auth.ts`)
   - Proper JWT verification using @fastify/jwt
   - Role-based access control (super_admin, admin, publisher)
   - Token payload includes necessary claims

2. **Login Security** (`/Users/andrewstreets/prebidjs-light/apps/api/src/routes/auth.ts`)
   - Stricter rate limiting (5 attempts/minute)
   - Password hashing with bcrypt
   - Refresh token rotation
   - Session invalidation on password reset

3. **Impersonation Controls**
   - Cannot impersonate super_admin
   - Full audit logging
   - Separate session tracking
   - 1-hour token expiry

4. **Password Reset**
   - Time-limited tokens (1 hour)
   - Single-use enforcement
   - Prevents email enumeration

---

## Recommendations Priority Matrix

### Immediate (Critical)

| Issue | Action | Effort |
|-------|--------|--------|
| Security Headers Disabled | Fix Helmet version or add manual headers | Low |
| Hardcoded Secrets | Add .env to .gitignore, rotate secrets | Low |
| CORS Wildcard on SSE | Remove manual CORS header from analytics SSE | Low |

### Short-term (High)

| Issue | Action | Effort |
|-------|--------|--------|
| Missing Rate Limiting | Add per-endpoint limits on public routes | Medium |
| Information Leakage | Sanitize all production error responses | Medium |
| Path Traversal Hardening | Add absolute path verification | Low |

### Medium-term (Medium)

| Issue | Action | Effort |
|-------|--------|--------|
| UUID Validation | Add schema validation to all routes | Medium |
| Module Code Validation | Create shared validation function | Low |
| Source Map Exposure | Disable in production | Low |
| Debug Endpoint | Add authentication or limit info | Low |

### Low Priority

| Issue | Action | Effort |
|-------|--------|--------|
| SSE Connection Limits | Add per-user limits | Medium |
| Cookie SameSite | Evaluate strict vs lax | Low |
| Impersonation Duration | Make configurable | Low |

---

## Conclusion

The pbjs_engine API has a solid security foundation with proper authentication, authorization, and some good defensive coding practices (especially in the build service). However, the disabled security headers and CORS configuration issues represent significant risks that should be addressed before production deployment.

The development environment secrets in version control are a critical finding that requires immediate remediation. All secrets should be rotated before any production deployment.

---

**Audit completed by:** API Gatekeeper
**Report generated:** 2026-02-03
