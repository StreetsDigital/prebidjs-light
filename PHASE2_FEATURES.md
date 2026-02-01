# Phase 2 Features Documentation

This document describes the Phase 2 enhancements to the Prebid Component Marketplace, implementing 4 major features that enhance configuration management, analytics, and build automation.

## Table of Contents

1. [Feature 1: Parameter Configuration](#feature-1-parameter-configuration)
2. [Feature 2: Enhanced Analytics Dashboards](#feature-2-enhanced-analytics-dashboards)
3. [Feature 3: Prebid.js Build System](#feature-3-prebidjs-build-system)
4. [Feature 4: Bulk Operations & Templates](#feature-4-bulk-operations--templates)

---

## Feature 1: Parameter Configuration ✅ IMPLEMENTED

### Overview

The Parameter Configuration feature enables publishers to configure bidder, module, and analytics adapter parameters through dynamic, auto-generated forms instead of manual JSON editing.

### What's Implemented

**Backend:**
- ✅ Parameter schema storage in database (`component_parameters` table)
- ✅ Parameter value storage with multi-level overrides (`component_parameter_values` table)
- ✅ Dynamic parameter validation based on schemas
- ✅ API endpoints for schema retrieval and value CRUD operations
- ✅ Predefined schemas for popular bidders (Rubicon, AppNexus, Index Exchange, PubMatic, OpenX)
- ✅ Module schemas (consentManagement, priceFloors, userId, schain)
- ✅ Analytics adapter schemas (Google Analytics, PubStack)

**Frontend:**
- ✅ `ComponentConfigModal` - Configuration modal UI
- ✅ `DynamicParameterForm` - Auto-generated forms from schemas
- ✅ `ParameterField` - Individual form fields with validation
- ✅ Configure buttons on Bidders, Modules, and Analytics pages
- ✅ Real-time validation and error messages
- ✅ JSON preview of configuration

### How to Use

1. **Navigate to Bidders, Modules, or Analytics Page**
   - Go to any component management page in the Publisher portal

2. **Click "Configure" on a Component**
   - Each component row has a "Configure" button
   - Click it to open the configuration modal

3. **Fill in Parameters**
   - The form auto-generates based on the component's parameter schema
   - Required fields are marked with a red asterisk (*)
   - Hover over the info icon to see field descriptions and validation rules

4. **Preview Configuration**
   - Click "Show JSON Preview" to see the resulting configuration
   - Verify the JSON matches your expectations

5. **Save Configuration**
   - Click "Save Configuration" to persist your settings
   - Parameters are validated before saving

### Parameter Schema Format

Each parameter has the following properties:

```typescript
interface Parameter {
  name: string;                    // Parameter name (e.g., "accountId")
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;               // Is this parameter required?
  defaultValue?: any;              // Default value if not specified
  description: string;             // Help text shown to users
  validation?: {
    pattern?: string;              // Regex pattern for validation
    min?: number;                  // Minimum value (for numbers)
    max?: number;                  // Maximum value (for numbers)
    enum?: any[];                  // Allowed values (shown as dropdown)
  };
}
```

### Example: Configuring Rubicon Bidder

```json
{
  "accountId": 12345,
  "siteId": 67890,
  "zoneId": 11111,
  "inventory": {
    "category": "news"
  }
}
```

### Multi-Level Parameter Overrides

Parameters can be configured at three levels:

1. **Publisher Level** - Applies to all websites
2. **Website Level** - Overrides publisher-level for a specific site
3. **Ad Unit Level** - Overrides both publisher and website levels

To configure at different levels, pass the appropriate scope:

- Publisher-level: No `websiteId` or `adUnitId`
- Website-level: Include `websiteId`
- Ad-unit-level: Include both `websiteId` and `adUnitId`

### API Endpoints

```http
# Get parameter schema
GET /api/components/{type}/{code}/parameters

# Get saved parameter values
GET /api/publishers/{publisherId}/components/{type}/{code}/parameters
Query params: ?websiteId=xxx&adUnitId=xxx

# Save parameter values
POST /api/publishers/{publisherId}/components/{type}/{code}/parameters
Body: {
  "websiteId": "optional",
  "adUnitId": "optional",
  "parameters": { "accountId": 12345, "siteId": 67890 }
}

# Validate parameters
POST /api/components/{type}/{code}/parameters/validate
Body: {
  "parameters": { "accountId": 12345, "siteId": 67890 }
}

# Delete parameter values
DELETE /api/publishers/{publisherId}/components/{type}/{code}/parameters
Query params: ?websiteId=xxx&adUnitId=xxx
```

### Adding New Parameter Schemas

To add schemas for additional components, edit `/apps/api/src/utils/prebid-markdown-parser.ts`:

```typescript
const BIDDER_SCHEMAS: Record<string, ParameterDefinition[]> = {
  // Existing schemas...

  // Add new bidder schema
  newBidder: [
    {
      name: 'publisherId',
      type: 'string',
      required: true,
      description: 'Your publisher ID',
    },
    {
      name: 'timeout',
      type: 'number',
      required: false,
      description: 'Custom timeout in ms',
      validation: { min: 100, max: 5000 },
    },
  ],
};
```

Then run:

```bash
npm run build
npm run dev
```

The new schema will be automatically seeded on server startup.

---

## Feature 2: Enhanced Analytics Dashboards (PLANNED)

### Overview

Provides comprehensive analytics for publishers to optimize their Prebid configurations with rich visualizations and insights.

### Planned Features

- Bidder performance dashboard with win rate trends
- Geographic analytics with country-level breakdowns
- Latency heatmaps (median, p95, p99)
- Time series analysis with date range comparisons
- Component health monitoring with automated alerts

**Status:** Backend and frontend implementation pending

---

## Feature 3: Prebid.js Build System (PLANNED)

### Overview

Generates custom Prebid.js bundles containing only the components a publisher has enabled, dramatically reducing bundle size.

### Planned Features

- One-click custom Prebid.js build generation
- Automatic CDN hosting of builds
- Build versioning and rollback capability
- Incremental rebuilds when components change
- Bundle size optimization (target: <120KB vs 800KB full Prebid.js)

**Status:** Backend and frontend implementation pending

---

## Feature 4: Bulk Operations & Templates (PLANNED)

### Overview

Enables efficient configuration management for publishers with multiple sites through templates and bulk operations.

### Planned Features

**4A: Configuration Templates**
- Pre-built templates (Video-Heavy, News Publisher, Mobile-First, etc.)
- One-click template application
- Custom template creation from existing configs
- Template marketplace for sharing

**4B: Bulk Component Operations**
- Select multiple components with checkboxes
- Bulk add/remove across all sites
- Bulk parameter updates
- Preview changes before applying

**4C: Import/Export**
- Export configuration as JSON
- Import configuration with merge strategies
- Full-config, per-site, or component-only exports
- Validation of imported configs

**Status:** Backend and frontend implementation pending

---

## Database Schema

### Feature 1 Tables

**`component_parameters`** - Parameter schemas from Prebid.org

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| component_type | TEXT | 'bidder', 'module', or 'analytics' |
| component_code | TEXT | Component identifier (e.g., 'rubicon') |
| parameter_name | TEXT | Parameter name (e.g., 'accountId') |
| parameter_type | TEXT | Data type: string, number, boolean, object, array |
| required | INTEGER | Is parameter required? (0 or 1) |
| default_value | TEXT | JSON-encoded default value |
| description | TEXT | Help text for users |
| validation_pattern | TEXT | Regex pattern for validation |
| min_value | REAL | Minimum value (for numbers) |
| max_value | REAL | Maximum value (for numbers) |
| enum_values | TEXT | JSON array of allowed values |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

**`component_parameter_values`** - User-configured parameter values

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| publisher_id | TEXT | Foreign key to publishers |
| component_type | TEXT | 'bidder', 'module', or 'analytics' |
| component_code | TEXT | Component identifier |
| website_id | TEXT | Null for publisher-level config |
| ad_unit_id | TEXT | Null for publisher/website-level config |
| parameter_name | TEXT | Parameter name |
| parameter_value | TEXT | JSON-encoded parameter value |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### Feature 2 Tables (Planned)

- `bidder_metrics` - Time-series performance data
- Indexes for efficient querying by date, bidder, country

### Feature 3 Tables (Planned)

- `prebid_builds` - Custom build tracking
- Build status, version, CDN URL, component hash

### Feature 4 Tables (Planned)

- `configuration_templates` - Preset and custom templates
- `bulk_operations` - Bulk operation tracking

---

## Development Guidelines

### Adding Parameter Schemas

1. Edit `/apps/api/src/utils/prebid-markdown-parser.ts`
2. Add schema to appropriate object (BIDDER_SCHEMAS, MODULE_SCHEMAS, or ANALYTICS_SCHEMAS)
3. Restart server - schemas are auto-seeded on startup

### Extending Validation

To add custom validation logic:

1. Edit `/apps/api/src/routes/component-parameters.ts`
2. Add validation in the `validateForm()` function
3. Return appropriate error messages

### Frontend Customization

To customize the parameter configuration UI:

- **Modal styling**: Edit `/apps/admin/src/components/ComponentConfigModal.tsx`
- **Form layout**: Edit `/apps/admin/src/components/DynamicParameterForm.tsx`
- **Field rendering**: Edit `/apps/admin/src/components/ParameterField.tsx`

---

## Testing

### Manual Testing Checklist

**Feature 1: Parameter Configuration**

- [ ] Open Bidders page and click Configure on Rubicon
- [ ] Verify accountId and siteId fields are marked as required
- [ ] Enter invalid accountId (e.g., -1) and verify validation error
- [ ] Enter valid values and save configuration
- [ ] Re-open Configure modal and verify values are pre-filled
- [ ] Repeat for Modules and Analytics pages

### API Testing

```bash
# Get Rubicon parameter schema
curl http://localhost:3001/api/components/bidder/rubicon/parameters

# Save Rubicon parameters
curl -X POST http://localhost:3001/api/publishers/{publisherId}/components/bidder/rubicon/parameters \
  -H "Content-Type: application/json" \
  -d '{"parameters": {"accountId": 12345, "siteId": 67890}}'

# Get saved parameters
curl http://localhost:3001/api/publishers/{publisherId}/components/bidder/rubicon/parameters
```

---

## Troubleshooting

### Parameter Schema Not Showing

**Issue:** Configure modal shows "No configurable parameters"

**Solutions:**
1. Check if component has a schema defined in `prebid-markdown-parser.ts`
2. Verify server startup logs show "Parameter schemas seeded"
3. Query database: `SELECT * FROM component_parameters WHERE component_code = 'rubicon';`

### Save Fails with Validation Error

**Issue:** "Validation failed" error when saving parameters

**Solutions:**
1. Check browser console for detailed validation errors
2. Verify parameter values match the schema requirements
3. Check for required fields that are empty
4. Verify numeric values are within min/max range

### Modal Not Opening

**Issue:** Configure button doesn't open modal

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify `ComponentConfigModal` is imported correctly
3. Check state variables are initialized properly
4. Verify `publisherId` is available in user context

---

## Future Enhancements

### Feature 1 Roadmap

- [ ] Real-time schema fetching from Prebid.org GitHub
- [ ] Markdown documentation parsing
- [ ] Schema versioning and migration
- [ ] Advanced field types (color picker, rich text, etc.)
- [ ] Conditional fields (show/hide based on other values)
- [ ] Import/export parameter configurations
- [ ] Parameter presets for common use cases

### Integration Opportunities

- Generate Prebid.js config from saved parameters (Feature 3)
- Include parameters in configuration templates (Feature 4A)
- Bulk parameter updates across sites (Feature 4B)
- Parameter change history and audit trail

---

## Support & Feedback

For questions, issues, or feature requests related to Phase 2 features:

1. Check this documentation first
2. Review the codebase comments in relevant files
3. Test API endpoints using the examples provided
4. Submit issues with detailed reproduction steps

**Key Files:**
- Backend: `/apps/api/src/routes/component-parameters.ts`
- Schemas: `/apps/api/src/utils/prebid-markdown-parser.ts`
- Frontend: `/apps/admin/src/components/ComponentConfigModal.tsx`
- Database: `/apps/api/src/db/migrations/008-add-phase2-tables.sql`
