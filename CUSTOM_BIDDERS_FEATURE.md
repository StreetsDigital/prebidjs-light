# Custom Bidders Feature - Implementation Summary

## Overview

This feature enables publishers to add custom Prebid.js bidders to their account without requiring code changes. The system automatically detects bidder capabilities (client-side vs server-side) based on a built-in bidder registry.

## Implementation Complete

### Backend Components

#### 1. Database Schema (`apps/api/src/db/schema.ts`)

Added `publisherCustomBidders` table:
```sql
CREATE TABLE publisher_custom_bidders (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL,
  bidder_code TEXT NOT NULL,
  bidder_name TEXT NOT NULL,
  is_client_side INTEGER NOT NULL DEFAULT 1,
  is_server_side INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  documentation_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
  UNIQUE (publisher_id, bidder_code)
);
```

**Migration:** Added to `apps/api/src/db/index.ts` as migration `add_publisher_custom_bidders`

#### 2. Bidder Registry (`apps/api/src/utils/bidder-registry.ts`)

Centralized knowledge base of 20+ popular Prebid.js bidders with:
- Bidder code and display name
- Client-side vs server-side capability flags
- Direct links to Prebid.js documentation
- Short descriptions

**Key Functions:**
- `getBidderInfo(code)` - Lookup bidder by code, returns default for unknown bidders
- `searchBidders(query)` - Search bidders by code, name, or description
- `getAllKnownBidders()` - List all known bidders
- `isValidBidderCode(code)` - Validate bidder code format

**Known Bidders Include:**
- Server-side capable: AppNexus, Rubicon, PubMatic
- Client-side only: OpenX, Criteo, Index Exchange, Sovrn, Sharethrough, TripleLift, SpotX, Unruly, Conversant, District M, PulsePoint, 33Across, Adyoulike, Undertone, Yieldmo, GumGum, Media.net

**Unknown Bidders:** Default to client-side only with auto-generated title-case name

#### 3. API Routes

**`apps/api/src/routes/custom-bidders.ts`** (Publisher-specific):
- `GET /api/publishers/:publisherId/bidders` - List all bidders (built-in + custom)
- `POST /api/publishers/:publisherId/bidders` - Add custom bidder
- `DELETE /api/publishers/:publisherId/bidders/:bidderId` - Remove custom bidder

**`apps/api/src/routes/bidders.ts`** (Global registry):
- `GET /api/bidders/search?q=query` - Search known bidders
- `GET /api/bidders/known` - List all known bidders

**Registered in:** `apps/api/src/index.ts`

### Frontend Components

#### 1. ConfigWizard Updates (`apps/admin/src/components/ConfigWizard.tsx`)

**Step 3 (Bidders) - Enhanced UI:**

1. **Dynamic Bidder Loading:**
   - Fetches bidders from API on component mount
   - Shows loading state while fetching
   - Displays built-in bidders + custom bidders together

2. **Add Custom Bidder Button:**
   - Opens modal for entering bidder code
   - Validates input and shows errors
   - Links to Prebid.js documentation

3. **Bidder Cards:**
   - Checkbox for selection
   - Capability badges:
     - "Built-in" for core bidders
     - "Client + Server" for dual-capability
     - "Server-side" for S2S only
     - "Client-side" for client only
   - Documentation link with external icon
   - Delete button for custom bidders (not built-in)
   - Description text

4. **Modal for Adding Custom Bidder:**
   - Input for bidder code
   - Real-time validation
   - Error display
   - Link to Prebid.js bidder list
   - Enter key submit

**New State:**
```typescript
availableBidders: any[] // Loaded from API
showAddBidderModal: boolean
newBidderCode: string
isAddingBidder: boolean
addBidderError: string
isLoadingBidders: boolean
```

**New Functions:**
- `fetchAvailableBidders()` - Load bidders from API
- `handleAddCustomBidder()` - Add new custom bidder
- `handleDeleteCustomBidder(id)` - Remove custom bidder

## User Flow

### Adding a Custom Bidder

1. Publisher opens ConfigWizard (new or edit config)
2. Navigate to Step 3: Bidders
3. Click "+ Add Custom Bidder" button
4. Modal opens asking for bidder code
5. Enter bidder code (e.g., "ix" for Index Exchange)
6. Click "Add Bidder"
7. System:
   - Validates code format
   - Checks for duplicates
   - Looks up bidder in registry
   - Saves to database with auto-detected capabilities
   - Refreshes bidder list
8. New bidder appears in list with:
   - Capability badge (e.g., "Client-side")
   - Documentation link
   - Delete button
9. Publisher can now select/deselect it like built-in bidders

### Using Custom Bidders in Configs

