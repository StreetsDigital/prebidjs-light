# pbjs_engine Comprehensive Security & Bug Hunt Audit
**Date:** 2026-02-01
**Method:** Automated security & code quality audit using specialized agents
**Scope:** Full codebase (API, Admin UI, Database, Build System)

---

## 🚨 CRITICAL ISSUES (11 Total)

### Security & Authentication

#### 1. **18 Route Files Completely Unauthenticated** ⚠️ SEVERITY: CRITICAL
**Impact:** Any unauthenticated user can read, create, modify, and delete all publisher data.

**Affected Files:**
- `apps/api/src/routes/notifications.ts`
- `apps/api/src/routes/custom-reports.ts`
- `apps/api/src/routes/yield-advisor.ts`
- `apps/api/src/routes/analytics.ts`
- `apps/api/src/routes/custom-bidders.ts`
- `apps/api/src/routes/publisher-modules.ts`
- `apps/api/src/routes/publisher-analytics.ts`
- `apps/api/src/routes/component-parameters.ts`
- `apps/api/src/routes/templates.ts`
- `apps/api/src/routes/bulk-operations.ts`
- `apps/api/src/routes/analytics-dashboard.ts`
- `apps/api/src/routes/prebid-builds.ts`
- `apps/api/src/routes/monitoring.ts`
- `apps/api/src/routes/system.ts`
- `apps/api/src/routes/bidders.ts`
- `apps/api/src/routes/prebid-components.ts`
- `apps/api/src/routes/wrapper-configs.ts`
- Plus one more

**Fix:** Add `preHandler: requireAdmin` or `requireAuth` to every route handler.

---

#### 2. **Remote Code Execution via Unauthenticated System Endpoint** ⚠️ SEVERITY: CRITICAL
**Location:** `apps/api/src/routes/system.ts:170-211`

```typescript
// NO authentication check!
fastify.post('/rebuild-wrapper', async (request, reply) => {
    const { exec } = await import('child_process');
    const execPromise = promisify(exec);
    const { stdout, stderr } = await execPromise('npm run build', {
      cwd: wrapperDir,
    });
```

**Also:** `apps/api/src/services/prebid-build-service.ts:143` uses `spawn` with `shell: true`, enabling command injection.

**Fix:**
1. Add `preHandler: requireSuperAdmin`
2. Remove `shell: true` from spawn
3. Validate module names against strict allowlist

---

#### 3. **Hardcoded JWT/Cookie Secrets with Public Defaults** ⚠️ SEVERITY: CRITICAL
**Location:** `apps/api/src/index.ts:58-64`

```typescript
app.register(jwt, {
  secret: (process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as string,
});

app.register(cookie, {
  secret: (process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production') as string,
});
```

**Also:** `.env` file exists in working directory with these default values.

**Fix:**
1. Remove fallback defaults - fail fast if not configured
2. Ensure `.env` is not committed to git
3. Generate cryptographically random secrets (256+ bits)

---

#### 4. **XSS/Script Injection in Wrapper Generation** ⚠️ SEVERITY: CRITICAL
**Location:** `apps/api/src/index.ts:150-323`

```typescript
// Direct template literal interpolation - no escaping!
var publisherId = '${publisher.slug}';
var apiEndpoint = '${apiEndpoint}';
* Publisher: ${publisher.name}
```

**Impact:** If publisher name/slug contains `'; alert(1); //`, this executes in every publisher site loading the wrapper.

**Fix:** Use `JSON.stringify()` for all values interpolated into JavaScript.

---

#### 5. **Hardcoded Default Admin Credentials** ⚠️ SEVERITY: CRITICAL
**Location:** `apps/api/src/db/seed-admin.ts:7-9`

```typescript
const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@thenexusengine.com';
const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';
```

Line 35 logs the password to stdout.

**Fix:**
1. Never log passwords
2. Require explicit environment variables
3. Force password change on first login

---

#### 6. **CORS Reflects All Origins** ⚠️ SEVERITY: HIGH → CRITICAL
**Location:** `apps/api/src/index.ts:53-56`

```typescript
app.register(cors, {
  origin: true, // Reflect the request origin - for development
  credentials: true,
});
```

**Impact:** Any website can make authenticated cross-origin requests using user cookies (CSRF).

**Fix:** Set explicit allowlist: `origin: ['https://admin.example.com']`

---

### Data Integrity

#### 7. **Multiple Database Operations Missing .run()** ⚠️ SEVERITY: HIGH
**Location:** `apps/api/src/routes/publishers.ts` (multiple lines)

