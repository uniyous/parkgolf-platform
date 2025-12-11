# Database Module
# Multi-cloud abstraction for managed PostgreSQL

terraform {
  required_version = ">= 1.0"
}

# ============================================================================
# Variables
# ============================================================================

variable "provider_type" {
  type        = string
  description = "Cloud provider: gcp, aws, azure"
  validation {
    condition     = contains(["gcp", "aws", "azure"], var.provider_type)
    error_message = "provider_type must be one of: gcp, aws, azure"
  }
}

variable "instance_name" {
  type        = string
  description = "Database instance name"
}

variable "environment" {
  type        = string
  description = "Environment: dev, staging, prod"
}

variable "region" {
  type        = string
  description = "Deployment region"
}

variable "postgres_version" {
  type        = string
  default     = "15"
  description = "PostgreSQL version"
}

variable "tier" {
  type        = string
  default     = "small"
  description = "Instance tier: micro, small, medium, large"
}

variable "storage_gb" {
  type        = number
  default     = 20
  description = "Storage size in GB"
}

variable "databases" {
  type        = list(string)
  default     = []
  description = "List of databases to create"
}

variable "vpc_network" {
  type        = string
  default     = null
  description = "VPC network for private IP (GCP)"
}

variable "backup_enabled" {
  type        = bool
  default     = true
  description = "Enable automated backups"
}

variable "backup_start_time" {
  type        = string
  default     = "03:00"
  description = "Backup start time (HH:MM)"
}

variable "high_availability" {
  type        = bool
  default     = false
  description = "Enable high availability"
}

variable "deletion_protection" {
  type        = bool
  default     = null
  description = "Enable deletion protection (defaults to true for prod)"
}

variable "admin_password" {
  type        = string
  sensitive   = true
  description = "Admin user password"
}

variable "admin_username" {
  type        = string
  default     = "parkgolf"
  description = "Admin username"
}

# AWS specific
variable "aws_vpc_id" {
  type        = string
  default     = null
  description = "AWS VPC ID"
}

variable "aws_subnet_ids" {
  type        = list(string)
  default     = []
  description = "AWS Subnet IDs for DB subnet group"
}

# Azure specific
variable "azure_resource_group" {
  type        = string
  default     = null
  description = "Azure Resource Group name"
}

# ============================================================================
# Locals
# ============================================================================

locals {
  deletion_protection = var.deletion_protection != null ? var.deletion_protection : var.environment == "prod"

  # Tier mapping for different providers
  gcp_tier_map = {
    micro  = "db-f1-micro"
    small  = "db-g1-small"
    medium = "db-custom-2-4096"
    large  = "db-custom-4-8192"
  }

  aws_tier_map = {
    micro  = "db.t3.micro"
    small  = "db.t3.small"
    medium = "db.t3.medium"
    large  = "db.t3.large"
  }

  azure_tier_map = {
    micro  = "B_Standard_B1ms"
    small  = "GP_Standard_D2s_v3"
    medium = "GP_Standard_D4s_v3"
    large  = "GP_Standard_D8s_v3"
  }
}

# ============================================================================
# GCP Cloud SQL
# ============================================================================

resource "google_sql_database_instance" "postgres" {
  count            = var.provider_type == "gcp" ? 1 : 0
  name             = "${var.instance_name}-${var.environment}"
  database_version = "POSTGRES_${var.postgres_version}"
  region           = var.region

  settings {
    tier              = local.gcp_tier_map[var.tier]
    availability_type = var.high_availability ? "REGIONAL" : "ZONAL"
    disk_size         = var.storage_gb
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = var.backup_enabled
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = var.environment == "prod"
      backup_retention_settings {
        retained_backups = var.environment == "prod" ? 30 : 7
      }
    }

    ip_configuration {
      ipv4_enabled    = var.vpc_network == null
      private_network = var.vpc_network
    }

    database_flags {
      name  = "max_connections"
      value = var.tier == "micro" ? "25" : var.tier == "small" ? "50" : "100"
    }

    database_flags {
      name  = "log_statement"
      value = "ddl"
    }

    insights_config {
      query_insights_enabled  = var.environment == "prod"
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 3
      update_track = "stable"
    }
  }

  deletion_protection = local.deletion_protection

  lifecycle {
    prevent_destroy = false
  }
}

