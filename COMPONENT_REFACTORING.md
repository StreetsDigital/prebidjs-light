# Component Refactoring Guide

## Overview

This document tracks the refactoring of large components in the pbjs_engine admin portal to improve maintainability, performance, and code organization.

**Date**: 2026-02-01
**Refactoring Type**: LOW severity performance optimization - Split large components

---

## Components Identified for Refactoring

### Critical Priority (>1000 lines)

#### 1. PublisherDetailPage.tsx - **7,782 lines** 🚨
**Location**: `/apps/admin/src/pages/admin/PublisherDetailPage.tsx`

**Issues**:
- Extremely bloated single-file component
- Contains 108+ inline arrow functions
- Multiple tab implementations in one file
- Complex state management (30+ useState calls)
- Difficult to maintain and understand

**Structure Analysis**:
- Lines 1-405: Type definitions and interfaces (24 interfaces)
- Lines 406-5503: Main component logic
  - State declarations (400+ lines)
  - Event handlers (1000+ lines)
  - API fetching functions (800+ lines)
  - Form handlers (600+ lines)
  - Tab definitions with inline JSX (2500+ lines)
- Lines 5504-7782: Main JSX render and modals (2278 lines)

**Tabs Identified**:
1. Overview Tab - API key, publisher details, assigned admins
2. Websites Tab - Website management
3. Ad Units Tab - Ad unit configuration
4. Bidders Tab - Bidder management
5. Analytics Tab - Analytics dashboard
6. Settings Tab - Configuration and A/B tests

**Refactoring Plan**:

```
apps/admin/src/
├── types/
│   └── publisher.ts              # Shared type definitions (NEW)
├── pages/admin/
│   └── publisher-detail/          # NEW directory structure
│       ├── PublisherDetailPage.tsx  # Main orchestrator (target: <300 lines)
│       ├── tabs/
│       │   ├── OverviewTab.tsx
│       │   ├── WebsitesTab.tsx
│       │   ├── AdUnitsTab.tsx
│       │   ├── BiddersTab.tsx
│       │   ├── AnalyticsTab.tsx
│       │   └── SettingsTab.tsx
│       ├── components/
│       │   ├── PublisherHeader.tsx
│       │   ├── ApiKeySection.tsx
│       │   ├── PublisherDetailsCard.tsx
│       │   ├── AssignedAdminsSection.tsx
│       │   ├── EditPublisherModal.tsx
│       │   ├── AdUnitModal.tsx
│       │   ├── BidderModal.tsx
│       │   ├── ABTestModal.tsx
│       │   └── AssignAdminModal.tsx
│       └── hooks/
│           ├── usePublisher.ts      # Publisher data fetching
│           ├── useWebsites.ts       # Website management
│           ├── useAdUnits.ts        # Ad unit management
│           ├── useBidders.ts        # Bidder management
│           └── useABTests.ts        # A/B test management
```

**Estimated Breakdown**:
- Types file: ~300 lines
- Main page: ~250 lines
- Each tab: ~300-800 lines
- Each component: ~100-300 lines
- Each hook: ~100-200 lines

**Total**: 7,782 lines → ~17 files averaging ~400 lines each

---

#### 2. AnalyticsPage.tsx - **1,288 lines**
**Location**: `/apps/admin/src/pages/admin/AnalyticsPage.tsx`

**Issues**:
- Complex real-time SSE connection management
- Multiple chart implementations in one file
- Large inline components

**Refactoring Plan**:

```
apps/admin/src/
├── pages/admin/
│   └── analytics/                  # NEW directory
│       ├── AnalyticsPage.tsx      # Main orchestrator (target: <200 lines)
│       ├── components/
│       │   ├── RealTimeStats.tsx
│       │   ├── ChartsSection.tsx
│       │   ├── EventStream.tsx
│       │   ├── FiltersPanel.tsx
│       │   └── ExportModal.tsx
│       └── hooks/
│           └── useAnalyticsSSE.ts  # Extract SSE connection logic
```

---

### High Priority (500-1000 lines)

#### 3. PublishersPage.tsx - **802 lines**
**Location**: `/apps/admin/src/pages/admin/PublishersPage.tsx`

**Refactoring Plan**:

```
apps/admin/src/
├── pages/admin/
│   └── publishers/                 # NEW directory
│       ├── PublishersPage.tsx     # Main orchestrator (target: <150 lines)
│       ├── components/
│       │   ├── PublisherTable.tsx
│       │   ├── PublisherFilters.tsx
│       │   └── PublisherRow.tsx
│       └── utils/
│           └── csvExport.ts        # Extract CSV export logic
```

---

#### 4. ConfigWizard.tsx - **707 lines**
**Location**: `/apps/admin/src/components/ConfigWizard.tsx`

**Refactoring Plan**:

```
apps/admin/src/
├── components/
│   └── config-wizard/              # NEW directory
│       ├── ConfigWizard.tsx       # Main orchestrator (target: <200 lines)
│       ├── steps/
│       │   ├── BasicInfoStep.tsx
│       │   ├── WrapperSettingsStep.tsx
│       │   ├── BiddersStep.tsx
│       │   ├── TargetingRulesStep.tsx
│       │   └── ReviewStep.tsx
│       └── components/
│           └── AddBidderModal.tsx
```

---

### Medium Priority (500-700 lines)

These files are borderline but could benefit from splitting:

- `UsersPage.tsx` (777 lines)
- `NotificationsPage.tsx` (773 lines)
- `CustomReportsPage.tsx` (772 lines)
- `RevenueForecastingPage.tsx` (768 lines)
- `AuditLogsPage.tsx` (625 lines)
- `OptimizationRulesPage.tsx` (624 lines)
- `ABTestCreateModal.tsx` (550 lines)
- `PrebidMarketplaceModal.tsx` (542 lines)
- `AnalyticsDashboardPage.tsx` (548 lines)

