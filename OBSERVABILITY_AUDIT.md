# pbjs_engine Observability & Monitoring Audit

**Date:** 2026-02-03  
**Auditor:** Metrics & Observability Engineer  
**Focus:** Production readiness for observability, monitoring, and alerting

---

## Executive Summary

pbjs_engine has **basic observability infrastructure** in place but lacks critical production-grade monitoring capabilities. The system has:

- ✅ Basic health check endpoint (`/health`)
- ✅ Detailed system health monitoring (`/api/system/health`)
- ✅ Wrapper analytics batching with sendBeacon
- ✅ Analytics event tracking via SQLite
- ✅ Fastify built-in logging
- ❌ **No error tracking service** (Sentry, Rollbar, etc.)
- ❌ **No APM/metrics collection** (Prometheus, DataDog, etc.)
- ❌ **No structured logging** for production
- ❌ **No histogram buckets** for latency tracking
- ❌ **No cardinality management** for high-dimensional metrics
- ❌ **No centralized log aggregation**

**Risk Level:** 🟡 MEDIUM - System is functional but lacks observability for production incidents.

---

## 1. Current State Assessment

### 1.1 Health Check Endpoints

**File:** `/apps/api/src/routes/public-routes.ts`

```typescript
// Basic health check (PUBLIC)
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});
```

**Status:** ✅ Implemented  
**Coverage:** Basic liveness check only  
**Gaps:**
- No dependency health checks (database, external APIs)
- No readiness vs liveness distinction
- No detailed diagnostics

---

**File:** `/apps/api/src/routes/monitoring.ts`

```typescript
// Detailed health check (AUTHENTICATED - super admin only)
fastify.get('/health', async (request, reply) => {
  // Database health check
  const dbStart = Date.now();
  await db.select().from(publishers).limit(1).all();
  const dbResponseTime = Date.now() - dbStart;
  
  return {
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime(),
    checks: {
      database: { healthy: dbHealthy, responseTime: `${dbResponseTime}ms` },
      cache: { size: cacheStats.size, entries: cacheStats.entries.length },
      memory: { rss, heapUsed, heapTotal },
    },
  };
});
```

**Status:** ✅ Implemented  
**Coverage:** Database, cache, memory  
**Gaps:**
- Requires authentication (not suitable for load balancer health checks)
- No Prebid.js source availability check
- No build directory writeable check
- No external dependency checks (if any)

---

### 1.2 Logging Infrastructure

**File:** `/apps/api/src/config/server-config.ts`

```typescript
export function createFastifyInstance() {
  return require('fastify').default({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });
}
```

**Status:** ✅ Basic logging enabled  
**Format:** Fastify default (JSON in production)  
**Log Levels:** Configurable via `LOG_LEVEL` env var  

**Current Usage Patterns:**
- `fastify.log.info()` - 30+ occurrences across routes
- `fastify.log.error()` - 94+ occurrences across routes
- `console.error()` - Used in wrapper and utility files
- `console.log()` - Some debug logging in services

**Gaps:**
- **No structured logging** with consistent fields (requestId, userId, publisherId, etc.)
- **No correlation IDs** flowing through requests
- **No log aggregation service** integration (LogTail, Papertrail, Datadog Logs)
- **Sensitive data redaction** not enforced (API keys, passwords may leak)
- **Inconsistent error context** (some errors logged with stack, some without)
- **No log sampling** for high-volume endpoints

---

### 1.3 Error Tracking

**File:** `/apps/api/src/utils/error-handler.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function handleError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof ApiError) {
    return reply.code(error.statusCode).send({ error: error.message, details: error.details });
  }
  
  console.error('Unexpected error:', error); // ❌ Just console.error, no Sentry
  return reply.code(500).send({ error: 'Internal server error' });
}
```

**Status:** ⚠️ Basic error handling only  
**Coverage:** Standardized ApiError class, error handling utility  
**Critical Gap:** **NO ERROR TRACKING SERVICE**

**What's Missing:**
- ❌ Sentry integration for error tracking
- ❌ Error grouping and deduplication
- ❌ Stack trace enrichment with source maps
- ❌ User context (publisherId, userId) in errors
- ❌ Error rate alerting
- ❌ Release tracking (to correlate errors with deployments)

---

### 1.4 Performance Metrics

**Current Metrics Collection:**

1. **Analytics Events** (`/apps/api/src/routes/analytics.ts`)
   - Bidder latency (via `latencyMs` field)
   - CPM values
   - Event types (bidRequested, bidResponse, bidWon, etc.)
   - Stored in SQLite `analytics_events` table

2. **Config Serve Logs** (`config_serve_log` table)
   - Request timestamps
   - Geo/device/config tracking
   - Used for `/api/system/metrics` endpoint

