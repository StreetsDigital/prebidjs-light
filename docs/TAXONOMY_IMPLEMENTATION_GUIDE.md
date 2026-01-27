# Taxonomy Implementation Guide

This guide walks through implementing the proper Publisher → Website → Ad Unit hierarchy throughout the application.

## Overview

We're migrating from a flat structure to a proper 3-tier hierarchy:

**Before (Flat):**
```
Publisher
  ├── Ad Unit 1 (direct)
  ├── Ad Unit 2 (direct)
  └── Ad Unit 3 (direct)
```

**After (Hierarchical):**
```
Publisher
  ├── Website 1
  │   ├── Ad Unit 1
  │   └── Ad Unit 2
  └── Website 2
      └── Ad Unit 3
```

## Implementation Steps

### Step 1: Run Database Migration

```bash
# Navigate to API directory
cd apps/api

# Run the migration script
npx tsx src/db/migrate-taxonomy.ts
```

**What this does:**
1. Creates default websites for publishers without any
2. Assigns orphaned ad units to their publisher's default website
3. Removes `publisher_id` column from `ad_units` table
4. Makes `website_id` NOT NULL (enforced at database level)

### Step 2: Update Schema File

Replace `apps/api/src/db/schema.ts` with `apps/api/src/db/schema-updated.ts`:

```bash
cd apps/api/src/db
cp schema.ts schema-old-backup.ts
cp schema-updated.ts schema.ts
```

**Key changes:**
- `adUnits` table no longer has `publisherId`
- `adUnits.websiteId` is now required
- Proper foreign key relationships enforced

### Step 3: Update API Routes

Replace ad units routes with the updated version:

```bash
cd apps/api/src/routes
cp ad-units.ts ad-units-old-backup.ts
cp ad-units-updated.ts ad-units.ts
```

**Key changes:**
- `GET /api/websites/:websiteId/ad-units` - List units for a website
- `POST /api/websites/:websiteId/ad-units` - Create unit under a website
- Old endpoint `/api/publishers/:id/ad-units` removed (breaks hierarchy)

### Step 4: Update UI - Publisher Detail Page

Update `apps/admin/src/pages/admin/PublisherDetailPage.tsx`:

#### A. Update Ad Units Tab

**Current (Wrong):**
```tsx
// Ad Units tab shows all ad units for publisher (flat)
<button onClick={() => createAdUnit({ publisherId })}>
  Add Ad Unit
</button>
```

**New (Correct):**
```tsx
// Ad Units tab shows websites, then units within each website
<div className="space-y-6">
  {websites.map(website => (
    <div key={website.id} className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3>{website.name} ({website.domain})</h3>
        <button onClick={() => createAdUnit({ websiteId: website.id })}>
          Add Ad Unit to {website.name}
        </button>
      </div>

      {/* Ad units for THIS website */}
      <AdUnitsTable websiteId={website.id} />
    </div>
  ))}
</div>
```

#### B. Update Ad Unit Creation Modal

**Add website selector:**
```tsx
interface AdUnitFormData {
  websiteId: string; // REQUIRED - must select website first
  code: string;
  name: string;
  // ... other fields
}

// In the form
<select
  value={formData.websiteId}
  onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
  required
>
  <option value="">Select Website...</option>
  {websites.map(w => (
    <option key={w.id} value={w.id}>{w.name} ({w.domain})</option>
  ))}
</select>
```

### Step 5: Update UI - Publisher Portal

Update `apps/admin/src/pages/publisher/AdUnitsPage.tsx`:

Publishers should see their ad units organized by website:

```tsx
export function AdUnitsPage() {
  const { user } = useAuthStore();
  const [websites, setWebsites] = useState([]);
  const [selectedWebsite, setSelectedWebsite] = useState(null);

  return (
    <div>
      <h1>Ad Units</h1>

      {/* Website selector */}
      <div className="mb-6">
        <label>Filter by Website:</label>
        <select
          value={selectedWebsite?.id || ''}
          onChange={(e) => {
            const site = websites.find(w => w.id === e.target.value);
            setSelectedWebsite(site);
          }}
        >
          <option value="">All Websites</option>
          {websites.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Ad units table (filtered by website if selected) */}
      {selectedWebsite ? (
        <AdUnitsTable websiteId={selectedWebsite.id} />
      ) : (
        // Show all websites with their ad units
        websites.map(website => (
          <div key={website.id} className="mb-8">
            <h2>{website.name}</h2>
            <AdUnitsTable websiteId={website.id} />
          </div>
        ))
      )}
    </div>
  );
}
```

### Step 6: Update Config API

Update the public config endpoint to return ad units grouped by website:

**File:** `apps/api/src/routes/config.ts`

```typescript
// GET /c/:apiKey - Public config endpoint
fastify.get('/c/:apiKey', async (request, reply) => {
  const { apiKey } = request.params;

  // Get publisher
  const publisher = await getPublisherByApiKey(apiKey);

  // Get all websites for publisher
  const websites = db.select()
    .from(websitesTable)
    .where(eq(websitesTable.publisherId, publisher.id))
    .all();

  // Get ad units for each website
  const adUnitsByWebsite = {};
  for (const website of websites) {
    const units = db.select()
      .from(adUnitsTable)
      .where(eq(adUnitsTable.websiteId, website.id))
      .all();

    adUnitsByWebsite[website.domain] = units;
  }

  // Return config with ad units organized by website
  return {
    publisherId: publisher.id,
    websites: websites.map(w => ({
      id: w.id,
      domain: w.domain,
      adUnits: adUnitsByWebsite[w.domain],
    })),
    prebidConfig: { /* ... */ },
  };
});
```

