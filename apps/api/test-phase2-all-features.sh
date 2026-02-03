#!/bin/bash

# Comprehensive Phase 2 API Testing Script
# Tests all 4 major features: Parameters, Analytics, Builds, Templates & Bulk Ops

BASE_URL="http://localhost:3001"
PUBLISHER_ID="5913a20f-c5aa-4251-99f1-8b69973d431b" # Test publisher ID

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# Test result tracking
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $2"
    ((PASS_COUNT++))
  else
    echo -e "${RED}❌ FAIL${NC}: $2"
    ((FAIL_COUNT++))
  fi
}

echo "========================================="
echo "  Phase 2 Comprehensive API Testing"
echo "========================================="
echo ""

# ==========================================
# FEATURE 1: PARAMETER CONFIGURATION
# ==========================================
echo -e "${BLUE}━━━ Feature 1: Parameter Configuration ━━━${NC}"
echo ""

# Test 1.1: Get parameter schema for Rubicon bidder
echo "Test 1.1: Get parameter schema for Rubicon bidder..."
RESPONSE=$(curl -s "$BASE_URL/api/components/bidder/rubicon/parameters")
echo "$RESPONSE" | grep -q "accountId" && echo "$RESPONSE" | grep -q "siteId"
test_result $? "Get Rubicon parameter schema"

# Test 1.2: Save parameter values
echo "Test 1.2: Save parameter values..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/components/bidder/rubicon/parameters" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "accountId": 12345,
      "siteId": 67890,
      "zoneId": 11111
    }
  }')
echo "$RESPONSE" | grep -q "success"
test_result $? "Save Rubicon parameters"

# Test 1.3: Retrieve saved parameter values
echo "Test 1.3: Retrieve saved parameter values..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/components/bidder/rubicon/parameters")
echo "$RESPONSE" | grep -q "accountId.*12345" && echo "$RESPONSE" | grep -q "siteId.*67890"
test_result $? "Retrieve saved parameters"

# Test 1.4: Validate parameters
echo "Test 1.4: Validate parameters..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/components/bidder/rubicon/parameters/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "accountId": 999,
      "siteId": 888
    }
  }')
echo "$RESPONSE" | grep -q "valid.*true"
test_result $? "Validate parameters"

echo ""

# ==========================================
# FEATURE 2: ANALYTICS DASHBOARD
# ==========================================
echo -e "${BLUE}━━━ Feature 2: Analytics Dashboard ━━━${NC}"
echo ""

# Test 2.1: Get bidder metrics (empty initially)
echo "Test 2.1: Get bidder metrics..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/analytics/bidders?startDate=2026-01-01&endDate=2026-02-01")
echo "$RESPONSE" | grep -q "data"
test_result $? "Get bidder metrics endpoint"

# Test 2.2: Get geographic analytics
echo "Test 2.2: Get geographic analytics..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/analytics/geo?startDate=2026-01-01&endDate=2026-02-01")
echo "$RESPONSE" | grep -q "data"
test_result $? "Get geographic analytics endpoint"

# Test 2.3: Get timeseries data
echo "Test 2.3: Get timeseries data..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/analytics/timeseries?startDate=2026-01-01&endDate=2026-02-01")
echo "$RESPONSE" | grep -q "data"
test_result $? "Get timeseries endpoint"

# Test 2.4: Get component health
echo "Test 2.4: Get component health..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/analytics/health?componentType=bidder&componentCode=rubicon")
echo "$RESPONSE" | grep -q "data"
test_result $? "Get component health endpoint"

echo ""

# ==========================================
# FEATURE 3: PREBID.JS BUILD SYSTEM
# ==========================================
echo -e "${BLUE}━━━ Feature 3: Prebid.js Build System ━━━${NC}"
echo ""

# Test 3.1: Trigger new build
echo "Test 3.1: Trigger new build..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/builds" \
  -H "Content-Type: application/json" \
  -d '{}')
BUILD_ID=$(echo "$RESPONSE" | grep -o '"buildId":"[^"]*"' | cut -d'"' -f4)
echo "$RESPONSE" | grep -q "buildId"
test_result $? "Trigger build"

