# TypeScript Audit - Quick Reference

## Critical Issues (Fix Immediately)

1. **Missing Error Boundary** - `apps/admin/src/main.tsx`
   - Any error crashes entire app
   - No user-facing error messages

2. **Memory Leaks in setInterval**
   - `apps/admin/src/pages/admin/BidderHealthPage.tsx:74`
   - `apps/admin/src/pages/admin/AuctionInspectorPage.tsx:85`
   - Intervals recreated on every dependency change

3. **SSE Memory Leak** - `apps/api/src/routes/analytics.ts:99-105`
   - EventEmitter listeners not properly cleaned up
   - Database queries on every event

4. **Missing Null Checks** - `apps/admin/src/pages/publisher/AnalyticsDashboardPage.tsx:117-128`
   - Array operations without null safety
   - Can accumulate NaN values

5. **Auth Race Condition** - `apps/admin/src/components/auth/ProtectedRoute.tsx:47-68`
   - Infinite loop risk from unmemoized dependencies
   - Brief unauthorized access possible

## High Priority Issues

6. **setTimeout Leak** - `apps/admin/src/stores/toastStore.ts:35-40`
7. **Hardcoded API URLs** - `apps/admin/src/pages/publisher/AnalyticsDashboardPage.tsx:70`
8. **Missing Try-Catch** - `apps/api/src/index.ts:120-330`
9. **No Request Cancellation** - `apps/admin/src/stores/chatStore.ts:55-133`
10. **Unchecked Array Access** - `apps/admin/src/pages/publisher/AnalyticsDashboardPage.tsx:157`
11. **Missing Input Validation** - `apps/api/src/routes/auth.ts:22-45`
12. **No Brute Force Protection** - Auth endpoints lack rate limiting

## Quick Fixes

```typescript
// 1. Add Error Boundary to main.tsx
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// 2. Fix useEffect dependencies with useCallback
const fetchData = useCallback(async () => {
  // fetch logic
}, [publisherId, dateRange]);

useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, [fetchData]);

// 3. Add null checks
const latencyData = topBiddersList
  .filter(bidder => bidder.avgLatency != null)
  .map((bidder) => ({
    name: bidder.bidderCode,
    latency: Math.round(bidder.avgLatency!),
  }));

// 4. Create API client
// apps/admin/src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const apiClient = (endpoint: string, options?: RequestInit) => 
  fetch(`${API_URL}${endpoint}`, {
    headers: { 
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...options?.headers 
    },
    ...options
  });
```

## Files Requiring Immediate Attention

### Frontend (apps/admin/src/)
- `main.tsx` - Add error boundary
- `components/auth/ProtectedRoute.tsx` - Fix race condition
- `pages/admin/BidderHealthPage.tsx` - Fix interval
- `pages/admin/AuctionInspectorPage.tsx` - Fix interval, add debouncing
- `pages/publisher/AnalyticsDashboardPage.tsx` - Fix null checks, API URL
- `stores/chatStore.ts` - Add request cancellation
- `stores/toastStore.ts` - Fix setTimeout leak

### Backend (apps/api/src/)
- `index.ts` - Add try-catch to inline routes
- `routes/analytics.ts` - Fix SSE memory leak
- `routes/auth.ts` - Add input validation
- `utils/prebid-data-fetcher.ts` - Add cleanup for setInterval

## Testing Checklist

- [ ] Test error boundary by throwing errors in components
- [ ] Verify intervals are cleared on unmount
- [ ] Test SSE with many concurrent connections
- [ ] Test auth flow with network interruptions
- [ ] Verify null data doesn't crash dashboard
- [ ] Test rapid toast creation/dismissal
- [ ] Load test with 100+ concurrent API requests

## Metrics to Monitor

- Heap memory usage over time
- EventEmitter listener count
- Failed authentication attempts
- Uncaught promise rejections
- Frontend error rate
- API response times

---

For full details, see: `2026-02-01-typescript-best-practices.md`