3. **Bidder Health Metrics** (`/apps/api/src/routes/bidder-health.ts`)
   - Timeout rates
   - Win rates
   - Fill rates
   - Health scores

**Status:** ⚠️ Business metrics exist, no API-level metrics  
**Gaps:**
- **No request/response timing** for API endpoints
- **No histogram buckets** for latency distribution
- **No Prometheus /metrics endpoint**
- **No request rate tracking** (RPS, RPM)
- **No error rate by endpoint**
- **No database query performance tracking**
- **No cache hit/miss ratios**
- **No build time tracking** for Prebid.js builds

---

### 1.5 Wrapper Analytics

**File:** `/apps/wrapper/src/pb.ts`

```typescript
// Analytics batching
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 30000; // 30 seconds

function sendBatch(): void {
  if (batchQueue.length === 0) return;

  try {
    const payload = JSON.stringify(batchQueue);
    const url = `/api/analytics/batch`;

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, payload);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(e => console.error('pb: Beacon error', e));
    }

    batchQueue = [];
  } catch (e) {
    console.error('pb: Batch send error', e);
  }
}

// Flush on page unload
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') sendBatch();
});
window.addEventListener('pagehide', () => sendBatch());
window.addEventListener('beforeunload', () => sendBatch());
```

**Status:** ✅ Well-implemented batching with sendBeacon  
**Coverage:**
- Event batching (10 events or 30 seconds)
- Graceful fallback to fetch if sendBeacon unavailable
- Multiple page unload event handlers
- Client-side error handling

**Gaps:**
- **No retry logic** for failed beacons
- **No offline queue** (events lost if network down)
- **No sampling for high-volume publishers**
- **No wrapper load time tracking**
- **No wrapper error reporting** to server

---

### 1.6 Instrumentation Completeness

**Critical Paths Analyzed:**

| Path | Instrumented? | Metrics | Errors Logged? |
|------|---------------|---------|----------------|
| `/api/auth/login` | ❌ | None | ✅ Yes |
| `/api/publishers` | ❌ | None | ✅ Yes |
| `/api/publishers/:id/builds` | ⚠️ | Build status only | ✅ Yes |
| `/c/:publisherId` (config) | ⚠️ | Serve log only | ✅ Yes |
| `/b` (analytics beacon) | ⚠️ | Event count only | ✅ Yes |
| `/pb.js` (wrapper script) | ❌ | None | ✅ Yes |
| `/api/analytics/*` | ⚠️ | Business metrics | ✅ Yes |

**Key Findings:**
- ✅ **Error logging:** Present in all routes
- ❌ **Request timing:** Not tracked
- ❌ **Success/error rates:** Not tracked
- ⚠️ **Business metrics:** Good coverage for bidder/auction analytics
- ❌ **API performance:** No APM-level metrics

---

## 2. Observability Gaps Analysis

### 2.1 HIGH PRIORITY Gaps

#### 2.1.1 No Error Tracking Service

**Impact:** 🔴 CRITICAL
- Cannot track error trends over time
- No visibility into production errors
- Cannot correlate errors with deployments
- No alerting on error spikes

**Recommendation:** Implement Sentry

**Implementation:**
```typescript
// apps/api/src/config/sentry-config.ts
import * as Sentry from '@sentry/node';
import { FastifyInstance } from 'fastify';

export function initializeSentry(app: FastifyInstance) {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.GIT_COMMIT || 'unknown',
      tracesSampleRate: 0.1, // 10% of requests
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      beforeSend(event, hint) {
        // Redact sensitive data
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      },
    });

    // Fastify error handler integration
    app.setErrorHandler((error, request, reply) => {
      Sentry.captureException(error, {
        tags: {
          endpoint: request.routerPath,
          method: request.method,
        },
        user: {
          id: request.user?.id,
          role: request.user?.role,
        },
        extra: {
          publisherId: request.params?.publisherId,
          body: request.body,
        },
      });
      
      // Continue with normal error handling
      return handleError(reply, error);
    });
  }
}
```

**Where to Add Sentry.captureException():**
1. `/apps/api/src/services/prebid-build-service.ts` - Build failures
2. `/apps/api/src/routes/wrapper.ts` - Wrapper generation errors
3. `/apps/api/src/routes/analytics.ts` - Analytics processing errors
4. `/apps/api/src/utils/prebid-data-fetcher.ts` - External API failures
5. `/apps/wrapper/src/pb.ts` - Client-side wrapper errors

**Cost:** FREE tier (5,000 events/month) sufficient for dev/staging  
**Production:** $26/month for 50k events

---

#### 2.1.2 No Prometheus Metrics Endpoint

**Impact:** 🔴 CRITICAL
- Cannot track API performance over time
- No alerting on slow endpoints
- No visibility into request rates
- Cannot correlate performance with load

