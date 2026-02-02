#!/bin/bash
# Easy test runner - handles virtual environment automatically

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Run all tests
python3 run_all_tests.py

# Deactivate when done
deactivate
