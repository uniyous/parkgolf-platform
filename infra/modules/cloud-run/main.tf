# Cloud Run / App Runner / Container Apps Module
# Multi-cloud abstraction for serverless container deployment

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

variable "service_name" {
  type        = string
  description = "Name of the service"
}

variable "environment" {
  type        = string
  description = "Environment: dev, staging, prod"
}

variable "image" {
  type        = string
  description = "Container image URL"
}

variable "region" {
  type        = string
  description = "Deployment region"
}

variable "cpu" {
  type        = string
  default     = "1"
  description = "CPU allocation"
}

variable "memory" {
  type        = string
  default     = "512Mi"
  description = "Memory allocation"
}

variable "min_instances" {
  type        = number
  default     = 0
  description = "Minimum number of instances"
}

variable "max_instances" {
  type        = number
  default     = 10
  description = "Maximum number of instances"
}

variable "port" {
  type        = number
  default     = 8080
  description = "Container port"
}

variable "timeout" {
  type        = number
  default     = 300
  description = "Request timeout in seconds"
}

variable "env_vars" {
  type        = map(string)
  default     = {}
  description = "Environment variables"
}

variable "secrets" {
  type = map(object({
    secret_name = string
    version     = string
  }))
  default     = {}
  description = "Secret references"
}

variable "vpc_connector" {
  type        = string
  default     = null
  description = "VPC connector for private networking (GCP)"
}

variable "allow_unauthenticated" {
  type        = bool
  default     = true
  description = "Allow unauthenticated access"
}

variable "service_account_email" {
  type        = string
  default     = null
  description = "Service account email"
}

# AWS specific
variable "aws_vpc_id" {
  type        = string
  default     = null
  description = "AWS VPC ID for App Runner"
}

variable "aws_subnet_ids" {
  type        = list(string)
  default     = []
  description = "AWS Subnet IDs"
}

# Azure specific
variable "azure_resource_group" {
  type        = string
  default     = null
  description = "Azure Resource Group name"
}

variable "azure_container_app_environment_id" {
  type        = string
  default     = null
  description = "Azure Container App Environment ID"
}

# ============================================================================
# GCP Cloud Run
# ============================================================================

resource "google_cloud_run_v2_service" "service" {
  count    = var.provider_type == "gcp" ? 1 : 0
  name     = "${var.service_name}-${var.environment}"
  location = var.region

  template {
    containers {
      image = var.image

      ports {
        container_port = var.port
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle = var.environment != "prod"
      }

      # Environment variables
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret references
      dynamic "env" {
        for_each = var.secrets
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version
            }
          }
        }
      }

      # Health check
      startup_probe {
        http_get {
          path = "/health"
          port = var.port
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = var.port
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    timeout = "${var.timeout}s"

    service_account = var.service_account_email

    dynamic "vpc_access" {
      for_each = var.vpc_connector != null ? [1] : []
      content {
        connector = var.vpc_connector
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Allow unauthenticated access
resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.provider_type == "gcp" && var.allow_unauthenticated ? 1 : 0
  project  = google_cloud_run_v2_service.service[0].project
  location = google_cloud_run_v2_service.service[0].location
  name     = google_cloud_run_v2_service.service[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================================================
# AWS App Runner (Future Implementation)
# ============================================================================

# resource "aws_apprunner_service" "service" {
#   count        = var.provider_type == "aws" ? 1 : 0
#   service_name = "${var.service_name}-${var.environment}"
#
#   source_configuration {
#     image_repository {
#       image_identifier      = var.image
#       image_repository_type = "ECR"
#       image_configuration {
#         port = tostring(var.port)
#         runtime_environment_variables = var.env_vars
#       }
#     }
#     auto_deployments_enabled = false
#   }
#
#   instance_configuration {
#     cpu    = var.cpu == "1" ? "1024" : var.cpu == "2" ? "2048" : "4096"
#     memory = var.memory == "512Mi" ? "2048" : var.memory == "1Gi" ? "3072" : "4096"
#   }
#
#   network_configuration {
#     egress_configuration {
#       egress_type       = var.aws_vpc_id != null ? "VPC" : "DEFAULT"
#       vpc_connector_arn = var.aws_vpc_id != null ? aws_apprunner_vpc_connector.connector[0].arn : null
#     }
#   }
#
#   health_check_configuration {
#     protocol            = "HTTP"
#     path                = "/health"
#     interval            = 10
#     timeout             = 5
#     healthy_threshold   = 1
#     unhealthy_threshold = 3
#   }
#
#   auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.scaling[0].arn
# }

# ============================================================================
# Azure Container Apps (Future Implementation)
# ============================================================================

# resource "azurerm_container_app" "service" {
#   count                        = var.provider_type == "azure" ? 1 : 0
#   name                         = "${var.service_name}-${var.environment}"
#   container_app_environment_id = var.azure_container_app_environment_id
#   resource_group_name          = var.azure_resource_group
#   revision_mode                = "Single"
#
#   template {
#     container {
#       name   = var.service_name
#       image  = var.image
#       cpu    = tonumber(var.cpu)
#       memory = replace(var.memory, "Mi", "") == var.memory ? var.memory : "${tonumber(replace(var.memory, "Mi", "")) / 1024}Gi"
#
#       dynamic "env" {
#         for_each = var.env_vars
#         content {
#           name  = env.key
#           value = env.value
#         }
#       }
#
#       liveness_probe {
#         transport = "HTTP"
#         path      = "/health"
#         port      = var.port
#       }
#
#       readiness_probe {
#         transport = "HTTP"
#         path      = "/health"
#         port      = var.port
#       }
#     }
#
#     min_replicas = var.min_instances
#     max_replicas = var.max_instances
#   }
#
#   ingress {
#     external_enabled = var.allow_unauthenticated
#     target_port      = var.port
#     traffic_weight {
#       percentage      = 100
#       latest_revision = true
#     }
#   }
# }

# ============================================================================
# Outputs
# ============================================================================

output "service_url" {
  description = "Service URL"
  value = try(
    google_cloud_run_v2_service.service[0].uri,
    # aws_apprunner_service.service[0].service_url,
    # "https://${azurerm_container_app.service[0].latest_revision_fqdn}",
    null
  )
}

output "service_name" {
  description = "Deployed service name"
  value = try(
    google_cloud_run_v2_service.service[0].name,
    # aws_apprunner_service.service[0].service_name,
    # azurerm_container_app.service[0].name,
    null
  )
}

output "service_id" {
  description = "Service ID"
  value = try(
    google_cloud_run_v2_service.service[0].id,
    # aws_apprunner_service.service[0].id,
    # azurerm_container_app.service[0].id,
    null
  )
}

output "latest_revision" {
  description = "Latest revision name (GCP only)"
  value = var.provider_type == "gcp" ? try(
    google_cloud_run_v2_service.service[0].latest_ready_revision,
    null
  ) : null
}
