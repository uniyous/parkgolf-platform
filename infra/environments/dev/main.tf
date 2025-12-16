# Park Golf Platform - Development Environment
# This is the main entry point for the development infrastructure

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "parkgolf-uniyous-terraform-state"
    prefix = "environments/dev"
  }
}

# ============================================================================
# Local Variables
# ============================================================================

locals {
  environment   = "dev"
  provider_type = "gcp"
  project_id    = "parkgolf-uniyous"
  region        = "asia-northeast3"

  # Service definitions - Minimal specs for dev (cost optimization)
  services = {
    "auth-service" = {
      cpu           = "1"
      memory        = "256Mi"
      min_instances = 0  # Scale to zero when idle
      max_instances = 1
      port          = 8080
    }
    "course-service" = {
      cpu           = "1"
      memory        = "256Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
    }
    "booking-service" = {
      cpu           = "1"
      memory        = "256Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
    }
    "notify-service" = {
      cpu           = "1"
      memory        = "128Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
    }
    "admin-api" = {
      cpu           = "1"
      memory        = "256Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
    }
    "user-api" = {
      cpu           = "1"
      memory        = "256Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
    }
  }

  # Database definitions
  databases = ["auth_db", "course_db", "booking_db", "notify_db"]

  # Common tags
  labels = {
    environment = local.environment
    project     = "parkgolf"
    managed_by  = "terraform"
  }
}

# ============================================================================
# Provider Configuration
# ============================================================================

provider "google" {
  project = local.project_id
  region  = local.region
}

# ============================================================================
# Data Sources
# ============================================================================

data "google_project" "project" {
  project_id = local.project_id
}

# ============================================================================
# Networking Module
# ============================================================================

module "networking" {
  source = "../../modules/networking"

  provider_type = local.provider_type
  network_name  = "parkgolf"
  environment   = local.environment
  region        = local.region

  vpc_cidr = "10.1.0.0/16"
  subnet_cidrs = {
    public  = "10.1.1.0/24"
    private = "10.1.2.0/24"
    data    = "10.1.3.0/24"
  }

  vpc_connector_cidr   = "10.1.10.0/28"
  enable_vpc_connector = true
  enable_nat           = false  # Disable NAT for cost savings in dev

  # Disable Private Service Connection - dev uses external Compute Engine PostgreSQL
  enable_private_service_connection = false
}

# ============================================================================
# External Database Configuration (Existing Compute Engine PostgreSQL)
# ============================================================================
# Dev environment uses existing PostgreSQL on Compute Engine in uniyous-319808 project
# No new database resources are created - using external DB connection

locals {
  # External database configuration
  external_db = {
    host     = var.db_host      # Compute Engine PostgreSQL IP
    port     = 5432
    username = var.db_username
    password = var.db_password
    # Database names: auth_db, course_db, booking_db, notify_db
  }
}

# ============================================================================
# Messaging Module (NATS)
# ============================================================================

module "messaging" {
  source = "../../modules/messaging"

  provider_type = local.provider_type
  name          = "parkgolf"
  environment   = local.environment
  region        = local.region

  # NATS JetStream VM Configuration - Minimal for dev
  nats_machine_type    = "e2-micro"   # Smallest instance type
  nats_disk_size       = 10           # Minimal disk
  nats_version         = "2.10-alpine"
  jetstream_max_memory = "128M"       # Minimal memory for JetStream
  jetstream_max_file   = "1G"         # Minimal file storage

  vpc_network    = module.networking.vpc_name
  vpc_subnetwork = module.networking.subnet_ids["private"]

  depends_on = [module.networking]
}

# ============================================================================
# Secrets Module
# ============================================================================

module "secrets" {
  source = "../../modules/secrets"

  provider_type = local.provider_type
  project_id    = local.project_id
  environment   = local.environment

  # Secret names (non-sensitive, used for for_each)
  secret_names = ["db_password", "jwt_secret", "jwt_refresh_secret"]

  # Secret values (sensitive)
  secret_values = {
    db_password        = var.db_password
    jwt_secret         = var.jwt_secret
    jwt_refresh_secret = var.jwt_refresh_secret
  }

  # Secret descriptions
  secret_descriptions = {
    db_password        = "Database password"
    jwt_secret         = "JWT signing secret"
    jwt_refresh_secret = "JWT refresh token secret"
  }

  # Service accounts are not pre-created in dev environment
  # Cloud Run services will use the default compute service account
  # IAM bindings will be added after services are deployed
  service_accounts = []
}

# ============================================================================
# Cloud Run Services
# ============================================================================

module "services" {
  for_each = local.services
  source   = "../../modules/cloud-run"

  provider_type = local.provider_type
  service_name  = each.key
  environment   = local.environment
  region        = local.region

  # Use placeholder image until actual images are built and pushed
  # After CI/CD deploys real images, this will be updated automatically
  image = "gcr.io/cloudrun/hello"

  cpu           = each.value.cpu
  memory        = each.value.memory
  min_instances = each.value.min_instances
  max_instances = each.value.max_instances
  port          = each.value.port

  vpc_connector         = module.networking.vpc_connector_id
  allow_unauthenticated = true

  # Using placeholder image (gcr.io/cloudrun/hello), so minimal env vars
  # After deploying real images via CI/CD, update with full config
  env_vars = {
    NODE_ENV = "development"
  }

  # Secrets will be added after real images are deployed
  secrets = {}

  depends_on = [
    module.networking,
    module.messaging,
    module.secrets
  ]
}

# ============================================================================
# Monitoring Module
# ============================================================================

module "monitoring" {
  source = "../../modules/monitoring"

  provider_type = local.provider_type
  project_id    = local.project_id
  environment   = local.environment

  services = keys(local.services)

  notification_channels = {
    dev_email = {
      type = "email"
      config = {
        email = var.alert_email
      }
    }
  }

  latency_threshold_ms = 3000 # More lenient for dev
  error_rate_threshold = 10
  enable_uptime_checks = false # Disabled for dev

  depends_on = [module.services]
}

# ============================================================================
# Variables
# ============================================================================

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name (passed from workflow, but defaults to dev)"
}

variable "db_host" {
  type        = string
  description = "External PostgreSQL host (Compute Engine IP in uniyous-319808)"
}

variable "db_username" {
  type        = string
  default     = "parkgolf"
  description = "Database username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Database password"
}

variable "jwt_secret" {
  type        = string
  sensitive   = true
  description = "JWT signing secret"
}

variable "jwt_refresh_secret" {
  type        = string
  sensitive   = true
  description = "JWT refresh token secret"
}

variable "alert_email" {
  type        = string
  default     = "dev@uniyous.com"
  description = "Email for alert notifications"
}

# ============================================================================
# Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC Network ID"
  value       = module.networking.vpc_id
}

output "vpc_connector" {
  description = "VPC Connector for Cloud Run"
  value       = module.networking.vpc_connector_name
}

output "database_host" {
  description = "External database host (Compute Engine PostgreSQL)"
  value       = local.external_db.host
}

output "database_port" {
  description = "External database port"
  value       = local.external_db.port
}

output "nats_url" {
  description = "NATS connection URL"
  value       = module.messaging.nats_url
}

output "service_urls" {
  description = "Cloud Run service URLs"
  value = {
    for k, v in module.services : k => v.service_url
  }
}