**Recommendation:** Add prom-client for Prometheus metrics

**Implementation:**
```typescript
// apps/api/src/metrics/prometheus.ts
import promClient from 'prom-client';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const register = new promClient.Registry();

// Default metrics (CPU, memory, event loop lag)
promClient.collectDefaultMetrics({ register });

// HTTP request duration histogram (CRITICAL for latency tracking)
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5], // Ad tech latencies
  registers: [register],
});

// HTTP request counter
const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Build time histogram
const buildDuration = new promClient.Histogram({
  name: 'prebid_build_duration_seconds',
  help: 'Duration of Prebid.js builds',
  labelNames: ['publisher_id', 'status'],
  buckets: [10, 30, 60, 120, 300], // Build times in seconds
  registers: [register],
});

// Analytics events counter
const analyticsEvents = new promClient.Counter({
  name: 'analytics_events_total',
  help: 'Total analytics events received',
  labelNames: ['event_type', 'publisher_id'],
  registers: [register],
});

// Database query duration
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['table', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export function instrumentFastify(app: FastifyInstance) {
  // Request timing middleware
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    request.startTime = Date.now();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = (Date.now() - request.startTime) / 1000;
    const route = request.routerPath || 'unknown';
    
    httpRequestDuration.observe(
      { method: request.method, route, status_code: reply.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: request.method,
      route,
      status_code: reply.statusCode,
    });
  });

  // Metrics endpoint
  app.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
}

export { httpRequestDuration, buildDuration, analyticsEvents, dbQueryDuration };
```

**Histogram Bucket Analysis:**

| Endpoint Type | Buckets (ms) | Rationale |
|---------------|--------------|-----------|
| **Auth/Config** | [10, 50, 100, 300, 500, 1000, 2000, 5000] | Fast paths (<100ms ideal) |
| **Builds** | [10s, 30s, 60s, 120s, 300s] | Long-running operations |
| **Analytics** | [1, 5, 10, 50, 100, 500, 1000] | High-throughput writes |
| **Database** | [1, 5, 10, 50, 100, 500, 1000] | Query performance tracking |

**Usage in Build Service:**
```typescript
// apps/api/src/services/prebid-build-service.ts
import { buildDuration } from '../metrics/prometheus';

async function executeBuild(options: BuildOptions): Promise<BuildResult> {
  const timer = buildDuration.startTimer({ publisher_id: options.publisherId });
  
  try {
    // ... build logic ...
    timer({ status: 'success' });
    return { success: true, cdnUrl, fileSize };
  } catch (error) {
    timer({ status: 'error' });
    throw error;
  }
}
```

**Cost:** FREE (self-hosted Prometheus)  
**Alternative:** Grafana Cloud FREE tier (10k series, 14-day retention)

---

#### 2.1.3 No Structured Logging with Correlation IDs

**Impact:** 🟡 MEDIUM
- Cannot trace requests across services
- Difficult to debug issues from logs alone
- No context about publisher/user in logs

**Recommendation:** Add correlation ID middleware + structured logging

**Implementation:**
```typescript
// apps/api/src/middleware/correlation-id.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export async function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Use existing header or generate new ID
  const correlationId = 
    request.headers['x-correlation-id'] as string ||
    request.headers['x-request-id'] as string ||
    uuidv4();
  
  request.correlationId = correlationId;
  reply.header('x-correlation-id', correlationId);
}

// apps/api/src/config/server-config.ts
export function createFastifyInstance() {
  return require('fastify').default({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            correlationId: request.correlationId,
            publisherId: request.params?.publisherId,
            userId: request.user?.id,
            userAgent: request.headers['user-agent'],
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
            correlationId: reply.getHeader('x-correlation-id'),
          };
        },
      },
    },
  });
}
```

**Log Enrichment Example:**
```typescript
// Before:
fastify.log.error('Build failed');

// After:
fastify.log.error({
  err,
  correlationId: request.correlationId,
  publisherId: request.params.publisherId,
  buildId: buildId,
  modules: modules.length,
}, 'Prebid.js build failed');
```

**Cost:** FREE (built into Fastify)

---

### 2.2 MEDIUM PRIORITY Gaps

#### 2.2.1 No Cardinality Management

**Impact:** 🟡 MEDIUM (becomes CRITICAL at scale)

**Problem:**
```typescript
// DANGEROUS: High cardinality explosion
analytics_events_total{
  event_type="bidResponse",
  publisher_id="pub-123",
  bidder_code="rubicon",
  ad_unit_code="header-banner-1", // ⚠️ Unbounded cardinality
  geo="US-CA-SAN_FRANCISCO",       // ⚠️ City-level = 10k+ values
  device_type="iPhone 15 Pro Max"  // ⚠️ Device model = 1000+ values
}
```

