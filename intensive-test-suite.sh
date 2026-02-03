#!/bin/bash
set -e

echo "🔍 INTENSIVE TESTING SUITE - BUG HUNTING MODE"
echo "=============================================="
echo ""

API_URL="http://localhost:3001"
TEST_PUBLISHER_ID=""
TEST_WEBSITE_ID=""
TEST_CONFIG_ID=""
ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  ((ERRORS++))
}

log_warning() {
  echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
  ((WARNINGS++))
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_info() {
  echo -e "${BLUE}ℹ  $1${NC}"
}

# Setup: Get test publisher
echo "📋 TEST 1: Database Integrity Checks"
echo "--------------------------------------"
cd apps/api

# Check schema
SCHEMA_CHECK=$(sqlite3 data/pbjs_engine.db "SELECT sql FROM sqlite_master WHERE type='table' AND name='wrapper_configs'" | grep -c "website_id")
if [ "$SCHEMA_CHECK" -eq 0 ]; then
  log_error "website_id column missing from wrapper_configs table"
else
  log_success "Schema contains website_id column"
fi

SCHEMA_CHECK=$(sqlite3 data/pbjs_engine.db "SELECT sql FROM sqlite_master WHERE type='table' AND name='wrapper_configs'" | grep -c "block_wrapper")
if [ "$SCHEMA_CHECK" -eq 0 ]; then
  log_error "block_wrapper column missing from wrapper_configs table"
else
  log_success "Schema contains block_wrapper column"
fi

# Check for orphaned configs (configs with invalid websiteId)
ORPHANED=$(sqlite3 data/pbjs_engine.db "SELECT COUNT(*) FROM wrapper_configs WHERE website_id IS NOT NULL AND website_id NOT IN (SELECT id FROM websites)")
if [ "$ORPHANED" -gt 0 ]; then
  log_warning "$ORPHANED configs reference non-existent websites"
else
  log_success "No orphaned configs found"
fi

# Check for default config conflicts
CONFLICTS=$(sqlite3 data/pbjs_engine.db "SELECT publisher_id, COUNT(*) as cnt FROM wrapper_configs WHERE is_default = 1 GROUP BY publisher_id HAVING cnt > 1")
if [ -n "$CONFLICTS" ]; then
  log_warning "Multiple default configs found for same publisher: $CONFLICTS"
else
  log_success "No default config conflicts"
fi

echo ""
echo "🔌 TEST 2: API Endpoint Health Checks"
echo "--------------------------------------"

# Check API is running
if curl -s "$API_URL/health" > /dev/null 2>&1; then
  log_success "API server is running"
else
  log_error "API server is not responding"
  exit 1
fi

# Get a test publisher
TEST_PUBLISHER_ID=$(sqlite3 data/pbjs_engine.db "SELECT id FROM publishers WHERE status='active' LIMIT 1" | tr -d '\n')
if [ -z "$TEST_PUBLISHER_ID" ]; then
  log_error "No active publishers found in database"
  exit 1
fi
log_info "Using test publisher: $TEST_PUBLISHER_ID"

echo ""
echo "🌐 TEST 3: Website API Tests"
echo "--------------------------------------"

# Test: List websites
RESPONSE=$(curl -s "$API_URL/api/publishers/$TEST_PUBLISHER_ID/websites")
if echo "$RESPONSE" | grep -q "websites"; then
  log_success "List websites endpoint works"
  WEBSITE_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
  log_info "Found $WEBSITE_COUNT websites"
else
  log_error "List websites endpoint failed: $RESPONSE"
fi

# Test: Create website
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/publishers/$TEST_PUBLISHER_ID/websites" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Website",
    "domain": "test-'$(date +%s)'.com",
    "status": "active"
  }')

if echo "$CREATE_RESPONSE" | grep -q "id"; then
  TEST_WEBSITE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  log_success "Create website works (ID: ${TEST_WEBSITE_ID:0:8}...)"
else
  log_error "Create website failed: $CREATE_RESPONSE"
fi

# Test: Get single website
if [ -n "$TEST_WEBSITE_ID" ]; then
  RESPONSE=$(curl -s "$API_URL/api/publishers/$TEST_PUBLISHER_ID/websites/$TEST_WEBSITE_ID")
  if echo "$RESPONSE" | grep -q "test-"; then
    log_success "Get single website works"
  else
    log_error "Get single website failed"
  fi
fi

echo ""
echo "⚙️  TEST 4: Config API with Website Support"
echo "--------------------------------------"

# Test: Create config WITHOUT websiteId (publisher-level)
CREATE_CONFIG=$(curl -s -X POST "$API_URL/api/publishers/$TEST_PUBLISHER_ID/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Publisher Config",
    "description": "Publisher-level config",
    "status": "active",
    "isDefault": true,
    "bidderTimeout": 1500
  }')

