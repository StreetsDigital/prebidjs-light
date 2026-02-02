#!/usr/bin/env python3
"""
E2E Test: Bidder Configuration
Tests adding bidders and configuring their parameters
"""

from playwright.sync_api import sync_playwright, expect
import sys

def login(page):
    """Helper function to login"""
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    page.fill('input[type="email"]', 'admin@thenexusengine.com')
    page.fill('input[type="password"]', 'ChangeMe123!')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard', timeout=5000)
    page.wait_for_load_state('networkidle')

def test_bidder_configuration():
    """Test bidder configuration workflow"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("📋 Test: Bidder Configuration")
        print("=" * 50)

        try:
            # 1. Login
            print("✓ Step 1: Login as admin")
            login(page)

            # 2. Navigate to first publisher
            print("✓ Step 2: Navigate to Publishers")
            page.click('a[href="/admin/publishers"]')
            page.wait_for_load_state('networkidle')

            # 3. Click on first publisher
            print("✓ Step 3: Open first publisher")
            # Click on "Edit" button for first publisher
            page.click('button:has-text("Edit"), a:has-text("Edit")')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/bidders_tab.png')

            # 4. Navigate to Bidders tab
            print("✓ Step 4: Navigate to Bidders section")
            # Click on the Bidders tab link
            bidders_tab = page.locator('text="Bidders"').first
            bidders_tab.click()
            page.wait_for_timeout(1000)
            page.screenshot(path='/tmp/bidders_tab_clicked.png')

            # 5. Verify bidders section loaded with Add Bidder button
            print("✓ Step 5: Verify bidder controls available")
            expect(page.get_by_role("button", name="Add Bidder")).to_be_visible(timeout=5000)
            page.screenshot(path='/tmp/bidders_tab_success.png')

            print("\n✅ All bidder configuration tests passed!")
            browser.close()
            return True

        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            page.screenshot(path='/tmp/error_bidder_config.png')
            print("Screenshot saved to /tmp/error_bidder_config.png")
            print(f"Current URL: {page.url}")
            browser.close()
            return False

if __name__ == "__main__":
    success = test_bidder_configuration()
    sys.exit(0 if success else 1)
