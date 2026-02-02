# Currency Conversion

pbjs_engine includes built-in support for Prebid.js currency conversion using the official Prebid currency file.

## Overview

The currency conversion system:
- ✅ Automatically fetches latest exchange rates from Prebid CDN
- ✅ Caches rates for 1 hour to reduce API calls
- ✅ Supports 32+ currencies (USD, EUR, GBP, JPY, CNY, INR, etc.)
- ✅ Configures Prebid.js currency module automatically
- ✅ Per-publisher currency preferences

## How It Works

1. **Publisher sets preferred currency** (e.g., EUR)
2. **Wrapper fetches currency config** from `/api/currency/config/:publisherId`
3. **Prebid.js converts all bids** to the publisher's currency
4. **Bidders can bid in any supported currency** - automatic conversion

## API Endpoints

### Get Latest Currency Rates
```http
GET /api/currency/rates
```

**Response:**
```json
{
  "generatedAt": "2026-02-02T03:00:00Z",
  "dataAsOf": "2026-02-02T00:00:00Z",
  "conversions": {
    "USD": {
      "EUR": 0.839,
      "GBP": 0.721,
      "JPY": 110.25
    },
    "EUR": {
      "USD": 1.192,
      "GBP": 0.859
    }
  }
}
```

### Get Supported Currencies
```http
GET /api/currency/supported
```

**Response:**
```json
{
  "currencies": ["USD", "EUR", "GBP", "JPY", "CNY", "INR", "BRL", "AUD", ...]
}
```

### Get Publisher Currency Config
```http
GET /api/currency/config/:publisherId
```

**Response:**
```json
{
  "adServerCurrency": "EUR",
  "granularityMultiplier": 1,
  "conversionRateFile": {
    "url": "https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json",
    "defaultRates": { /* conversion rates */ }
  }
}
```

### Update Publisher Currency
```http
PUT /api/currency/:publisherId
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "currency": "EUR"
}
```

**Response:**
```json
{
  "id": "pub-uuid",
  "currency": "EUR",
  "message": "Currency updated to EUR"
}
```

### Get Conversion Rate
```http
GET /api/currency/convert?from=USD&to=EUR
```

**Response:**
```json
{
  "from": "USD",
  "to": "EUR",
  "rate": 0.839
}
```

## Usage in Prebid Wrapper

The wrapper automatically configures currency conversion:

```javascript
// Wrapper automatically calls:
fetch('/api/currency/config/' + publisherId)
  .then(config => {
    pbjs.setConfig({
      currency: config
    });
  });
```

## Setting Publisher Currency

### Via Admin UI

1. Navigate to Publishers → Publisher Detail
2. In the Settings section, select currency
3. Click "Save"

### Via API

```bash
curl -X PUT http://localhost:3001/api/currency/:publisherId \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency": "EUR"}'
```

### Via Database

```sql
UPDATE publishers
SET currency = 'EUR', updated_at = datetime('now')
WHERE slug = 'your-publisher-slug';
```

## Supported Currencies

The system supports 32+ currencies including:

**Major Currencies:**
- USD - US Dollar
- EUR - Euro
- GBP - British Pound
- JPY - Japanese Yen
- CHF - Swiss Franc
- CAD - Canadian Dollar
- AUD - Australian Dollar
- NZD - New Zealand Dollar

**Emerging Markets:**
- CNY - Chinese Yuan
- INR - Indian Rupee
- BRL - Brazilian Real
- MXN - Mexican Peso
- ZAR - South African Rand
- SGD - Singapore Dollar
- HKD - Hong Kong Dollar
- KRW - South Korean Won

**European:**
- SEK - Swedish Krona
- NOK - Norwegian Krone
- DKK - Danish Krone
- PLN - Polish Złoty
- CZK - Czech Koruna
- HUF - Hungarian Forint
- RON - Romanian Leu
- BGN - Bulgarian Lev

**And more:** TRY, ILS, ARS, CLP, COP, PEN, PHP, THB, IDR, MYR, AED, SAR...

## Example: Multi-Currency Setup

### Scenario
Publisher in Europe (EUR) with global bidders:
- Rubicon bids in USD
- PubMatic bids in USD
- European SSP bids in EUR
- Asian SSP bids in JPY

### Configuration

1. **Set publisher currency:**
```bash
curl -X PUT /api/currency/ef633902-b870-4031-aee8-a3e1f0779af7 \
  -d '{"currency": "EUR"}'
```

2. **Wrapper automatically converts all bids to EUR**

3. **Publisher sees unified pricing in EUR**

## Technical Details

### Caching
- Currency rates cached for 1 hour
- Automatic refresh on cache expiration
- Falls back to cached data if CDN unavailable

### Currency File Source
- Official Prebid currency file: https://github.com/prebid/currency-file
- Updated multiple times daily
- Served via CDN: https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json

### Prebid.js Integration
Uses the official Prebid.js [Currency Module](https://docs.prebid.org/dev-docs/modules/currency.html):
- Converts all bid responses to publisher currency
- Applies conversion before price granularity
- Supports granularityMultiplier for fine-tuning

## Testing Currency Conversion

```bash
# 1. Check current rates
curl http://localhost:3001/api/currency/rates

# 2. Test conversion
curl "http://localhost:3001/api/currency/convert?from=USD&to=EUR"

# 3. Get publisher config
curl http://localhost:3001/api/currency/config/:publisherId

# 4. Update publisher currency
curl -X PUT http://localhost:3001/api/currency/:publisherId \
  -H "Authorization: Bearer TOKEN" \
  -d '{"currency": "GBP"}'

# 5. Verify in wrapper config
curl http://localhost:3001/c/:publisherId | jq .currency
```

## Troubleshooting

### Currency rates not updating
- Check CDN connectivity to cdn.jsdelivr.net
- Verify cache is not stale: `CurrencyService.clearCache()`
- Check API logs for fetch errors

### Unsupported currency error
- Verify currency code is 3 letters (ISO 4217)
- Check `/api/currency/supported` for valid codes
- Currency must exist in Prebid currency file

### Bids not converting
- Ensure Prebid.js currency module is loaded in build
- Check browser console for currency configuration
- Verify bidders are sending currency in bid response

## Future Enhancements

Potential improvements:
- [ ] Currency override at ad unit level
- [ ] Historical currency rate tracking
- [ ] Custom exchange rates (for testing)
- [ ] Currency conversion analytics
- [ ] Multiple currency display in reports

## Related Documentation

- [Prebid Currency Module](https://docs.prebid.org/dev-docs/modules/currency.html)
- [Prebid Currency File](https://github.com/prebid/currency-file)
- [ISO 4217 Currency Codes](https://en.wikipedia.org/wiki/ISO_4217)
