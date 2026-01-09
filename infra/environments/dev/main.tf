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

  # Disable Private Service Connection (using Compute Engine PostgreSQL)
  enable_private_service_connection = false
}

# ============================================================================
# Database VM (PostgreSQL on Compute Engine) - Cost optimized for dev
# ============================================================================

resource "google_compute_instance" "postgres" {
  name         = "parkgolf-postgres-${local.environment}"
  machine_type = "e2-small"  # 0.5 vCPU (shared), 2GB - ~$13/month
  zone         = "${local.region}-a"

  tags = ["postgres-server", "internal"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 10
      type  = "pd-standard"  # HDD for cost saving
    }
  }

  network_interface {
    network    = module.networking.vpc_name
    subnetwork = module.networking.subnet_ids["data"]

    # External IP for Cloud Run access (Option A: External IP + Firewall)
    access_config {
      # Ephemeral external IP
    }
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    set -e

    # Install PostgreSQL 15
    apt-get update
    apt-get install -y gnupg2 wget
    echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    apt-get install -y postgresql-15

    # Configure PostgreSQL to listen on all interfaces
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/15/main/postgresql.conf

    # Allow connections from VPC
    echo "host    all             all             10.2.0.0/16             md5" >> /etc/postgresql/15/main/pg_hba.conf

    # Restart PostgreSQL
    systemctl restart postgresql

    # Create databases and user
    sudo -u postgres psql <<EOSQL
    CREATE USER parkgolf WITH PASSWORD '${var.db_password}';
    CREATE DATABASE auth_db OWNER parkgolf;
    CREATE DATABASE course_db OWNER parkgolf;
    CREATE DATABASE booking_db OWNER parkgolf;
    CREATE DATABASE notify_db OWNER parkgolf;
    GRANT ALL PRIVILEGES ON DATABASE auth_db TO parkgolf;
    GRANT ALL PRIVILEGES ON DATABASE course_db TO parkgolf;
    GRANT ALL PRIVILEGES ON DATABASE booking_db TO parkgolf;
    GRANT ALL PRIVILEGES ON DATABASE notify_db TO parkgolf;
    EOSQL

    echo "PostgreSQL setup completed"
  EOF

  service_account {
    scopes = ["cloud-platform"]
  }

  scheduling {
    preemptible       = false
    automatic_restart = true
  }

  labels = {
    environment = local.environment
    service     = "postgres"
    component   = "database"
  }

  depends_on = [module.networking]
}

# Firewall for PostgreSQL from Cloud Run (External IP access)
# Cloud Run uses dynamic external IPs from Google infrastructure
# Security is maintained via database password authentication
resource "google_compute_firewall" "postgres_from_cloudrun" {
  name    = "parkgolf-allow-postgres-${local.environment}"
  network = module.networking.vpc_name

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  # Allow from any IP (Cloud Run uses dynamic IPs)
  # Application-level security: DB password authentication
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["postgres-server"]
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
  nats_disk_type       = "pd-standard" # Cost optimized (75% cheaper than SSD)
  nats_version         = "2.10-alpine"
  jetstream_max_memory = "128M"       # Minimal memory for JetStream
  jetstream_max_file   = "1G"         # Minimal file storage

  vpc_network    = module.networking.vpc_name
  vpc_subnetwork = module.networking.subnet_ids["private"]
  # private_subnet_cidr removed - using External IP access (Option A)

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

  # Secret names
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
  cpu_idle      = each.value.cpu_idle

  # No VPC configuration (Option A: External IP + Firewall)
  # Cloud Run connects to VMs via External IP instead of Direct VPC Egress
  # This eliminates serverless IP issues during terraform destroy

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

output "database_instance" {
  description = "Database VM instance name"
  value       = google_compute_instance.postgres.name
}

output "database_private_ip" {
  description = "Database private IP"
  value       = google_compute_instance.postgres.network_interface[0].network_ip
  sensitive   = true
}

output "database_external_ip" {
  description = "Database external IP (for Cloud Run access)"
  value       = google_compute_instance.postgres.network_interface[0].access_config[0].nat_ip
  sensitive   = true
}

output "service_urls" {
  description = "Cloud Run service URLs"
  value = {
    for k, v in module.services : k => v.service_url
  }
}
