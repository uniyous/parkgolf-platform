#!/bin/bash

echo "🚀 Starting parkgolf-course-service in development mode..."

# 환경 변수 설정
export NODE_ENV=development
export PORT=3012

# 의존성 확인 및 설치
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 데이터베이스 마이그레이션 (Prisma가 있는 경우)
if [ -f "prisma/schema.prisma" ]; then
    echo "🗄️  Running database migrations..."
    npx prisma migrate dev
fi

# 개발 서버 시작
npm run start:dev
