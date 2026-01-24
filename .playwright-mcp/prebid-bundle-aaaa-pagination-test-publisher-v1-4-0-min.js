// Prebid.js Bundle for Publisher: 64488716-77c4-448d-a7d8-072c83877837
// Version: 1.4.0
// Generated: 2026-01-24T07:52:10.761Z
// Modules: 12
// Bidders: 1

var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

// Publisher Config
pbjs.setConfig({
  priceGranularity: "medium",
  enableSendAllBids: true,
  bidderTimeout: 1500,
  publisherId: "64488716-77c4-448d-a7d8-072c83877837"
});

// Ad Units
pbjs.addAdUnits([
  {
    "code": "responsive-banner",
    "mediaTypes": {
      "banner": {
        "sizes": [
          [
            300,
            250
          ],
          [
            728,
            90
          ],
          [
            970,
            250
          ]
        ]
      }
    }
  }
]);

// Bidder Adapters
// AppNexus adapter loaded

// GPT Integration
pbjs.que.push(function() {
  pbjs.requestBids({
    bidsBackHandler: function() {
      pbjs.setTargetingForGPTAsync();
    }
  });
});

console.log("[pbjs_engine] Prebid.js bundle loaded for aaaa-pagination-test-publisher");
