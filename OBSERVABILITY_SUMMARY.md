# pbjs_engine Observability Audit - Executive Summary

**Date:** 2026-02-03  
**Status:** 🟡 MEDIUM RISK - Functional but lacks production observability  
**Recommendation:** Implement Phases 1-2 within 2 weeks before production launch

---

## Current State

### ✅ What Exists

| Component | Status | Location |
|-----------|--------|----------|
| Basic health check | ✅ Implemented | `/health` |
| Detailed health check | ✅ Implemented | `/api/system/health` (authenticated) |
| Fastify logging | ✅ Basic | Configurable via `LOG_LEVEL` env var |
| Error handling | ✅ Standardized | `ApiError` class in `utils/error-handler.ts` |
| Wrapper analytics | ✅ Well-designed | Batching + sendBeacon fallback |
| Analytics events | ✅ Tracked | SQLite `analytics_events` table |
| Bidder health metrics | ✅ Implemented | Health scores, timeout rates, etc. |
| Cache monitoring | ✅ Basic | Cache size tracking |

---

### ❌ Critical Gaps

| Missing Component | Impact | Priority | Est. Time |
|-------------------|--------|----------|-----------|
| **Error tracking (Sentry)** | 🔴 CRITICAL | P0 | 4 hours |
| **Prometheus metrics** | 🔴 CRITICAL | P0 | 8 hours |
| **Correlation IDs** | 🟡 MEDIUM | P1 | 2 hours |
| **Alert configuration** | 🟡 MEDIUM | P1 | 4 hours |
| **Log aggregation** | 🟡 MEDIUM | P2 | 6 hours |
| **Structured logging** | 🟡 MEDIUM | P2 | 4 hours |

**Total P0 work:** 12 hours (1.5 days)  
**Total P0-P1 work:** 18 hours (2-3 days)  
**Total P0-P2 work:** 28 hours (3-4 days)

---

## Key Findings

### 1. Instrumentation Coverage

**Good:**
- 39 route files with error logging
- 94+ `fastify.log.error()` calls
- Business metrics tracked (bidder performance, revenue, etc.)

**Missing:**
- ❌ No request/response timing
- ❌ No error rate tracking
- ❌ No latency histograms
- ❌ No build time metrics

### 2. Logging Quality

**Good:**
- Fastify structured JSON logging enabled
- Error handlers in place

**Missing:**
- ❌ No correlation IDs
- ❌ No sensitive data redaction
- ❌ Inconsistent error context
- ❌ No log aggregation (logs scattered)

### 3. Error Tracking

**Critical Gap:** No error tracking service

**Current behavior:**
```typescript
console.error('Unexpected error:', error); // Just console, lost forever
```

**What's needed:**
- Sentry integration for error tracking
- Error grouping and deduplication
- Stack trace enrichment
- User context in errors
- Error rate alerting

### 4. Performance Monitoring

**Good:**
- Wrapper analytics batching works well
- Bidder latency tracked in analytics events

**Missing:**
- ❌ No API endpoint latency tracking
- ❌ No histogram buckets for ad tech latencies
- ❌ No database query performance tracking
- ❌ No build time tracking

### 5. Cardinality Risk

**Potential Problem:**
```typescript
// DANGEROUS: Unbounded cardinality
metrics{
  publisher_id="...",  // 100+ values
  ad_unit_code="...",  // 5,000+ values
  geo="US-CA-SF",      // 10,000+ values
  device="iPhone 15"   // 1,000+ values
}
// = 500 MILLION metric series 💥
```

**Solution:** Use bounded labels (tiers, regions, categories)

---

## Recommended Implementation

### Phase 1: Critical Monitoring (Week 1)

**Priority:** P0 - Must have before production

1. **Sentry Error Tracking** (4 hours)
   - Install `@sentry/node`
   - Configure DSN
   - Add to error handler
   - Test with intentional error

2. **Prometheus Metrics** (8 hours)
   - Install `prom-client`
   - Add request timing middleware
   - Create `/metrics` endpoint
   - Add build duration tracking
   - Deploy Prometheus server