### Step 7: Update Wrapper Script

Update `apps/wrapper/src/pb.ts` to handle multi-website config:

```typescript
async init() {
  // Fetch config
  const config = await fetch(`${apiEndpoint}/c/${publisherId}`).then(r => r.json());

  // Detect current domain
  const currentDomain = window.location.hostname;

  // Find website config for current domain
  const websiteConfig = config.websites.find(w =>
    currentDomain.includes(w.domain) || w.domain.includes(currentDomain)
  );

  if (!websiteConfig) {
    console.warn(`pb: No configuration found for domain ${currentDomain}`);
    return;
  }

  // Initialize Prebid.js with ad units for THIS website only
  window.pbjs.addAdUnits(websiteConfig.adUnits);

  // Apply publisher-level config
  window.pbjs.setConfig(config.prebidConfig);
}
```

### Step 8: Update Analytics Queries

Update analytics to support website-level filtering:

```typescript
// Publisher-level analytics (aggregate across all websites)
SELECT
  SUM(impressions) as total_impressions,
  SUM(revenue) as total_revenue
FROM analytics_events
WHERE publisher_id = ?

// Website-level analytics
SELECT
  w.domain,
  SUM(impressions) as impressions,
  SUM(revenue) as revenue
FROM analytics_events e
JOIN ad_units au ON e.ad_unit_id = au.id
JOIN websites w ON au.website_id = w.id
WHERE w.publisher_id = ?
GROUP BY w.id

// Ad unit-level analytics (unchanged)
SELECT * FROM analytics_events
WHERE ad_unit_id = ?
```

## Testing Checklist

After implementation, verify:

### Database
- [ ] All ad units have a `website_id` (no nulls)
- [ ] Ad units table does NOT have `publisher_id` column
- [ ] Foreign key constraint exists: `ad_units.website_id → websites.id`
- [ ] Cascading deletes work (delete website → deletes ad units)

### API
- [ ] `GET /api/websites/:id/ad-units` returns units for that website
- [ ] `POST /api/websites/:id/ad-units` creates unit under that website
- [ ] `GET /api/ad-units/:id` includes parent website info
- [ ] Cannot create ad unit without specifying `websiteId`
- [ ] Old endpoint `/api/publishers/:id/ad-units` returns 404

### UI - Admin
- [ ] Publisher detail page shows websites tab
- [ ] Can create/edit/delete websites
- [ ] Ad units tab shows units grouped by website
- [ ] Creating ad unit requires selecting a website
- [ ] Can filter/view ad units by website
- [ ] Deleting a website warns about cascade to ad units

### UI - Publisher Portal
- [ ] Publishers see their websites
- [ ] Ad units are organized by website
- [ ] Can filter ad units by website
- [ ] Creating ad unit requires selecting website

### Wrapper
- [ ] Wrapper fetches config successfully
- [ ] Auto-detects current website domain
- [ ] Loads only ad units for current website
- [ ] Falls back gracefully if domain not configured

### Analytics
- [ ] Can view analytics at publisher level (aggregated)
- [ ] Can drill down to website level
- [ ] Can drill down to ad unit level
- [ ] Charts/tables show website breakdown

## Rollback Plan

If issues arise, rollback:

```bash
# 1. Restore old schema
cd apps/api/src/db
cp schema-old-backup.ts schema.ts

# 2. Restore database from backup
# (You did create a backup before running migration, right?)

# 3. Restore old API routes
cd apps/api/src/routes
cp ad-units-old-backup.ts ad-units.ts

# 4. Restart API server
npm run dev:api
```

## Benefits of New Structure

✅ **Proper Hierarchy** - Clear parent-child relationships
✅ **Multi-Domain Publishers** - Publishers can manage multiple websites
✅ **Domain-Specific Config** - Each website can have custom settings (future)
✅ **Better Analytics** - Drill-down: Publisher → Website → Ad Unit
✅ **Data Integrity** - Enforced by foreign keys and NOT NULL constraints
✅ **Scalability** - Easy to extend (e.g., add Apps tier below Website)
✅ **Clarity** - Ad units clearly belong to a website, not floating

## Common Issues

### Issue: Migration fails with "no website for publisher"
**Solution:** Some publishers have no websites. The migration creates default websites, but verify `websites` table is not empty before migration.

### Issue: UI still shows old flat structure
**Solution:** Clear browser cache and rebuild frontend:
```bash
cd apps/admin
rm -rf dist
npm run build
```

### Issue: Wrapper script not loading ad units
**Solution:** Check domain matching logic. Ensure `website.domain` in database matches actual domains where wrapper is embedded.

### Issue: Cannot create ad units (400 error)
**Solution:** Ensure `websiteId` is being sent in request body. Check browser network tab for request payload.

## Next Steps

After implementing the core hierarchy:

1. **Website-Level Settings** - Allow per-website Prebid configuration overrides
2. **Domain Validation** - Validate that ad units only load on configured domains
3. **Website-Level Bidders** - Override bidder settings per website (optional)
4. **Multi-App Support** - Add "App" tier below Website for mobile app inventory
5. **Cross-Website Analytics** - Compare performance across websites

## Questions?

See `/docs/TAXONOMY.md` for detailed documentation on the data model and relationships.
