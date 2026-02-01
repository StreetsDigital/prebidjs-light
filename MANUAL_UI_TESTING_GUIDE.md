# Manual UI Testing Guide - Phase 2

**Status:** Ready for Manual Testing
**Date:** February 1, 2026
**Servers Running:**
- Backend API: http://localhost:3001 ✅
- Admin Frontend: http://localhost:5173 ✅

**Test Data Ready:**
- Sample publisher: Test Publisher (ID: 5913a20f-c5aa-4251-99f1-8b69973d431b)
- 32 analytics metrics across 8 bidders (4 days of data)
- 6 preset templates seeded
- 15 parameter schemas available

---

## How to Test

1. **Login first** at http://localhost:5173/login
   - **Username:** `publisher@test.com`
   - **Password:** `password123`

2. Follow the testing steps below for each feature

3. Check off ✅ items as you test them

---

## Feature 1: Parameter Configuration

**Test URL:** http://localhost:5173/publisher/bidders

### Test Steps:

- [ ] **1.1 Open Configuration Modal**
  - Navigate to Bidders page
  - Find "Rubicon" in the list (should be already added)
  - Click the "Configure" button next to Rubicon
  - ✅ **Expected:** Modal opens with form fields

- [ ] **1.2 View Parameter Schema**
  - In the modal, you should see:
    - Account ID field (required, number)
    - Site ID field (required, number)
    - Zone ID field (optional, number)
  - ✅ **Expected:** All fields display with proper labels and types

- [ ] **1.3 Fill in Parameters**
  - Enter `Account ID: 12345`
  - Enter `Site ID: 67890`
  - Enter `Zone ID: 11111`
  - ✅ **Expected:** Values accepted without errors

- [ ] **1.4 Save Parameters**
  - Click "Save" button
  - ✅ **Expected:** Success message appears, modal closes

- [ ] **1.5 Verify Persistence**
  - Click "Configure" on Rubicon again
  - ✅ **Expected:** Previous values (12345, 67890, 11111) are pre-filled

- [ ] **1.6 Test Validation**
  - Clear Account ID field
  - Try to save
  - ✅ **Expected:** Validation error appears (required field)

- [ ] **1.7 Test on Other Pages**
  - Go to Modules page → Click Configure on any module
  - Go to Analytics page → Click Configure on any analytics adapter
  - ✅ **Expected:** Configuration works on all component types

---

## Feature 2: Analytics Dashboard

**Test URL:** http://localhost:5173/publisher/analytics-dashboard

### Test Steps:

- [ ] **2.1 Navigate to Dashboard**
  - Click "Analytics Dashboard" in left sidebar
  - ✅ **Expected:** Dashboard page loads with KPI cards

- [ ] **2.2 View KPI Cards**
  - You should see 4 cards:
    1. Total Revenue (should show ~$94.50)
    2. Impressions (should show ~27,500)
    3. Avg CPM (calculated value)
    4. Win Rate (percentage)
  - ✅ **Expected:** All cards display numeric values

- [ ] **2.3 View Top Bidders Table**
  - Scroll to "Top Bidders by Revenue" section
  - ✅ **Expected:** Table shows:
    - Rubicon (top performer ~$19)
    - AppNexus
    - Index Exchange
    - PubMatic
    - OpenX
  - All sorted by revenue (highest first)

