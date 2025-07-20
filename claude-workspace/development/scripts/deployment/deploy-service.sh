#!/bin/bash

# Park Golf Platform - Service Deployment Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Usage
usage() {
    echo "Usage: $0 -s SERVICE_NAME -e ENVIRONMENT [-p PROJECT_ID] [-r REGION]"
    echo "  -s SERVICE_NAME  Name of the service to deploy (e.g., auth-service, admin-api)"
    echo "  -e ENVIRONMENT   Environment to deploy to (development, staging, production)"
    echo "  -p PROJECT_ID    GCP Project ID (optional, uses gcloud config if not provided)"
    echo "  -r REGION        GCP Region (optional, defaults to asia-northeast3)"
    echo ""
    echo "Example:"
    echo "  $0 -s auth-service -e staging"
    exit 1
}

# Parse arguments
while getopts "s:e:p:r:h" opt; do
    case $opt in
        s) SERVICE_NAME="$OPTARG" ;;
        e) ENVIRONMENT="$OPTARG" ;;
        p) PROJECT_ID="$OPTARG" ;;
        r) REGION="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

# Validate required arguments
if [ -z "$SERVICE_NAME" ] || [ -z "$ENVIRONMENT" ]; then
    echo -e "${RED}Error: SERVICE_NAME and ENVIRONMENT are required${NC}"
    usage
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment. Must be development, staging, or production${NC}"
    exit 1
fi

# Set defaults
REGION=${REGION:-"asia-northeast3"}
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}Error: No project ID provided and no default project set in gcloud${NC}"
        exit 1
    fi
fi

# Set environment-specific values
case $ENVIRONMENT in
    development)
        PROJECT_SUFFIX="dev"
        MIN_INSTANCES=0
        MAX_INSTANCES=1
        ;;
    staging)
        PROJECT_SUFFIX="staging"
        MIN_INSTANCES=1
        MAX_INSTANCES=3
        ;;
    production)
        PROJECT_SUFFIX="prod"
        MIN_INSTANCES=2
        MAX_INSTANCES=10
        ;;
esac

SERVICE_DIR="services/$SERVICE_NAME"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"
CLOUD_RUN_SERVICE="$SERVICE_NAME-$PROJECT_SUFFIX"

echo "🏌️ Park Golf Platform - Deploying $SERVICE_NAME to $ENVIRONMENT"
echo "============================================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $CLOUD_RUN_SERVICE"
echo ""

# Check if service directory exists
if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${RED}Error: Service directory $SERVICE_DIR not found${NC}"
    exit 1
fi

# Check if cloudbuild.yaml exists
if [ ! -f "$SERVICE_DIR/cloudbuild.yaml" ]; then
    echo -e "${YELLOW}Warning: No cloudbuild.yaml found. Creating default configuration...${NC}"
    
    # Create default cloudbuild.yaml
    cat > "$SERVICE_DIR/cloudbuild.yaml" << EOF
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '$IMAGE_NAME:$SHORT_SHA', '-t', '$IMAGE_NAME:latest', '.']
    dir: '$SERVICE_DIR'

  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', '$IMAGE_NAME']

  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - '$CLOUD_RUN_SERVICE'
      - '--image'
      - '$IMAGE_NAME:$SHORT_SHA'
      - '--region'
      - '$REGION'
      - '--platform'
      - 'managed'
      - '--min-instances'
      - '$MIN_INSTANCES'
      - '--max-instances'
      - '$MAX_INSTANCES'
      - '--port'
      - '${_PORT}'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'NODE_ENV=$ENVIRONMENT,GCP_PROJECT=$PROJECT_ID'

substitutions:
  _PORT: '3000'

options:
  logging: CLOUD_LOGGING_ONLY
EOF
fi

# Check if Dockerfile exists
if [ ! -f "$SERVICE_DIR/Dockerfile" ]; then
    echo -e "${YELLOW}Warning: No Dockerfile found. Creating default Dockerfile...${NC}"
    
    # Determine service type and create appropriate Dockerfile
    if [[ "$SERVICE_NAME" == *"service"* ]] || [[ "$SERVICE_NAME" == *"api"* ]]; then
        # Node.js service Dockerfile
        cat > "$SERVICE_DIR/Dockerfile" << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm install -g @nestjs/cli prisma && \
    npx prisma generate

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main.js"]
EOF
    elif [[ "$SERVICE_NAME" == *"dashboard"* ]] || [[ "$SERVICE_NAME" == *"webapp"* ]]; then
        # React app Dockerfile
        cat > "$SERVICE_DIR/Dockerfile" << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOF
    fi
fi

# Set gcloud project
echo -e "\nSetting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "\nEnabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# Submit build
echo -e "\nSubmitting build to Cloud Build..."
gcloud builds submit \
    --config="$SERVICE_DIR/cloudbuild.yaml" \
    --substitutions="_PORT=${PORT:-3000},SHORT_SHA=$(git rev-parse --short HEAD)" \
    --project=$PROJECT_ID

# Get service URL
echo -e "\nRetrieving service URL..."
SERVICE_URL=$(gcloud run services describe $CLOUD_RUN_SERVICE \
    --platform=managed \
    --region=$REGION \
    --format='value(status.url)' \
    2>/dev/null || echo "")

if [ -n "$SERVICE_URL" ]; then
    echo -e "\n${GREEN}✅ Deployment successful!${NC}"
    echo -e "Service URL: $SERVICE_URL"
else
    echo -e "\n${YELLOW}⚠️  Service deployed but URL not available yet${NC}"
    echo "Check deployment status with:"
    echo "  gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION"
fi

# Display next steps
echo -e "\nNext steps:"
echo "1. Update environment variables in Cloud Run console if needed"
echo "2. Configure custom domain if required"
echo "3. Set up monitoring and alerts"
echo "4. Test the deployed service"
EOF

chmod +x .claude-workspace/scripts/deployment/deploy-service.sh