Drizzle ORM requires `.run()` to execute writes. These silently fail:
- Line 242-252: Publisher updates
- Line 257-274: Audit log writes
- Line 319-329: Hard deletes
- Line 326-329: Soft deletes
- Line 368-371: Restore operations
- Line 394-397: API key regeneration
- Plus ~20 more across multiple files

**Impact:** Operations return HTTP 200/204 but database is never modified.

**Fix:** Append `.run()` to every `db.update()`, `db.insert()`, `db.delete()` call.

---

#### 8. **Auth Middleware Doesn't Stop Execution on Failure** ⚠️ SEVERITY: HIGH
**Location:** `apps/api/src/middleware/auth.ts:25-35`

```typescript
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    request.user = request.user as TokenPayload;
  } catch (err) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    // MISSING: return reply; -- route handler still executes!
  }
}
```

**Fix:** Add `return reply` after every `reply.send()` in auth middleware.

---

### Memory & Resource Management

#### 9. **Memory Leak: Unbounded Chat Session Storage** ⚠️ SEVERITY: HIGH
**Location:** `apps/api/src/routes/chat.ts:6-23`

```typescript
const chatSessions = new Map<string, {...}>();
```

No eviction, no size limit, no TTL. Grows indefinitely.

**Fix:** Implement LRU cache with max size or persist to database.

---

#### 10. **Memory Leak: React Component setInterval** ⚠️ SEVERITY: CRITICAL (Runtime)
**Location:** `apps/admin/src/pages/publisher/BidderHealthPage.tsx`, `AuctionInspectorPage.tsx`

```typescript
useEffect(() => {
    setInterval(() => { /* poll data */ }, interval);
    // Missing cleanup! Creates new interval on every re-render
}, [data, filters, /* many deps */]);
```

**Impact:** Page becomes unusable after a few minutes as hundreds of intervals stack up.

**Fix:** Return cleanup function and use `useCallback` for dependencies.

---

#### 11. **Missing Error Boundary in React App** ⚠️ SEVERITY: CRITICAL (UX)
**Location:** `apps/admin/src/main.tsx`

No error boundary anywhere in the app. Any uncaught error crashes entire application with white screen.

**Fix:** Wrap `<App />` in error boundary component.

---

## 🔴 HIGH SEVERITY ISSUES (18 Total)

### Security

1. **Unauthenticated Analytics Beacon Accepts Arbitrary Publisher IDs** (`apps/api/src/index.ts:489-574`)
   - Can flood analytics with fake data for any publisher

2. **JWT Contains All Publisher IDs** (`apps/api/src/routes/auth.ts:54-71`)
   - Large tokens, no revocation mechanism, 24h expiry

3. **Public Config Endpoint Exposes Internal UUIDs** (`apps/api/src/index.ts:335-486`)
   - Leaks publisher IDs to public

4. **Embed Code Exposes API Key** (`apps/api/src/routes/publishers.ts:403-428`)
   - API key visible in HTML source

5. **No Rate Limiting on Login** (`apps/api/src/index.ts:66-69`)
   - 100 password attempts/minute possible

6. **Password Reset Token Logged in Production** (`apps/api/src/routes/auth.ts:263-267`)
   - No `NODE_ENV` check

7. **Missing Security Headers** (`apps/api/src/index.ts`)
   - No helmet, CSP, HSTS, etc.

8. **SSE Connection Leak** (`apps/api/src/routes/analytics.ts`)
   - EventEmitter listeners never cleaned up, exhausts resources

### Data & Logic

9. **229 JSON.parse Calls Without try-catch** (25 files)
   - Any malformed data crashes server with 500

10. **Race Condition in Impression Counter** (`apps/api/src/routes/wrapper.ts:327-344`)
    - Read-then-write pattern loses increments under concurrency

11. **No Input Validation on Route Parameters** (nearly all routes)
    - Non-UUID IDs waste DB resources

12. **Path Traversal Protection Incomplete** (`apps/api/src/routes/prebid-builds.ts:388-407`)
    - Only checks for `..`, doesn't handle URL encoding

### Frontend

13. **Authentication Race Condition** (`apps/admin/src/components/auth/ProtectedRoute.tsx`)
    - Unmemoized dependencies cause infinite loop risk

14. **No Request Cancellation** (multiple pages)
    - Stale data fetches overwrite fresh data

15. **Missing Null Checks in Data Processing** (`apps/admin/src/pages/publisher/AnalyticsDashboardPage.tsx`)
    - Can accumulate NaN values in calculations

16. **Hardcoded localhost URLs** (multiple components)
    - Will break in production

17. **Uncleaned setTimeout in Toast Store** (`apps/admin/src/stores/toastStore.ts`)
    - Memory leak

