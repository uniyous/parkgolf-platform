#!/bin/bash

# Park Golf Platform - 서비스 통합 실행 스크립트
# 이 스크립트는 필수 서비스들을 한번에 실행합니다.

echo "🚀 Park Golf Platform 서비스 시작..."

# 색상 설정
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리 (claude-workspace/management/scripts에서 3단계 위로)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# 로그 디렉토리 생성
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# PID 파일 디렉토리
PID_DIR="$PROJECT_ROOT/.pids"
mkdir -p "$PID_DIR"

# 서비스 정의 (배열로 변경)
SERVICES="auth-service:3011 course-service:3012 booking-service:3013 admin-api:3091 user-api:3092 admin-dashboard:3000 user-webapp:3001"

# 서비스 시작 함수
start_service() {
    local service=$1
    local port=$2
    local service_dir="$PROJECT_ROOT/services/$service"
    
    echo -e "${YELLOW}Starting $service on port $port...${NC}"
    
    # 디렉토리 확인
    if [ ! -d "$service_dir" ]; then
        echo -e "${RED}Error: Directory $service_dir not found${NC}"
        return 1
    fi
    
    # 이미 실행 중인지 확인
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Port $port is already in use. Skipping $service.${NC}"
        return 0
    fi
    
    # 서비스 시작
    cd "$service_dir"
    
    # package.json 확인
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: package.json not found in $service_dir${NC}"
        return 1
    fi
    
    # 의존성 설치 확인
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies for $service...${NC}"
        npm install
    fi
    
    # 서비스 시작 (백그라운드)
    if [[ "$service" == *"dashboard"* ]] || [[ "$service" == *"webapp"* ]]; then
        # Frontend 서비스
        nohup npm run dev > "$LOG_DIR/$service.log" 2>&1 &
    else
        # Backend 서비스
        nohup npm run start:dev > "$LOG_DIR/$service.log" 2>&1 &
    fi
    
    local pid=$!
    echo $pid > "$PID_DIR/$service.pid"
    
    # 서비스 시작 대기
    sleep 3
    
    # 프로세스 확인
    if ps -p $pid > /dev/null; then
        echo -e "${GREEN}✓ $service started successfully (PID: $pid)${NC}"
    else
        echo -e "${RED}✗ Failed to start $service${NC}"
        return 1
    fi
}

# 모든 서비스 시작
echo "Starting all services..."
echo "======================"

for service_info in $SERVICES; do
    IFS=':' read -r service port <<< "$service_info"
    start_service "$service" "$port"
    echo ""
done

# 서비스 상태 확인
echo "======================"
echo -e "${GREEN}Service Status:${NC}"
echo "======================"

for service_info in $SERVICES; do
    IFS=':' read -r service port <<< "$service_info"
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $service (port $port): Running${NC}"
    else
        echo -e "${RED}✗ $service (port $port): Not running${NC}"
    fi
done

echo ""
echo -e "${GREEN}Services started! Check logs in: $LOG_DIR${NC}"
echo ""
echo "Service URLs:"
echo "============="
echo "Admin Dashboard: http://localhost:3000"
echo "User WebApp:     http://localhost:3001"
echo "Admin API (BFF): http://localhost:3091"
echo "User API (BFF):  http://localhost:3092"
echo "Auth Service:    http://localhost:3011"
echo "Course Service:  http://localhost:3012"
echo "Booking Service: http://localhost:3013"
echo ""
echo "To stop all services, run: ./stop-services.sh"