# Create databases
resource "google_sql_database" "databases" {
  for_each = var.provider_type == "gcp" ? toset(var.databases) : []
  name     = each.value
  instance = google_sql_database_instance.postgres[0].name
}

# Create user
resource "google_sql_user" "admin" {
  count    = var.provider_type == "gcp" ? 1 : 0
  name     = var.admin_username
  instance = google_sql_database_instance.postgres[0].name
  password = var.admin_password
}

# ============================================================================
# AWS RDS (Future Implementation)
# ============================================================================

# resource "aws_db_subnet_group" "postgres" {
#   count      = var.provider_type == "aws" ? 1 : 0
#   name       = "${var.instance_name}-${var.environment}"
#   subnet_ids = var.aws_subnet_ids
# }

# resource "aws_db_instance" "postgres" {
#   count                  = var.provider_type == "aws" ? 1 : 0
#   identifier             = "${var.instance_name}-${var.environment}"
#   engine                 = "postgres"
#   engine_version         = var.postgres_version
#   instance_class         = local.aws_tier_map[var.tier]
#   allocated_storage      = var.storage_gb
#   max_allocated_storage  = var.storage_gb * 2
#   storage_type           = "gp3"
#   storage_encrypted      = true
#
#   db_name  = var.databases[0]
#   username = var.admin_username
#   password = var.admin_password
#
#   vpc_security_group_ids = []
#   db_subnet_group_name   = aws_db_subnet_group.postgres[0].name
#
#   multi_az               = var.high_availability
#   publicly_accessible    = false
#   deletion_protection    = local.deletion_protection
#
#   backup_retention_period = var.backup_enabled ? (var.environment == "prod" ? 30 : 7) : 0
#   backup_window           = "${var.backup_start_time}-${format("%02d:00", tonumber(split(":", var.backup_start_time)[0]) + 1)}"
#
#   performance_insights_enabled = var.environment == "prod"
#
#   skip_final_snapshot     = var.environment != "prod"
#   final_snapshot_identifier = var.environment == "prod" ? "${var.instance_name}-${var.environment}-final" : null
# }

# ============================================================================
# Azure PostgreSQL Flexible Server (Future Implementation)
# ============================================================================

# resource "azurerm_postgresql_flexible_server" "postgres" {
#   count               = var.provider_type == "azure" ? 1 : 0
#   name                = "${var.instance_name}-${var.environment}"
#   resource_group_name = var.azure_resource_group
#   location            = var.region
#   version             = var.postgres_version
#   sku_name            = local.azure_tier_map[var.tier]
#   storage_mb          = var.storage_gb * 1024
#
#   administrator_login    = var.admin_username
#   administrator_password = var.admin_password
#
#   backup_retention_days        = var.backup_enabled ? (var.environment == "prod" ? 30 : 7) : 7
#   geo_redundant_backup_enabled = var.high_availability
#
#   high_availability {
#     mode = var.high_availability ? "ZoneRedundant" : "Disabled"
#   }
# }

# ============================================================================
# Outputs
# ============================================================================

output "instance_name" {
  description = "Database instance name"
  value = try(
    google_sql_database_instance.postgres[0].name,
    # aws_db_instance.postgres[0].identifier,
    # azurerm_postgresql_flexible_server.postgres[0].name,
    null
  )
}

output "private_ip" {
  description = "Private IP address"
  value = try(
    google_sql_database_instance.postgres[0].private_ip_address,
    # aws_db_instance.postgres[0].address,
    # azurerm_postgresql_flexible_server.postgres[0].fqdn,
    null
  )
}

output "public_ip" {
  description = "Public IP address (if enabled)"
  value = try(
    google_sql_database_instance.postgres[0].public_ip_address,
    null
  )
}

output "connection_urls" {
  description = "Database connection URLs"
  sensitive   = true
  value = var.provider_type == "gcp" ? {
    for db in var.databases : db => "postgresql://${var.admin_username}:${var.admin_password}@${google_sql_database_instance.postgres[0].private_ip_address}:5432/${db}?schema=public"
  } : {}
}

output "database_names" {
  description = "Created database names"
  value       = var.databases
}