**Cardinality Estimation:**
- Publishers: ~100
- Bidders: ~50
- Event types: ~10
- Ad units per publisher: ~50
- Geo (country): ~200
- **Total combinations:** 100 × 50 × 10 × 50 × 200 = **500 million series** 💥

**Recommendation:**
```typescript
// SAFE: Bounded cardinality
analytics_events_total{
  event_type="bidResponse",
  publisher_tier="enterprise",  // ✅ 3-5 values
  bidder_code="rubicon",        // ✅ ~50 values
  geo_region="us-west",         // ✅ ~10 values
  device_category="mobile"      // ✅ 3 values (mobile/desktop/tablet)
}

// Total combinations: 10 × 5 × 50 × 10 × 3 = 75,000 series ✅
```

**Label Sanitization:**
```typescript
// apps/api/src/metrics/label-sanitizer.ts
export function sanitizePublisherId(publisherId: string): string {
  // Map to tier instead of raw ID
  const publisher = getPublisher(publisherId);
  if (publisher.revenue > 100000) return 'enterprise';
  if (publisher.revenue > 10000) return 'professional';
  return 'standard';
}

export function sanitizeGeo(country: string): string {
  const regions = {
    'US': 'us-west', 'CA': 'us-west',
    'UK': 'eu-west', 'DE': 'eu-west', 'FR': 'eu-west',
    'CN': 'asia-east', 'JP': 'asia-east',
  };
  return regions[country] || 'other';
}
```

---

#### 2.2.2 No Log Aggregation Service

**Impact:** 🟡 MEDIUM
- Logs scattered across multiple servers
- Difficult to search logs across instances
- No long-term log retention

**Recommendation:** Use Grafana Loki or Datadog Logs

**Option 1: Grafana Loki (FREE self-hosted)**
```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
```

**Option 2: Datadog Logs (Paid but better UX)**
```typescript
// apps/api/src/config/server-config.ts
import winston from 'winston';
import { DatadogTransport } from '@datadog/datadog-winston';

export function createFastifyInstance() {
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.Console(),
      new DatadogTransport({
        apiKey: process.env.DATADOG_API_KEY,
        service: 'pbjs-engine-api',
        hostname: process.env.HOSTNAME,
      }),
    ],
  });

  return require('fastify').default({ logger });
}
```

**Cost:**
- Loki: FREE (self-hosted)
- Datadog: $0.10/GB ingested (~$50/month for moderate traffic)

---

#### 2.2.3 No Alerting Configuration

**Impact:** 🟡 MEDIUM
- No notifications for production incidents
- Manual monitoring required

**Recommendation:** Define alert rules for Prometheus + Alertmanager

```yaml
# prometheus-alerts.yml
groups:
  - name: pbjs_engine_alerts
    interval: 30s
    rules:
      # API latency alert
      - alert: HighApiLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket{route="/c/:publisherId"}) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Config endpoint P95 latency > 500ms"
          description: "{{ $value }}s latency on config endpoint"
          runbook: https://docs.pbjs-engine.com/runbooks/high-latency

      # Error rate alert
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate detected"
          description: "{{ $value }} errors/sec (> 5%)"
          runbook: https://docs.pbjs-engine.com/runbooks/high-errors

      # Build failure alert
      - alert: BuildFailureRate
        expr: rate(prebid_build_duration_seconds_count{status="error"}[10m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Prebid.js builds failing"
          description: "{{ $value }} builds/min failing"

      # Database slow query
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, db_query_duration_seconds_bucket) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database queries slow (P95 > 100ms)"

      # Analytics processing lag
      - alert: AnalyticsBacklog
        expr: analytics_events_total - analytics_events_processed_total > 10000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Analytics processing backlog growing"
```

**Alerting Destinations:**
- Slack webhook (FREE)
- PagerDuty (Paid, $25/user/month)
- Email (FREE but noisy)
- Opsgenie (Paid, $9/user/month)

---

### 2.3 LOW PRIORITY Gaps

#### 2.3.1 No Distributed Tracing

**Impact:** 🟢 LOW (nice-to-have for debugging)

If you adopt **OpenTelemetry** later:
- Trace request flow: Wrapper → API → Database → External APIs
- Identify bottlenecks in multi-step operations
- Track Prebid.js build pipeline steps

**Cost:** FREE (Jaeger self-hosted) or Datadog APM ($31/host/month)

---

#### 2.3.2 No Business Metrics Dashboards

**Impact:** 🟢 LOW (analytics exist, just need visualization)

**Current State:**
- ✅ Data collected in `analytics_events` table
- ❌ No real-time dashboards for publishers

**Recommendation:** Build Grafana dashboards using existing data