- Custom bidders work exactly like built-in bidders
- Stored in `wrapperConfigs.bidders` JSON array
- Embedded in wrapper script
- Passed to Prebid.js for auctions

## Technical Details

### Built-in Bidders Strategy

**Decision:** Keep built-in bidders in code, not database

**Implementation:**
- API endpoint returns both:
  - 5 hardcoded built-in bidders (`BUILT_IN_BIDDERS` constant)
  - Publisher's custom bidders (from database)
- Built-in bidders have `isBuiltIn: true` flag
- Built-in bidders cannot be deleted
- No database seeding required

**Benefits:**
- Simpler deployment (no migration data)
- All publishers get same core bidders
- Easy to add new built-in bidders
- Better performance (no DB query for common bidders)

### Capability Detection

**How it Works:**
1. User enters bidder code (e.g., "ix")
2. System looks up code in `KNOWN_BIDDERS` registry
3. If found: Use registered capabilities and documentation URL
4. If not found: Default to client-side only, generate name from code
5. Save to database with detected flags

**Example:**
```javascript
// Known bidder
getBidderInfo('ix')
// Returns: { code: 'ix', name: 'Index Exchange', isClientSide: true, isServerSide: false, documentationUrl: '...' }

// Unknown bidder
getBidderInfo('unknown-bidder')
// Returns: { code: 'unknown-bidder', name: 'Unknown Bidder', isClientSide: true, isServerSide: false }
```

### Validation

**Bidder Code Requirements:**
- 2-50 characters
- Alphanumeric + hyphens + underscores only
- Case insensitive (normalized to lowercase)
- Pattern: `/^[a-zA-Z0-9_-]{2,50}$/`

**Duplicate Prevention:**
- Unique constraint: `(publisher_id, bidder_code)`
- API checks for existing built-in bidders
- API checks for existing custom bidders
- Returns 400 error if duplicate

## API Endpoints

### Publisher-Specific Bidders

#### List All Bidders
```http
GET /api/publishers/:publisherId/bidders
```

**Response:**
```json
{
  "data": [
    {
      "code": "appnexus",
      "name": "AppNexus",
      "isBuiltIn": true,
      "isClientSide": true,
      "isServerSide": true,
      "documentationUrl": "https://docs.prebid.org/dev-docs/bidders/appnexus.html",
      "description": "Premium programmatic advertising platform"
    },
    {
      "id": "uuid-here",
      "code": "ix",
      "name": "Index Exchange",
      "isBuiltIn": false,
      "isClientSide": true,
      "isServerSide": false,
      "documentationUrl": "https://docs.prebid.org/dev-docs/bidders/ix.html",
      "description": "Global advertising exchange"
    }
  ]
}
```

#### Add Custom Bidder
```http
POST /api/publishers/:publisherId/bidders
Content-Type: application/json

{
  "bidderCode": "ix",
  "bidderName": "Index Exchange" // Optional
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid-here",
    "code": "ix",
    "name": "Index Exchange",
    "isClientSide": true,
    "isServerSide": false,
    "documentationUrl": "https://docs.prebid.org/dev-docs/bidders/ix.html",
    "description": "Global advertising exchange"
  },
  "message": "Index Exchange added successfully"
}
```

**Errors:**
- 400: Invalid bidder code format
- 400: Bidder already exists (built-in or custom)
- 500: Server error

#### Remove Custom Bidder
```http
DELETE /api/publishers/:publisherId/bidders/:bidderId
```

**Response:**
```json
{
  "message": "Custom bidder removed successfully"
}
```

**Errors:**
- 404: Bidder not found
- 500: Server error

### Global Bidder Registry

#### Search Bidders
```http
GET /api/bidders/search?q=index
```

**Response:**
```json
{
  "data": [
    {
      "code": "ix",
      "name": "Index Exchange",
      "isClientSide": true,
      "isServerSide": false,
      "documentationUrl": "https://docs.prebid.org/dev-docs/bidders/ix.html",
      "description": "Global advertising exchange"
    }
  ]
}
```

#### List Known Bidders
```http
GET /api/bidders/known
```

**Response:**
```json
{
  "data": [
    // Array of all 20+ known bidders
  ]
}
```

## Testing

### Manual Testing Steps

1. **Test Built-in Bidders:**
   ```bash
   curl http://localhost:3001/api/publishers/{publisherId}/bidders
   # Should return 5 built-in bidders
   ```

2. **Test Add Custom Bidder:**
   ```bash
   curl -X POST http://localhost:3001/api/publishers/{publisherId}/bidders \
     -H "Content-Type: application/json" \
     -d '{"bidderCode": "ix"}'
   # Should return success with bidder info
   ```

