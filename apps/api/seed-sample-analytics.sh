#!/bin/bash

# Seed Sample Analytics Data for Dashboard Testing
# This creates realistic-looking metrics for the analytics dashboard

PUBLISHER_ID="5913a20f-c5aa-4251-99f1-8b69973d431b"
BASE_URL="http://localhost:3001"

echo "🌱 Seeding sample analytics data..."
echo ""

# Get current date
TODAY=$(date +%Y-%m-%d)

# Calculate dates for the past 30 days
generate_past_dates() {
  for i in {0..29}; do
    date -v-${i}d +%Y-%m-%d 2>/dev/null || date -d "-${i} days" +%Y-%m-%d 2>/dev/null
  done
}

# Sample bidders with varying performance
BIDDERS=("rubicon" "appnexus" "ix" "pubmatic" "openx" "criteo" "sovrn" "33across")

# Function to generate random number in range
random_range() {
  local min=$1
  local max=$2
  echo $(( RANDOM % (max - min + 1) + min ))
}

# Function to generate random float
random_float() {
  local min=$1
  local max=$2
  echo "scale=2; $min + ($max - $min) * $RANDOM / 32767" | bc
}

# Ingest sample metrics for the past 30 days
DATES=$(generate_past_dates)

COUNT=0
for DATE in $DATES; do
  for BIDDER in "${BIDDERS[@]}"; do
    # Generate realistic metrics with some variation
    IMPRESSIONS=$(random_range 1000 5000)
    BIDS=$(random_range 800 4500)
    WINS=$(random_range 200 $(( BIDS / 2 )))
    REVENUE=$(random_range 50 500)
    AVG_CPM=$(echo "scale=2; $REVENUE / ($IMPRESSIONS / 1000)" | bc)
    AVG_LATENCY=$(random_range 80 300)

    # Calculate rates
    FILL_RATE=$(echo "scale=4; $BIDS / $IMPRESSIONS" | bc)
    WIN_RATE=$(echo "scale=4; $WINS / $BIDS" | bc)

    # Ingest data
    curl -s -X POST "$BASE_URL/api/publishers/$PUBLISHER_ID/analytics/ingest" \
      -H "Content-Type: application/json" \
      -d "{
        \"bidderCode\": \"$BIDDER\",
        \"date\": \"$DATE\",
        \"impressions\": $IMPRESSIONS,
        \"bids\": $BIDS,
        \"wins\": $WINS,
        \"revenue\": $REVENUE,
        \"avgCpm\": $AVG_CPM,
        \"avgLatency\": $AVG_LATENCY,
        \"fillRate\": $FILL_RATE,
        \"winRate\": $WIN_RATE,
        \"countryCode\": \"US\"
      }" > /dev/null 2>&1

    ((COUNT++))
  done
done

echo "✅ Seeded $COUNT metric records"
echo "📊 Data spans 30 days for ${#BIDDERS[@]} bidders"
echo ""
echo "You can now view the analytics dashboard with real data!"
echo "🌐 Frontend: http://localhost:5173/publisher/analytics-dashboard"
