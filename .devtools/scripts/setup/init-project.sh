#!/bin/bash

# Park Golf Platform - Project Initialization Script

set -e

echo "🏌️ Park Golf Platform - Project Initialization"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
else
    print_status "Node.js $(node -v) found"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
else
    print_status "npm $(npm -v) found"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Docker is required for local development."
else
    print_status "Docker found"
fi

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    print_warning "Google Cloud SDK is not installed. Required for deployment."
else
    print_status "Google Cloud SDK found"
fi

# Create main directories
echo -e "\nCreating project structure..."

# Create services directory
mkdir -p services/{auth-service,course-service,booking-service,notify-service,search-service,ml-service,admin-api,user-api,admin-dashboard,user-webapp}
print_status "Created services directories"

# Create shared directories
mkdir -p shared/{configs/{database,elastic,monitoring},terraform/{modules,environments,shared}}
print_status "Created shared directories"

# Initialize git repository
if [ ! -d .git ]; then
    echo -e "\nInitializing git repository..."
    git init
    print_status "Git repository initialized"
fi

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
*/node_modules/
**/node_modules/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env

# Build outputs
dist/
build/
out/
.next/
*.tsbuildinfo

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
coverage/
.nyc_output/

# Terraform
*.tfstate
*.tfstate.*
.terraform/
terraform.tfvars

# Python
__pycache__/
*.py[cod]
*$py.class
.Python
env/
venv/
.venv/

# Go
*.exe
*.exe~
*.dll
*.so
*.dylib
vendor/

# Docker
.dockerignore

# Temporary files
tmp/
temp/
.cache/

# Database
*.sqlite
*.sqlite3
*.db

# Certificates
*.pem
*.key
*.crt
EOF
print_status "Created .gitignore"

# Create README.md
cat > README.md << 'EOF'
# Park Golf Platform

A comprehensive microservices-based platform for managing park golf course bookings.

## Architecture

This platform follows a microservices architecture with BFF (Backend for Frontend) pattern:

- **Frontend Applications**
  - Admin Dashboard (React + TypeScript)
  - User Web App (React + TypeScript)

- **BFF Services**
  - Admin API (NestJS)
  - User API (NestJS)

- **Microservices**
  - Auth Service (NestJS)
  - Course Service (NestJS)
  - Booking Service (NestJS)
  - Notify Service (NestJS)
  - Search Service (Golang)
  - ML Service (Python FastAPI)

## Technology Stack

- **Frontend**: React, TypeScript, Redux Toolkit/Recoil
- **Backend**: NestJS, Golang, Python FastAPI
- **Database**: PostgreSQL, ElasticSearch, Redis
- **Message Broker**: NATS Streaming
- **Infrastructure**: Google Cloud Platform (Cloud Run)
- **CI/CD**: Cloud Build, GitOps

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Google Cloud SDK
- Go 1.21+ (for search service)
- Python 3.11+ (for ML service)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/uniyous/parkgolf-platform.git
   cd parkgolf-platform
   ```

2. Run the initialization script:
   ```bash
   ./.devtools/scripts/setup/init-project.sh
   ```

3. Start the development environment:
   ```bash
   ./.devtools/scripts/development/start-dev.sh
   ```

4. Access the applications:
   - Admin Dashboard: http://localhost:3001
   - User Web App: http://localhost:3002
   - Admin API: http://localhost:3091
   - User API: http://localhost:3092

## Project Structure

```
parkgolf-platform/
├── .devtools/               # Development tools and scripts
├── services/               # Microservices
├── shared/                # Shared configurations
└── README.md
```

## Contributing

Please read our contributing guidelines before submitting PRs.

## License

This project is proprietary and confidential.
EOF
print_status "Created README.md"

# Create docker-compose.yml for local development
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: parkgolf
      POSTGRES_PASSWORD: parkgolf123
      POSTGRES_DB: parkgolf
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # ElasticSearch
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elastic_data:/usr/share/elasticsearch/data

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # NATS Streaming
  nats:
    image: nats-streaming:latest
    ports:
      - "4222:4222"
      - "8222:8222"
    command: ["-st", "parkgolf-cluster", "-SD", "-m", "8222"]

volumes:
  postgres_data:
  elastic_data:
  redis_data:
EOF
print_status "Created docker-compose.yml"

# Create environment template
cat > .env.example << 'EOF'
# Node Environment
NODE_ENV=development

# Database
DATABASE_URL=postgresql://parkgolf:parkgolf123@localhost:5432/parkgolf

# ElasticSearch
ELASTICSEARCH_URL=http://localhost:9200

# Redis
REDIS_URL=redis://localhost:6379

# NATS
NATS_URL=nats://localhost:4222
NATS_CLUSTER_ID=parkgolf-cluster

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Google Cloud
GCP_PROJECT_ID=parkgolf-dev
GCP_REGION=asia-northeast3

# Service Ports
AUTH_SERVICE_PORT=3011
COURSE_SERVICE_PORT=3012
BOOKING_SERVICE_PORT=3013
NOTIFY_SERVICE_PORT=3014
SEARCH_SERVICE_PORT=3015
ML_SERVICE_PORT=3016
ADMIN_API_PORT=3091
USER_API_PORT=3092
EOF
print_status "Created .env.example"

# Create VS Code workspace settings
mkdir -p .vscode
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/coverage": true
  }
}
EOF
print_status "Created VS Code settings"

echo -e "\n${GREEN}✨ Project initialization completed!${NC}"
echo -e "\nNext steps:"
echo "1. Copy .env.example to .env and update the values"
echo "2. Run 'docker-compose up -d' to start local services"
echo "3. Run './.devtools/scripts/development/setup-services.sh' to setup all services"
echo "4. Run './.devtools/scripts/development/start-dev.sh' to start development"
EOF

chmod +x .devtools/scripts/setup/init-project.sh