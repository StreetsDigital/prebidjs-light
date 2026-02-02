# UUID Validation Migration

## Purpose
Add input validation for UUID route parameters to prevent SQL injection and invalid database queries.

## Files Modified

### 1. `/apps/api/src/utils/validation.ts` (NEW)
- Created UUID validation utility with `validateUUID()` function
- Validates v4 UUID format
- Throws descriptive errors for invalid UUIDs

### 2. Route Files Updated

#### `/apps/api/src/routes/publishers.ts`
Routes requiring validation:
- `GET /:id` - line 117
- `PUT /:id` - line 211
- `DELETE /:id` - line 283
- `POST /:id/restore` - line 336
- `POST /:id/regenerate-key` - line 381
- `GET /:id/embed-code` - line 403
- `GET /:id/admins` - line 433
- `GET /:id/available-admins` - line 465
- `POST /:id/admins` - line 500
- `DELETE /:id/admins/:userId` - line 566
- `GET /:id/ad-units` - line 646
- `GET /:id/ad-units/:unitId` - line 675
- `POST /:id/ad-units` - line 702
- `PUT /:id/ad-units/:unitId` - line 758
- `DELETE /:id/ad-units/:unitId` - line 813
- `GET /:id/bidders` - line 855
- `GET /:id/bidders/:bidderId` - line 883
- `POST /:id/bidders` - line 909
- `PUT /:id/bidders/:bidderId` - line 963
- `DELETE /:id/bidders/:bidderId` - line 1005
- `GET /:id/config` - line 1081
- `PUT /:id/config` - line 1113
- `GET /:id/config/versions` - line 1228
- `POST /:id/config/rollback/:versionId` - line 1284
- `POST /:id/bidders/copy-from` - line 1390

#### `/apps/api/src/routes/websites.ts`
Routes requiring validation:
- `GET /publishers/:publisherId/websites/:websiteId` - line 98
- `PUT /publishers/:publisherId/websites/:websiteId` - line 202
- `DELETE /publishers/:publisherId/websites/:websiteId` - line 292

#### `/apps/api/src/routes/prebid-builds.ts`
Routes requiring validation:
- `GET /publishers/:publisherId/builds/:buildId` - line 193
- `POST /publishers/:publisherId/builds/:buildId/activate` - line 337

#### `/apps/api/src/routes/wrapper-configs.ts`
Routes requiring validation:
- `GET /:configId` - line 101
- `PUT /:configId` - line 225
- `DELETE /:configId` - line 334
- `POST /:configId/duplicate` - line 369
- `POST /:configId/test-match` - line 437
- `POST /:configId/activate` - line 507
- `POST /:configId/pause` - line 541
- `GET /:configId/analytics` - line 575

## Implementation Pattern

```typescript
// Import at top of file
import { validateUUID } from '../utils/validation';

// In each route handler that accepts UUID params
fastify.get<{ Params: { id: string } }>('/:id', {
  preHandler: requireAuth,
}, async (request, reply) => {
  const { id } = request.params;

  // ADD THIS VALIDATION
  try {
    validateUUID(id, 'Publisher ID');
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }

  // Rest of handler...
});
```

## Testing

After implementation, test with:
1. Valid UUID: `550e8400-e29b-41d4-a716-446655440000`
2. Invalid UUID: `not-a-uuid`
3. SQL injection attempt: `'; DROP TABLE publishers; --`
4. Malformed UUID: `550e8400-e29b-41d4-a716` (incomplete)

Expected: All invalid inputs return 400 Bad Request before database query.

## Rollback

If issues occur, remove validation calls:
```bash
git diff apps/api/src/routes/ | grep -A 3 "validateUUID"
```

Then revert specific files or the entire migration.
