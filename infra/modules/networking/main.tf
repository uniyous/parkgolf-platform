# Networking Module
# Multi-cloud abstraction for VPC and networking components
#
# ============================================================================
# IP Address Policy (Standard)
# ============================================================================
# 환경별 IP 대역 표준:
#   - 10.1.x.x: 예약됨 (uniyous VPC와 충돌 방지)
#   - 10.2.x.x: Dev 환경
#   - 10.3.x.x: Staging 환경
#   - 10.4.x.x: Prod 환경
#
# 서브넷 구성 (3rd octet):
#   - x.x.1.0/24: Public (외부 접근 가능)
#   - x.x.2.0/24: Private (내부 서비스, NATS VM 등)
#   - x.x.3.0/24: Data (데이터베이스, 스토리지)
#
# 예시:
#   Dev:     10.2.0.0/16, public=10.2.1.0/24, private=10.2.2.0/24, data=10.2.3.0/24
#   Staging: 10.3.0.0/16, public=10.3.1.0/24, private=10.3.2.0/24, data=10.3.3.0/24
#   Prod:    10.4.0.0/16, public=10.4.1.0/24, private=10.4.2.0/24, data=10.4.3.0/24
# ============================================================================

terraform {
  required_version = ">= 1.0"
}

# ============================================================================
# Locals - Environment-based IP defaults
# ============================================================================

locals {
  # Environment to IP octet mapping
  env_ip_octet = {
    dev     = 2
    staging = 3
    prod    = 4
  }

  # Get IP octet for current environment (default to 2 if not found)
  ip_octet = lookup(local.env_ip_octet, var.environment, 2)

  # Default CIDRs based on environment
  default_vpc_cidr = "10.${local.ip_octet}.0.0/16"
  default_subnet_cidrs = {
    public  = "10.${local.ip_octet}.1.0/24"
    private = "10.${local.ip_octet}.2.0/24"
    data    = "10.${local.ip_octet}.3.0/24"
  }

  # Use provided values or defaults
  vpc_cidr     = var.vpc_cidr != null ? var.vpc_cidr : local.default_vpc_cidr
  subnet_cidrs = var.subnet_cidrs != null ? var.subnet_cidrs : local.default_subnet_cidrs
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
  default     = null
  description = "VPC CIDR block (defaults based on environment: dev=10.2.0.0/16, staging=10.3.0.0/16, prod=10.4.0.0/16)"
}

variable "subnet_cidrs" {
  type        = map(string)
  default     = null
  description = "Subnet CIDR blocks (defaults based on environment)"
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
  ip_cidr_range            = local.subnet_cidrs["public"]
  region                   = var.region
  network                  = google_compute_network.vpc[0].id
  private_ip_google_access = true
}

# Private Subnet
resource "google_compute_subnetwork" "private" {
  count                    = var.provider_type == "gcp" ? 1 : 0
  name                     = "${var.network_name}-private-${var.environment}"
  ip_cidr_range            = local.subnet_cidrs["private"]
  region                   = var.region
  network                  = google_compute_network.vpc[0].id
  private_ip_google_access = true
}

# Data Subnet (for databases)
resource "google_compute_subnetwork" "data" {
  count                    = var.provider_type == "gcp" ? 1 : 0
  name                     = "${var.network_name}-data-${var.environment}"
  ip_cidr_range            = local.subnet_cidrs["data"]
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

  source_ranges = [local.vpc_cidr]
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
  value       = var.provider_type == "gcp" ? local.subnet_cidrs["private"] : null
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = var.provider_type == "gcp" ? local.vpc_cidr : null
}

# Direct VPC egress requires format: projects/{project}/global/networks/{network}
output "vpc_network_resource" {
  description = "VPC network resource path for Direct VPC egress (format: projects/{project}/global/networks/{network})"
  value       = var.provider_type == "gcp" ? "projects/${google_compute_network.vpc[0].project}/global/networks/${google_compute_network.vpc[0].name}" : null
}

# Direct VPC egress requires format: projects/{project}/regions/{region}/subnetworks/{subnetwork}
output "subnet_resources" {
  description = "Subnet resource paths for Direct VPC egress"
  value = var.provider_type == "gcp" ? {
    public  = "projects/${google_compute_subnetwork.public[0].project}/regions/${google_compute_subnetwork.public[0].region}/subnetworks/${google_compute_subnetwork.public[0].name}"
    private = "projects/${google_compute_subnetwork.private[0].project}/regions/${google_compute_subnetwork.private[0].region}/subnetworks/${google_compute_subnetwork.private[0].name}"
    data    = "projects/${google_compute_subnetwork.data[0].project}/regions/${google_compute_subnetwork.data[0].region}/subnetworks/${google_compute_subnetwork.data[0].name}"
  } : {}
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
