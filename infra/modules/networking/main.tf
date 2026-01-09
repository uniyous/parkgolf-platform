# Networking Module
# Multi-cloud abstraction for VPC and networking components

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

variable "network_name" {
  type        = string
  description = "Name of the network"
}

variable "environment" {
  type        = string
  description = "Environment: dev, staging, prod"
}

variable "region" {
  type        = string
  description = "Deployment region"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "VPC CIDR block"
}

variable "subnet_cidrs" {
  type = map(string)
  default = {
    public  = "10.0.1.0/24"
    private = "10.0.2.0/24"
    data    = "10.0.3.0/24"
  }
  description = "Subnet CIDR blocks"
}

variable "enable_nat" {
  type        = bool
  default     = true
  description = "Enable NAT for private subnets"
}

variable "enable_vpc_connector" {
  type        = bool
  default     = true
  description = "Enable VPC connector for serverless (GCP)"
}

variable "vpc_connector_cidr" {
  type        = string
  default     = "10.0.10.0/28"
  description = "VPC connector CIDR (GCP)"
}

variable "enable_private_service_connection" {
  type        = bool
  default     = true
  description = "Enable Private Service Connection for Cloud SQL (GCP)"
}

# Azure specific
variable "azure_resource_group" {
  type        = string
  default     = null
  description = "Azure Resource Group name"
}

# ============================================================================
# GCP VPC Network
# ============================================================================

resource "google_compute_network" "vpc" {
  count                   = var.provider_type == "gcp" ? 1 : 0
  name                    = "${var.network_name}-${var.environment}"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

# Public Subnet
resource "google_compute_subnetwork" "public" {
  count                    = var.provider_type == "gcp" ? 1 : 0
  name                     = "${var.network_name}-public-${var.environment}"
  ip_cidr_range            = var.subnet_cidrs["public"]
  region                   = var.region
  network                  = google_compute_network.vpc[0].id
  private_ip_google_access = true
}

# Private Subnet
resource "google_compute_subnetwork" "private" {
  count                    = var.provider_type == "gcp" ? 1 : 0
  name                     = "${var.network_name}-private-${var.environment}"
  ip_cidr_range            = var.subnet_cidrs["private"]
  region                   = var.region
  network                  = google_compute_network.vpc[0].id
  private_ip_google_access = true
}

# Data Subnet (for databases)
resource "google_compute_subnetwork" "data" {
  count                    = var.provider_type == "gcp" ? 1 : 0
  name                     = "${var.network_name}-data-${var.environment}"
  ip_cidr_range            = var.subnet_cidrs["data"]
  region                   = var.region
  network                  = google_compute_network.vpc[0].id
  private_ip_google_access = true
}

# VPC Connector for Cloud Run
resource "google_vpc_access_connector" "connector" {
  count         = var.provider_type == "gcp" && var.enable_vpc_connector ? 1 : 0
  name          = "${var.network_name}-connector-${var.environment}"
  ip_cidr_range = var.vpc_connector_cidr
  network       = google_compute_network.vpc[0].name
  region        = var.region

  min_instances = 2
  max_instances = 10
}

# Cloud NAT
resource "google_compute_router" "router" {
  count   = var.provider_type == "gcp" && var.enable_nat ? 1 : 0
  name    = "${var.network_name}-router-${var.environment}"
  region  = var.region
  network = google_compute_network.vpc[0].id
}

resource "google_compute_router_nat" "nat" {
  count  = var.provider_type == "gcp" && var.enable_nat ? 1 : 0
  name   = "${var.network_name}-nat-${var.environment}"
  router = google_compute_router.router[0].name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Private Service Connection (for Cloud SQL)
resource "google_compute_global_address" "private_ip_range" {
  count         = var.provider_type == "gcp" && var.enable_private_service_connection ? 1 : 0
  name          = "${var.network_name}-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc[0].id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  count                   = var.provider_type == "gcp" && var.enable_private_service_connection ? 1 : 0
  network                 = google_compute_network.vpc[0].id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range[0].name]
}

# Firewall Rules
resource "google_compute_firewall" "allow_internal" {
  count   = var.provider_type == "gcp" ? 1 : 0
  name    = "${var.network_name}-allow-internal-${var.environment}"
  network = google_compute_network.vpc[0].name

  allow {
    protocol = "tcp"
  }
  allow {
    protocol = "udp"
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = [var.vpc_cidr]
}

resource "google_compute_firewall" "allow_health_check" {
  count   = var.provider_type == "gcp" ? 1 : 0
  name    = "${var.network_name}-allow-health-check-${var.environment}"
  network = google_compute_network.vpc[0].name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080"]
  }

  # Google Cloud health check ranges
  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
  target_tags   = ["http-server", "https-server"]
}

resource "google_compute_firewall" "allow_ssh" {
  count   = var.provider_type == "gcp" ? 1 : 0
  name    = "${var.network_name}-allow-ssh-${var.environment}"
  network = google_compute_network.vpc[0].name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # IAP ranges
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["ssh"]
}

# ============================================================================
# AWS VPC (Future Implementation)
# ============================================================================

# resource "aws_vpc" "vpc" {
#   count                = var.provider_type == "aws" ? 1 : 0
#   cidr_block           = var.vpc_cidr
#   enable_dns_hostnames = true
#   enable_dns_support   = true
#
#   tags = {
#     Name        = "${var.network_name}-${var.environment}"
#     Environment = var.environment
#   }
# }

# ============================================================================
# Azure VNet (Future Implementation)
# ============================================================================

# resource "azurerm_virtual_network" "vnet" {
#   count               = var.provider_type == "azure" ? 1 : 0
#   name                = "${var.network_name}-${var.environment}"
#   location            = var.region
#   resource_group_name = var.azure_resource_group
#   address_space       = [var.vpc_cidr]
# }

# ============================================================================
# Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC/VNet ID"
  value = try(
    google_compute_network.vpc[0].id,
    # aws_vpc.vpc[0].id,
    # azurerm_virtual_network.vnet[0].id,
    null
  )
}

