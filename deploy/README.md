# Park Golf Platform - Deployment Guide

## 📋 Prerequisites

Before deploying, ensure you have:

1. **GCP Account and Project**
   - Project ID: `uniyous-319808`
   - Billing enabled
   - Required APIs enabled (Cloud Run, Artifact Registry, Firebase)

2. **Service Account**
   - Email: `parkgolf-services@uniyous-319808.iam.gserviceaccount.com`
   - Roles: Cloud Run Admin, Artifact Registry Admin, Firebase Admin

3. **External Services Running**
   - NATS Server: `34.64.85.225:4222`
   - PostgreSQL: `34.47.122.22:5432`
   - Redis (configure in production.env)

4. **Tools Installed**
   - gcloud CLI
   - Docker
   - Firebase CLI
   - Node.js 20+

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy and configure environment file
cp deploy/config/production.env.example deploy/config/production.env
# Edit production.env with your actual values

# Source environment variables
source deploy/config/production.env
```

### 2. Authenticate with GCP

```bash
# Login to GCP
gcloud auth login

# Set project
gcloud config set project uniyous-319808

# Configure Docker
gcloud auth configure-docker asia-northeast3-docker.pkg.dev
```

### 3. Deploy Backend Services

```bash
# Deploy all backend services
./deploy/scripts/deploy-backend.sh all production

# Or deploy specific service
./deploy/scripts/deploy-backend.sh auth-service production
```

### 4. Deploy Frontend Apps

```bash
# Deploy all frontend apps
./deploy/scripts/deploy-frontend.sh all production

# Or deploy specific app
./deploy/scripts/deploy-frontend.sh admin-dashboard production
```

## 📦 Service Architecture

### Backend Services (Cloud Run)

| Service | Port | Description | Database |
|---------|------|-------------|----------|
| auth-service | 3011 | Authentication & User Management | auth_db |
| course-service | 3012 | Golf Course Management | course_db |
| booking-service | 3013 | Booking Management | booking_db |
| notify-service | 3014 | Notification Service | notify_db |
| admin-api | 3091 | Admin BFF API | - |
| user-api | 3092 | User BFF API | - |

### Frontend Apps (Firebase Hosting)

| App | URL | Description |
|-----|-----|-------------|
| admin-dashboard | https://parkgolf-admin.web.app | Admin Portal |
| user-webapp | https://parkgolf-user.web.app | User Portal |

## 🔧 Manual Deployment

### Backend Service Deployment

1. **Build Docker Image**
```bash
docker build -t asia-northeast3-docker.pkg.dev/uniyous-319808/parkgolf/[service-name]:latest \
  -f services/[service-name]/Dockerfile \
  services/[service-name]
```

2. **Push to Artifact Registry**
```bash
docker push asia-northeast3-docker.pkg.dev/uniyous-319808/parkgolf/[service-name]:latest
```

3. **Deploy to Cloud Run**
```bash
gcloud run deploy [service-name] \
  --image asia-northeast3-docker.pkg.dev/uniyous-319808/parkgolf/[service-name]:latest \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --service-account parkgolf-services@uniyous-319808.iam.gserviceaccount.com \
  --set-env-vars-from-file deploy/config/production.env
```

### Frontend App Deployment

1. **Build Application**
```bash
cd services/[app-name]
npm ci
npm run build
```

2. **Deploy to Firebase**
```bash
firebase deploy --project uniyous-319808 --only hosting:[site-name]
```

## 🔄 CI/CD with GitHub Actions

### Automatic Deployment

Push to branches triggers automatic deployment:

- `main` branch → Production environment
- `develop` branch → Development environment

### Manual Deployment

Trigger deployment manually from GitHub Actions:

1. Go to Actions tab
2. Select workflow (Deploy Backend or Deploy Frontend)
3. Click "Run workflow"
4. Select services/apps to deploy

### Required GitHub Secrets

Configure these secrets in your GitHub repository:

```
GCP_SA_KEY              # Service account key JSON
JWT_SECRET              # JWT secret key
REDIS_HOST              # Redis host address
SENDGRID_API_KEY        # SendGrid API key
TWILIO_ACCOUNT_SID      # Twilio account SID
TWILIO_AUTH_TOKEN       # Twilio auth token
FIREBASE_SERVICE_ACCOUNT # Firebase service account JSON
GA_TRACKING_ID          # Google Analytics tracking ID
CLOUD_RUN_HASH          # Cloud Run service hash
```

## 🗃️ Database Setup

### Initial Database Creation

```sql
-- Connect to PostgreSQL
psql -h 34.47.122.22 -U postgres

-- Create databases
CREATE DATABASE auth_db;
CREATE DATABASE course_db;
CREATE DATABASE booking_db;
CREATE DATABASE notify_db;
```

### Run Migrations

Migrations are automatically run during service startup. To run manually:

```bash
# For each service
cd services/[service-name]
npx prisma migrate deploy
```

## 🔍 Monitoring & Logs

### View Service Logs

```bash
# Cloud Run logs
gcloud run logs read [service-name] --region asia-northeast3 --limit 100

# Stream logs
gcloud run logs tail [service-name] --region asia-northeast3
```

### View Service Status

```bash
# List all services
gcloud run services list --region asia-northeast3

# Describe specific service
gcloud run services describe [service-name] --region asia-northeast3
```

## 🚨 Troubleshooting

### Common Issues

1. **Service fails to start**
   - Check database connectivity
   - Verify NATS server is accessible
   - Review environment variables

2. **Build fails**
   - Ensure Node.js version compatibility
   - Check npm dependencies
   - Verify Prisma schema

3. **Deployment fails**
   - Check GCP quotas
   - Verify service account permissions
   - Review Cloud Run limits

### Rollback

```bash
# List revisions
gcloud run revisions list --service [service-name] --region asia-northeast3

# Rollback to previous revision
gcloud run services update-traffic [service-name] \
  --to-revisions [previous-revision]=100 \
  --region asia-northeast3
```

## 📊 Health Checks

Each service exposes health endpoints:

- `/health` - Basic health check
- `/health/ready` - Readiness check
- `/health/live` - Liveness check

Test health:
```bash
curl https://[service-url]/health
```

## 🔐 Security Notes

1. **Never commit secrets** - Use GitHub Secrets or GCP Secret Manager
2. **Rotate credentials regularly** - Especially database passwords and API keys
3. **Use least privilege** - Service accounts should have minimal required permissions
4. **Enable audit logging** - Track all deployments and changes
5. **Set up alerts** - Monitor for unusual activity or errors

## 📝 Post-Deployment Checklist

- [ ] All services are running (check Cloud Run console)
- [ ] Database migrations completed successfully
- [ ] Frontend apps accessible via Firebase URLs
- [ ] API endpoints responding correctly
- [ ] NATS messaging working between services
- [ ] Email/SMS notifications sending properly
- [ ] Monitoring and logging configured
- [ ] SSL certificates valid
- [ ] Performance within acceptable limits
- [ ] Security scan completed

## 📞 Support

For deployment issues:
1. Check logs for error messages
2. Review this documentation
3. Contact DevOps team
4. Create issue in GitHub repository

---

Last Updated: January 2025
Version: 1.0.0