- [ ] **2.4 Toggle Date Range**
  - Click "Last 7 Days" button
  - Click "Last 30 Days" button
  - ✅ **Expected:** Button highlights change (data won't change much as we only have 4 days)

- [ ] **2.5 Revenue Trend Chart**
  - Scroll to "Revenue Trend" section
  - ✅ **Expected:** Placeholder box appears (chart visualization not implemented yet)

---

## Feature 3: Prebid.js Build System

**Test URL:** http://localhost:5173/publisher/builds

### Test Steps:

- [ ] **3.1 Navigate to Builds Page**
  - Click "Builds" in left sidebar
  - ✅ **Expected:** Builds page loads (may be empty initially)

- [ ] **3.2 Generate New Build**
  - Click "Generate Build" button
  - ✅ **Expected:**
    - Build starts
    - Status shows "pending" then changes to "success" within 1-2 seconds
    - Build appears in table below

- [ ] **3.3 View Build Details**
  - Check the build table for:
    - Version number (e.g., 1.0.1738377296...)
    - Status badge (green "success")
    - File size (~120-170KB)
    - CDN URL
    - Creation timestamp
  - ✅ **Expected:** All details display correctly

- [ ] **3.4 Activate Build**
  - Click "Activate" button on the build
  - ✅ **Expected:**
    - Confirmation dialog or direct activation
    - "Active" indicator appears next to build
    - CDN URL becomes active

- [ ] **3.5 Generate Another Build**
  - Click "Generate Build" again
  - Wait for completion
  - ✅ **Expected:** New build appears in table, old one is no longer active

- [ ] **3.6 Activate Previous Build (Rollback)**
  - Click "Activate" on the first build you created
  - ✅ **Expected:**
    - First build becomes active again
    - Second build loses active status
    - This demonstrates rollback functionality

---

## Feature 4: Templates & Bulk Operations

**Test URL:** http://localhost:5173/publisher/templates

### Test Steps:

#### 4A: Templates

- [ ] **4.1 Navigate to Templates Page**
  - Click "Templates" in left sidebar
  - ✅ **Expected:** Templates page loads showing grid of templates

- [ ] **4.2 View Preset Templates**
  - You should see 6 preset templates:
    1. Video-Heavy Site
    2. News Publisher
    3. Mobile-First
    4. Privacy-Focused
    5. High CPM
    6. Starter Template
  - ✅ **Expected:** All templates display with:
    - Template name
    - Description
    - Component counts (bidders, modules, analytics)

- [ ] **4.3 View Template Details**
  - Click on "News Publisher" template
  - ✅ **Expected:** Expanded view or modal shows:
    - Full list of components included
    - Component counts

- [ ] **4.4 Apply Template**
  - Click "Apply Template" on "News Publisher"
  - ✅ **Expected:**
    - Confirmation dialog appears
    - Shows what will be added
    - Success message after applying

- [ ] **4.5 Verify Template Applied**
  - Navigate to Modules page
  - ✅ **Expected:** New modules from template are now enabled

#### 4B: Export Configuration

- [ ] **4.6 Export Configuration**
  - Navigate to Settings or Bidders page
  - Look for "Export" button (may be in a menu)
  - Click Export
  - ✅ **Expected:**
    - JSON file downloads
    - File contains modules and analytics configuration
    - Can open in text editor to view

#### 4C: Bulk Operations

- [ ] **4.7 Bulk Add Components**
  - Navigate to Modules page
  - Select multiple modules (if checkboxes are present)
  - OR look for "Bulk Add" button
  - ✅ **Expected:** Can add multiple components at once

---

## Integration Testing

### End-to-End Workflow Test

Complete this workflow to test how all features work together:

- [ ] **Step 1:** Add 3 bidders (Rubicon, AppNexus, Index Exchange)
- [ ] **Step 2:** Configure parameters for each bidder
- [ ] **Step 3:** Add 2 modules (consentManagement, priceFloors)
- [ ] **Step 4:** Apply "News Publisher" template
- [ ] **Step 5:** Generate Prebid.js build
- [ ] **Step 6:** Verify build includes all components
- [ ] **Step 7:** Activate the build
- [ ] **Step 8:** Check Analytics Dashboard shows data
- [ ] **Step 9:** Export complete configuration
- [ ] **Step 10:** Verify exported JSON includes everything

---

## Navigation Testing

Test that all navigation links work:

- [ ] Click each sidebar menu item:
  - [ ] Chat Assistant → /publisher/chat
  - [ ] Dashboard → /publisher/dashboard
  - [ ] Ad Units → /publisher/ad-units
  - [ ] Sites → /publisher/sites
  - [ ] Bidders → /publisher/bidders
  - [ ] Modules → /publisher/modules
  - [ ] Settings → /publisher/settings
  - [ ] Get Code → /publisher/get-code
  - [ ] Analytics → /publisher/analytics
  - [ ] **Analytics Dashboard** → /publisher/analytics-dashboard ✨ NEW
  - [ ] **Templates** → /publisher/templates ✨ NEW
  - [ ] **Builds** → /publisher/builds ✨ NEW
  - [ ] Support → /publisher/support

---

## Known Limitations (Expected)

These are NOT bugs - they're expected based on current implementation:

1. **Analytics Dashboard:**
   - Only 4 days of sample data (Jan 28-31, 2026)
   - No chart visualization yet (placeholder shown)
   - Revenue values shown in dollars (converted from cents)

2. **Build System:**
   - Builds complete instantly (simulated, not real Prebid.js compilation)
   - CDN URLs are mock URLs (not actually hosted)
   - File sizes are randomized estimates

3. **Templates:**
   - Can apply templates but can't create custom templates from UI yet
   - No template editing UI

4. **Parameter Configuration:**
   - Only 15 components have parameter schemas
   - Others will show "No parameters available"
   - No conditional fields yet

---

## What to Look For (Success Criteria)

✅ **UI renders without errors**
✅ **All buttons are clickable**
✅ **Forms submit successfully**
✅ **Data persists after reload**
✅ **Navigation works smoothly**
✅ **Tables display data correctly**
✅ **Modals open and close**
✅ **Success/error messages appear**

---

## Reporting Issues

If you find any bugs during testing, note:

1. **What you were doing** (exact steps)
2. **What you expected** to happen
3. **What actually happened**
4. **Any error messages** (check browser console with F12)
5. **Screenshots** (if visual issue)

---

## Quick Test Checklist

For a quick smoke test, just test these critical paths:

- [ ] Login works
- [ ] Bidders page loads
- [ ] Configure button opens modal for Rubicon
- [ ] Can save parameters
- [ ] Analytics Dashboard shows data
- [ ] Builds page can generate a build
- [ ] Templates page shows 6 templates
- [ ] Can apply a template

---

## Browser Developer Tools

**Useful for debugging:**

1. Press **F12** to open DevTools
2. **Console tab:** Check for JavaScript errors
3. **Network tab:** Check API calls and responses
4. **Application tab:** Check localStorage for auth token

---

**Happy Testing! 🚀**

*All Phase 2 features are ready for your review!*
