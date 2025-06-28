#!/bin/bash

echo "🔨 Building all Park Golf services..."

services=("parkgolf-auth-service" "parkgolf-course-service" "parkgolf-booking-service" "parkgolf-notify-service" "parkgolf-search-service" "parkgolf-admin-api" "parkgolf-user-api")

for service in "${services[@]}"; do
    echo "Building $service..."
    cd "$service"
    
    if [ -f "scripts/build.sh" ]; then
        ./scripts/build.sh
    else
        npm run build
    fi
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed for $service"
        exit 1
    fi
    
    cd ..
done

echo "✅ All services built successfully"
