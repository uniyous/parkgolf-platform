# Secrets Management Module
# Multi-cloud abstraction for secrets/parameter storage

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

variable "project_id" {
  type        = string
  default     = null
  description = "GCP Project ID"
}

variable "environment" {
  type        = string
  description = "Environment: dev, staging, prod"
}

variable "secret_names" {
  type        = list(string)
  default     = []
  description = "List of secret names to create"
}

variable "secret_values" {
  type        = map(string)
  sensitive   = true
  default     = {}
  description = "Map of secret values (sensitive)"
}

variable "secret_descriptions" {
  type        = map(string)
  default     = {}
  description = "Map of secret descriptions"
}

variable "service_accounts" {
  type        = list(string)
  default     = []
  description = "Service accounts to grant access"
}

# Azure specific
variable "azure_resource_group" {
  type        = string
  default     = null
  description = "Azure Resource Group name"
}

variable "azure_location" {
  type        = string
  default     = null
  description = "Azure location"
}

variable "azure_tenant_id" {
  type        = string
  default     = null
  description = "Azure Tenant ID"
}

# ============================================================================
# GCP Secret Manager
# ============================================================================

locals {
  # Convert list to set for for_each (non-sensitive)
  secret_names_set = var.provider_type == "gcp" ? toset(var.secret_names) : toset([])
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = local.secret_names_set
  secret_id = "${each.value}-${var.environment}"

  labels = {
    environment = var.environment
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "versions" {
  for_each    = local.secret_names_set
  secret      = google_secret_manager_secret.secrets[each.value].id
  secret_data = var.secret_values[each.value]
}

# Grant access to service accounts
resource "google_secret_manager_secret_iam_member" "accessors" {
  for_each = var.provider_type == "gcp" ? {
    for pair in setproduct(var.secret_names, var.service_accounts) :
    "${pair[0]}-${pair[1]}" => {
      secret_name     = pair[0]
      service_account = pair[1]
    }
  } : {}

  secret_id = google_secret_manager_secret.secrets[each.value.secret_name].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.service_account}"
}

# ============================================================================
# AWS Secrets Manager (Future Implementation)
# ============================================================================

# resource "aws_secretsmanager_secret" "secrets" {
#   for_each    = var.provider_type == "aws" ? var.secrets : {}
#   name        = "${each.key}-${var.environment}"
#   description = each.value.description
#
#   tags = {
#     Environment = var.environment
#   }
# }

# resource "aws_secretsmanager_secret_version" "versions" {
#   for_each      = var.provider_type == "aws" ? var.secrets : {}
#   secret_id     = aws_secretsmanager_secret.secrets[each.key].id
#   secret_string = each.value.value
# }

# ============================================================================
# Azure Key Vault (Future Implementation)
# ============================================================================

# resource "azurerm_key_vault" "vault" {
#   count                      = var.provider_type == "azure" ? 1 : 0
#   name                       = "parkgolf-${var.environment}"
#   location                   = var.azure_location
#   resource_group_name        = var.azure_resource_group
#   tenant_id                  = var.azure_tenant_id
#   sku_name                   = "standard"
#   soft_delete_retention_days = 7
#   purge_protection_enabled   = var.environment == "prod"
# }

# resource "azurerm_key_vault_secret" "secrets" {
#   for_each     = var.provider_type == "azure" ? var.secrets : {}
#   name         = replace(each.key, "_", "-")
#   value        = each.value.value
#   key_vault_id = azurerm_key_vault.vault[0].id
# }

# ============================================================================
# Outputs
# ============================================================================

output "secret_ids" {
  description = "Secret IDs"
  value = var.provider_type == "gcp" ? {
    for k, v in google_secret_manager_secret.secrets : k => v.id
  } : {}
}

output "secret_names" {
  description = "Secret names"
  value = var.provider_type == "gcp" ? {
    for k, v in google_secret_manager_secret.secrets : k => v.secret_id
  } : {}
}

output "secret_versions" {
  description = "Secret version IDs"
  value = var.provider_type == "gcp" ? {
    for k, v in google_secret_manager_secret_version.versions : k => v.id
  } : {}
}

# Reference format for Cloud Run
output "secret_references" {
  description = "Secret references for Cloud Run env vars"
  value = var.provider_type == "gcp" ? {
    for k, v in google_secret_manager_secret.secrets : k => {
      secret_name = v.secret_id
      version     = "latest"
    }
  } : {}
}