**Sample Dashboard Panels:**
1. **Revenue Trends** (bidWon events × CPM)
2. **Fill Rate by Bidder** (responses / requests)
3. **Timeout Rate by Bidder** (timeouts / requests)
4. **Latency Heatmap** (P50/P95/P99 by hour)
5. **Top Performing Ad Units** (revenue by adUnitCode)

---

## 3. Implementation Roadmap

### Phase 1: Critical Monitoring (Week 1-2)

**Goal:** Gain visibility into production errors and performance

**Tasks:**
1. ✅ **Add Sentry for error tracking** (4 hours)
   - Install `@sentry/node`
   - Configure in `apps/api/src/index.ts`
   - Add `Sentry.captureException()` to critical paths
   - Test with intentional errors

2. ✅ **Add Prometheus metrics endpoint** (8 hours)
   - Install `prom-client`
   - Implement `apps/api/src/metrics/prometheus.ts`
   - Add request timing middleware
   - Add build duration tracking
   - Deploy Prometheus server (Docker)

3. ✅ **Add correlation IDs** (2 hours)
   - Implement middleware
   - Update log serializers
   - Test end-to-end tracing

**Deliverables:**
- `/metrics` endpoint returning Prometheus metrics
- Sentry dashboard showing production errors
- Logs with correlation IDs

---

### Phase 2: Alerting & Dashboards (Week 3-4)

**Goal:** Get notified about incidents before users complain

**Tasks:**
1. ✅ **Configure Prometheus alerts** (4 hours)
   - Write alert rules (see examples above)
   - Set up Alertmanager
   - Configure Slack webhook

2. ✅ **Build Grafana dashboards** (8 hours)
   - API performance dashboard (latency, error rate, RPS)
   - Build system dashboard (build times, success rate)
   - Business metrics dashboard (revenue, fill rate)

3. ✅ **Test alert firing** (2 hours)
   - Trigger test alerts
   - Verify Slack notifications
   - Document runbook links

**Deliverables:**
- 3 Grafana dashboards
- Slack alerts for critical issues
- Runbook documentation

---

### Phase 3: Log Aggregation (Week 5-6)

**Goal:** Centralized log search and analysis

**Tasks:**
1. ✅ **Deploy Grafana Loki** (4 hours)
   - Set up Loki + Promtail
   - Configure log ingestion
   - Test log queries

2. ✅ **Add structured logging** (6 hours)
   - Enhance log serializers
   - Add sensitive data redaction
   - Standardize log formats

3. ✅ **Create log-based alerts** (2 hours)
   - Alert on specific error patterns
   - Track login failures
   - Monitor API key usage

**Deliverables:**
- Loki instance ingesting all logs
- Log-based alerts in Grafana
- Redaction for sensitive data

---

### Phase 4: Advanced Observability (Future)

**Optional enhancements for scale:**
- Distributed tracing with OpenTelemetry
- Real-time analytics streaming (Redis Streams → ClickHouse)
- Client-side RUM (Real User Monitoring)
- Synthetic monitoring (Pingdom, Uptime Robot)

---

## 4. Monitoring Cost Estimates

### Option A: FREE Tier Stack (Recommended for MVP)

| Service | Cost | Notes |
|---------|------|-------|
| **Sentry** | $0 | 5k events/month |
| **Prometheus** | $0 | Self-hosted (Docker) |
| **Grafana** | $0 | Self-hosted or Grafana Cloud FREE |
| **Loki** | $0 | Self-hosted |
| **Alertmanager** | $0 | Self-hosted |
| **Slack webhooks** | $0 | Built into Slack |
| **Total** | **$0/month** | Requires devops time |

**Infrastructure:**
- 1 VPS for Prometheus/Grafana/Loki: $20/month (Hetzner, DigitalOcean)

---

### Option B: Managed Stack (Production-Ready)

| Service | Cost | Notes |
|---------|------|-------|
| **Sentry** | $26/month | 50k events/month |
| **Datadog APM** | $31/host | Metrics + APM |
| **Datadog Logs** | ~$50/month | 50GB ingestion |
| **PagerDuty** | $25/user | On-call rotation |
| **Total** | **~$130/month** | Fully managed |

---

### Option C: Hybrid (Best Value)

| Service | Cost | Notes |
|---------|------|-------|
| **Sentry** | $0 | FREE tier |
| **Grafana Cloud** | $0 | FREE tier (10k series) |
| **Loki** | $0 | Self-hosted |
| **Slack** | $0 | Webhooks |
| **Total** | **$0/month** | Best of both worlds |

**Recommended:** Start with Option C, upgrade to Option B at scale.

---

## 5. Code Examples

### 5.1 Full Sentry Integration

