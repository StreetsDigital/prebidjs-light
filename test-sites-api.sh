#!/bin/bash

# Sites Feature API Test Script
# Tests the complete Sites Feature backend

echo "🧪 Testing Sites Feature API"
echo "================================"
echo ""

# Configuration
API_URL="http://localhost:3001"
PUBLISHER_ID=""
CONFIG_ID=""
TOKEN=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if API is running
echo "1️⃣  Checking if API server is running..."
if curl -s "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ API server is running${NC}"
else
    echo -e "${RED}❌ API server is not running. Start it with: cd apps/api && npm run dev${NC}"
    exit 1
fi
echo ""

# Get publisher ID from user
echo "2️⃣  Enter Publisher ID to test:"
read -p "Publisher ID: " PUBLISHER_ID

if [ -z "$PUBLISHER_ID" ]; then
    echo -e "${RED}❌ Publisher ID is required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Using Publisher ID: $PUBLISHER_ID${NC}"
echo ""

# Test 1: List configs (should be empty initially)
echo "3️⃣  Test: List all configs for publisher"
echo "GET $API_URL/api/publishers/$PUBLISHER_ID/configs"
RESPONSE=$(curl -s "$API_URL/api/publishers/$PUBLISHER_ID/configs")
echo "Response: $RESPONSE"
echo ""

# Test 2: Create a new config
echo "4️⃣  Test: Create new config"
echo "POST $API_URL/api/publishers/$PUBLISHER_ID/configs"
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "UK Mobile Premium",
    "description": "High-value config for UK mobile users",
    "status": "active",
    "isDefault": false,
    "bidderTimeout": 2000,
    "priceGranularity": "high",
    "enableSendAllBids": true,
    "bidders": [
      {
        "bidderCode": "appnexus",
        "params": {"placementId": "123"},
        "timeoutOverride": 1800
      }
    ],
    "adUnits": {
      "header-banner": {
        "mediaTypes": {"banner": {"sizes": [[728, 90]]}}
      }
    },
    "targetingRules": {
      "conditions": [
        {
          "attribute": "geo",
          "operator": "equals",
          "value": "GB"
        },
        {
          "attribute": "device",
          "operator": "equals",
          "value": "mobile"
        }
      ],
      "matchType": "all",
      "priority": 100
    }
  }')

echo "Response: $CREATE_RESPONSE"

# Extract config ID
CONFIG_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CONFIG_ID" ]; then
    echo -e "${GREEN}✅ Config created with ID: $CONFIG_ID${NC}"
else
    echo -e "${RED}❌ Failed to create config${NC}"
    exit 1
fi
echo ""

# Test 3: Get single config
echo "5️⃣  Test: Get single config"
echo "GET $API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID"
SINGLE_RESPONSE=$(curl -s "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID")
echo "Response: $SINGLE_RESPONSE"
echo ""

# Test 4: Test match
echo "6️⃣  Test: Test targeting match"
echo "POST $API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/test-match"
MATCH_RESPONSE=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/test-match" \
  -H "Content-Type: application/json" \
  -d '{
    "geo": "GB",
    "device": "mobile",
    "browser": "chrome",
    "os": "android"
  }')

echo "Response: $MATCH_RESPONSE"

if echo "$MATCH_RESPONSE" | grep -q '"matches":true'; then
    echo -e "${GREEN}✅ Targeting rules match correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Targeting rules did not match (this might be expected)${NC}"
fi
echo ""

# Test 5: Update config
echo "7️⃣  Test: Update config"
echo "PUT $API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description for UK mobile users"
  }')

echo "Response: $UPDATE_RESPONSE"
echo ""

# Test 6: Duplicate config
echo "8️⃣  Test: Duplicate config"
echo "POST $API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/duplicate"
DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/duplicate" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "UK Mobile Premium (Copy)"
  }')

echo "Response: $DUPLICATE_RESPONSE"

