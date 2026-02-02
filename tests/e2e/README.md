# E2E Testing with Playwright

End-to-end tests for pbjs_engine admin UI using Playwright.

## Prerequisites

```bash
# Install Playwright
pip install playwright

# Install browsers
playwright install chromium
```

## Running Tests

### Run All Tests
```bash
cd tests/e2e
python3 run_all_tests.py
```

### Run Individual Tests
```bash
# Login test
python3 test_admin_login.py

# Publisher CRUD
python3 test_publisher_crud.py

# Bidder configuration
python3 test_bidder_configuration.py

# Ad unit creation
python3 test_ad_unit_creation.py
```

### With Server Helper (Automatic Server Management)
```bash
# From project root
python ~/.claude/plugins/cache/anthropic-agent-skills/example-skills/c74d647e56e6/webapp-testing/scripts/with_server.py \
  --server "cd apps/api && npm run dev" --port 3001 \
  --server "cd apps/admin && npm run dev" --port 5173 \
  -- python tests/e2e/run_all_tests.py
```

## Test Coverage

### 1. Authentication (`test_admin_login.py`)
- ✅ Login form renders
- ✅ Credentials accepted
- ✅ Redirect to dashboard
- ✅ User session persists

### 2. Publisher Management (`test_publisher_crud.py`)
- ✅ Create new publisher
- ✅ View publisher list
- ✅ Edit publisher details
- ✅ Delete publisher
- ✅ View publisher detail page

### 3. Bidder Configuration (`test_bidder_configuration.py`)
- ✅ Open bidder marketplace
- ✅ Search for bidders
- ✅ Add bidder to publisher
- ✅ Configure bidder parameters
- ✅ Save configuration

### 4. Ad Unit Creation (`test_ad_unit_creation.py`)
- ✅ Create display ad unit (banner)
- ✅ Create video ad unit (instream/outstream)
- ✅ Create native ad unit
- ✅ Verify multiple ad units

## Screenshots

All tests generate screenshots saved to `/tmp/`:
- `/tmp/01_login_page.png`
- `/tmp/02_credentials_filled.png`
- `/tmp/03_dashboard.png`
- `/tmp/publishers_list.png`
- `/tmp/bidder_marketplace.png`
- `/tmp/ad_units_list.png`
- `/tmp/error_*.png` (on failures)

## Debugging Failed Tests

1. **Check screenshots**: Failed tests save error screenshots
2. **Run in headed mode**: Edit test file, set `headless=False`
3. **Add pauses**: Use `page.pause()` to inspect during execution
4. **Check console logs**: Add console listener in test
5. **Verify selectors**: Use Playwright Inspector

```python
# Debug mode
browser = p.chromium.launch(headless=False, slow_mo=1000)

# Pause execution
page.pause()

# Capture console logs
page.on("console", lambda msg: print(f"Console: {msg.text}"))
```

## Common Issues

### Port Already in Use
```bash
# Kill existing servers
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Timeout Errors
- Increase timeout: `page.wait_for_selector('selector', timeout=10000)`
- Check if servers are running
- Verify network connectivity

### Element Not Found
- Update selectors if UI changed
- Add wait: `page.wait_for_load_state('networkidle')`
- Check if element is in viewport

### Authentication Failures
- Verify credentials in test match seeded admin
- Check .env file has correct values
- Ensure database is seeded

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          npm install
          pip install playwright
          playwright install chromium

      - name: Start servers
        run: |
          cd apps/api && npm run dev &
          cd apps/admin && npm run dev &
          sleep 10

      - name: Run E2E tests
        run: python tests/e2e/run_all_tests.py

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: /tmp/error_*.png
```

## Adding New Tests

1. Create new test file: `test_your_feature.py`
2. Use helper functions: `login(page)` for authentication
3. Follow pattern: Setup → Action → Verify → Screenshot
4. Add to `TESTS` list in `run_all_tests.py`

### Test Template
```python
#!/usr/bin/env python3
from playwright.sync_api import sync_playwright, expect
import sys

def login(page):
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    page.fill('input[type="email"]', 'admin@thenexusengine.com')
    page.fill('input[type="password"]', 'ChangeMe123!')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard', timeout=5000)

def test_your_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            login(page)
            # Your test logic here
            browser.close()
            return True
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path='/tmp/error_your_feature.png')
            browser.close()
            return False

if __name__ == "__main__":
    sys.exit(0 if test_your_feature() else 1)
```

## Resources

- [Playwright Documentation](https://playwright.dev/python/)
- [Playwright Selectors](https://playwright.dev/python/docs/selectors)
- [Best Practices](https://playwright.dev/python/docs/best-practices)
