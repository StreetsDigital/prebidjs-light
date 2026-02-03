# Observability Quick Start Guide

**For:** pbjs_engine development team  
**Last Updated:** 2026-02-03

---

## TL;DR - What to Implement First

### Week 1: Error Tracking (4 hours)

```bash
# 1. Install Sentry
npm install --save @sentry/node

# 2. Add to apps/api/.env
echo "SENTRY_DSN=https://YOUR_DSN@sentry.io/PROJECT" >> apps/api/.env

# 3. Initialize in apps/api/src/index.ts
import { initializeSentry } from './config/sentry';
initializeSentry(app);
```

**Result:** Get notified when production breaks

---

### Week 2: Metrics (8 hours)

```bash
# 1. Install Prometheus client
npm install --save prom-client

# 2. Create apps/api/src/metrics/index.ts (see full audit doc)

# 3. Start Prometheus with Docker
docker run -d -p 9090:9090 \
  -v $PWD/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**Result:** Track API latency, error rates, build times

---

### Week 3: Alerts (4 hours)

```yaml
# prometheus-alerts.yml
groups:
  - name: pbjs_engine_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        annotations:
          summary: "5xx errors > 5%"
```

**Result:** Get Slack messages when errors spike

---

## Quick Metrics Implementation

### 1. Add Prometheus Endpoint

**File:** `apps/api/src/metrics/simple.ts`

```typescript
import promClient from 'prom-client';
import { FastifyInstance } from 'fastify';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export function setupMetrics(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => {
    req.startTime = Date.now();
  });

  app.addHook('onResponse', async (req, reply) => {
    const duration = (Date.now() - req.startTime) / 1000;
    httpDuration.observe(
      { method: req.method, route: req.routerPath, status: reply.statusCode },
      duration
    );
  });

  app.get('/metrics', async () => register.metrics());
}
```

**Add to `apps/api/src/index.ts`:**
```typescript
import { setupMetrics } from './metrics/simple';
setupMetrics(app);
```

**Test:**
```bash
curl http://localhost:3001/metrics
```

---

## Quick Sentry Implementation

**File:** `apps/api/src/config/sentry.ts`

```typescript
import * as Sentry from '@sentry/node';
import { FastifyInstance } from 'fastify';

export function initializeSentry(app: FastifyInstance) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });

  app.setErrorHandler((error, request, reply) => {
    if (reply.statusCode >= 500) {
      Sentry.captureException(error, {
        tags: { endpoint: request.routerPath },
        user: { id: request.user?.id },
      });
    }
    reply.send({ error: error.message });
  });
}
```

**Add to `apps/api/src/index.ts`:**
```typescript
import { initializeSentry } from './config/sentry';
initializeSentry(app);
```

---

## Quick Alerting Setup

### Option 1: Slack Webhook (Easiest)

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add to `alertmanager.yml`:

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_WEBHOOK_URL'
        channel: '#alerts'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### Option 2: Email (Free but noisy)

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'oncall@yourcompany.com'
        from: 'alertmanager@yourcompany.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your@gmail.com'
        auth_password: 'app_password'
```

---

## Critical Metrics to Track

### API Performance
```promql
# P95 latency by endpoint
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# Requests per minute
rate(http_requests_total[1m]) * 60
```

### Build System
```typescript
export const buildDuration = new promClient.Histogram({
  name: 'prebid_build_duration_seconds',
  help: 'Build duration',
  labelNames: ['status'],
  buckets: [10, 30, 60, 120, 300],
});

// Usage in build service:
const timer = buildDuration.startTimer();
try {
  await executeBuild();
  timer({ status: 'success' });
} catch (err) {
  timer({ status: 'error' });
  throw err;
}
```

### Analytics Processing
```typescript
export const analyticsEvents = new promClient.Counter({
  name: 'analytics_events_total',
  help: 'Analytics events received',
  labelNames: ['event_type'],
});

// Usage in analytics route:
analyticsEvents.inc({ event_type: event.eventType });
```

---

## Health Check Best Practices

### Liveness (for load balancer)
```typescript
// NO authentication needed
fastify.get('/health/live', async () => {
  return { status: 'ok' }; // Just check if process is running
});
```

### Readiness (can accept traffic?)
```typescript
fastify.get('/health/ready', async (req, reply) => {
  try {
    await db.select().from(publishers).limit(1); // Quick DB check
    return { status: 'ready' };
  } catch {
    return reply.code(503).send({ status: 'not_ready' });
  }
});
```