DUPLICATE_ID=$(echo "$DUPLICATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$DUPLICATE_ID" ]; then
    echo -e "${GREEN}✅ Config duplicated with ID: $DUPLICATE_ID${NC}"
else
    echo -e "${RED}❌ Failed to duplicate config${NC}"
fi
echo ""

# Test 7: Activate/Pause config
echo "9️⃣  Test: Pause config"
echo "POST $API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/pause"
PAUSE_RESPONSE=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/pause")
echo "Response: $PAUSE_RESPONSE"
echo ""

echo "🔟 Test: Activate config"
echo "POST $API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/activate"
ACTIVATE_RESPONSE=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/activate")
echo "Response: $ACTIVATE_RESPONSE"
echo ""

# Test 8: Test wrapper serving
echo "1️⃣1️⃣  Test: Wrapper serving with embedded config"
echo "GET $API_URL/pb/$PUBLISHER_ID.js"
echo "Checking if wrapper is served with embedded config..."

WRAPPER_RESPONSE=$(curl -s "$API_URL/pb/$PUBLISHER_ID.js" -H "CF-IPCountry: GB" -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile Chrome/90.0")

if echo "$WRAPPER_RESPONSE" | grep -q "__PB_CONFIG__"; then
    echo -e "${GREEN}✅ Wrapper served with embedded config!${NC}"
    echo "Sample of embedded config:"
    echo "$WRAPPER_RESPONSE" | grep -o '__PB_CONFIG__={[^;]*' | head -c 200
    echo "..."
else
    echo -e "${RED}❌ Wrapper did not contain embedded config${NC}"
fi
echo ""

# Test 9: Get analytics
echo "1️⃣2️⃣  Test: Get config analytics"
echo "GET $API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/analytics"
ANALYTICS_RESPONSE=$(curl -s "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID/analytics?days=7")
echo "Response: $ANALYTICS_RESPONSE"
echo ""

# Test 10: List all configs again
echo "1️⃣3️⃣  Test: List all configs (should now show 2)"
echo "GET $API_URL/api/publishers/$PUBLISHER_ID/configs"
FINAL_LIST_RESPONSE=$(curl -s "$API_URL/api/publishers/$PUBLISHER_ID/configs")
echo "Response: $FINAL_LIST_RESPONSE"

CONFIG_COUNT=$(echo "$FINAL_LIST_RESPONSE" | grep -o '"id":"' | wc -l)
echo -e "${GREEN}✅ Found $CONFIG_COUNT config(s)${NC}"
echo ""

# Clean up (optional)
echo "1️⃣4️⃣  Cleanup (optional)"
read -p "Do you want to delete the test configs? (y/N): " DELETE_CONFIRM

if [ "$DELETE_CONFIRM" = "y" ] || [ "$DELETE_CONFIRM" = "Y" ]; then
    echo "Deleting config $CONFIG_ID..."
    curl -s -X DELETE "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID"

    if [ -n "$DUPLICATE_ID" ]; then
        echo "Deleting config $DUPLICATE_ID..."
        curl -s -X DELETE "$API_URL/api/publishers/$PUBLISHER_ID/configs/$DUPLICATE_ID"
    fi

    echo -e "${GREEN}✅ Configs deleted${NC}"
else
    echo "Configs kept for further testing"
fi
echo ""

# Summary
echo "================================"
echo "🎉 Test Complete!"
echo "================================"
echo ""
echo "Summary:"
echo "- Config created: $CONFIG_ID"
echo "- Config duplicated: $DUPLICATE_ID"
echo "- Wrapper serving: $([ $(echo "$WRAPPER_RESPONSE" | grep -c '__PB_CONFIG__') -gt 0 ] && echo '✅ Working' || echo '❌ Failed')"
echo ""
echo "Next steps:"
echo "1. Open test page: http://localhost:3001/test-wrapper-embedded.html"
echo "2. Enter Publisher ID: $PUBLISHER_ID"
echo "3. Test wrapper loading and performance"
echo "4. Verify 0ms config fetch time!"
echo ""