3. **Correlation IDs** (2 hours)
   - Add correlation ID middleware
   - Update log serializers
   - Propagate through requests

**Deliverables:**
- Sentry dashboard tracking production errors
- `/metrics` endpoint with HTTP latency histograms
- Logs with correlation IDs for tracing

**Cost:** $0 (all free tiers)

---

### Phase 2: Alerting (Week 2)

**Priority:** P1 - Critical for incident response

1. **Prometheus Alerts** (4 hours)
   - Configure alert rules
   - Set up Alertmanager
   - Connect Slack webhook

2. **Grafana Dashboards** (8 hours)
   - API performance dashboard
   - Build system dashboard
   - Business metrics dashboard

**Deliverables:**
- Slack alerts for:
  - High error rate (>5%)
  - High latency (P95 >500ms)
  - Build failures (>10%)
- 3 Grafana dashboards

**Cost:** $0 (self-hosted or Grafana Cloud free tier)

---

### Phase 3: Log Aggregation (Week 3-4)

**Priority:** P2 - Important for debugging

1. **Grafana Loki** (6 hours)
   - Deploy Loki + Promtail
   - Configure log ingestion
   - Create log queries

2. **Structured Logging** (4 hours)
   - Enhance log formats
   - Add sensitive data redaction
   - Standardize log fields

**Deliverables:**
- Centralized log search
- Log-based alerts
- Sensitive data redacted

**Cost:** $0 (self-hosted Loki)

---

## Cost Analysis

### Option 1: FREE Tier (Recommended for MVP)

```
Sentry:         $0  (5k events/month)
Prometheus:     $0  (self-hosted)
Grafana:        $0  (self-hosted or Cloud free tier)
Loki:           $0  (self-hosted)
Alertmanager:   $0  (self-hosted)
Slack:          $0  (webhooks)
----------------------
Total:          $0/month

Infrastructure: $20/month (1 VPS for monitoring stack)
```

### Option 2: Production Stack (Scale)

```
Sentry:         $26/month  (50k events)
Datadog APM:    $31/month  (per host)
Datadog Logs:   $50/month  (50GB)
PagerDuty:      $25/month  (per user)
----------------------
Total:          $132/month
```

**Recommendation:** Start with FREE tier, upgrade at scale.

---

## Specific Code Changes Needed

### 1. Add Sentry to `apps/api/src/index.ts`

```diff
+ import { initializeSentry } from './config/sentry';
  
  const app = createFastifyInstance();
  
  const start = async () => {
    try {
+     initializeSentry(app);
      await registerPlugins(app);
```

### 2. Add Metrics to `apps/api/src/index.ts`

```diff
+ import { instrumentFastify } from './metrics';
  
  const app = createFastifyInstance();
  
  const start = async () => {
    try {
      await registerPlugins(app);
      await registerRoutes(app);
+     instrumentFastify(app);
```

### 3. Add Build Metrics to `apps/api/src/services/prebid-build-service.ts`

```diff
+ import { buildDuration } from '../metrics';
  
  async function executeBuild(options: BuildOptions): Promise<BuildResult> {
+   const timer = buildDuration.startTimer();
    try {
      // ... build logic ...
+     timer({ status: 'success' });
      return result;
    } catch (error) {
+     timer({ status: 'error' });
      throw error;
    }
  }
```

---

## Health Check Improvements

### Current Issue

Two `/health` endpoints exist:
1. `/health` (public) - Basic liveness check
2. `/api/system/health` (authenticated) - Detailed health check

**Problem:** Load balancers need **unauthenticated** readiness check.

### Recommended Structure

```
/health/live     → Liveness (is process running?)     [PUBLIC]
/health/ready    → Readiness (can accept traffic?)    [PUBLIC]
/health/detailed → Full diagnostics                   [AUTHENTICATED]
```

**Implementation:**
```typescript
// Liveness - just return OK
fastify.get('/health/live', async () => ({ status: 'ok' }));

// Readiness - check dependencies
fastify.get('/health/ready', async (req, reply) => {
  const healthy = await Promise.all([
    checkDatabase(),
    checkPrebidSource(),
    checkBuildDirectory(),
  ]).then(checks => checks.every(c => c === true));
  
  return reply.code(healthy ? 200 : 503).send({
    status: healthy ? 'ready' : 'not_ready',
  });
});
```

