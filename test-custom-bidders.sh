#!/bin/bash

# Test script for custom bidders feature
API_BASE="http://localhost:3001/api"

echo "===== Testing Custom Bidders Feature ====="
echo ""

# 1. Test known bidders endpoint
echo "1. Testing GET /api/bidders/known"
curl -s "${API_BASE}/bidders/known" | jq -r '.data | length' 2>/dev/null
echo ""

# 2. Test bidder search
echo "2. Testing GET /api/bidders/search?q=index"
curl -s "${API_BASE}/bidders/search?q=index" | jq -r '.data | .[].name' 2>/dev/null
echo ""

# 3. Get test publisher ID (assuming test publisher exists)
PUBLISHER_ID="test-publisher-id"  # Update this with actual publisher ID

# 4. Test list bidders for publisher
echo "3. Testing GET /api/publishers/${PUBLISHER_ID}/bidders"
curl -s "${API_BASE}/publishers/${PUBLISHER_ID}/bidders" | jq -r '.data | length' 2>/dev/null
echo ""

# 5. Test adding custom bidder
echo "4. Testing POST /api/publishers/${PUBLISHER_ID}/bidders (add Index Exchange)"
curl -s -X POST "${API_BASE}/publishers/${PUBLISHER_ID}/bidders" \
  -H "Content-Type: application/json" \
  -d '{"bidderCode":"ix"}' | jq .
echo ""

# 6. Verify bidder was added
echo "5. Verifying custom bidder was added"
curl -s "${API_BASE}/publishers/${PUBLISHER_ID}/bidders" | jq -r '.data[] | select(.code=="ix") | .name'
echo ""

echo "===== Test Complete ====="