# Wait for build to complete
sleep 1

# Test 3.2: Get build status
echo "Test 3.2: Get build status..."
if [ -n "$BUILD_ID" ]; then
  RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/builds/$BUILD_ID")
  echo "$RESPONSE" | grep -q "status.*success"
  test_result $? "Get build status"
else
  echo "⚠️  SKIP: No build ID from previous test"
  ((FAIL_COUNT++))
fi

# Test 3.3: List builds
echo "Test 3.3: List all builds..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/builds")
echo "$RESPONSE" | grep -q "data"
test_result $? "List builds"

# Test 3.4: Activate build
echo "Test 3.4: Activate build..."
if [ -n "$BUILD_ID" ]; then
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/builds/$BUILD_ID/activate")
  echo "$RESPONSE" | grep -q "success"
  test_result $? "Activate build"
else
  echo "⚠️  SKIP: No build ID"
  ((FAIL_COUNT++))
fi

# Test 3.5: Get current active build
echo "Test 3.5: Get current active build..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/builds/current")
echo "$RESPONSE" | grep -q "data"
test_result $? "Get current active build"

echo ""

# ==========================================
# FEATURE 4: TEMPLATES & BULK OPERATIONS
# ==========================================
echo -e "${BLUE}━━━ Feature 4: Templates & Bulk Operations ━━━${NC}"
echo ""

# Test 4.1: List preset templates
echo "Test 4.1: List preset templates..."
RESPONSE=$(curl -s "$BASE_URL/api/templates?type=preset")
echo "$RESPONSE" | grep -q "News Publisher" && echo "$RESPONSE" | grep -q "Video-Heavy"
test_result $? "List preset templates"

# Test 4.2: Get specific template details
echo "Test 4.2: Get template details..."
TEMPLATE_ID=$(curl -s "$BASE_URL/api/templates?type=preset" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$TEMPLATE_ID" ]; then
  RESPONSE=$(curl -s "$BASE_URL/api/templates/$TEMPLATE_ID")
  echo "$RESPONSE" | grep -q "configJson"
  test_result $? "Get template details"
else
  echo "⚠️  SKIP: No template ID found"
  ((FAIL_COUNT++))
fi

# Test 4.3: Apply template to publisher
echo "Test 4.3: Apply template..."
if [ -n "$TEMPLATE_ID" ]; then
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/apply-template" \
    -H "Content-Type: application/json" \
    -d "{
      \"templateId\": \"$TEMPLATE_ID\",
      \"targetSites\": \"all\",
      \"mergeStrategy\": \"append\"
    }")
  echo "$RESPONSE" | grep -q "success"
  test_result $? "Apply template"
else
  echo "⚠️  SKIP: No template ID"
  ((FAIL_COUNT++))
fi

# Test 4.4: Bulk add components
echo "Test 4.4: Bulk add components..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/bulk/add" \
  -H "Content-Type: application/json" \
  -d '{
    "componentType": "module",
    "componentCodes": ["consentManagement", "priceFloors"],
    "targetSites": "all"
  }')
echo "$RESPONSE" | grep -q "operationId"
test_result $? "Bulk add components"

# Test 4.5: Export configuration
echo "Test 4.5: Export configuration..."
RESPONSE=$(curl -s "$BASE_URL/api/publishers/$PUBLISHER_ID/export?format=json")
echo "$RESPONSE" | grep -q "modules" || echo "$RESPONSE" | grep -q "analytics"
test_result $? "Export configuration"

# Test 4.6: Import configuration (preview)
echo "Test 4.6: Import configuration..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/import" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "configuration": {
        "modules": [{"code": "gptPreAuction", "name": "GPT Pre-Auction", "category": "general", "enabled": true}],
        "analytics": []
      }
    },
    "mergeStrategy": "append"
  }')
echo "$RESPONSE" | grep -q "success\|applied\|imported\|added"
test_result $? "Import configuration"

echo ""
echo "========================================="
echo "        PHASE 2 TEST SUMMARY"
echo "========================================="
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo "Total:  $((PASS_COUNT + FAIL_COUNT))"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Phase 2 is fully functional!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Review above for details.${NC}"
  exit 1
fi
