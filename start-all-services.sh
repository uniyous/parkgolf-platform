#!/bin/bash

# Park Golf Platform - Start All Services Script
echo "🚀 Starting Park Golf Platform Services..."

# Function to start a service
start_service() {
    local service_name=$1
    local port=$2
    
    echo "Starting $service_name on port $port..."
    cd "/Users/sungyoo/git/uniyous/parkgolf/services/$service_name"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo "❌ $service_name: package.json not found"
        return 1
    fi
    
    # Start service in background
    if [[ "$service_name" == *"dashboard"* ]] || [[ "$service_name" == *"webapp"* ]]; then
        npm run dev > "$service_name.log" 2>&1 &
    else
        npm run start:dev > "$service_name.log" 2>&1 &
    fi
    local pid=$!
    
    echo "✅ $service_name started (PID: $pid, Port: $port)"
    sleep 1
}

# Start backend services (NestJS)
echo "📦 Starting Backend Services..."
start_service "auth-service" "3011"
start_service "course-service" "3012" 
start_service "booking-service" "3013"
start_service "notify-service" "3014"
start_service "search-service" "3015"

# Start BFF services
echo "🔗 Starting BFF Services..."
start_service "admin-api" "3091"
start_service "user-api" "3001"

# Start frontend services (React)
echo "🌐 Starting Frontend Services..."
start_service "admin-dashboard" "3000"
start_service "user-webapp" "3002"

# Wait for services to initialize
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
services=(
    "auth-service:3011"
    "course-service:3012"
    "booking-service:3013"
    "notify-service:3014"
    "admin-api:3091"
    "user-api:3001"
    "admin-dashboard:3000"
    "user-webapp:3002"
)

for service_port in "${services[@]}"; do
    IFS=':' read -r service port <<< "$service_port"
    
    if lsof -ti ":$port" > /dev/null 2>&1; then
        echo "✅ $service is running on port $port"
    else
        echo "❌ $service is NOT running on port $port"
    fi
done

echo ""
echo "🎉 Park Golf Platform Services Started!"
echo ""
echo "📱 Access URLs:"
echo "   Admin Dashboard: http://localhost:3000"
echo "   User WebApp:     http://localhost:3002"
echo "   Admin API:       http://localhost:3091"
echo "   User API:        http://localhost:3001"
echo ""
echo "🔧 Backend Services:"
echo "   Auth Service:    http://localhost:3011"
echo "   Course Service:  http://localhost:3012"
echo "   Booking Service: http://localhost:3013"
echo "   Notify Service:  http://localhost:3014"
echo "   Search Service:  http://localhost:3015"
echo ""
echo "📋 Service Logs:"
for service in auth-service course-service booking-service notify-service search-service admin-api user-api admin-dashboard user-webapp; do
    echo "   $service: tail -f services/$service/$service.log"
done
echo ""
echo "🛑 To stop all services: ./stop-all-services.sh"