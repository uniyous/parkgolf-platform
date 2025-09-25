#!/bin/bash

# GCP Deployment Script for Backend Services
# Usage: ./deploy-backend.sh [service-name|all] [environment]

set -e

# Configuration
GCP_PROJECT_ID="uniyous-319808"
REGION="asia-northeast3"
SERVICE_ACCOUNT_EMAIL="parkgolf-services@uniyous-319808.iam.gserviceaccount.com"
ARTIFACT_REGISTRY="asia-northeast3-docker.pkg.dev/${GCP_PROJECT_ID}/parkgolf"

# External Services Configuration
NATS_URL="nats://34.64.85.225:4222"
NATS_USER="nats"
NATS_PASSWORD="nats123"
DATABASE_HOST="34.47.122.22"
DATABASE_PORT="5432"
DATABASE_USER="postgres"
DATABASE_PASSWORD="postgres123"

# Services array
SERVICES=(
  "auth-service"
  "course-service"
  "booking-service"
  "notify-service"
  "admin-api"
  "user-api"
)

# Parse arguments
SERVICE_NAME=${1:-all}
ENVIRONMENT=${2:-production}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function to deploy a single service
deploy_service() {
  local service=$1
  print_status "Deploying ${service}..."

  # Set service-specific environment variables
  case $service in
    auth-service)
      PORT=3011
      DATABASE_NAME="auth_db"
      EXTRA_VARS="--set-env-vars JWT_SECRET=${JWT_SECRET:-default-jwt-secret} --set-env-vars REDIS_URL=${REDIS_URL:-redis://localhost:6379}"
      ;;
    course-service)
      PORT=3012
      DATABASE_NAME="course_db"
      EXTRA_VARS=""
      ;;
    booking-service)
      PORT=3013
      DATABASE_NAME="booking_db"
      EXTRA_VARS=""
      ;;
    notify-service)
      PORT=3014
      DATABASE_NAME="notify_db"
      EXTRA_VARS="--set-env-vars SENDGRID_API_KEY=${SENDGRID_API_KEY} --set-env-vars TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID} --set-env-vars TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}"
      ;;
    admin-api)
      PORT=3091
      DATABASE_NAME=""
      EXTRA_VARS="--set-env-vars REDIS_URL=${REDIS_URL:-redis://localhost:6379}"
      ;;
    user-api)
      PORT=3092
      DATABASE_NAME=""
      EXTRA_VARS="--set-env-vars REDIS_URL=${REDIS_URL:-redis://localhost:6379}"
      ;;
    *)
      print_error "Unknown service: $service"
      exit 1
      ;;
  esac

  # Build Docker image
  print_status "Building Docker image for ${service}..."
  docker build \
    -t ${ARTIFACT_REGISTRY}/${service}:${ENVIRONMENT} \
    -t ${ARTIFACT_REGISTRY}/${service}:latest \
    -f services/${service}/Dockerfile \
    --build-arg NODE_ENV=${ENVIRONMENT} \
    services/${service}

  # Push to Artifact Registry
  print_status "Pushing Docker image to Artifact Registry..."
  docker push ${ARTIFACT_REGISTRY}/${service}:${ENVIRONMENT}
  docker push ${ARTIFACT_REGISTRY}/${service}:latest

  # Deploy to Cloud Run
  print_status "Deploying to Cloud Run..."

  # Build the gcloud command
  DEPLOY_CMD="gcloud run deploy ${service} \
    --image ${ARTIFACT_REGISTRY}/${service}:${ENVIRONMENT} \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --port ${PORT} \
    --service-account ${SERVICE_ACCOUNT_EMAIL} \
    --set-env-vars NODE_ENV=${ENVIRONMENT} \
    --set-env-vars PORT=${PORT} \
    --set-env-vars NATS_URL=${NATS_URL} \
    --set-env-vars NATS_USER=${NATS_USER} \
    --set-env-vars NATS_PASSWORD=${NATS_PASSWORD}"

  # Add database variables if needed
  if [ -n "$DATABASE_NAME" ]; then
    DEPLOY_CMD="${DEPLOY_CMD} \
      --set-env-vars DATABASE_HOST=${DATABASE_HOST} \
      --set-env-vars DATABASE_PORT=${DATABASE_PORT} \
      --set-env-vars DATABASE_USER=${DATABASE_USER} \
      --set-env-vars DATABASE_PASSWORD=${DATABASE_PASSWORD} \
      --set-env-vars DATABASE_NAME=${DATABASE_NAME} \
      --set-env-vars DATABASE_URL=postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
  fi

  # Add extra variables if any
  if [ -n "$EXTRA_VARS" ]; then
    DEPLOY_CMD="${DEPLOY_CMD} ${EXTRA_VARS}"
  fi

  # Add resource limits
  DEPLOY_CMD="${DEPLOY_CMD} \
    --min-instances 1 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300"

  # Execute deployment
  eval $DEPLOY_CMD

  # Get service URL
  SERVICE_URL=$(gcloud run services describe ${service} --region=${REGION} --format='value(status.url)')
  print_status "Service deployed to: ${SERVICE_URL}"

  echo ""
}

# Main execution
main() {
  print_status "Starting deployment to GCP Cloud Run..."
  print_status "Project: ${GCP_PROJECT_ID}"
  print_status "Region: ${REGION}"
  print_status "Environment: ${ENVIRONMENT}"
  echo ""

  # Authenticate with GCP
  print_status "Authenticating with GCP..."
  gcloud auth configure-docker ${REGION}-docker.pkg.dev

  # Create Artifact Registry repository if it doesn't exist
  print_status "Ensuring Artifact Registry repository exists..."
  gcloud artifacts repositories create parkgolf \
    --repository-format=docker \
    --location=${REGION} \
    --description="Park Golf Platform Docker images" \
    2>/dev/null || print_warning "Repository already exists"

  # Deploy services
  if [ "$SERVICE_NAME" == "all" ]; then
    print_status "Deploying all services..."
    for service in "${SERVICES[@]}"; do
      deploy_service $service
    done
  else
    # Check if service exists
    if [[ " ${SERVICES[@]} " =~ " ${SERVICE_NAME} " ]]; then
      deploy_service $SERVICE_NAME
    else
      print_error "Invalid service name: ${SERVICE_NAME}"
      print_error "Available services: ${SERVICES[*]}"
      exit 1
    fi
  fi

  print_status "Deployment completed successfully!"

  # List all deployed services
  echo ""
  print_status "Deployed services:"
  gcloud run services list --region=${REGION} --format="table(SERVICE,REGION,URL)"
}

# Run main function
main