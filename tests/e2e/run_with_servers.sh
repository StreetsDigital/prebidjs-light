#!/bin/bash
# Run tests with automatic server management

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Run with server helper
python ~/.claude/plugins/cache/anthropic-agent-skills/example-skills/c74d647e56e6/webapp-testing/scripts/with_server.py \
  --server "cd ../../apps/api && JWT_SECRET=dev-jwt-secret-for-testing COOKIE_SECRET=dev-cookie-secret-for-testing npm run dev" --port 3001 \
  --server "cd ../../apps/admin && npm run dev" --port 5173 \
  -- python run_all_tests.py

deactivate