---

## Common Pitfalls to Avoid

### ❌ High Cardinality Labels
```typescript
// BAD: publisherId has unlimited values
httpDuration.observe({ publisher_id: req.params.publisherId });

// GOOD: Use tiers instead
const tier = getPublisherTier(req.params.publisherId); // enterprise/pro/standard
httpDuration.observe({ publisher_tier: tier });
```

### ❌ Logging Sensitive Data
```typescript
// BAD: Password in logs
fastify.log.error({ body: req.body }, 'Login failed');

// GOOD: Redact sensitive fields
const safeBody = { ...req.body, password: '[REDACTED]' };
fastify.log.error({ body: safeBody }, 'Login failed');
```

### ❌ Missing Error Context
```typescript
// BAD: No context
console.error('Build failed');

// GOOD: Rich context
fastify.log.error({
  err,
  publisherId: req.params.publisherId,
  buildId,
  modules: moduleList.length,
}, 'Prebid.js build failed');
```

---

## Testing Your Setup

### 1. Test Metrics Endpoint
```bash
curl http://localhost:3001/metrics | grep http_request_duration
```

### 2. Test Error Tracking
```typescript
// Add a test route that always errors
fastify.get('/test-error', async () => {
  throw new Error('Test error for Sentry');
});

// Trigger it
curl http://localhost:3001/test-error

// Check Sentry dashboard - error should appear
```

### 3. Test Alerting
```bash
# Trigger alert by causing errors
for i in {1..100}; do curl http://localhost:3001/test-error; done

# Check Prometheus alerts page
open http://localhost:9090/alerts

# Check Slack for alert message
```

---

## Monitoring Stack Comparison

| Stack | Cost | Setup Time | Best For |
|-------|------|------------|----------|
| **FREE Tier** | $0/mo | 2 days | MVP, startups |
| Sentry + Grafana Cloud + Loki | | | |
| | | | |
| **Hybrid** | ~$50/mo | 1 day | Small teams |
| Sentry (paid) + Grafana Cloud | | | |
| | | | |
| **Managed** | ~$130/mo | 4 hours | Production |
| Datadog full stack | | | |

---

## Recommended First Week Plan

### Monday: Error Tracking
- [ ] Sign up for Sentry (free tier)
- [ ] Add Sentry SDK to API
- [ ] Test with intentional error
- [ ] Add to build service
- [ ] Add to wrapper (client-side errors)

### Tuesday: Basic Metrics
- [ ] Add prom-client
- [ ] Implement request timing
- [ ] Create /metrics endpoint
- [ ] Start Prometheus locally
- [ ] Verify metrics collection

### Wednesday: Dashboards
- [ ] Install Grafana
- [ ] Create API performance dashboard
- [ ] Create build system dashboard
- [ ] Import pre-built dashboards

### Thursday: Alerting
- [ ] Set up Alertmanager
- [ ] Configure Slack webhook
- [ ] Write 3 critical alerts
- [ ] Test alert firing

### Friday: Documentation
- [ ] Document runbook for alerts
- [ ] Update deployment docs
- [ ] Share with team
- [ ] Plan next phase

---

## Next Steps After Week 1

### Short Term (Month 1)
- Add structured logging with correlation IDs
- Deploy log aggregation (Loki)
- Create business metrics dashboards
- Set up uptime monitoring (Pingdom/UptimeRobot)

### Medium Term (Month 2-3)
- Add distributed tracing (OpenTelemetry)
- Implement SLI/SLO tracking
- Add client-side RUM
- Create automated runbooks

### Long Term (Month 4+)
- Migrate to ClickHouse for analytics
- Implement anomaly detection
- Add capacity planning metrics
- Build cost tracking dashboards

---

## Resources

- **Full Audit:** See `OBSERVABILITY_AUDIT.md` (43KB detailed guide)
- **Sentry Docs:** https://docs.sentry.io/platforms/node/
- **Prometheus Docs:** https://prometheus.io/docs/
- **Grafana Tutorials:** https://grafana.com/tutorials/
- **Alert Rules Examples:** https://awesome-prometheus-alerts.grep.to/

---

## Support

Questions? Check:
1. Full audit document: `OBSERVABILITY_AUDIT.md`
2. Code examples in audit Appendix
3. Team Slack: #observability
4. On-call engineer: See PagerDuty schedule

