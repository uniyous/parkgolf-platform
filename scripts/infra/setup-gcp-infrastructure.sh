#!/bin/bash
# ============================================================================
# GCP Infrastructure Initial Setup Script
# Project: parkgolf-uniyous
#
# This script sets up the prerequisites for Terraform:
# 1. Terraform State Bucket (GCS)
# 2. Service Account for GitHub Actions
# 3. Required APIs
# ============================================================================

set -e

# Configuration
PROJECT_ID="parkgolf-uniyous"
REGION="asia-northeast3"
STATE_BUCKET="parkgolf-uniyous-terraform-state"
SA_NAME="github-actions-terraform"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=============================================="
echo "GCP Infrastructure Setup"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "=============================================="

# Check if gcloud is configured
echo ""
echo "[1/6] Checking gcloud configuration..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "Setting project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
fi
echo "✓ Project configured: $PROJECT_ID"

# Enable required APIs
echo ""
echo "[2/6] Enabling required GCP APIs..."
APIS=(
    "compute.googleapis.com"
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "secretmanager.googleapis.com"
    "vpcaccess.googleapis.com"
    "servicenetworking.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "artifactregistry.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "  Enabling $api..."
    gcloud services enable $api --quiet
done
echo "✓ All APIs enabled"

# Create Terraform State Bucket
echo ""
echo "[3/6] Creating Terraform state bucket..."
if gsutil ls -b gs://${STATE_BUCKET} 2>/dev/null; then
    echo "  Bucket already exists: gs://${STATE_BUCKET}"
else
    gsutil mb -p $PROJECT_ID -l $REGION -b on gs://${STATE_BUCKET}
    echo "  Created bucket: gs://${STATE_BUCKET}"
fi

# Enable versioning
gsutil versioning set on gs://${STATE_BUCKET}
echo "✓ State bucket ready with versioning enabled"

# Create Service Account for GitHub Actions
echo ""
echo "[4/6] Creating Service Account for GitHub Actions..."
if gcloud iam service-accounts describe $SA_EMAIL 2>/dev/null; then
    echo "  Service account already exists: $SA_EMAIL"
else
    gcloud iam service-accounts create $SA_NAME \
        --display-name="GitHub Actions Terraform" \
        --description="Service account for GitHub Actions to run Terraform"
    echo "  Created service account: $SA_EMAIL"
fi
echo "✓ Service account ready"

# Grant IAM roles to Service Account
echo ""
echo "[5/6] Granting IAM roles to Service Account..."
ROLES=(
    "roles/compute.admin"
    "roles/run.admin"
    "roles/cloudsql.admin"
    "roles/secretmanager.admin"
    "roles/vpcaccess.admin"
    "roles/servicenetworking.networksAdmin"
    "roles/iam.serviceAccountAdmin"
    "roles/iam.serviceAccountUser"
    "roles/storage.admin"
    "roles/monitoring.admin"
    "roles/artifactregistry.admin"
    "roles/resourcemanager.projectIamAdmin"
)

for role in "${ROLES[@]}"; do
    echo "  Granting $role..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --quiet 2>/dev/null || true
done
echo "✓ IAM roles granted"

# Create and download Service Account key
echo ""
echo "[6/6] Creating Service Account key..."
KEY_FILE="github-actions-sa-key.json"
if [ -f "$KEY_FILE" ]; then
    echo "  Key file already exists: $KEY_FILE"
    echo "  Delete it first if you want to regenerate"
else
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SA_EMAIL
    echo "  Created key file: $KEY_FILE"
fi
echo "✓ Service account key ready"

# Summary
echo ""
echo "=============================================="
echo "Setup Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Add the following GitHub Secrets:"
echo "   ─────────────────────────────────────────"
echo "   GCP_SA_KEY         : Contents of $KEY_FILE"
echo "   DB_PASSWORD        : Your database password"
echo "   JWT_SECRET         : JWT signing secret (32+ chars)"
echo "   JWT_REFRESH_SECRET : JWT refresh secret (32+ chars)"
echo "   ALERT_EMAIL        : Alert notification email"
echo ""
echo "2. To get the SA key content, run:"
echo "   cat $KEY_FILE | base64"
echo ""
echo "3. After setting secrets, run the GitHub Workflow:"
echo "   Actions → 'CD Infrastructure' → Run workflow"
echo ""
echo "4. For security, delete the local key file after setup:"
echo "   rm $KEY_FILE"
echo ""
echo "=============================================="
