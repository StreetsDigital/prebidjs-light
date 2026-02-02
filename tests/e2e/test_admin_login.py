#!/usr/bin/env python3
"""
E2E Test: Admin Login Flow
Tests the complete authentication workflow
"""

from playwright.sync_api import sync_playwright, expect
import sys

def test_admin_login():
    """Test admin login and dashboard access"""

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("📋 Test: Admin Login Flow")
        print("=" * 50)

        try:
            # 1. Navigate to login page
            print("✓ Step 1: Navigate to login page")
            page.goto('http://localhost:5173/login')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/01_login_page.png')

            # 2. Verify login form exists
            print("✓ Step 2: Verify login form elements")
            expect(page.locator('input[type="email"]')).to_be_visible()
            expect(page.locator('input[type="password"]')).to_be_visible()
            expect(page.locator('button[type="submit"]')).to_be_visible()

            # 3. Fill in credentials
            print("✓ Step 3: Fill in login credentials")
            page.fill('input[type="email"]', 'admin@thenexusengine.com')
            page.fill('input[type="password"]', 'ChangeMe123!')
            page.screenshot(path='/tmp/02_credentials_filled.png')

            # 4. Submit login form
            print("✓ Step 4: Submit login form")
            page.click('button[type="submit"]')

            # 5. Wait for redirect to dashboard
            print("✓ Step 5: Wait for dashboard redirect")
            page.wait_for_url('**/dashboard', timeout=5000)
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/03_dashboard.png')

            # 6. Verify dashboard elements
            print("✓ Step 6: Verify dashboard loaded")
            expect(page.locator('a[href="/admin/publishers"]')).to_be_visible()

            # 7. Check for user menu/profile
            print("✓ Step 7: Verify user is logged in")
            # Look for any indicator of logged-in state (adjust selector as needed)
            expect(page.get_by_role("button", name="User menu")).to_be_visible()

            print("\n✅ All login tests passed!")
            browser.close()
            return True

        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            page.screenshot(path='/tmp/error_login.png')
            print("Screenshot saved to /tmp/error_login.png")
            browser.close()
            return False

if __name__ == "__main__":
    success = test_admin_login()
    sys.exit(0 if success else 1)
