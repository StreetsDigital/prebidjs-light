#!/bin/bash

API_URL="http://localhost:3001"
TOKEN=""

echo "🔐 Getting authentication token..."

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@thenexusengine.io","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✓ Got auth token: ${TOKEN:0:20}..."
echo ""

# Get publisher ID from token
PUBLISHER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"publisherId":"[^"]*"' | cut -d'"' -f4)
echo "ℹ  Publisher ID: $PUBLISHER_ID"
echo ""

echo "🌐 TEST: Website Management"
echo "----------------------------"

# List websites
echo -n "List websites... "
WEBSITES=$(curl -s "$API_URL/api/publishers/$PUBLISHER_ID/websites" \
  -H "Authorization: Bearer $TOKEN")
if echo "$WEBSITES" | grep -q "websites"; then
  echo "✓"
  echo "$WEBSITES" | head -20
else
  echo "❌"
  echo "$WEBSITES"
fi

echo ""
echo "⚙️  TEST: Create Website-Level Config"
echo "---------------------------------------"

# First create a website
echo -n "Creating test website... "
WEBSITE=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/websites" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Bug Hunt Test Site\",
    \"domain\": \"bugtest-$(date +%s).com\",
    \"status\": \"active\"
  }")

WEBSITE_ID=$(echo "$WEBSITE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$WEBSITE_ID" ]; then
  echo "✓ (ID: ${WEBSITE_ID:0:12}...)"
else
  echo "❌"
  echo "$WEBSITE"
  exit 1
fi

# Create website-level config
echo -n "Creating website-level config... "
CONFIG=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Website Config\",
    \"description\": \"Website-specific configuration\",
    \"status\": \"active\",
    \"websiteId\": \"$WEBSITE_ID\",
    \"bidderTimeout\": 2000,
    \"priceGranularity\": \"high\"
  }")

CONFIG_ID=$(echo "$CONFIG" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$CONFIG_ID" ]; then
  echo "✓ (ID: ${CONFIG_ID:0:12}...)"
else
  echo "❌"
  echo "$CONFIG"
fi

echo ""
echo "🚫 TEST: Blocking Configuration"
echo "--------------------------------"

# Create blocking config
echo -n "Creating blocking config... "
BLOCKING=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Block China Traffic\",
    \"description\": \"Prevent wrapper loading from CN\",
    \"status\": \"active\",
    \"websiteId\": \"$WEBSITE_ID\",
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

BLOCKING_ID=$(echo "$BLOCKING" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$BLOCKING_ID" ]; then
  echo "✓ (ID: ${BLOCKING_ID:0:12}...)"
  
  # Verify in database
  cd apps/api
  BLOCK_FLAG=$(sqlite3 data/pbjs_engine.db "SELECT block_wrapper FROM wrapper_configs WHERE id='$BLOCKING_ID'")
  if [ "$BLOCK_FLAG" == "1" ]; then
    echo "  ✓ blockWrapper flag set correctly in database"
  else
    echo "  ❌ blockWrapper flag incorrect: $BLOCK_FLAG"
  fi
  cd ../..
else
  echo "❌"
  echo "$BLOCKING"
fi

echo ""
echo "📋 TEST: List Configs with Grouping"
echo "------------------------------------"

CONFIG_LIST=$(curl -s "$API_URL/api/publishers/$PUBLISHER_ID/configs" \
  -H "Authorization: Bearer $TOKEN")

echo "Configs for website $WEBSITE_ID:"
echo "$CONFIG_LIST" | grep -A 5 "$WEBSITE_ID" || echo "No configs found"

echo ""
echo "🧹 Cleanup"
echo "----------"

if [ -n "$CONFIG_ID" ]; then
  curl -s -X DELETE "$API_URL/api/publishers/$PUBLISHER_ID/configs/$CONFIG_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "✓ Deleted test config"
fi

if [ -n "$BLOCKING_ID" ]; then
  curl -s -X DELETE "$API_URL/api/publishers/$PUBLISHER_ID/configs/$BLOCKING_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "✓ Deleted blocking config"
fi

if [ -n "$WEBSITE_ID" ]; then
  curl -s -X DELETE "$API_URL/api/publishers/$PUBLISHER_ID/websites/$WEBSITE_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "✓ Deleted test website"
fi

echo ""
echo "🎉 Bug hunting complete!"