```typescript
// apps/api/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { FastifyInstance } from 'fastify';
import { handleError } from '../utils/error-handler';

export function initializeSentry(app: FastifyInstance) {
  if (!process.env.SENTRY_DSN) {
    app.log.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.GIT_COMMIT || 'unknown',
    
    // Performance monitoring (10% sample rate)
    tracesSampleRate: 0.1,
    
    integrations: [
      new Sentry.Integrations.Http({ tracing: true, breadcrumbs: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    
    beforeSend(event, hint) {
      // Redact sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      
      // Redact sensitive body fields
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data.password) data.password = '[REDACTED]';
        if (data.apiKey) data.apiKey = '[REDACTED]';
      }
      
      return event;
    },
  });

  // Request context middleware
  app.addHook('onRequest', async (request, reply) => {
    Sentry.setContext('request', {
      correlationId: request.correlationId,
      method: request.method,
      url: request.url,
    });
    
    if (request.user) {
      Sentry.setUser({
        id: request.user.id,
        email: request.user.email,
        role: request.user.role,
      });
    }
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    // Skip 4xx errors (client mistakes, not our bugs)
    if (error.statusCode && error.statusCode < 500) {
      return handleError(reply, error);
    }

    Sentry.captureException(error, {
      tags: {
        endpoint: request.routerPath,
        method: request.method,
      },
      extra: {
        publisherId: request.params?.publisherId,
        body: request.body,
        query: request.query,
      },
    });
    
    return handleError(reply, error);
  });

  app.log.info('Sentry error tracking initialized');
}

// Usage in services:
// import * as Sentry from '@sentry/node';
// 
// try {
//   await buildPrebidJs(options);
// } catch (error) {
//   Sentry.captureException(error, {
//     tags: { service: 'prebid-build' },
//     extra: { publisherId, modules: moduleList },
//   });
//   throw error;
// }
```

---

### 5.2 Complete Prometheus Metrics

```typescript
// apps/api/src/metrics/index.ts
import promClient from 'prom-client';
import { FastifyInstance } from 'fastify';

const register = new promClient.Registry();

// Enable default metrics (CPU, memory, event loop lag)
promClient.collectDefaultMetrics({ register, prefix: 'pbjs_' });

// === HTTP Metrics ===

export const httpRequestDuration = new promClient.Histogram({
  name: 'pbjs_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestsTotal = new promClient.Counter({
  name: 'pbjs_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// === Database Metrics ===

export const dbQueryDuration = new promClient.Histogram({
  name: 'pbjs_db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['table', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbConnectionPool = new promClient.Gauge({
  name: 'pbjs_db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['state'], // active, idle, waiting
  registers: [register],
});

// === Build System Metrics ===

export const buildDuration = new promClient.Histogram({
  name: 'pbjs_build_duration_seconds',
  help: 'Prebid.js build duration',
  labelNames: ['publisher_tier', 'status'], // enterprise/professional/standard
  buckets: [10, 30, 60, 120, 300],
  registers: [register],
});

export const buildQueueSize = new promClient.Gauge({
  name: 'pbjs_build_queue_size',
  help: 'Number of builds in queue',
  registers: [register],
});

// === Analytics Metrics ===

export const analyticsEventsTotal = new promClient.Counter({
  name: 'pbjs_analytics_events_total',
  help: 'Total analytics events received',
  labelNames: ['event_type', 'publisher_tier'],
  registers: [register],
});

export const analyticsProcessingLag = new promClient.Gauge({
  name: 'pbjs_analytics_processing_lag_seconds',
  help: 'Time between event timestamp and processing time',
  registers: [register],
});

// === Cache Metrics ===

export const cacheHits = new promClient.Counter({
  name: 'pbjs_cache_hits_total',
  help: 'Cache hits',
  labelNames: ['cache_type'], // wrapper, config, etc.
  registers: [register],
});

export const cacheMisses = new promClient.Counter({
  name: 'pbjs_cache_misses_total',
  help: 'Cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheSize = new promClient.Gauge({
  name: 'pbjs_cache_size_bytes',
  help: 'Cache size in bytes',
  labelNames: ['cache_type'],
  registers: [register],
});

// === Business Metrics ===

export const revenueTotal = new promClient.Counter({
  name: 'pbjs_revenue_total_usd',
  help: 'Total revenue in USD',
  labelNames: ['publisher_tier', 'bidder'],
  registers: [register],
});

export const bidTimeouts = new promClient.Counter({
  name: 'pbjs_bid_timeouts_total',
  help: 'Total bid timeouts',
  labelNames: ['bidder', 'publisher_tier'],
  registers: [register],
});

// Fastify integration
export function instrumentFastify(app: FastifyInstance) {
  // Request timing
  app.addHook('onRequest', async (request, reply) => {
    (request as any).startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const duration = (Date.now() - (request as any).startTime) / 1000;
    const route = request.routerPath || 'unknown';
    
    httpRequestDuration.observe(
      { method: request.method, route, status_code: reply.statusCode },
      duration
    );
    
    httpRequestsTotal.inc({
      method: request.method,
      route,
      status_code: reply.statusCode,
    });
  });

  // Metrics endpoint (NO authentication - needs to be scraped)
  app.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  app.log.info('Prometheus metrics enabled at /metrics');
}

export { register };
```

