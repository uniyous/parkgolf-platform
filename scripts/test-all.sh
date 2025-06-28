#!/bin/bash

echo "🧪 Running tests for all Park Golf services..."

services=("parkgolf-auth-service" "parkgolf-course-service" "parkgolf-booking-service" "parkgolf-notify-service" "parkgolf-search-service" "parkgolf-admin-api" "parkgolf-user-api")
failed_services=()

for service in "${services[@]}"; do
    echo "Testing $service..."
    cd "$service"
    
    if [ -f "scripts/test.sh" ]; then
        ./scripts/test.sh
    else
        npm run test
    fi
    
    if [ $? -ne 0 ]; then
        failed_services+=("$service")
    fi
    
    cd ..
done

if [ ${#failed_services[@]} -eq 0 ]; then
    echo "✅ All tests passed"
else
    echo "❌ Tests failed for: ${failed_services[*]}"
    exit 1
fi
