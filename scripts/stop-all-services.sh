#!/bin/bash

# Park Golf Platform - 서비스 종료 스크립트

echo "🛑 Stopping Park Golf Platform services..."

# 색상 설정
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리 (scripts에서 1단계 위로)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# PID 파일 디렉토리
PID_DIR="$PROJECT_ROOT/.pids"

# 서비스 정의 (배열로 변경)
# 핵심 서비스만 포함
SERVICES="iam-service:3011 club-service:3012 booking-service:3013 admin-api:3091 admin-dashboard:3000 user-webapp:3002"

# 서비스 종료 함수
stop_service() {
    local service=$1
    local port=$2
    local pid_file="$PID_DIR/$service.pid"
    
    echo -e "${YELLOW}Stopping $service...${NC}"
    
    # PID 파일에서 프로세스 ID 읽기
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            sleep 2
            
            # 프로세스가 여전히 실행 중이면 강제 종료
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${YELLOW}Force stopping $service...${NC}"
                kill -9 $pid
            fi
            
            echo -e "${GREEN}✓ $service stopped${NC}"
        else
            echo -e "${YELLOW}$service was not running (PID: $pid)${NC}"
        fi
        rm -f "$pid_file"
    else
        # PID 파일이 없으면 포트로 찾아서 종료
        local pids=$(lsof -ti :$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            echo -e "${YELLOW}Found $service process(es) on port $port: $pids${NC}"
            # 각 PID에 대해 종료 시도
            for pid in $pids; do
                kill $pid 2>/dev/null
            done
            sleep 2
            
            # 여전히 실행 중인 프로세스 강제 종료
            local remaining_pids=$(lsof -ti :$port 2>/dev/null)
            if [ ! -z "$remaining_pids" ]; then
                echo -e "${YELLOW}Force stopping remaining processes...${NC}"
                for pid in $remaining_pids; do
                    kill -9 $pid 2>/dev/null
                done
            fi
            echo -e "${GREEN}✓ $service stopped (found on port $port)${NC}"
        else
            echo -e "${YELLOW}$service was not running${NC}"
        fi
    fi
}

# 모든 서비스 종료
echo "Stopping all services..."
echo "======================"

for service_info in $SERVICES; do
    IFS=':' read -r service port <<< "$service_info"
    stop_service "$service" "$port"
done

# 서비스 상태 확인
echo ""
echo "======================"
echo -e "${GREEN}Service Status:${NC}"
echo "======================"

all_stopped=true
for service_info in $SERVICES; do
    IFS=':' read -r service port <<< "$service_info"
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${RED}✗ $service (port $port): Still running${NC}"
        all_stopped=false
    else
        echo -e "${GREEN}✓ $service (port $port): Stopped${NC}"
    fi
done

if [ "$all_stopped" = true ]; then
    echo ""
    echo -e "${GREEN}All services stopped successfully!${NC}"
else
    echo ""
    echo -e "${RED}Some services are still running. You may need to manually stop them.${NC}"
fi