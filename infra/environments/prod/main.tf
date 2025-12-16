# Park Golf Platform - Production Environment
# This is the main entry point for the production infrastructure

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
    prefix = "environments/prod"
  }
}

# ============================================================================
# Local Variables
# ============================================================================

locals {
  environment   = "prod"
  provider_type = "gcp"
  project_id    = "parkgolf-uniyous"
  region        = "asia-northeast3"

  # Service definitions - Production specs
  services = {
    "auth-service" = {
      cpu           = "2"
      memory        = "1Gi"
      min_instances = 1
      max_instances = 10
      port          = 8080
    }
    "course-service" = {
      cpu           = "2"
      memory        = "1Gi"
      min_instances = 1
      max_instances = 10
      port          = 8080
    }
    "booking-service" = {
      cpu           = "2"
      memory        = "1Gi"
      min_instances = 1
      max_instances = 15
      port          = 8080
    }
    "notify-service" = {
      cpu           = "1"
      memory        = "512Mi"
      min_instances = 1
      max_instances = 5
      port          = 8080
    }
    "admin-api" = {
      cpu           = "2"
      memory        = "1Gi"
      min_instances = 1
      max_instances = 10
      port          = 8080
    }
    "user-api" = {
      cpu           = "2"
      memory        = "2Gi"
      min_instances = 2
      max_instances = 20
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

  vpc_cidr = "10.0.0.0/16"
  subnet_cidrs = {
    public  = "10.0.1.0/24"
    private = "10.0.2.0/24"
    data    = "10.0.3.0/24"
  }

  vpc_connector_cidr   = "10.0.10.0/28"
  enable_vpc_connector = true
  enable_nat           = true
}

# ============================================================================
# Database Module
# ============================================================================

module "database" {
  source = "../../modules/database"

  provider_type    = local.provider_type
  instance_name    = "parkgolf-db"
  environment      = local.environment
  region           = local.region
  postgres_version = "15"
  tier             = "medium" # Production tier
  storage_gb       = 100

  databases       = local.databases
  admin_username  = "parkgolf"
  admin_password  = var.db_password

  vpc_network         = module.networking.vpc_self_link
  backup_enabled      = true
  backup_start_time   = "03:00"
  high_availability   = true # Enable HA for production
  deletion_protection = true

  depends_on = [module.networking]
}

# ============================================================================
# Messaging Module (NATS JetStream)
# ============================================================================

module "messaging" {
  source = "../../modules/messaging"

  provider_type = local.provider_type
  name          = "parkgolf"
  environment   = local.environment
  region        = local.region

  # NATS JetStream VM Configuration (Production specs)
  nats_machine_type    = "e2-medium"
  nats_disk_size       = 50
  nats_version         = "2.10-alpine"
  jetstream_max_memory = "2G"
  jetstream_max_file   = "20G"

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

  service_accounts = [
    for svc in keys(local.services) :
    "${svc}-${local.environment}@${local.project_id}.iam.gserviceaccount.com"
  ]
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

  # Use placeholder image - actual images deployed by CD Services workflow
  image = "gcr.io/cloudrun/hello"

  cpu           = each.value.cpu
  memory        = each.value.memory
  min_instances = each.value.min_instances
  max_instances = each.value.max_instances
  port          = each.value.port
  timeout       = 300

  vpc_connector         = module.networking.vpc_connector_id
  allow_unauthenticated = true

  env_vars = {
    NODE_ENV = "production"
    # PORT is automatically set by Cloud Run, do not set it manually
    NATS_URL = module.messaging.nats_url
  }

  secrets = {
    DATABASE_URL = module.secrets.secret_references["db_password"]
    JWT_SECRET   = module.secrets.secret_references["jwt_secret"]
  }

  depends_on = [
    module.networking,
    module.database,
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
    ops_email = {
      type = "email"
      config = {
        email = var.ops_email
      }
    }
    slack_alerts = {
      type = "slack"
      config = {
        channel    = var.slack_channel
        auth_token = var.slack_token
      }
    }
  }

  latency_threshold_ms = 1000
  error_rate_threshold = 5
  cpu_threshold        = 80
  memory_threshold     = 80

  enable_uptime_checks = true
  uptime_check_urls = {
    admin_api = {
      url     = "https://admin-api-prod.run.app"
      timeout = 10
      period  = 60
    }
    user_api = {
      url     = "https://user-api-prod.run.app"
      timeout = 10
      period  = 60
    }
  }

  depends_on = [module.services]
}

# ============================================================================
# Variables
# ============================================================================

variable "environment" {
  type        = string
  default     = "prod"
  description = "Environment name (passed from workflow, but defaults to prod)"
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

variable "ops_email" {
  type        = string
  description = "Operations team email for alerts"
}

variable "slack_channel" {
  type        = string
  default     = "#parkgolf-alerts"
  description = "Slack channel for alerts"
}

variable "slack_token" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Slack webhook token"
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

output "database_instance" {
  description = "Database instance name"
  value       = module.database.instance_name
}

output "database_ip" {
  description = "Database private IP"
  value       = module.database.private_ip
  sensitive   = true
}

output "nats_url" {
  description = "NATS connection URL"
  value       = module.messaging.nats_url
  sensitive   = true
}

output "service_urls" {
  description = "Cloud Run service URLs"
  value = {
    for k, v in module.services : k => v.service_url
  }
}

output "monitoring_dashboard" {
  description = "Monitoring dashboard ID"
  value       = module.monitoring.dashboard_id
}
