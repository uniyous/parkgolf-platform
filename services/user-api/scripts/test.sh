#!/bin/bash

echo "🧪 Running tests for parkgolf-user-api..."

# 단위 테스트
echo "Running unit tests..."
npm run test

# E2E 테스트
echo "Running e2e tests..."
npm run test:e2e

# 커버리지 리포트
echo "Generating coverage report..."
npm run test:cov

echo "✅ All tests completed for parkgolf-user-api"