---

### 5.3 Instrumented Build Service

```typescript
// apps/api/src/services/prebid-build-service.ts (updated)
import * as Sentry from '@sentry/node';
import { buildDuration, buildQueueSize } from '../metrics';

export async function buildPrebidJs(options: BuildOptions): Promise<BuildResult> {
  const timer = buildDuration.startTimer({
    publisher_tier: getPublisherTier(options.publisherId),
    status: 'pending',
  });
  
  buildQueueSize.inc();
  
  const transaction = Sentry.startTransaction({
    op: 'prebid.build',
    name: 'Build Prebid.js',
    data: {
      publisherId: options.publisherId,
      buildId: options.buildId,
    },
  });

  try {
    const span1 = transaction.startChild({ op: 'fetch_modules' });
    const modules = await getEnabledModules(options.publisherId);
    span1.finish();

    const span2 = transaction.startChild({ op: 'execute_build' });
    const result = await executeBuild(modules, outputFileName, options);
    span2.finish();

    timer({ status: 'success' });
    transaction.setStatus('ok');
    
    return result;
  } catch (error) {
    timer({ status: 'error' });
    transaction.setStatus('internal_error');
    
    Sentry.captureException(error, {
      tags: { service: 'prebid-build' },
      extra: {
        publisherId: options.publisherId,
        buildId: options.buildId,
        modules: modules?.length,
      },
    });
    
    throw error;
  } finally {
    buildQueueSize.dec();
    transaction.finish();
  }
}

function getPublisherTier(publisherId: string): string {
  // Avoid high cardinality - use tiers instead of IDs
  const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
  if (!publisher) return 'unknown';
  
  if (publisher.revenue > 100000) return 'enterprise';
  if (publisher.revenue > 10000) return 'professional';
  return 'standard';
}
```

---

### 5.4 Enhanced Health Check

```typescript
// apps/api/src/routes/monitoring.ts (updated)
import { register } from '../metrics';

// Liveness check (for load balancers) - NO authentication
fastify.get('/health/live', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Readiness check - NO authentication
fastify.get('/health/ready', async (request, reply) => {
  const checks = {
    database: false,
    prebid_source: false,
    build_directory: false,
  };

  try {
    // Database check
    const dbStart = Date.now();
    await db.select().from(publishers).limit(1).all();
    const dbLatency = Date.now() - dbStart;
    checks.database = dbLatency < 1000; // Fail if > 1s

    // Prebid.js source check
    const prebidSourcePath = path.join(__dirname, '../../prebid-builds/prebid-source');
    checks.prebid_source = fs.existsSync(prebidSourcePath);

    // Build directory writeable check
    const buildPath = path.join(__dirname, '../../prebid-builds/output');
    try {
      const testFile = path.join(buildPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      checks.build_directory = true;
    } catch {
      checks.build_directory = false;
    }

    const ready = Object.values(checks).every(c => c === true);

    return reply.code(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return reply.code(503).send({
      status: 'not_ready',
      checks,
      error: err.message,
    });
  }
});

// Detailed health (for admins) - AUTHENTICATED
fastify.get('/health/detailed', {
  preHandler: requireSuperAdmin,
}, async (request, reply) => {
  const dbStart = Date.now();
  await db.select().from(publishers).limit(1).all();
  const dbLatency = Date.now() - dbStart;

  const metrics = await register.metrics();

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime(),
    checks: {
      database: { healthy: true, latency_ms: dbLatency },
      cache: getCacheStats(),
      memory: process.memoryUsage(),
    },
    metrics_summary: {
      request_rate_rpm: '...', // Extract from metrics
      error_rate: '...',
      p95_latency_ms: '...',
    },
  };
});
```

---

## 6. Runbook Examples

### Runbook: High API Latency

**Alert:** `HighApiLatency` - Config endpoint P95 > 500ms

**Impact:** Slow page loads for publishers, poor user experience

**Investigation Steps:**
1. Check Grafana dashboard for traffic spike
2. Query slow queries: `SELECT * FROM config_serve_log WHERE latency_ms > 500 ORDER BY timestamp DESC LIMIT 100`
3. Check database EXPLAIN: `EXPLAIN QUERY PLAN SELECT ...`
4. Check memory usage: Is heap near limit?
5. Check cache hit rate: Is cache cold?

**Resolution:**
- **If database slow:** Add indexes, optimize queries
- **If memory high:** Restart service, investigate memory leak
- **If cache cold:** Warm cache with popular configs
- **If traffic spike:** Scale horizontally, add rate limiting