---

## Wrapper Analytics Verification

**Status:** ✅ GOOD - Well implemented

**Strengths:**
- Batching (10 events or 30 seconds)
- sendBeacon with fetch fallback
- Multiple page unload handlers
- Client-side error handling

**Minor Improvements:**
```typescript
// Add retry logic for failed beacons
function sendBatchWithRetry(retries = 3) {
  if (!navigator.sendBeacon(url, payload)) {
    if (retries > 0) {
      setTimeout(() => sendBatchWithRetry(retries - 1), 1000);
    }
  }
}

// Track wrapper load time
const wrapperLoadTime = performance.now();
queueAnalyticsEvent({
  eventType: 'wrapperLoaded',
  loadTimeMs: wrapperLoadTime,
});
```

---

## Histogram Bucket Recommendations

### API Endpoints (Fast Paths)
```typescript
buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5] // 10ms to 5s
```

**Rationale:** Config endpoints should be <100ms (P95)

### Build System (Long Operations)
```typescript
buckets: [10, 30, 60, 120, 300] // 10s to 5min
```

**Rationale:** Builds can take 30-120 seconds

### Database Queries
```typescript
buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1] // 1ms to 1s
```

**Rationale:** Most queries <10ms, slow queries >100ms

### Analytics Processing
```typescript
buckets: [0.001, 0.005, 0.01, 0.05, 0.1] // 1ms to 100ms
```

**Rationale:** High-throughput writes, sub-10ms ideal

---

## Alert Rules (Must-Have)

```yaml
# API Error Rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
  for: 2m
  severity: critical
  
# API Latency
- alert: HighApiLatency
  expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 0.5
  for: 5m
  severity: warning

# Build Failures
- alert: BuildFailureSpike
  expr: rate(prebid_build_duration_seconds_count{status="error"}[10m]) > 0.1
  for: 5m
  severity: warning

# Database Slow
- alert: SlowDatabaseQueries
  expr: histogram_quantile(0.95, db_query_duration_seconds_bucket) > 0.1
  for: 5m
  severity: warning
```

---

## Next Steps

### Immediate (This Week)
1. Review full audit: `OBSERVABILITY_AUDIT.md`
2. Install Sentry + test error tracking
3. Add Prometheus metrics endpoint
4. Deploy Prometheus locally

### Week 2
1. Configure alerts (Slack webhooks)
2. Build Grafana dashboards
3. Test alert firing
4. Document runbooks

### Week 3-4
1. Add correlation IDs
2. Deploy Loki for logs
3. Add structured logging
4. Create log-based alerts

---

## Documentation

- **Full Audit:** `OBSERVABILITY_AUDIT.md` (43KB)
- **Quick Start:** `OBSERVABILITY_QUICK_START.md` (11KB)
- **This Summary:** `OBSERVABILITY_SUMMARY.md` (9KB)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Production errors go unnoticed | HIGH | CRITICAL | Implement Sentry (P0) |
| Slow endpoints unknown | HIGH | HIGH | Add Prometheus (P0) |
| Cannot debug issues | MEDIUM | HIGH | Add correlation IDs (P1) |
| Incidents undetected | MEDIUM | CRITICAL | Configure alerts (P1) |
| Logs scattered/lost | MEDIUM | MEDIUM | Deploy Loki (P2) |

**Overall Risk:** 🟡 MEDIUM  
**Risk after P0 implementation:** 🟢 LOW  
**Risk after P0-P2 implementation:** 🟢 VERY LOW

---

## Questions?

Contact: Observability team or review full documentation.

**Key Files:**
- `/apps/api/src/config/server-config.ts` - Fastify logging config
- `/apps/api/src/utils/error-handler.ts` - Error handling
- `/apps/api/src/routes/monitoring.ts` - Health checks
- `/apps/api/src/routes/analytics.ts` - Analytics tracking
- `/apps/wrapper/src/pb.ts` - Wrapper analytics batching

