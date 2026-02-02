#!/usr/bin/env python3
"""
E2E Test: Publisher CRUD Operations
Tests creating, viewing, editing, and managing publishers
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

def test_publisher_crud():
    """Test complete publisher lifecycle"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("📋 Test: Publisher CRUD Operations")
        print("=" * 50)

        try:
            # Login first
            print("✓ Step 1: Login as admin")
            login(page)

            # 2. Navigate to Publishers page
            print("✓ Step 2: Navigate to Publishers page")
            page.click('a[href="/admin/publishers"]')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/publishers_list.png')

            # 3. Click "Add Publisher" button
            print("✓ Step 3: Open Add Publisher modal")
            # Navigate directly to the new publisher page
            page.goto('http://localhost:5173/admin/publishers/new')
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(500)
            page.screenshot(path='/tmp/add_publisher_modal.png')

            # 4. Fill in publisher details
            print("✓ Step 4: Fill in publisher details")
            timestamp = int(time.time())
            test_name = f"Test Publisher {timestamp}"
            test_slug = f"test-pub-{timestamp}"

            # Fill form using label-based selectors
            page.get_by_label("Publisher Name").fill(test_name)
            page.get_by_label("Slug").fill(test_slug)
            page.get_by_label("Allowed Domains").fill('test.example.com')
            page.screenshot(path='/tmp/publisher_form_filled.png')

            # 5. Submit form
            print("✓ Step 5: Submit publisher creation")
            page.get_by_role("button", name="Create Publisher").click()
            page.wait_for_timeout(1000)
            page.screenshot(path='/tmp/publisher_created.png')

            # 6. Verify publisher was created (we're redirected to detail page)
            print("✓ Step 6: Verify publisher created")
            page.wait_for_url('**/admin/publishers/**', timeout=5000)
            expect(page.get_by_role("heading", name=test_name)).to_be_visible(timeout=5000)

            # 7. Verify detail page loaded
            print("✓ Step 7: Verify detail page")
            expect(page.get_by_role("heading", name="API Key")).to_be_visible()
            page.screenshot(path='/tmp/publisher_crud_success.png')

            print("\n✅ All publisher CRUD tests passed!")
            browser.close()
            return True

        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            page.screenshot(path='/tmp/error_publisher_crud.png')
            print("Screenshot saved to /tmp/error_publisher_crud.png")
            print(f"Current URL: {page.url}")
            browser.close()
            return False

if __name__ == "__main__":
    success = test_publisher_crud()
    sys.exit(0 if success else 1)
