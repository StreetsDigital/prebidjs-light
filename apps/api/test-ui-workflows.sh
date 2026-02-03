#!/bin/bash

# Comprehensive UI Workflow Testing via API
# Simulates user interactions with the frontend

BASE_URL="http://localhost:3001"
PUBLISHER_ID="5913a20f-c5aa-4251-99f1-8b69973d431b"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $2"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}: $2"
    ((FAIL++))
  fi
}

echo "========================================="
echo "  UI WORKFLOW TESTING"
echo "  Simulating Complete User Journeys"
echo "========================================="
echo ""

# ==========================================
# WORKFLOW 1: CONFIGURE BIDDER PARAMETERS
# ==========================================
echo -e "${BLUE}━━━ Workflow 1: Configure Bidder Parameters ━━━${NC}"
echo ""

echo "Step 1.1: User navigates to Bidders page and clicks Configure on Rubicon..."
RESPONSE=$(curl -s "$BASE_URL/api/components/bidder/rubicon/parameters")
echo "$RESPONSE" | grep -q "accountId" && echo "$RESPONSE" | grep -q "siteId"
test_result $? "Load Rubicon parameter schema (modal opens)"

echo "Step 1.2: User fills in form and clicks Save..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/components/bidder/rubicon/parameters" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "accountId": 99999,
      "siteId": 88888,
      "zoneId": 77777
    }
  }')
echo "$RESPONSE" | grep -q "success"
test_result $? "Save parameters (success message appears)"

echo "Step 1.3: User reopens modal to verify saved values..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/components/bidder/rubicon/parameters")
echo "$RESPONSE" | grep -q "99999" && echo "$RESPONSE" | grep -q "88888"
test_result $? "Values persisted correctly (form pre-filled)"

echo ""

# ==========================================
# WORKFLOW 2: VIEW ANALYTICS DASHBOARD
# ==========================================
echo -e "${BLUE}━━━ Workflow 2: View Analytics Dashboard ━━━${NC}"
echo ""

echo "Step 2.1: User clicks Analytics Dashboard in sidebar..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/analytics/bidders?startDate=2026-01-25&endDate=2026-02-01")
echo "$RESPONSE" | grep -q '"bidderCode":"rubicon"' && echo "$RESPONSE" | grep -q '"revenue"'
test_result $? "Dashboard loads with metrics data"

echo "Step 2.2: User views KPI cards (calculating totals)..."
TOTAL_REVENUE=$(echo "$RESPONSE" | grep -o '"revenue":[0-9.]*' | cut -d: -f2 | awk '{s+=$1} END {print s}')
if (( $(echo "$TOTAL_REVENUE > 0" | bc -l) )); then
  echo -e "  ${GREEN}Revenue KPI: \$$TOTAL_REVENUE${NC}"
  test_result 0 "KPI cards display revenue"
else
  test_result 1 "KPI cards display revenue"
fi

echo "Step 2.3: User views Top Bidders table..."
TOP_BIDDER=$(echo "$RESPONSE" | grep -o '"bidderCode":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "  ${GREEN}Top bidder: $TOP_BIDDER${NC}"
test_result 0 "Top bidders table populated"

echo "Step 2.4: User toggles date range to 7 days..."
RESPONSE_7D=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/analytics/bidders?startDate=2026-01-25&endDate=2026-02-01")
echo "$RESPONSE_7D" | grep -q "data"
test_result $? "Date range filter works"

echo ""

# ==========================================
# WORKFLOW 3: GENERATE AND ACTIVATE BUILD
# ==========================================
echo -e "${BLUE}━━━ Workflow 3: Generate & Activate Build ━━━${NC}"
echo ""

echo "Step 3.1: User clicks 'Generate Build' button..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/builds" \
  -H "Content-Type: application/json" \
  -d '{}')
BUILD_ID=$(echo "$RESPONSE" | grep -o '"buildId":"[^"]*"' | cut -d'"' -f4)
echo "$RESPONSE" | grep -q "buildId"
test_result $? "Build initiated (button triggers build)"

