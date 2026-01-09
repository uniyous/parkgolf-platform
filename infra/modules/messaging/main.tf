# Messaging Module
# NATS JetStream for all messaging patterns (Request/Response + Pub/Sub)
#
# ============================================================================
# IMPORTANT: NATS Container Configuration
# ============================================================================
# NATS 2.10 버전에서 JetStream 설정 시 명령줄 인수 제한 사항:
#
# 지원되는 인수:
#   -js           : JetStream 활성화
#   -sd /data     : Storage directory 지정
#   -m 8222       : HTTP 모니터링 포트
#
# 지원되지 않는 인수 (설정 파일에서만 가능):
#   --jetstream_max_memory (X)
#   --jetstream_max_file (X)
#
# JetStream 메모리/파일 제한이 필요한 경우 nats.conf 설정 파일을 사용해야 함:
#   jetstream {
#     store_dir: /data
#     max_memory_store: 1G
#     max_file_store: 10G
#   }
#
# 트러블슈팅:
#   1. VM이 TERMINATED 상태인 경우:
#      gcloud compute instances start parkgolf-nats-{env} --zone={zone}
#
#   2. 컨테이너가 계속 재시작하는 경우:
#      SSH 접속 후 docker logs nats로 원인 확인
#      잘못된 인수 사용 시 컨테이너 수동 재생성 필요
#
#   3. Cloud Run에서 연결 실패:
#      - VPC Connector 상태 확인
#      - Firewall 규칙 확인 (4222 포트)
#      - NATS_URL 환경변수 확인
# ============================================================================

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

variable "name" {
  type        = string
  description = "Name of the messaging resources"
}

variable "environment" {
  type        = string
  description = "Environment: dev, staging, prod"
}

variable "region" {
  type        = string
  description = "Deployment region"
}

# NATS VM Configuration
variable "nats_machine_type" {
  type        = string
  default     = "e2-small"
  description = "Machine type for NATS VM"
}

variable "nats_disk_size" {
  type        = number
  default     = 20
  description = "Disk size in GB for NATS VM"
}

variable "nats_disk_type" {
  type        = string
  default     = "pd-ssd"
  description = "Disk type for NATS VM (pd-standard or pd-ssd)"
}

variable "nats_version" {
  type        = string
  default     = "2.10-alpine"
  description = "NATS Docker image version"
}

variable "vpc_network" {
  type        = string
  default     = null
  description = "VPC network for NATS VM"
}

variable "vpc_subnetwork" {
  type        = string
  default     = null
  description = "VPC subnetwork for NATS VM"
}

variable "private_subnet_cidr" {
  type        = string
  default     = null
  description = "Private subnet CIDR for Cloud Run Direct VPC egress firewall rules"
}

# JetStream Configuration
variable "jetstream_max_memory" {
  type        = string
  default     = "1G"
  description = "Maximum memory for JetStream storage"
}

variable "jetstream_max_file" {
  type        = string
  default     = "10G"
  description = "Maximum file storage for JetStream"
}

# Azure specific
variable "azure_resource_group" {
  type        = string
  default     = null
  description = "Azure Resource Group name"
}

# ============================================================================
# GCP - NATS JetStream on Compute Engine
# ============================================================================

resource "google_compute_instance" "nats" {
  count        = var.provider_type == "gcp" ? 1 : 0
  name         = "${var.name}-nats-${var.environment}"
  machine_type = var.nats_machine_type
  zone         = "${var.region}-a"

  tags = ["nats-server", "internal"]

  boot_disk {
    initialize_params {
      image = "cos-cloud/cos-stable"
      size  = var.nats_disk_size
      type  = var.nats_disk_type
    }
  }

  network_interface {
    network    = var.vpc_network
    subnetwork = var.vpc_subnetwork

    # External IP for Docker Hub access (required for pulling images)
    # NATS ports (4222, 6222, 8222) are protected by firewall rules (internal only)
    access_config {
      # Ephemeral external IP (no cost)
    }
  }

  metadata = {
    gce-container-declaration = yamlencode({
      spec = {
        containers = [{
          name  = "nats"
          image = "nats:${var.nats_version}"
          args = [
            "-js",                                    # Enable JetStream
            "-sd", "/data",                           # Storage directory
            "-m", "8222"                              # Monitoring port
          ]
          volumeMounts = [{
            name      = "nats-data"
            mountPath = "/data"
          }]
          ports = [
            { containerPort = 4222 },  # Client connections
            { containerPort = 6222 },  # Cluster routing
            { containerPort = 8222 }   # HTTP monitoring
          ]
          env = [
            { name = "NATS_SERVER_NAME", value = "${var.name}-nats-${var.environment}" }
          ]
        }]
        volumes = [{
          name = "nats-data"
          hostPath = {
            path = "/var/nats-data"
          }
        }]
        restartPolicy = "Always"
      }
    })
  }

  service_account {
    scopes = ["cloud-platform"]
  }

  scheduling {
    # NATS는 메시징 인프라로 안정성이 중요하므로 preemptible 사용 안함
    preemptible       = false
    automatic_restart = true
    on_host_maintenance = "MIGRATE"
  }

  labels = {
    environment = var.environment
    service     = "nats"
    component   = "messaging"
  }

  # lifecycle block removed to allow metadata updates via Terraform
}

