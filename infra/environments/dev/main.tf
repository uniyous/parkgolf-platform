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
      cpu           = "1"   # Must be >= 1 when cpu_idle=false
      memory        = "512Mi" # Must be >= 512Mi when cpu_idle=false
      min_instances = 1     # Always running for NATS message listening
      max_instances = 1
      port          = 8080
      cpu_idle      = false # No CPU throttling (--no-cpu-throttling)
    }
    "course-service" = {
      cpu           = "0.5"
      memory        = "128Mi"
      min_instances = 0     # Scale to zero when idle
      max_instances = 1
      port          = 8080
      cpu_idle      = true  # CPU throttling enabled
    }
    "booking-service" = {
      cpu           = "0.5"
      memory        = "128Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
      cpu_idle      = true
    }
    "notify-service" = {
      cpu           = "0.5"
      memory        = "128Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
      cpu_idle      = true
    }
    "admin-api" = {
      cpu           = "0.5"
      memory        = "128Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
      cpu_idle      = true
    }
    "user-api" = {
      cpu           = "0.5"
      memory        = "128Mi"
      min_instances = 0
      max_instances = 1
      port          = 8080
      cpu_idle      = true
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

  vpc_cidr = "10.2.0.0/16"
  subnet_cidrs = {
    public  = "10.2.1.0/24"
    private = "10.2.2.0/24"
    data    = "10.2.3.0/24"
  }

  # Direct VPC egress replaces VPC Connector (cost savings & better performance)
  enable_vpc_connector = false
  enable_nat           = false  # NATS VM uses external IP instead (cost saving)

  # Disable Private Service Connection - dev uses external Compute Engine PostgreSQL
  enable_private_service_connection = false
}

# ============================================================================
# VPC Peering to uniyous-319808 (PostgreSQL Database)
# ============================================================================
# Dev environment connects to existing PostgreSQL on Compute Engine in uniyous-319808 project

# Peering from parkgolf-uniyous (parkgolf-dev) -> uniyous-319808 (default)
resource "google_compute_network_peering" "parkgolf_to_uniyous" {
  name         = "parkgolf-to-uniyous-peering"
  network      = module.networking.vpc_self_link
  peer_network = "projects/uniyous-319808/global/networks/default"

  export_custom_routes = true
  import_custom_routes = true

  depends_on = [module.networking]
}

# Note: The reverse peering (uniyous-319808 -> parkgolf-uniyous) must be created
# in the uniyous-319808 project. Run the following command manually:
#
#   gcloud compute networks peerings create uniyous-to-parkgolf-peering \
#     --network=default \
#     --peer-project=parkgolf-uniyous \
#     --peer-network=parkgolf-dev \
#     --export-custom-routes \
#     --import-custom-routes \
#     --project=uniyous-319808

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
  nats_disk_type       = "pd-standard" # Cost optimized (75% cheaper than SSD)
  nats_version         = "2.10-alpine"
  jetstream_max_memory = "128M"       # Minimal memory for JetStream
  jetstream_max_file   = "1G"         # Minimal file storage

  vpc_network         = module.networking.vpc_name
  vpc_subnetwork      = module.networking.subnet_ids["private"]
  private_subnet_cidr = module.networking.private_subnet_cidr

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

  # Secret names - dev uses external DB, so no db_password needed
  secret_names = ["jwt_secret", "jwt_refresh_secret"]

  # Secret values (sensitive)
  secret_values = {
    jwt_secret         = var.jwt_secret
    jwt_refresh_secret = var.jwt_refresh_secret
  }

  # Secret descriptions
  secret_descriptions = {
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
  cpu_idle      = each.value.cpu_idle

  # Direct VPC egress (replaces VPC Connector)
  vpc_network      = module.networking.vpc_network_resource
  vpc_subnet       = module.networking.subnet_resources["private"]
  vpc_network_tags = ["cloud-run"]

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
# Monitoring Module - DISABLED for dev (cost optimization)
# ============================================================================
# Logs are still available via Cloud Logging (automatic, free)
# To view logs: gcloud logging read "resource.type=cloud_run_revision" --project=parkgolf-uniyous

# ============================================================================
# Variables
# ============================================================================

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name (passed from workflow, but defaults to dev)"
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

# ============================================================================
# Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC Network ID"
  value       = module.networking.vpc_id
}

output "vpc_subnet" {
  description = "VPC Subnet for Cloud Run Direct VPC egress"
  value       = module.networking.subnet_resources["private"]
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
