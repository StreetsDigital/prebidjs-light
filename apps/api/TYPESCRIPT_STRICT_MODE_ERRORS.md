# TypeScript Strict Mode - Remaining Errors

**Status**: Strict mode enabled in `apps/api/tsconfig.json`
**Date**: 2026-02-01
**Total Remaining Errors**: 259

## Summary

TypeScript strict mode has been successfully enabled in the API project. The following files have been fully fixed:

### ✅ Fixed Files
- `src/routes/wrapper.ts` - Added missing import for `safeJsonParseArray`, added `blockWrapper` to `WrapperConfig` interface
- `src/utils/targeting.ts` - Fixed UAParser instantiation, added `domain` to `RequestAttributes` interface
- `src/routes/monitoring.ts` - Fixed all 7 `fastify.log.error` calls to use correct parameter order
- `src/routes/templates.ts` - Fixed type issues with `TemplateConfig`, boolean conversions, and enum types

## Error Categories

### 1. Null vs Undefined (96 errors)
**Pattern**: `Argument of type 'null' is not assignable to parameter of type 'object | undefined'`

**Files Affected**:
- `src/routes/ab-tests.ts` (16 occurrences)
- `src/routes/ad-units.ts` (30+ occurrences)
- `src/routes/ad-units-updated.ts` (30+ occurrences)
- `src/routes/publishers.ts` (12+ occurrences)
- Other files

**Fix Strategy**:
Replace `null` with `undefined` or `{}` in `safeJsonParseObject()` calls:

```typescript
// Before:
params: safeJsonParseObject(data.params, null)

// After:
params: safeJsonParseObject(data.params, {})
// or
params: data.params ? safeJsonParseObject(data.params, {}) : undefined
```

### 2. Possibly Undefined (66 errors)
**Pattern**: `'created' is possibly 'undefined'` or `'updated' is possibly 'undefined'`

**Files Affected**:
- `src/routes/ad-units.ts` (22 occurrences)
- `src/routes/ad-units-updated.ts` (44 occurrences)

**Fix Strategy**:
Add null checks or use optional chaining:

```typescript
// Before:
console.log(created.id);

// After:
if (created) {
  console.log(created.id);
}
// or
console.log(created?.id);
```

### 3. Database Insert/Update Overload Errors (18 errors)
**Pattern**: `No overload matches this call`

**Files Affected**:
- `src/routes/ad-units.ts`
- `src/routes/ad-units-updated.ts`
- `src/routes/publishers.ts`

**Fix Strategy**:
Ensure proper typing for database operations, especially with boolean fields and enum types. Cast values appropriately:

```typescript
// Before:
isPublic: isPublic ? 1 : 0

// After:
isPublic: Boolean(isPublic)
```

### 4. Unknown Error Type (16 errors)
**Pattern**: `'err' is of type 'unknown'`

**Files Affected**:
- `src/routes/notifications.ts`
- `src/routes/custom-reports.ts`
- Various other route files

**Fix Strategy**:
Cast error to Error type in catch blocks:

```typescript
// Before:
} catch (err) {
  console.log(err.message);
}

// After:
} catch (err) {
  console.log((err as Error).message);
}
```

### 5. Missing Properties on Empty Objects (25 errors)
**Pattern**: `Property 'X' does not exist on type '{}'`

**Files Affected**:
- `src/routes/yield-advisor.ts` (revenueChange)
- `src/routes/notifications.ts` (webhookUrl, emails, phoneNumbers)
- `src/routes/publishers.ts` (bidderTimeout, priceGranularity, etc.)

**Fix Strategy**:
Define proper interfaces for parsed JSON objects:

```typescript
// Before:
const config = safeJsonParseObject(data, {});
console.log(config.bidderTimeout);

// After:
interface ConfigType {
  bidderTimeout?: number;
  priceGranularity?: string;
}
const config = safeJsonParseObject<ConfigType>(data, {});
console.log(config.bidderTimeout);
```

### 6. Fastify Route Handler Type Errors (14 errors)
**Pattern**: `Argument of type '(request: FastifyRequest<...>)' is not assignable to parameter...`

**Files Affected**:
- `src/routes/wrapper-configs.ts`
- `src/routes/component-parameters.ts`
- `src/routes/custom-bidders.ts`

**Fix Strategy**:
Use Fastify's generic route typing properly or use type assertions:

```typescript
// Option 1: Use proper generics
fastify.get<{ Params: { id: string } }>('/route/:id', async (request, reply) => {
  // request.params is properly typed
});

// Option 2: Type assertion
const { id } = request.params as { id: string };
```

### 7. Other Errors (24 errors)
- Implicit any type indexing (2 errors in `src/index.ts`)
- Type mismatches (2 errors - assignment issues)
- Missing .where() method (1 error in prebid-builds)
- Duplicate properties (1 error)
- UAParser constructor issue (1 error - FIXED)

## Recommended Fix Order

1. **Quick wins** (Estimated: 30 minutes)
   - Fix all `err` type errors (16) - just add `as Error`
   - Fix null vs undefined in safeJsonParseObject (96) - replace `null` with `{}`

2. **Medium effort** (Estimated: 1-2 hours)
   - Add null checks for possibly undefined (66) - add if statements or optional chaining
   - Define interfaces for JSON objects (25) - create proper type definitions

3. **Complex fixes** (Estimated: 2-3 hours)
   - Fix database operation type mismatches (18) - requires understanding schema
   - Fix Fastify route handler types (14) - requires understanding Fastify generics

4. **Edge cases** (Estimated: 1 hour)
   - Fix remaining miscellaneous errors (24)

## Total Estimated Time
**6-8 hours** to fix all remaining 259 errors

## Notes

- The safe-json utilities (`safeJsonParse`, `safeJsonParseArray`, `safeJsonParseObject`) are located in `src/utils/safe-json.ts`
- Many errors are repetitive patterns that can be fixed with find/replace
- Consider creating a utility function for error type casting: `const asError = (err: unknown) => err as Error`
- Some errors might be fixed automatically when parent errors are resolved

## Progress Tracking

- [x] Enable strict mode in tsconfig.json
- [x] Fix wrapper.ts (2 errors)
- [x] Fix targeting.ts (2 errors)
- [x] Fix monitoring.ts (7 errors)
- [x] Fix templates.ts (13 errors)
- [ ] Fix remaining 259 errors across other files

## Next Steps

1. Create helper functions for common patterns
2. Fix errors in batches by pattern type
3. Run tests after each batch to ensure no regressions
4. Update CLAUDE.md with new TypeScript patterns learned
