# Park Golf Platform - Production Environment (GitOps)
#
# 이 파일은 prod 환경의 네트워크 자원만 정의합니다.
# GKE 클러스터, ArgoCD, ESO, GCP Secret Manager 시드 등은
# cd-infra.yml(gke-setup) 워크플로우가 생성합니다.
# 워크로드(postgres/NATS/마이크로서비스)는 ArgoCD가 Helm chart로 동기화합니다.

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
    prefix = "environments/prod"
  }
}

# ============================================================================
# Local Variables
# ============================================================================

locals {
  environment   = "prod"
  provider_type = "gcp"
  project_id    = "parkgolf-uniyous"
  region        = "asia-northeast3"
}

# ============================================================================
# Provider Configuration
# ============================================================================

provider "google" {
  project = local.project_id
  region  = local.region
}

# ============================================================================
# Networking Module — VPC + Subnets (prod: 10.0.0.0/16, NAT 활성화)
# ============================================================================

module "networking" {
  source = "../../modules/networking"

  provider_type = local.provider_type
  network_name  = "parkgolf"
  environment   = local.environment
  region        = local.region

  vpc_cidr = "10.0.0.0/16"
  subnet_cidrs = {
    public  = "10.0.1.0/24"
    private = "10.0.2.0/24"
    data    = "10.0.3.0/24"
  }

  enable_vpc_connector              = false
  enable_nat                        = true
  enable_private_service_connection = false
}

# ============================================================================
# Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC Network ID"
  value       = module.networking.vpc_id
}

output "vpc_name" {
  description = "VPC Network name"
  value       = module.networking.vpc_name
}

output "subnet_ids" {
  description = "Subnet IDs by purpose"
  value       = module.networking.subnet_ids
}