output "vpc_name" {
  description = "VPC/VNet name"
  value = try(
    google_compute_network.vpc[0].name,
    # aws_vpc.vpc[0].tags.Name,
    # azurerm_virtual_network.vnet[0].name,
    null
  )
}

output "vpc_self_link" {
  description = "VPC self link (GCP)"
  value       = var.provider_type == "gcp" ? google_compute_network.vpc[0].self_link : null
}

output "subnet_ids" {
  description = "Subnet IDs"
  value = var.provider_type == "gcp" ? {
    public  = google_compute_subnetwork.public[0].id
    private = google_compute_subnetwork.private[0].id
    data    = google_compute_subnetwork.data[0].id
  } : {}
}

output "subnet_self_links" {
  description = "Subnet self links (for Direct VPC egress)"
  value = var.provider_type == "gcp" ? {
    public  = google_compute_subnetwork.public[0].self_link
    private = google_compute_subnetwork.private[0].self_link
    data    = google_compute_subnetwork.data[0].self_link
  } : {}
}

output "private_subnet_cidr" {
  description = "Private subnet CIDR block"
  value       = var.provider_type == "gcp" ? var.subnet_cidrs["private"] : null
}

output "vpc_connector_id" {
  description = "VPC Connector ID (GCP)"
  value       = var.provider_type == "gcp" && var.enable_vpc_connector ? google_vpc_access_connector.connector[0].id : null
}

output "vpc_connector_name" {
  description = "VPC Connector name (GCP)"
  value       = var.provider_type == "gcp" && var.enable_vpc_connector ? google_vpc_access_connector.connector[0].name : null
}

output "private_vpc_connection" {
  description = "Private VPC connection for Cloud SQL (GCP)"
  value       = var.provider_type == "gcp" && var.enable_private_service_connection ? google_service_networking_connection.private_vpc_connection[0].id : null
}
