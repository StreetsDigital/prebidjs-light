# Data Taxonomy & Hierarchy

## Overview

The pbjs_engine platform uses a strict three-tier hierarchy to organize publishers, their websites, and advertising inventory.

## Hierarchy Structure

```
Publisher (Organization Level)
  ├── Website #1 (Domain Level)
  │   ├── Ad Unit #1 (Placement Level)
  │   ├── Ad Unit #2
  │   └── Ad Unit #3
  └── Website #2
      ├── Ad Unit #1
      └── Ad Unit #2
```

## Entity Definitions

### 1. Publisher
**Definition:** The top-level organization or media company.

**Examples:**
- "New York Times Media"
- "CNN Digital"
- "Vox Media"

**Properties:**
- Name, slug, API key
- Domains (allowed for CORS)
- Status (active/paused/disabled)
- Global Prebid configuration
- Bidder settings (shared across all websites)

**Use Cases:**
- Manages multiple websites/properties
- Owns the API key for config fetching
- Sets platform-wide bidder relationships
- Views aggregated analytics across all properties

### 2. Website
**Definition:** A specific domain or property owned by a publisher.

**Examples:**
- "nytimes.com"
- "cnn.com"
- "theverge.com"

**Properties:**
- Name (human-readable: "The New York Times")
- Domain (actual domain: "nytimes.com")
- Status (active/paused/disabled)
- Notes/metadata

**Parent:** Publisher (required)

**Children:** Ad Units (one-to-many)

**Use Cases:**
- Represents a distinct website/app property
- Container for ad units specific to that domain
- Enables per-site reporting and management
- Supports multi-domain publishers

### 3. Ad Unit
**Definition:** A specific ad placement/slot on a website.

**Examples:**
- "homepage-leaderboard" (728x90 banner at top)
- "article-sidebar" (300x250 sidebar placement)
- "video-preroll" (video ad before content)

**Properties:**
- Code (unique identifier: "homepage-leaderboard")
- Name (human-readable: "Homepage Leaderboard")
- Media types (banner, video, native)
- Sizes, floor prices, targeting
- Status (active/paused)

**Parent:** Website (required)

**Use Cases:**
- Represents a single ad slot on a page
- Configured with specific sizes and bidders
- Tracked individually in analytics
- Managed by publisher via self-service portal

## Navigation Flow

### Publisher-Level Actions
```
Publishers Page
  └── View All Publishers (table)
      └── Click Publisher Row
          └── Publisher Detail Page
              ├── Overview Tab (basic info, API key)
              ├── Websites Tab → Manage websites for this publisher
              ├── Bidders Tab → Configure bidders (applies to ALL websites)
              ├── Config Tab → Prebid settings (applies to ALL websites)
              ├── Analytics Tab → Aggregated analytics across all websites
              └── Builds Tab → Generated JS bundles
```

### Website-Level Actions
```
Publisher Detail > Websites Tab
  ├── Add Website Button → Create new website modal
  ├── Website List (cards/table)
  └── Click Website Card
      └── Website Detail View
          ├── Ad Units (list of units for THIS website)
          ├── Add Ad Unit → Creates unit under THIS website
          └── Website Settings (domain, status, notes)
```

### Ad Unit-Level Actions
```
Website Detail > Ad Units
  ├── Add Ad Unit Button → Create unit for THIS website
  ├── Ad Unit List (table)
  └── Click Ad Unit Row
      └── Ad Unit Editor Modal
          ├── Basic Info (code, name)
          ├── Media Types (banner/video/native)
          ├── Sizes
          ├── Floor Price
          ├── Targeting
          └── Status
```

## Database Relationships

```sql
-- Proper hierarchy enforced by foreign keys
publishers (id)
  ↓ (one-to-many)
websites (id, publisher_id NOT NULL)
  ↓ (one-to-many)
ad_units (id, website_id NOT NULL)
```

### Key Constraints
1. **Website MUST belong to a Publisher** - `websites.publisher_id` is required
2. **Ad Unit MUST belong to a Website** - `ad_units.website_id` is required
3. **No orphaned Ad Units** - Deleting a website cascades to its ad units
4. **No orphaned Websites** - Deleting a publisher cascades to its websites

## URL Structure

```
/admin/publishers                          # List all publishers
/admin/publishers/create                   # Create publisher
/admin/publishers/:publisherId             # Publisher detail (overview)
/admin/publishers/:publisherId?tab=websites    # Websites tab
/admin/publishers/:publisherId?tab=bidders     # Bidders tab
/admin/publishers/:publisherId?tab=config      # Config tab

# Website management happens within publisher context
# Ad units are managed within website context
```

## API Endpoints

```
GET    /api/publishers/:publisherId/websites
POST   /api/publishers/:publisherId/websites
PUT    /api/publishers/:publisherId/websites/:websiteId
DELETE /api/publishers/:publisherId/websites/:websiteId

GET    /api/websites/:websiteId/ad-units
POST   /api/websites/:websiteId/ad-units
PUT    /api/ad-units/:adUnitId
DELETE /api/ad-units/:adUnitId
```

## Configuration Inheritance

### Bidder Configuration
- **Configured at:** Publisher level
- **Applies to:** ALL websites under that publisher
- **Example:** If "AppNexus" is enabled for Publisher A, it's available for all websites

### Prebid Settings
- **Configured at:** Publisher level
- **Applies to:** ALL websites under that publisher
- **Example:** `bidderTimeout: 1500ms` applies globally

### Ad Unit Settings
- **Configured at:** Ad Unit level
- **Applies to:** That specific ad unit only
- **Example:** Floor price of $2.50 for homepage-leaderboard

## Analytics Hierarchy

### Publisher-Level Analytics
- Aggregate data across ALL websites
- Total revenue, impressions, fill rate
- Bidder performance across all properties

### Website-Level Analytics
- Data for a SPECIFIC website
- Per-domain performance metrics
- Drill-down from publisher level

### Ad Unit-Level Analytics
- Data for a SPECIFIC ad unit
- Individual placement performance
- Drill-down from website level

## Migration from Old Structure

### Before (Flat)
```
ad_units
  - id: "abc-123"
  - publisher_id: "pub-1"  ← Direct reference
  - code: "homepage-leaderboard"
```

### After (Hierarchical)
```
ad_units
  - id: "abc-123"
  - website_id: "web-1"     ← Through website
  - code: "homepage-leaderboard"

websites
  - id: "web-1"
  - publisher_id: "pub-1"   ← To get publisher
```

### Migration Steps
1. Create default website for each publisher ("Default Website")
2. Assign all existing ad units to their publisher's default website
3. Remove `publisher_id` column from ad_units
4. Make `website_id` NOT NULL

## Publisher Wrapper Integration

When a publisher embeds the wrapper script:

```html
<script src="https://cdn.pbjs-engine.com/pb/PUBLISHER_API_KEY.js"></script>
```

The wrapper:
1. Fetches config by publisher API key
2. Receives ALL websites and ad units for that publisher
3. Filters ad units by current domain (auto-detection)
4. Initializes Prebid.js with relevant ad units only

## Benefits of This Structure

✅ **Clean hierarchy** - Clear parent-child relationships
✅ **Proper scoping** - Ad units belong to websites, not publishers
✅ **Multi-domain support** - Publishers can manage multiple sites
✅ **Flexible analytics** - Drill-down from publisher → website → ad unit
✅ **Domain isolation** - Each website's ad units are isolated
✅ **Scalable** - Easy to add new levels (e.g., Apps) in future