# Firewall for NATS
resource "google_compute_firewall" "nats" {
  count   = var.provider_type == "gcp" ? 1 : 0
  name    = "${var.name}-allow-nats-${var.environment}"
  network = var.vpc_network

  allow {
    protocol = "tcp"
    ports    = ["4222", "6222", "8222"]
  }

  source_tags = ["internal"]
  target_tags = ["nats-server"]
}

# Firewall for NATS from Cloud Run (External IP access)
# Cloud Run uses dynamic external IPs from Google infrastructure
resource "google_compute_firewall" "nats_from_external" {
  count   = var.provider_type == "gcp" ? 1 : 0
  name    = "${var.name}-allow-nats-external-${var.environment}"
  network = var.vpc_network

  allow {
    protocol = "tcp"
    ports    = ["4222"]
  }

  # Allow from any IP (Cloud Run uses dynamic IPs)
  # Application-level security via NATS authentication can be added if needed
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["nats-server"]
}

# ============================================================================
# AWS - NATS on EC2 (Future Implementation)
# ============================================================================

# resource "aws_instance" "nats" {
#   count         = var.provider_type == "aws" ? 1 : 0
#   ami           = data.aws_ami.amazon_linux.id
#   instance_type = var.nats_machine_type == "e2-small" ? "t3.small" : "t3.medium"
#
#   user_data = <<-EOF
#     #!/bin/bash
#     docker run -d --name nats \
#       -p 4222:4222 -p 6222:6222 -p 8222:8222 \
#       -v /var/nats-data:/data \
#       nats:${var.nats_version} \
#       -js -sd /data --cluster_name parkgolf-cluster
#   EOF
# }

# ============================================================================
# Azure - NATS on Container Instance (Future Implementation)
# ============================================================================

# resource "azurerm_container_group" "nats" {
#   count               = var.provider_type == "azure" ? 1 : 0
#   name                = "${var.name}-nats-${var.environment}"
#   location            = var.region
#   resource_group_name = var.azure_resource_group
#   os_type             = "Linux"
#
#   container {
#     name   = "nats"
#     image  = "nats:${var.nats_version}"
#     cpu    = "1"
#     memory = "2"
#     commands = ["nats-server", "-js", "-sd", "/data"]
#   }
# }

# ============================================================================
# Outputs
# ============================================================================

output "nats_internal_ip" {
  description = "NATS VM internal IP"
  value = var.provider_type == "gcp" ? (
    length(google_compute_instance.nats) > 0 ?
    google_compute_instance.nats[0].network_interface[0].network_ip : null
  ) : null
}

output "nats_external_ip" {
  description = "NATS VM external IP (for Cloud Run access)"
  value = var.provider_type == "gcp" ? (
    length(google_compute_instance.nats) > 0 ?
    google_compute_instance.nats[0].network_interface[0].access_config[0].nat_ip : null
  ) : null
}

output "nats_url" {
  description = "NATS connection URL (uses external IP for Cloud Run access)"
  value = var.provider_type == "gcp" ? (
    length(google_compute_instance.nats) > 0 ?
    "nats://${google_compute_instance.nats[0].network_interface[0].access_config[0].nat_ip}:4222" : null
  ) : null
}

output "nats_internal_url" {
  description = "NATS internal connection URL (for VPC internal access)"
  value = var.provider_type == "gcp" ? (
    length(google_compute_instance.nats) > 0 ?
    "nats://${google_compute_instance.nats[0].network_interface[0].network_ip}:4222" : null
  ) : null
}

output "nats_monitoring_url" {
  description = "NATS monitoring endpoint (internal)"
  value = var.provider_type == "gcp" ? (
    length(google_compute_instance.nats) > 0 ?
    "http://${google_compute_instance.nats[0].network_interface[0].network_ip}:8222" : null
  ) : null
}

output "nats_instance_name" {
  description = "NATS VM instance name"
  value = var.provider_type == "gcp" ? (
    length(google_compute_instance.nats) > 0 ?
    google_compute_instance.nats[0].name : null
  ) : null
}
