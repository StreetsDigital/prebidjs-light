# pbjs_engine Observability Documentation

**Audit Date:** 2026-02-03  
**Auditor:** Metrics & Observability Engineer  
**Status:** 🟡 MEDIUM RISK - Basic observability exists, production-grade monitoring needed

---

## Documentation Overview

This observability audit provides a complete analysis of pbjs_engine's monitoring capabilities and a roadmap for production-ready observability.

### 📊 Documents

| Document | Size | Purpose | Audience |
|----------|------|---------|----------|
| **OBSERVABILITY_SUMMARY.md** | 11KB | Executive summary & key findings | Leadership, PMs |
| **OBSERVABILITY_QUICK_START.md** | 9KB | Quick implementation guide | Developers |
| **OBSERVABILITY_AUDIT.md** | 43KB | Complete technical audit | Engineers, SREs |
| **This Index** | 2KB | Navigation & overview | Everyone |

---

## Quick Links

### Start Here
- **New to observability?** → Read [OBSERVABILITY_SUMMARY.md](./OBSERVABILITY_SUMMARY.md)
- **Need to implement now?** → Follow [OBSERVABILITY_QUICK_START.md](./OBSERVABILITY_QUICK_START.md)
- **Want all details?** → Review [OBSERVABILITY_AUDIT.md](./OBSERVABILITY_AUDIT.md)

### Key Sections in Full Audit

1. **Current State Assessment** - What exists today
2. **Observability Gaps Analysis** - What's missing (prioritized)
3. **Implementation Roadmap** - Week-by-week plan
4. **Cost Estimates** - FREE vs Paid options
5. **Code Examples** - Copy-paste Sentry/Prometheus setup
6. **Runbook Examples** - Alert response procedures

---

## What's Missing (TL;DR)

### 🔴 CRITICAL (Must fix before production)

1. **No Error Tracking** - Install Sentry (4 hours, $0)
2. **No Metrics** - Add Prometheus (8 hours, $0)
3. **No Alerts** - Configure Alertmanager (4 hours, $0)

**Total:** 16 hours (2 days)

### 🟡 IMPORTANT (Fix in first month)

4. **No Correlation IDs** - Add request tracing (2 hours)
5. **No Log Aggregation** - Deploy Loki (6 hours)
6. **No Structured Logging** - Enhance log format (4 hours)

**Total:** 12 hours (1.5 days)

---

## Implementation Priority

```
Week 1: Error Tracking + Metrics     [P0 - CRITICAL]
Week 2: Alerts + Dashboards          [P1 - HIGH]
Week 3: Log Aggregation              [P2 - MEDIUM]
Week 4: Advanced Features            [P3 - LOW]
```

---

## Cost Summary

### FREE Tier Stack (Recommended)
```
Sentry:       $0  (5k errors/month)
Prometheus:   $0  (self-hosted)
Grafana:      $0  (Cloud free tier)
Loki:         $0  (self-hosted)
Alerts:       $0  (Slack webhooks)
```

**Total:** $0/month + $20/month VPS

### Production Stack (At Scale)
```
Sentry:       $26/month  (50k errors)
Datadog APM:  $31/month  (per host)
PagerDuty:    $25/month  (per user)
```

**Total:** ~$130/month

---

## Current Status

### ✅ What Works

- Basic health check at `/health`
- Fastify JSON logging enabled
- Error handling with `ApiError` class
- Wrapper analytics batching (sendBeacon)
- Bidder health metrics tracked
- Analytics events in SQLite

### ❌ What's Missing

- No error tracking service (Sentry)
- No performance metrics (Prometheus)
- No alerting (Alertmanager)
- No correlation IDs
- No log aggregation
- No histogram buckets for latency
- No cardinality management

---

## Key Metrics to Track

### API Performance
- Request rate (RPS)
- P50/P95/P99 latency
- Error rate by endpoint
- Database query duration

### Build System
- Build duration (P50/P95)
- Build success/failure rate
- Queue size
- Build cache hit rate

### Business Metrics
- Revenue by bidder
- Fill rate by bidder
- Timeout rate
- CPM distribution

### System Health
- CPU/memory usage
- Database connection pool
- Cache size
- Event loop lag

---

## Alert Rules (Must-Have)

```yaml
# Error Rate Spike
rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05

# High Latency
histogram_quantile(0.95, http_request_duration_seconds_bucket) > 0.5

# Build Failures
rate(prebid_build_duration_seconds_count{status="error"}[10m]) > 0.1

# Database Slow
histogram_quantile(0.95, db_query_duration_seconds_bucket) > 0.1
```

---

## Files Referenced in Audit

### Critical Code Files
```
/apps/api/src/config/server-config.ts      - Fastify logging config
/apps/api/src/utils/error-handler.ts       - Error handling
/apps/api/src/routes/monitoring.ts         - Health checks
/apps/api/src/routes/public-routes.ts      - Basic /health endpoint
/apps/api/src/services/prebid-build-service.ts - Build service
/apps/wrapper/src/pb.ts                    - Wrapper analytics
```