**Escalation:** If unresolved in 30min, page on-call engineer

---

### Runbook: Build Failures

**Alert:** `BuildFailureRate` - >10% builds failing

**Impact:** Publishers cannot deploy new configs

**Investigation Steps:**
1. Check Sentry for build errors
2. Check logs: `grep "Build failed" /var/log/pbjs-engine.log`
3. Check Prebid.js source: Is git repo accessible?
4. Check disk space: `df -h`
5. Check Node.js version: `node --version`

**Resolution:**
- **If source missing:** Re-clone Prebid.js repo
- **If disk full:** Clean old builds, increase disk
- **If module invalid:** Fix module name sanitization
- **If gulp error:** Check Node.js/npm versions

**Escalation:** If unresolved in 1 hour, notify engineering lead

---

## 7. Key Recommendations Summary

### Immediate Actions (This Week)

1. ✅ **Add Sentry** - 4 hours, $0 cost
   - File: `apps/api/src/config/sentry.ts`
   - Install: `npm install @sentry/node`
   - Configure: Add `SENTRY_DSN` to `.env`

2. ✅ **Add Prometheus metrics** - 8 hours, $0 cost
   - File: `apps/api/src/metrics/index.ts`
   - Install: `npm install prom-client`
   - Instrument: Add timing middleware

3. ✅ **Add correlation IDs** - 2 hours, $0 cost
   - File: `apps/api/src/middleware/correlation-id.ts`
   - Propagate through all log statements

---

### Short-Term Actions (Next Month)

4. ✅ **Configure Prometheus alerts** - 4 hours
   - Set up Alertmanager
   - Configure Slack webhook
   - Write alert rules

5. ✅ **Build Grafana dashboards** - 8 hours
   - API performance dashboard
   - Build system dashboard
   - Business metrics dashboard

6. ✅ **Deploy log aggregation** - 6 hours
   - Deploy Grafana Loki
   - Configure Promtail
   - Create log-based alerts

---

### Long-Term Actions (When Scaling)

7. **Add distributed tracing** - OpenTelemetry integration
8. **Migrate to ClickHouse** - For high-volume analytics
9. **Add RUM** - Client-side performance monitoring
10. **Add synthetic monitoring** - Pingdom health checks

---

## 8. Success Metrics

After implementing this observability strategy, you should be able to answer:

✅ **What is our P95 API latency?**  
✅ **What percentage of builds are failing?**  
✅ **Which bidders have highest timeout rates?**  
✅ **How many errors occurred in the last hour?**  
✅ **Which publisher had the most revenue today?**  
✅ **Are we having a production incident right now?**

---

## Appendix A: Environment Variables

Add to `apps/api/.env`:

```bash
# Error Tracking
SENTRY_DSN=https://YOUR_DSN@sentry.io/PROJECT_ID
GIT_COMMIT=HEAD  # For release tracking

# Logging
LOG_LEVEL=info  # debug, info, warn, error
NODE_ENV=production

# Metrics (optional if using remote write)
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus.example.com/api/v1/write
PROMETHEUS_REMOTE_WRITE_USER=username
PROMETHEUS_REMOTE_WRITE_PASSWORD=password

# Alerting (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_API_KEY=your_pagerduty_key
```

---

## Appendix B: Docker Compose for Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus-alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false

  loki:
    image: grafana/loki:latest
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
    ports:
      - "3100:3100"

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager
    ports:
      - "9093:9093"

volumes:
  prometheus-data:
  grafana-data:
  loki-data:
  alertmanager-data:
```

---

## Appendix C: Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "/etc/prometheus/alerts.yml"

scrape_configs:
  - job_name: 'pbjs-engine-api'
    static_configs:
      - targets: ['host.docker.internal:3001']  # Adjust for your setup
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

---

## Conclusion

pbjs_engine has **basic observability** but lacks production-grade monitoring. Implementing the recommendations in this audit will provide:

- 🔍 **Visibility** into production errors (Sentry)
- 📊 **Metrics** for performance tracking (Prometheus)
- 🔔 **Alerts** for incidents (Alertmanager + Slack)
- 📜 **Logs** for debugging (Loki)
- 🎯 **SLIs/SLOs** for reliability targets

**Estimated Implementation Time:** 40 hours (2-3 weeks)  
**Estimated Cost:** $0-130/month (depending on stack choice)  
**Risk Reduction:** HIGH - Prevents extended production outages

**Priority Ranking:**
1. ⭐ Sentry (error tracking) - Start here
2. ⭐ Prometheus (metrics) - Core observability
3. 🔵 Alerting (Slack/PagerDuty) - Incident response
4. 🔵 Loki (log aggregation) - Debugging aid
5. 🟢 Distributed tracing - Future enhancement

