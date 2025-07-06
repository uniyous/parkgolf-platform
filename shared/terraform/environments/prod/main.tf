# Production Environment Configuration for Park Golf Platform

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  backend "gcs" {
    bucket = "parkgolf-terraform-state-prod"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "parkgolf-prod"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast3"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Networking
resource "google_compute_network" "vpc" {
  name                    = "parkgolf-vpc-prod"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "parkgolf-subnet-prod"
  ip_cidr_range = "10.30.0.0/20"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  secondary_ip_range {
    range_name    = "k8s-pods"
    ip_cidr_range = "10.30.16.0/20"
  }
  
  secondary_ip_range {
    range_name    = "k8s-services"
    ip_cidr_range = "10.30.32.0/20"
  }
}

# Cloud SQL (PostgreSQL)
resource "google_sql_database_instance" "postgres" {
  name             = "parkgolf-postgres-prod"
  database_version = "POSTGRES_15"
  region           = var.region
  
  settings {
    tier              = "db-custom-4-16384"
    availability_type = "REGIONAL"
    disk_size         = 100
    disk_type         = "PD_SSD"
    
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      location                       = var.region
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }
    
    database_flags {
      name  = "max_connections"
      value = "200"
    }
    
    insights_config {
      query_insights_enabled  = true
      query_string_length    = 1024
      record_application_tags = true
      record_client_address  = true
    }
  }
  
  deletion_protection = true
}

# Databases
resource "google_sql_database" "databases" {
  for_each = toset([
    "auth_service",
    "course_service",
    "booking_service",
    "notify_service"
  ])
  
  name     = each.key
  instance = google_sql_database_instance.postgres.name
}

# Redis (Memorystore)
resource "google_redis_instance" "cache" {
  name               = "parkgolf-redis-prod"
  tier               = "STANDARD_HA"
  memory_size_gb     = 5
  region             = var.region
  authorized_network = google_compute_network.vpc.id
  redis_version      = "REDIS_7_0"
  
  replica_count = 2
  read_replicas_mode = "READ_REPLICAS_ENABLED"
  
  persistence_config {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "TWENTY_FOUR_HOURS"
  }
}

# Service Accounts
resource "google_service_account" "services" {
  for_each = toset([
    "auth-service",
    "course-service",
    "booking-service",
    "notify-service",
    "search-service",
    "ml-service",
    "admin-api",
    "user-api"
  ])
  
  account_id   = "${each.key}-sa"
  display_name = "${each.key} Service Account"
}

# Cloud Run Services
module "auth_service" {
  source = "../../modules/cloud-run"
  
  project_id    = var.project_id
  region        = var.region
  service_name  = "auth-service-prod"
  image         = "gcr.io/${var.project_id}/auth-service:latest"
  port          = 3011
  min_instances = 2
  max_instances = 10
  memory        = "1Gi"
  cpu           = "2"
  
  env_vars = {
    NODE_ENV            = "production"
    DATABASE_URL        = "postgresql://auth_service@/auth_service?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
    REDIS_URL          = google_redis_instance.cache.host
    NATS_URL           = "nats://nats-prod.parkgolf.internal:4222"
    JWT_SECRET         = "SECRET_FROM_SECRET_MANAGER"
  }
}

module "course_service" {
  source = "../../modules/cloud-run"
  
  project_id    = var.project_id
  region        = var.region
  service_name  = "course-service-prod"
  image         = "gcr.io/${var.project_id}/course-service:latest"
  port          = 3012
  min_instances = 2
  max_instances = 10
  memory        = "1Gi"
  cpu           = "2"
  
  env_vars = {
    NODE_ENV            = "production"
    DATABASE_URL        = "postgresql://course_service@/course_service?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
    REDIS_URL          = google_redis_instance.cache.host
    NATS_URL           = "nats://nats-prod.parkgolf.internal:4222"
    ELASTICSEARCH_URL   = "https://es-prod.parkgolf.internal:9200"
  }
}

# Monitoring
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "High Latency Alert - Production"
  combiner     = "OR"
  
  conditions {
    display_name = "Request latency > 1s"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1000
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_99"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Email Notification"
  type         = "email"
  
  labels = {
    email_address = "ops@parkgolf.com"
  }
}

# Outputs
output "vpc_id" {
  value = google_compute_network.vpc.id
}

output "postgres_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

output "service_urls" {
  value = {
    auth_service   = module.auth_service.service_url
    course_service = module.course_service.service_url
  }
}