18. **Token in localStorage** (`apps/admin/src/stores/authStore.ts:219-222`)
    - Vulnerable to XSS

---

## 🟡 MEDIUM SEVERITY ISSUES (18 Total)

1. Wrapper cache unbounded growth
2. PRAGMA SQL interpolation without validation
3. Missing CAPTCHA on repeated auth failures
4. 58 instances of `as any` type assertions
5. Inconsistent error handling patterns
6. TypeScript strict mode not enabled
7. EventEmitter listener leaks (analytics dashboard)
8. Missing loading state protection
9. No validation of Anthropic API key before use
10. Component re-renders on every auth store change
11. Duplicate data fetching in useEffect
12. Missing cleanup in chart components
13. Browser compatibility checks missing
14. No pagination on large datasets
15. Missing optimistic UI updates
16. WebSocket reconnection logic incomplete
17. Form validation happens only on submit
18. Missing accessibility attributes

---

## 🟢 LOW SEVERITY ISSUES (12 Total)

1. No test suite (zero tests)
2. Stale schema files (`schema-old.ts`, `schema-updated.ts`)
3. Debug comments in production (`// TODO`, `version: 'v2-cors-fixed'`)
4. Console.log in production code
5. Magic numbers for timeouts
6. Missing JSDoc comments
7. Inconsistent naming conventions
8. Dead code in old migration files
9. Unused imports
10. Missing TypeScript return types
11. Component files too large (>500 lines)
12. CSS-in-JS performance issues

---

## 📊 Summary

| Severity | Security | Data | Frontend | Infrastructure | Total |
|----------|----------|------|----------|----------------|-------|
| CRITICAL | 6 | 2 | 3 | 0 | **11** |
| HIGH | 8 | 4 | 5 | 1 | **18** |
| MEDIUM | 5 | 3 | 8 | 2 | **18** |
| LOW | 1 | 2 | 6 | 3 | **12** |
| **TOTAL** | **20** | **11** | **22** | **6** | **59** |

---

## ✅ Immediate Action Required (Before ANY Production Deployment)

### Must Fix (Week 1)

1. ✅ **Add authentication to all 18 unprotected routes** (C-01)
2. ✅ **Protect `/rebuild-wrapper` endpoint** (C-02)
3. ✅ **Remove hardcoded secrets and rotate all credentials** (C-03, C-04, C-05)
4. ✅ **Fix XSS in wrapper generation** (use JSON.stringify)
5. ✅ **Add `.run()` to all database writes** (H-02)
6. ✅ **Fix auth middleware to return after send** (H-06)
7. ✅ **Restrict CORS to allowlist** (H-01)
8. ✅ **Add React error boundary** (C-11)
9. ✅ **Fix setInterval memory leaks** (C-10)
10. ✅ **Add try-catch to all JSON.parse calls** (H-09)

### Should Fix (Week 2)

1. Implement proper chat session management
2. Add rate limiting to login endpoint
3. Remove password reset logging in production
4. Add security headers (helmet)
5. Fix SSE connection leaks
6. Implement request cancellation in frontend
7. Add null checks to data processing
8. Centralize API client (remove hardcoded URLs)

### Recommended (Week 3+)

1. Write comprehensive test suite
2. Enable TypeScript strict mode
3. Remove dead code and `as any` assertions
4. Add monitoring and alerting
5. Implement proper error tracking (Sentry)
6. Add CAPTCHA to auth flows
7. Optimize large components
8. Add accessibility improvements

---

## 🎯 Production Readiness: NOT READY

**Current State:** ❌ **Blocking Issues Prevent Production Use**

**Risk Assessment:**
- **Security Risk:** 🔴 EXTREME (unauthenticated endpoints + RCE)
- **Data Integrity Risk:** 🔴 HIGH (silent write failures)
- **Stability Risk:** 🔴 HIGH (memory leaks, no error boundaries)
- **Compliance Risk:** 🟡 MEDIUM (missing security headers, XSS)

**Estimated Effort to Production Ready:**
- Critical fixes: 40-60 hours
- High priority fixes: 20-30 hours
- Testing & validation: 20-40 hours
- **Total:** ~80-130 hours (2-3 weeks with 2 engineers)

---

## 📝 Notes

This audit was performed using:
- `audit-code` agent (production readiness specialist)
- `audit-python` agent (TypeScript/code quality specialist)

Both agents performed:
- Static code analysis
- Security pattern detection
- Best practices validation
- Memory leak detection
- Type safety analysis

Full detailed reports available at:
- `.claude/checkpoints/prebidjs-light-audit_code.md`
- `docs/audits/2026-02-01-typescript-best-practices.md`

---

**End of Report**
