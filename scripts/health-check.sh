#!/bin/bash

# Park Golf Platform - 서비스 상태 체크 스크립트

echo "🔍 Park Golf Platform 서비스 상태 체크..."

# 색상 설정
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 서비스 정의
# 핵심 서비스만 포함
SERVICES="auth-service:3011 course-service:3012 booking-service:3013 admin-api:3091 admin-dashboard:3000 user-webapp:3002"

# 인프라 서비스 정의
INFRA_SERVICES="postgresql:5432 redis:6379 nats:4222 elasticsearch:9200"

echo "======================"
echo -e "${GREEN}Infrastructure Status:${NC}"
echo "======================"

for service_info in $INFRA_SERVICES; do
    IFS=':' read -r service port <<< "$service_info"
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓ $service (port $port): Running${NC}"
    else
        echo -e "${RED}✗ $service (port $port): Not running${NC}"
    fi
done

echo ""
echo "======================"
echo -e "${GREEN}Application Services:${NC}"
echo "======================"

all_running=true
for service_info in $SERVICES; do
    IFS=':' read -r service port <<< "$service_info"
    if lsof -i :$port > /dev/null 2>&1; then
        # 프로세스 정보 가져오기
        process_info=$(lsof -i :$port | tail -n 1 | awk '{print $2}')
        echo -e "${GREEN}✓ $service (port $port): Running (PID: $process_info)${NC}"
    else
        echo -e "${RED}✗ $service (port $port): Not running${NC}"
        all_running=false
    fi
done

echo ""
echo "======================"
if [ "$all_running" = true ]; then
    echo -e "${GREEN}All application services are running! 🚀${NC}"
else
    echo -e "${RED}Some services are not running. Use ./start-services.sh to start them.${NC}"
fi

echo ""
echo "Service URLs:"
echo "============="
echo "Admin Dashboard: http://localhost:3000"
echo "User WebApp:     http://localhost:3001"
echo "Admin API:       http://localhost:3091/api"
echo "User API:        http://localhost:3092/api"
echo ""
echo "Health Endpoints:"
echo "================"
for service_info in "admin-api:3091 user-api:3092 auth-service:3011 course-service:3012 booking-service:3013"; do
    IFS=':' read -r service port <<< "$service_info"
    echo "- http://localhost:$port/health"
done