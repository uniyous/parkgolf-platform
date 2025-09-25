#!/bin/bash

# Firebase Hosting Deployment Script for Frontend Apps
# Usage: ./deploy-frontend.sh [app-name|all] [environment]

set -e

# Configuration
GCP_PROJECT_ID="uniyous-319808"
FIREBASE_PROJECT_ID="uniyous-319808"

# Apps array
APPS=(
  "admin-dashboard"
  "user-webapp"
)

# Parse arguments
APP_NAME=${1:-all}
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

# Function to deploy a single app
deploy_app() {
  local app=$1
  print_status "Deploying ${app}..."

  cd services/${app}

  # Install dependencies
  print_status "Installing dependencies..."
  npm ci

  # Set environment-specific variables
  case $app in
    admin-dashboard)
      FIREBASE_SITE="parkgolf-admin"
      API_URL="${ADMIN_API_URL:-https://admin-api-${CLOUD_RUN_HASH}.asia-northeast3.run.app}"
      ;;
    user-webapp)
      FIREBASE_SITE="parkgolf-user"
      API_URL="${USER_API_URL:-https://user-api-${CLOUD_RUN_HASH}.asia-northeast3.run.app}"
      ;;
    *)
      print_error "Unknown app: $app"
      exit 1
      ;;
  esac

  # Create production environment file
  print_status "Creating environment file..."
  cat > .env.production << EOF
VITE_API_URL=${API_URL}
VITE_APP_ENV=${ENVIRONMENT}
VITE_GA_TRACKING_ID=${GA_TRACKING_ID}
VITE_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
EOF

  # Build the application
  print_status "Building ${app}..."
  npm run build

  # Deploy to Firebase Hosting
  print_status "Deploying to Firebase Hosting..."

  # Check if firebase.json exists, create if not
  if [ ! -f "firebase.json" ]; then
    print_status "Creating firebase.json..."
    cat > firebase.json << EOF
{
  "hosting": {
    "public": "dist",
    "site": "${FIREBASE_SITE}",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|map)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=86400"
          }
        ]
      }
    ]
  }
}
EOF
  fi

  # Deploy using Firebase CLI
  firebase deploy \
    --project ${FIREBASE_PROJECT_ID} \
    --only hosting:${FIREBASE_SITE} \
    --message "Deploy ${app} ${ENVIRONMENT} - $(date)"

  # Get the hosting URL
  HOSTING_URL="https://${FIREBASE_SITE}.web.app"
  print_status "App deployed to: ${HOSTING_URL}"

  cd ../..
  echo ""
}

# Main execution
main() {
  print_status "Starting deployment to Firebase Hosting..."
  print_status "Project: ${FIREBASE_PROJECT_ID}"
  print_status "Environment: ${ENVIRONMENT}"
  echo ""

  # Check if Firebase CLI is installed
  if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed"
    print_status "Installing Firebase CLI..."
    npm install -g firebase-tools
  fi

  # Deploy apps
  if [ "$APP_NAME" == "all" ]; then
    print_status "Deploying all apps..."
    for app in "${APPS[@]}"; do
      deploy_app $app
    done
  else
    # Check if app exists
    if [[ " ${APPS[@]} " =~ " ${APP_NAME} " ]]; then
      deploy_app $APP_NAME
    else
      print_error "Invalid app name: ${APP_NAME}"
      print_error "Available apps: ${APPS[*]}"
      exit 1
    fi
  fi

  print_status "Deployment completed successfully!"

  # Show deployment URLs
  echo ""
  print_status "Deployed apps:"
  echo "  Admin Dashboard: https://parkgolf-admin.web.app"
  echo "  User WebApp: https://parkgolf-user.web.app"
}

# Run main function
main