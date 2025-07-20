#!/bin/bash

# Park Golf Platform - Development Environment Startup Script

set -e

echo "🏌️ Park Golf Platform - Starting Development Environment"
echo "======================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}✗${NC} Port $1 is already in use"
        return 1
    else
        echo -e "${GREEN}✓${NC} Port $1 is available"
        return 0
    fi
}

# Check required ports
echo "Checking required ports..."
PORTS=(3000 3002 3011 3012 3013 3014 3015 3016 3091 3092 4222 5432 6379 9200)
PORT_CHECK_FAILED=false

for port in "${PORTS[@]}"; do
    if ! check_port $port; then
        PORT_CHECK_FAILED=true
    fi
done

if [ "$PORT_CHECK_FAILED" = true ]; then
    echo -e "\n${RED}Some required ports are in use. Please free them before continuing.${NC}"
    exit 1
fi

# Start Docker services
echo -e "\nStarting Docker services..."
if docker-compose up -d; then
    echo -e "${GREEN}✓${NC} Docker services started"
else
    echo -e "${RED}✗${NC} Failed to start Docker services"
    exit 1
fi

# Wait for services to be ready
echo -e "\nWaiting for services to be ready..."
sleep 5

# Check PostgreSQL
echo -n "Checking PostgreSQL... "
until docker exec $(docker-compose ps -q postgres) pg_isready -U parkgolf > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "${GREEN}Ready${NC}"

# Check ElasticSearch
echo -n "Checking ElasticSearch... "
until curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "${GREEN}Ready${NC}"

# Check Redis
echo -n "Checking Redis... "
until docker exec $(docker-compose ps -q redis) redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "${GREEN}Ready${NC}"

# Check NATS
echo -n "Checking NATS... "
until curl -s http://localhost:8222/streaming/serverz > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "${GREEN}Ready${NC}"

# Create tmux session for services
echo -e "\nStarting services in tmux..."

# Kill existing session if exists
tmux kill-session -t parkgolf 2>/dev/null || true

# Create new session
tmux new-session -d -s parkgolf -n 'services'

# Function to start a service in tmux
start_service() {
    local service_name=$1
    local service_dir=$2
    local start_command=$3
    
    echo -e "Starting ${service_name}..."
    tmux new-window -t parkgolf -n "$service_name"
    tmux send-keys -t parkgolf:"$service_name" "cd $service_dir" C-m
    tmux send-keys -t parkgolf:"$service_name" "$start_command" C-m
}

# Start microservices
if [ -d "services/auth-service" ]; then
    start_service "auth" "services/auth-service" "npm run start:dev"
fi

if [ -d "services/course-service" ]; then
    start_service "course" "services/course-service" "npm run start:dev"
fi

if [ -d "services/booking-service" ]; then
    start_service "booking" "services/booking-service" "npm run start:dev"
fi

if [ -d "services/notify-service" ]; then
    start_service "notify" "services/notify-service" "npm run start:dev"
fi

if [ -d "services/search-service" ]; then
    start_service "search" "services/search-service" "go run cmd/main.go"
fi

if [ -d "services/ml-service" ]; then
    start_service "ml" "services/ml-service" "uvicorn app.main:app --reload --port 3016"
fi

# Start BFF services
if [ -d "services/admin-api" ]; then
    start_service "admin-api" "services/admin-api" "npm run start:dev"
fi

if [ -d "services/user-api" ]; then
    start_service "user-api" "services/user-api" "npm run start:dev"
fi

# Start frontend applications
if [ -d "services/admin-dashboard" ]; then
    start_service "admin-ui" "services/admin-dashboard" "npm run dev"
fi

if [ -d "services/user-webapp" ]; then
    start_service "user-ui" "services/user-webapp" "npm start"
fi

# Display service status
echo -e "\n${GREEN}✨ Development environment started!${NC}"
echo -e "\nServices:"
echo "  Admin Dashboard:  http://localhost:3000"
echo "  User Web App:     http://localhost:3002"
echo "  Admin API:        http://localhost:3091/api/docs"
echo "  User API:         http://localhost:3092/api/docs"
echo -e "\nInfrastructure:"
echo "  PostgreSQL:       localhost:5432"
echo "  ElasticSearch:    http://localhost:9200"
echo "  Redis:            localhost:6379"
echo "  NATS:             localhost:4222"
echo -e "\nTmux commands:"
echo "  View services:    tmux attach -t parkgolf"
echo "  Switch windows:   Ctrl+b, n (next) / p (previous)"
echo "  List windows:     Ctrl+b, w"
echo "  Detach:          Ctrl+b, d"
echo -e "\nTo stop all services:"
echo "  ./scripts/development/stop-dev.sh"
EOF

chmod +x .claude-workspace/scripts/development/start-dev.sh