if echo "$CREATE_CONFIG" | grep -q "id"; then
  PUB_CONFIG_ID=$(echo "$CREATE_CONFIG" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  log_success "Create publisher-level config works"
  
  # Verify it has NULL websiteId
  WEBSITE_ID_CHECK=$(sqlite3 data/pbjs_engine.db "SELECT website_id FROM wrapper_configs WHERE id='$PUB_CONFIG_ID'")
  if [ -z "$WEBSITE_ID_CHECK" ] || [ "$WEBSITE_ID_CHECK" == "NULL" ]; then
    log_success "Publisher-level config has NULL websiteId"
  else
    log_warning "Publisher-level config has unexpected websiteId: $WEBSITE_ID_CHECK"
  fi
else
  log_error "Create publisher-level config failed"
fi

# Test: Create config WITH websiteId (website-level)
if [ -n "$TEST_WEBSITE_ID" ]; then
  CREATE_CONFIG=$(curl -s -X POST "$API_URL/api/publishers/$TEST_PUBLISHER_ID/configs" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Website Config\",
      \"description\": \"Website-level config\",
      \"status\": \"active\",
      \"websiteId\": \"$TEST_WEBSITE_ID\",
      \"bidderTimeout\": 2000
    }")

  if echo "$CREATE_CONFIG" | grep -q "id"; then
    TEST_CONFIG_ID=$(echo "$CREATE_CONFIG" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_success "Create website-level config works"
    
    # Verify it has correct websiteId
    STORED_WEBSITE_ID=$(sqlite3 data/pbjs_engine.db "SELECT website_id FROM wrapper_configs WHERE id='$TEST_CONFIG_ID'")
    if [ "$STORED_WEBSITE_ID" == "$TEST_WEBSITE_ID" ]; then
      log_success "Website-level config has correct websiteId"
    else
      log_error "Website-level config websiteId mismatch: expected $TEST_WEBSITE_ID, got $STORED_WEBSITE_ID"
    fi
  else
    log_error "Create website-level config failed"
  fi
fi

echo ""
echo "🚫 TEST 5: Blocking Feature Tests"
echo "--------------------------------------"

# Test: Create blocking config
if [ -n "$TEST_WEBSITE_ID" ]; then
  CREATE_BLOCKING=$(curl -s -X POST "$API_URL/api/publishers/$TEST_PUBLISHER_ID/configs" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Blocking Config\",
      \"description\": \"Should block wrapper\",
      \"status\": \"active\",
      \"websiteId\": \"$TEST_WEBSITE_ID\",
      \"blockWrapper\": true,
      \"targetingRules\": {
        \"conditions\": [{
          \"attribute\": \"geo\",
          \"operator\": \"equals\",
          \"value\": \"CN\"
        }],
        \"matchType\": \"all\",
        \"priority\": 999
      }
    }")

  if echo "$CREATE_BLOCKING" | grep -q "id"; then
    BLOCKING_CONFIG_ID=$(echo "$CREATE_BLOCKING" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_success "Create blocking config works"
    
    # Verify blockWrapper flag
    BLOCK_FLAG=$(sqlite3 data/pbjs_engine.db "SELECT block_wrapper FROM wrapper_configs WHERE id='$BLOCKING_CONFIG_ID'")
    if [ "$BLOCK_FLAG" == "1" ]; then
      log_success "Blocking config has blockWrapper=true"
    else
      log_error "Blocking config blockWrapper flag not set correctly: $BLOCK_FLAG"
    fi
  else
    log_error "Create blocking config failed"
  fi
fi

echo ""
echo "🎯 TEST 6: Wrapper Serving with Blocking"
echo "--------------------------------------"

# Note: We can't easily test wrapper serving without setting up complete publisher data
# This would require:
# - Valid publisher with slug
# - Active configs
# - Proper targeting setup
log_info "Wrapper serving tests require full publisher setup"
log_info "Manual testing recommended for complete verification"

echo ""
echo "🔍 TEST 7: Data Validation & Edge Cases"
echo "--------------------------------------"

# Test: Invalid websiteId
INVALID_RESPONSE=$(curl -s -X POST "$API_URL/api/publishers/$TEST_PUBLISHER_ID/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Website Config",
    "websiteId": "nonexistent-id-12345",
    "status": "active"
  }')

if echo "$INVALID_RESPONSE" | grep -q "id"; then
  log_warning "API accepts invalid websiteId (no FK constraint?)"
else
  log_success "API properly handles invalid websiteId"
fi

# Test: Multiple default configs per website
if [ -n "$TEST_WEBSITE_ID" ]; then
  # First default
  curl -s -X POST "$API_URL/api/publishers/$TEST_PUBLISHER_ID/configs" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Default 1\",\"websiteId\":\"$TEST_WEBSITE_ID\",\"isDefault\":true,\"status\":\"active\"}" > /dev/null
  
  # Second default
  curl -s -X POST "$API_URL/api/publishers/$TEST_PUBLISHER_ID/configs" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Default 2\",\"websiteId\":\"$TEST_WEBSITE_ID\",\"isDefault\":true,\"status\":\"active\"}" > /dev/null
  
  # Check how many defaults exist
  DEFAULT_COUNT=$(sqlite3 data/pbjs_engine.db "SELECT COUNT(*) FROM wrapper_configs WHERE website_id='$TEST_WEBSITE_ID' AND is_default=1")
  if [ "$DEFAULT_COUNT" -gt 1 ]; then
    log_warning "Multiple default configs allowed for same website ($DEFAULT_COUNT found)"
  else
    log_success "Only one default config per website enforced"
  fi
fi

echo ""
echo "🧹 TEST 8: Cleanup Test Data"
echo "--------------------------------------"

if [ -n "$TEST_CONFIG_ID" ]; then
  curl -s -X DELETE "$API_URL/api/publishers/$TEST_PUBLISHER_ID/configs/$TEST_CONFIG_ID" > /dev/null
  log_success "Deleted test config"
fi

if [ -n "$TEST_WEBSITE_ID" ]; then
  curl -s -X DELETE "$API_URL/api/publishers/$TEST_PUBLISHER_ID/websites/$TEST_WEBSITE_ID" > /dev/null
  log_success "Deleted test website"
fi

echo ""
echo "=============================================="
echo "📊 INTENSIVE TEST RESULTS"
echo "=============================================="
echo -e "${RED}Errors:   $ERRORS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED - NO BUGS FOUND!${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}✓ Tests passed with $WARNINGS warnings${NC}"
  exit 0
else
  echo -e "${RED}❌ TESTS FAILED - $ERRORS errors found${NC}"
  exit 1
fi
