#!/bin/bash

# Park Golf Platform - Infrastructure Startup Script
# This script starts only the infrastructure services (PostgreSQL, NATS, Redis, ElasticSearch)

set -e

echo "🏌️ Park Golf Platform - Starting Infrastructure Services"
echo "======================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop first."
    exit 1
fi

print_status "Docker is running"

# Check if .env.development exists
if [ ! -f .env.development ]; then
    print_warning ".env.development not found. Creating from template..."
    cp .env.example .env.development 2>/dev/null || print_warning "No .env.example found. Please create .env.development manually."
fi

# Load environment variables
if [ -f .env.development ]; then
    set -a
    source .env.development
    set +a
    print_status "Environment variables loaded from .env.development"
fi

# Check required ports
echo -e "\n📡 Checking required infrastructure ports..."
INFRASTRUCTURE_PORTS=(5432 6379 4222 8222 9200)
PORT_CHECK_FAILED=false

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_error "Port $1 is already in use"
        return 1
    else
        print_status "Port $1 is available"
        return 0
    fi
}

for port in "${INFRASTRUCTURE_PORTS[@]}"; do
    if ! check_port $port; then
        PORT_CHECK_FAILED=true
    fi
done

if [ "$PORT_CHECK_FAILED" = true ]; then
    echo -e "\n${RED}Some required ports are in use. Please stop conflicting services.${NC}"
    echo -e "You can check what's using a port with: ${YELLOW}lsof -i :PORT_NUMBER${NC}"
    exit 1
fi

# Create necessary directories
echo -e "\n📁 Creating necessary directories..."
mkdir -p logs shared/configs/database shared/configs/elastic
print_status "Directories created"

# Start infrastructure services
echo -e "\n🚀 Starting infrastructure services..."

# Start core infrastructure
docker-compose up -d postgres redis nats elasticsearch

if [ $? -eq 0 ]; then
    print_status "Infrastructure services started"
else
    print_error "Failed to start infrastructure services"
    exit 1
fi

# Wait for services to be ready
echo -e "\n⏳ Waiting for services to be ready..."

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=${3:-30}
    local attempt=0

    echo -n "Waiting for $service_name... "
    while [ $attempt -lt $max_attempts ]; do
        if eval $check_command > /dev/null 2>&1; then
            echo -e " ${GREEN}Ready${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    echo -e " ${RED}Timeout${NC}"
    return 1
}

# Check PostgreSQL
wait_for_service "PostgreSQL" "docker exec parkgolf-postgres pg_isready -U parkgolf -d parkgolf"

# Check Redis
wait_for_service "Redis" "docker exec parkgolf-redis redis-cli --no-auth-warning -a redis123 ping"

# Check NATS
wait_for_service "NATS" "curl -s http://localhost:8222/varz"

# Check ElasticSearch
wait_for_service "ElasticSearch" "curl -s http://localhost:9200/_cluster/health"

echo -e "\n🎯 Verifying database setup..."

# Check if databases were created
DB_CHECK=$(docker exec parkgolf-postgres psql -U parkgolf -d parkgolf -t -c "SELECT datname FROM pg_database WHERE datname IN ('auth_db', 'course_db', 'booking_db', 'notify_db', 'ml_db');" | wc -l)

if [ "$DB_CHECK" -eq 5 ]; then
    print_status "All microservice databases created successfully"
else
    print_warning "Some databases may not have been created. Check the logs."
fi

echo -e "\n✨ Infrastructure services are ready!"
echo -e "\n📊 Service Status:"
echo -e "  • PostgreSQL:    http://localhost:5432 (parkgolf/parkgolf123)"
echo -e "  • Redis:         redis://localhost:6379 (password: redis123)"
echo -e "  • NATS:          nats://localhost:4222"
echo -e "  • NATS Monitor:  http://localhost:8222"
echo -e "  • ElasticSearch: http://localhost:9200"

echo -e "\n🛠️  Optional Monitoring UIs (run with --profile monitoring):"
echo -e "  • PgAdmin:       http://localhost:5050 (admin@parkgolf.com/admin123)"
echo -e "  • Redis UI:      http://localhost:8081"
echo -e "  • Kibana:        http://localhost:5601"

echo -e "\n🔧 To start monitoring UIs:"
echo -e "  ${YELLOW}docker-compose --profile monitoring up -d${NC}"

echo -e "\n🚀 Next steps:"
echo -e "  1. Run individual services: ${YELLOW}cd services/auth-service && npm run start:dev${NC}"
echo -e "  2. Or use the full dev script: ${YELLOW}./.devtools/scripts/development/start-dev.sh${NC}"
echo -e "  3. View logs: ${YELLOW}docker-compose logs -f [service_name]${NC}"

echo -e "\n⏹️  To stop all services:"
echo -e "  ${YELLOW}docker-compose down${NC}"