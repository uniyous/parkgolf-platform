#!/bin/bash

echo "🚀 Starting all Park Golf services..."

# 기존 프로세스 종료
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*nest" || true
sleep 2

services=("parkgolf-auth-service" "parkgolf-course-service" "parkgolf-booking-service" "parkgolf-notify-service" "parkgolf-search-service" "parkgolf-admin-api" "parkgolf-user-api")

for service in "${services[@]}"; do
    echo "Starting $service..."
    cd "$service"
    
    if [ -f "scripts/start-dev.sh" ]; then
        ./scripts/start-dev.sh > "../logs/${service}.log" 2>&1 &
    else
        npm run start:dev > "../logs/${service}.log" 2>&1 &
    fi
    
    cd ..
    sleep 3
done

echo "✅ All services started"
echo "🌐 Services are running on the following ports:"
echo "  - Auth Service: http://localhost:3011"
echo "  - Course Service: http://localhost:3012" 
echo "  - Booking Service: http://localhost:3013"
echo "  - Notify Service: http://localhost:3014"
echo "  - Search Service: http://localhost:3015"
echo "  - Admin API: http://localhost:3001"
echo "  - User API: http://localhost:3002"

echo ""
echo "📋 Check logs in ./logs/ directory for service status"

wait