### Files to Create
```
/apps/api/src/config/sentry.ts             - Sentry integration
/apps/api/src/metrics/index.ts             - Prometheus metrics
/apps/api/src/middleware/correlation-id.ts - Request tracing
```

### Configuration Files
```
/prometheus.yml                            - Prometheus config
/prometheus-alerts.yml                     - Alert rules
/alertmanager.yml                          - Alert routing
/loki-config.yaml                          - Loki config
/docker-compose.monitoring.yml             - Monitoring stack
```

---

## Risk Assessment

| Issue | Current Risk | After P0 | After P1 | After P2 |
|-------|-------------|----------|----------|----------|
| Production errors unnoticed | 🔴 HIGH | 🟢 LOW | 🟢 LOW | 🟢 LOW |
| Slow endpoints unknown | 🔴 HIGH | 🟢 LOW | 🟢 LOW | 🟢 LOW |
| Cannot debug issues | 🟡 MEDIUM | 🟡 MEDIUM | 🟢 LOW | 🟢 LOW |
| No incident alerts | 🟡 MEDIUM | 🟡 MEDIUM | 🟢 LOW | 🟢 LOW |
| Logs lost | 🟡 MEDIUM | 🟡 MEDIUM | 🟡 MEDIUM | 🟢 LOW |

**Overall:** 🟡 MEDIUM → 🟢 LOW after implementation

---

## Architecture Findings

### No pbs/internal/metrics/
The audit searched for Go-based metrics infrastructure (pbs/internal/metrics) but found none - this is a **Node.js/TypeScript project**, not a Go project. The architecture is:

- **Backend:** Node.js + Fastify + SQLite
- **Frontend:** React + Vite
- **Wrapper:** TypeScript → ES2015
- **NOT:** Go + Prebid Server (PBS)

This means:
- ✅ Use `prom-client` (Node.js), not `prometheus/client_golang`
- ✅ Use `@sentry/node`, not `@sentry/go`
- ✅ Use Fastify middleware, not Go HTTP handlers

---

## Next Actions

### Today
1. [ ] Read executive summary (OBSERVABILITY_SUMMARY.md)
2. [ ] Review implementation timeline
3. [ ] Get approval for 2-day implementation sprint

### This Week
1. [ ] Set up Sentry account (free tier)
2. [ ] Install `@sentry/node` and `prom-client`
3. [ ] Follow OBSERVABILITY_QUICK_START.md
4. [ ] Deploy Prometheus locally

### Next Week
1. [ ] Configure alert rules
2. [ ] Set up Slack webhook
3. [ ] Build Grafana dashboards
4. [ ] Test alert firing

### This Month
1. [ ] Add correlation IDs
2. [ ] Deploy Loki for logs
3. [ ] Create runbook documentation
4. [ ] Train team on new tools

---

## Success Metrics

After implementation, you should be able to answer:

- ✅ What is our P95 API latency?
- ✅ How many 5xx errors in the last hour?
- ✅ Which bidders have highest timeout rates?
- ✅ What percentage of builds are failing?
- ✅ Is there a production incident right now?
- ✅ Which endpoint is slowest?
- ✅ What's causing this error spike?

---

## Related Documentation

### Project Documentation
- **CLAUDE.md** - Development guidelines
- **README.md** - Project setup
- **ARCHITECTURE_NOTES.md** - Architecture decisions
- **PHASE2_FEATURES.md** - Advanced features

### Observability Documentation (This Audit)
- **OBSERVABILITY_SUMMARY.md** - Executive summary
- **OBSERVABILITY_QUICK_START.md** - Quick implementation guide
- **OBSERVABILITY_AUDIT.md** - Complete technical audit
- **OBSERVABILITY_INDEX.md** - This document

---

## Questions?

### For Leadership
Read: OBSERVABILITY_SUMMARY.md  
Key Question: "How much time/budget for implementation?"

### For Developers
Read: OBSERVABILITY_QUICK_START.md  
Key Question: "What do I implement first?"

### For SREs/DevOps
Read: OBSERVABILITY_AUDIT.md (full)  
Key Question: "What monitoring stack should we use?"

---

## Audit Methodology

This audit analyzed:

✅ 39 API route files  
✅ 94+ error logging statements  
✅ Health check implementations  
✅ Logging configuration  
✅ Wrapper analytics code  
✅ Error handling patterns  
✅ Build service error tracking  
✅ Database query patterns  

**Tools Used:**
- Static code analysis (grep, glob)
- File inspection (39 route files)
- Architecture review
- Industry best practices comparison

**Focus Areas:**
- Instrumentation completeness
- Histogram bucket design
- Cardinality management
- Logging quality
- Error tracking
- Performance metrics

---

## Contact

**Questions about this audit?**
- Review the detailed audit (OBSERVABILITY_AUDIT.md)
- Check the quick start guide (OBSERVABILITY_QUICK_START.md)
- Contact: Your observability team or SRE

**Found an issue with this documentation?**
- Create an issue or pull request
- Update the relevant .md file
- Keep documentation in sync with implementation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-03 | Initial audit completed |

---

**Last Updated:** 2026-02-03  
**Next Review:** After Phase 1 implementation (Week 1)

