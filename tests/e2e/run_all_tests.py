#!/usr/bin/env python3
"""
Run All E2E Tests
Executes all Playwright E2E tests and generates a report
"""

import subprocess
import sys
from pathlib import Path

# Test files in order of execution
TESTS = [
    'test_admin_login.py',
    'test_publisher_crud.py',
    'test_bidder_configuration.py',
    'test_ad_unit_creation.py',
]

def run_test(test_file):
    """Run a single test file and return result"""
    print(f"\n{'='*60}")
    print(f"Running: {test_file}")
    print('='*60)

    result = subprocess.run(
        ['python3', test_file],
        cwd=Path(__file__).parent,
        capture_output=False
    )

    return result.returncode == 0

def main():
    """Run all tests and report results"""
    print("🚀 Starting E2E Test Suite")
    print("="*60)
    print(f"Total tests: {len(TESTS)}")
    print("="*60)

    results = {}

    for test in TESTS:
        success = run_test(test)
        results[test] = success

        if not success:
            print(f"\n⚠️  Test {test} failed. Continuing with remaining tests...")

    # Print summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    failed = len(results) - passed

    for test, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {test}")

    print("="*60)
    print(f"Total: {len(results)} | Passed: {passed} | Failed: {failed}")
    print("="*60)

    if failed > 0:
        print("\n⚠️  Some tests failed. Check screenshots in /tmp/")
        print("Screenshots: /tmp/error_*.png")
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()
