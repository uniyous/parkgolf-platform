# Park Golf Platform - Terraform Infrastructure

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  default     = "uniyous-319808"
}

variable "region" {
  description = "GCP Region"
  default     = "asia-northeast3"
}

variable "environment" {
  description = "Environment (dev/prod)"
  type        = string
}

# Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud SQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "parkgolf-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = var.environment == "prod" ? "db-g1-small" : "db-f1-micro"

    backup_configuration {
      enabled = var.environment == "prod"
      start_time = "03:00"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    database_flags {
      name  = "max_connections"
      value = var.environment == "prod" ? "100" : "50"
    }
  }

  deletion_protection = var.environment == "prod"
}

# Databases
resource "google_sql_database" "auth_db" {
  name     = "auth_db"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_database" "course_db" {
  name     = "course_db"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_database" "booking_db" {
  name     = "booking_db"
  instance = google_sql_database_instance.postgres.name
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "parkgolf-vpc-${var.environment}"
  auto_create_subnetworks = false
}

# Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "parkgolf-subnet-${var.environment}"
  ip_cidr_range = var.environment == "prod" ? "10.0.0.0/24" : "10.1.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# VPC Connector for Cloud Run
resource "google_vpc_access_connector" "connector" {
  name          = "parkgolf-connector-${var.environment}"
  ip_cidr_range = var.environment == "prod" ? "10.2.0.0/28" : "10.3.0.0/28"
  network       = google_compute_network.vpc.name
  region        = var.region
}

# Cloud Run Service (Backend API)
resource "google_cloud_run_service" "backend_api" {
  name     = "backend-api-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/backend-api:latest"

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "DATABASE_URL"
          value = "postgresql://postgres:${google_secret_manager_secret_version.db_password.secret_data}@${google_sql_database_instance.postgres.private_ip_address}:5432/auth_db"
        }

        resources {
          limits = {
            cpu    = var.environment == "prod" ? "2" : "1"
            memory = var.environment == "prod" ? "2Gi" : "512Mi"
          }
        }
      }

      service_account_name = google_service_account.backend.email
    }

    metadata {
      annotations = {
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.id
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
        "autoscaling.knative.dev/minScale"        = var.environment == "prod" ? "1" : "0"
        "autoscaling.knative.dev/maxScale"        = var.environment == "prod" ? "100" : "10"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Service Account
resource "google_service_account" "backend" {
  account_id   = "backend-api-${var.environment}"
  display_name = "Backend API Service Account"
}

# IAM Bindings
resource "google_project_iam_member" "backend_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# Secret Manager for DB Password
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password-${var.environment}"

  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret = google_secret_manager_secret.db_password.id
  secret_data = var.environment == "prod" ? "prod-secure-password" : "dev-password-123"
}

# Cloud Pub/Sub Topic (NATS 대체)
resource "google_pubsub_topic" "events" {
  name = "parkgolf-events-${var.environment}"

  message_retention_duration = "86600s"
}

resource "google_pubsub_subscription" "events_sub" {
  name  = "parkgolf-events-sub-${var.environment}"
  topic = google_pubsub_topic.events.name

  ack_deadline_seconds = 20

  push_config {
    push_endpoint = google_cloud_run_service.backend_api.status[0].url
  }
}

# Monitoring Alert
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "High Latency Alert - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run Latency"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.environment == "prod" ? 1000 : 3000

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }

  enabled = var.environment == "prod"
}

# Outputs
output "cloud_sql_instance" {
  value = google_sql_database_instance.postgres.name
}

output "cloud_run_url" {
  value = google_cloud_run_service.backend_api.status[0].url
}

output "vpc_connector" {
  value = google_vpc_access_connector.connector.name
}