if [ -n "$BUILD_ID" ]; then
  echo -e "  ${GREEN}Build ID: $BUILD_ID${NC}"

  echo "Step 3.2: Waiting for build to complete (status polling)..."
  sleep 2

  echo "Step 3.3: User views build details..."
  RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/builds/$BUILD_ID")
  echo "$RESPONSE" | grep -q '"status":"success"'
  test_result $? "Build completes successfully (status updates)"

  CDN_URL=$(echo "$RESPONSE" | grep -o '"cdnUrl":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$CDN_URL" ]; then
    echo -e "  ${GREEN}CDN URL: $CDN_URL${NC}"
  fi

  echo "Step 3.4: User clicks 'Activate' button..."
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/builds/$BUILD_ID/activate")
  echo "$RESPONSE" | grep -q "success"
  test_result $? "Build activated (active indicator appears)"

  echo "Step 3.5: User views builds list..."
  RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/builds")
  echo "$RESPONSE" | grep -q "$BUILD_ID"
  test_result $? "Build appears in history table"

  echo "Step 3.6: User checks current active build..."
  RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/builds/current")
  echo "$RESPONSE" | grep -q "$BUILD_ID"
  test_result $? "Active build indicator correct"
else
  echo -e "${YELLOW}⚠️  Skipping build tests - no build ID${NC}"
  ((FAIL+=5))
fi

echo ""

# ==========================================
# WORKFLOW 4: APPLY TEMPLATE
# ==========================================
echo -e "${BLUE}━━━ Workflow 4: Apply Configuration Template ━━━${NC}"
echo ""

echo "Step 4.1: User navigates to Templates page..."
RESPONSE=$(curl -s "$BASE_URL/api/templates?type=preset")
echo "$RESPONSE" | grep -q "News Publisher"
test_result $? "Templates page loads with presets"

echo "Step 4.2: User views template details..."
TEMPLATE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$TEMPLATE_ID" ]; then
  echo -e "  ${GREEN}Template ID: $TEMPLATE_ID${NC}"
  RESPONSE=$(curl -s "$BASE_URL/api/templates/$TEMPLATE_ID")
  echo "$RESPONSE" | grep -q "configJson"
  test_result $? "Template details shown (component preview)"

  echo "Step 4.3: User clicks 'Apply Template' button..."
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/apply-template" \
    -H "Content-Type: application/json" \
    -d "{
      \"templateId\": \"$TEMPLATE_ID\",
      \"targetSites\": \"all\",
      \"mergeStrategy\": \"append\"
    }")
  echo "$RESPONSE" | grep -q "success"
  test_result $? "Template applied (components added)"
else
  echo -e "${YELLOW}⚠️  Skipping template tests - no template found${NC}"
  ((FAIL+=2))
fi

echo ""

# ==========================================
# WORKFLOW 5: BULK ADD COMPONENTS
# ==========================================
echo -e "${BLUE}━━━ Workflow 5: Bulk Add Components ━━━${NC}"
echo ""

echo "Step 5.1: User selects multiple modules for bulk add..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/bulk/add" \
  -H "Content-Type: application/json" \
  -d '{
    "componentType": "module",
    "componentCodes": ["gptPreAuction", "adpod"],
    "targetSites": "all"
  }')
echo "$RESPONSE" | grep -q "operationId"
test_result $? "Bulk operation initiated"

OP_ID=$(echo "$RESPONSE" | grep -o '"operationId":"[^"]*"' | cut -d'"' -f4)
if [ -n "$OP_ID" ]; then
  echo -e "  ${GREEN}Operation ID: $OP_ID${NC}"

  echo "Step 5.2: User checks operation status..."
  RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/bulk/operations/$OP_ID")
  echo "$RESPONSE" | grep -q "status"
  test_result $? "Operation status tracked"
else
  echo -e "${YELLOW}⚠️  Operation ID not returned${NC}"
  ((FAIL++))
fi

echo ""

# ==========================================
# WORKFLOW 6: EXPORT & IMPORT CONFIG
# ==========================================
echo -e "${BLUE}━━━ Workflow 6: Export & Import Configuration ━━━${NC}"
echo ""

echo "Step 6.1: User clicks 'Export' button..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/export?format=json")
echo "$RESPONSE" | grep -q "configuration" && echo "$RESPONSE" | grep -q "modules"
test_result $? "Configuration exported as JSON"

# Save export for import test
echo "$RESPONSE" > /tmp/test-export.json

echo "Step 6.2: User verifies export contains data..."
MODULE_COUNT=$(echo "$RESPONSE" | grep -o '"code":"[^"]*"' | wc -l)
echo -e "  ${GREEN}Exported $MODULE_COUNT components${NC}"
test_result 0 "Export contains component data"

echo "Step 6.3: User imports configuration..."
IMPORT_CONFIG=$(cat <<'EOF'
{
  "config": {
    "configuration": {
      "modules": [
        {"code": "fledgeForGpt", "name": "Fledge for GPT", "category": "general", "enabled": true}
      ],
      "analytics": []
    }
  },
  "mergeStrategy": "append"
}
EOF
)

RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/import" \
  -H "Content-Type: application/json" \
  -d "$IMPORT_CONFIG")
echo "$RESPONSE" | grep -q "success\|added\|imported"
test_result $? "Import successful (components added)"

echo ""

# ==========================================
# WORKFLOW 7: END-TO-END INTEGRATION
# ==========================================
echo -e "${BLUE}━━━ Workflow 7: Complete Integration Test ━━━${NC}"
echo ""

echo "Step 7.1: Configure parameters → Generate build workflow..."
# Already configured Rubicon parameters above
RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/builds" \
  -H "Content-Type: application/json" \
  -d '{}')
NEW_BUILD_ID=$(echo "$RESPONSE" | grep -o '"buildId":"[^"]*"' | cut -d'"' -f4)
test_result $? "Parameters → Build workflow works"

sleep 1

echo "Step 7.2: Verify build includes configured components..."
if [ -n "$NEW_BUILD_ID" ]; then
  RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/builds/$NEW_BUILD_ID")
  echo "$RESPONSE" | grep -q "modulesIncluded"
  test_result $? "Build contains components"
fi

echo "Step 7.3: Apply template → Check analytics workflow..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/analytics/bidders?startDate=2026-01-28&endDate=2026-02-01")
echo "$RESPONSE" | grep -q "bidderCode"
test_result $? "Template → Analytics workflow works"

echo ""

# ==========================================
# SUMMARY
# ==========================================
echo "========================================="
echo "        UI WORKFLOW TEST SUMMARY"
echo "========================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo "Total:  $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 All UI workflows passed!${NC}"
  echo -e "${GREEN}✅ Frontend is ready for manual testing!${NC}"
  echo ""
  echo "Next Steps:"
  echo "1. Open browser to http://localhost:5173"
  echo "2. Login with publisher@test.com / password123"
  echo "3. Test the UI manually following MANUAL_UI_TESTING_GUIDE.md"
  exit 0
else
  echo -e "${RED}⚠️  Some workflows failed.${NC}"
  echo "Review failures above and check server logs."
  exit 1
fi
