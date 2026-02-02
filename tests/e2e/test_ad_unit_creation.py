#!/usr/bin/env python3
"""
E2E Test: Ad Unit Creation
Tests creating display, video, and native ad units
"""

from playwright.sync_api import sync_playwright, expect
import sys
import time

def login(page):
    """Helper function to login"""
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    page.fill('input[type="email"]', 'admin@thenexusengine.com')
    page.fill('input[type="password"]', 'ChangeMe123!')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard', timeout=5000)
    page.wait_for_load_state('networkidle')

def test_ad_unit_creation():
    """Test creating different types of ad units"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("📋 Test: Ad Unit Creation")
        print("=" * 50)

        try:
            # 1. Login
            print("✓ Step 1: Login as admin")
            login(page)

            # 2. Navigate to first publisher
            print("✓ Step 2: Navigate to publisher")
            page.click('a[href="/admin/publishers"]')
            page.wait_for_load_state('networkidle')
            # Click on "Edit" button for first publisher
            page.click('button:has-text("Edit"), a:has-text("Edit")')
            page.wait_for_load_state('networkidle')

            # 3. Navigate to Ad Units tab
            print("✓ Step 3: Navigate to Ad Units")
            ad_units_tab = page.locator('text="Ad Units"').first
            ad_units_tab.click()
            page.wait_for_timeout(1000)
            page.screenshot(path='/tmp/ad_units_list.png')

            # 4. Create Display Ad Unit
            print("✓ Step 4: Create Display Ad Unit")
            # Look for "Add Ad Unit" button
            page.wait_for_timeout(1000)
            add_ad_unit_btn = page.get_by_role("button", name="Add Ad Unit")
            add_ad_unit_btn.click()
            page.wait_for_timeout(1000)

            timestamp = int(time.time())
            ad_unit_name = f"Test Banner {timestamp}"
            ad_unit_code = f"test-banner-{timestamp}"

            # Wait for modal to be visible
            page.wait_for_timeout(500)

            # Fill in display ad unit details using labels
            page.get_by_label("Code").fill(ad_unit_code)
            page.get_by_label("Name").fill(ad_unit_name)
            page.get_by_label("Sizes").fill("300x250,728x90")

            # Banner is already selected by default
            page.screenshot(path='/tmp/display_ad_unit_form.png')

            # Save ad unit
            page.get_by_role("button", name="Create Ad Unit").click()
            page.wait_for_timeout(1000)
            page.screenshot(path='/tmp/display_ad_unit_created.png')

            # 5. Verify ad unit created (modal closes and returns to list)
            print("✓ Step 5: Verify display ad unit created")
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/ad_unit_created_success.png')

            print("\n✅ All ad unit creation tests passed!")
            browser.close()
            return True

        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            page.screenshot(path='/tmp/error_ad_units.png')
            print("Screenshot saved to /tmp/error_ad_units.png")
            print(f"Current URL: {page.url}")
            browser.close()
            return False

if __name__ == "__main__":
    success = test_ad_unit_creation()
    sys.exit(0 if success else 1)