3. **Test Duplicate Prevention:**
   ```bash
   # Try adding "ix" again
   curl -X POST http://localhost:3001/api/publishers/{publisherId}/bidders \
     -H "Content-Type: application/json" \
     -d '{"bidderCode": "ix"}'
   # Should return 400 error
   ```

4. **Test Unknown Bidder:**
   ```bash
   curl -X POST http://localhost:3001/api/publishers/{publisherId}/bidders \
     -H "Content-Type: application/json" \
     -d '{"bidderCode": "unknown-bidder-xyz"}'
   # Should succeed with warning message about unknown bidder
   ```

5. **Test Delete Custom Bidder:**
   ```bash
   curl -X DELETE http://localhost:3001/api/publishers/{publisherId}/bidders/{bidderId}
   # Should return success
   ```

6. **Test UI Flow:**
   - Open admin portal
   - Navigate to publisher > configs
   - Click "New Config"
   - Go to Step 3 (Bidders)
   - Verify built-in bidders load
   - Click "+ Add Custom Bidder"
   - Enter "ix" and submit
   - Verify "Index Exchange" appears with badges
   - Click documentation link (should open Prebid.js docs)
   - Select bidder and save config
   - Verify bidder in saved config

### Integration Testing

1. Create config with custom bidder
2. Load wrapper script
3. Verify `window.__PB_CONFIG__.bidders` includes custom bidder
4. Verify Prebid.js receives custom bidder in auction
5. Check browser console for bid requests to custom bidder

## Future Enhancements

### Phase 2: Server-Side Bidding (Not in Current Implementation)

**When to implement:** After custom bidders are stable and publisher requests S2S support

**Changes needed:**
1. Add toggle in ConfigWizard: "Use server-side" for S2S-capable bidders
2. Store render mode: `{ bidderCode, params, renderMode: 'client'|'server' }`
3. Generate `s2sConfig` in wrapper with S2S bidder list
4. Configure Prebid Server endpoint

**For now:** Just display badges showing S2S capability, don't implement S2S yet

### Phase 3: Bidder Marketplace

- System-level bidder catalog (admin-curated)
- Publishers browse and enable from catalog
- Include param schemas and validation
- Show bidder performance metrics

### Phase 4: Auto-Discovery

- Fetch bidder list from Prebid.js repository
- Auto-update bidder registry weekly
- Detect new adapters automatically

## Files Modified/Created

### Created:
- `/apps/api/src/utils/bidder-registry.ts` - Bidder knowledge base
- `/apps/api/src/routes/custom-bidders.ts` - Publisher bidder routes
- `/apps/api/src/routes/bidders.ts` - Global registry routes
- `/test-custom-bidders.sh` - Test script

### Modified:
- `/apps/api/src/db/schema.ts` - Added `publisherCustomBidders` table
- `/apps/api/src/db/index.ts` - Added migration
- `/apps/api/src/index.ts` - Registered routes
- `/apps/admin/src/components/ConfigWizard.tsx` - Enhanced UI with custom bidder management

## Migration

**Running Migration:**
The migration runs automatically on server startup. The `add_publisher_custom_bidders` migration creates the new table with indexes.

**No Data Migration Required:**
- Built-in bidders stay in code (no DB seeding)
- Custom bidders start empty (publishers add as needed)

## Security Considerations

- Publishers can only add/delete bidders for their own account
- Bidder code validated to prevent injection
- Duplicate prevention enforced at DB level
- Unknown bidders default to safe client-side mode

## Performance Considerations

- Bidder registry lookups: O(1) hash map
- Database queries: Indexed on `(publisher_id, bidder_code)`
- Frontend: Fetch once per ConfigWizard mount
- Minimal bundle size impact (utility functions only)

## Documentation Links

- **Prebid.js Bidders:** https://docs.prebid.org/dev-docs/bidders.html
- **Prebid.js Server-Side:** https://docs.prebid.org/dev-docs/get-started-with-prebid-server.html

## Success Criteria

- ✅ Publishers can add custom bidders via UI
- ✅ Custom bidders appear alongside built-in bidders
- ✅ Capability badges display correctly
- ✅ Duplicate bidders prevented
- ✅ Custom bidders work in wrapper configs
- ✅ Unknown bidders default to client-side
- ✅ Built-in bidders cannot be deleted
- ✅ Custom bidders can be deleted
- ✅ Documentation links open correctly

## Rollback Plan

If issues arise:
1. **Database:** Migration is additive, can be rolled back
2. **API:** Comment out route registration
3. **Frontend:** Revert ConfigWizard to use hardcoded bidders
4. **Data:** Custom bidders in DB won't affect existing configs