**Decision**: Monitor for now, refactor if they grow >800 lines or become problematic.

---

## CSS-in-JS Performance Audit

### Tailwind CSS Usage

**Framework**: Tailwind CSS (utility-first, no runtime CSS-in-JS)

**Findings**:
- ✅ No runtime CSS-in-JS libraries detected
- ✅ Tailwind generates static CSS at build time
- ⚠️ Some dynamic className generation in components
- ⚠️ Repeated className strings (could be extracted)

**Examples of Dynamic className Generation**:

```typescript
// Found in multiple files:
const buttonClass = `px-4 py-2 rounded ${isActive ? 'bg-blue-600' : 'bg-gray-400'}`;

// This is fine for Tailwind - no performance issue
// But could be cleaner with extraction:
const BUTTON_BASE = 'px-4 py-2 rounded';
const BUTTON_ACTIVE = 'bg-blue-600';
const BUTTON_INACTIVE = 'bg-gray-400';
```

**Recommendation**: ✅ No critical CSS performance issues found. Tailwind's approach is optimal.

**Optional Optimization**: Extract frequently repeated className strings to constants for better maintainability (not a performance issue, just code quality).

---

## Refactoring Guidelines

### Principles

1. **Single Responsibility**: Each component should do one thing well
2. **Composition**: Build complex UIs from simple components
3. **Co-location**: Keep related code together (types, components, hooks)
4. **Progressive Enhancement**: Refactor incrementally, test continuously

### Component Size Guidelines

- **Pages**: <300 lines (orchestrate child components)
- **Feature Components**: <400 lines (contain business logic)
- **UI Components**: <200 lines (presentational only)
- **Hooks**: <200 lines (encapsulate reusable logic)

### Extraction Checklist

When extracting components:

- [ ] Move related type definitions to `types/` directory
- [ ] Extract reusable logic into custom hooks
- [ ] Split large forms into step components
- [ ] Separate modals into their own files
- [ ] Extract repeated JSX patterns into components
- [ ] Maintain prop type safety with TypeScript
- [ ] Update imports in parent files
- [ ] Test functionality after extraction

### Testing After Refactoring

For each refactored component:

1. ✅ Verify UI renders correctly
2. ✅ Test all user interactions (forms, buttons, modals)
3. ✅ Check API calls still work
4. ✅ Validate error handling
5. ✅ Test with different user roles (if applicable)
6. ✅ Check browser console for errors

---

## Implementation Status

### Phase 1: Type Definitions ✅ COMPLETED
- [x] Extract publisher-related types to `/apps/admin/src/types/publisher.ts`
- [ ] Extract analytics types to `/apps/admin/src/types/analytics.ts`
- [ ] Update imports across codebase

### Phase 2: PublisherDetailPage Refactoring (IN PROGRESS)
- [x] Create directory structure
- [x] Extract type definitions
- [x] Create example component (ApiKeySection)
- [ ] Create custom hooks
- [ ] Extract tab components
- [ ] Extract modal components
- [ ] Extract section components
- [ ] Update main page to orchestrate children
- [ ] Test all functionality

### Phase 3: AnalyticsPage Refactoring (PENDING)
- [ ] Create directory structure
- [ ] Extract SSE hook
- [ ] Extract chart components
- [ ] Test real-time updates

### Phase 4: PublishersPage Refactoring (PENDING)
- [ ] Create directory structure
- [ ] Extract table component
- [ ] Extract CSV export utility
- [ ] Test pagination and filtering

### Phase 5: ConfigWizard Refactoring (PENDING)
- [ ] Create directory structure
- [ ] Extract step components
- [ ] Extract modal components
- [ ] Test wizard flow

---

## Breaking Changes

**None**: All refactoring is internal restructuring. Public APIs and component interfaces remain unchanged.

---

## Performance Impact

**Expected Improvements**:
- ✅ Faster development (easier to find and modify code)
- ✅ Better code splitting (React.lazy can load tabs on demand)
- ✅ Easier testing (smaller, focused components)
- ✅ Better TypeScript performance (smaller files compile faster)

**No Negative Impact Expected**:
- Bundle size: Same (just reorganized)
- Runtime performance: Same or better (can add React.memo to extracted components)
- Memory usage: Same

---

## Code Quality Metrics

### Before Refactoring

| Metric | Value |
|--------|-------|
| Largest file | 7,782 lines |
| Files >500 lines | 20 |
| Files >1000 lines | 2 |
| Average file size | ~450 lines |

### After Refactoring (Target)

| Metric | Value |
|--------|-------|
| Largest file | <500 lines |
| Files >500 lines | 0 |
| Files >1000 lines | 0 |
| Average file size | ~250 lines |

---

## Future Considerations

### Potential Enhancements (Beyond This Refactoring)

1. **Code Splitting**: Use React.lazy() for tab components
2. **State Management**: Consider Zustand for complex shared state
3. **Data Fetching**: Consider React Query for caching and revalidation
4. **Form Validation**: Consider React Hook Form + Zod
5. **Component Library**: Extract common UI patterns into reusable library

### Monitoring

Watch for these patterns in future development:

- ⚠️ Files growing >500 lines
- ⚠️ More than 10 useState calls in one component
- ⚠️ Inline components (arrow functions in JSX)
- ⚠️ Duplicated code across files

---

## References

- [React Component Best Practices](https://react.dev/learn/thinking-in-react)
- [TypeScript Project Structure](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Tailwind CSS Performance](https://tailwindcss.com/docs/optimizing-for-production)

---

**Last Updated**: 2026-02-01
**Status**: In Progress
**Next Review**: After Phase 2 completion
