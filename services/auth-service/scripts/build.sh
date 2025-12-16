#!/bin/bash

echo "🔨 Building parkgolf-auth-service..."

# 의존성 설치
npm ci

# 빌드 실행
npm run build

echo "✅ Build completed for parkgolf-auth-service"
