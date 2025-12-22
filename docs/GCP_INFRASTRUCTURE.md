# GCP 인프라 세부 구성 가이드

## 목차
1. [전체 아키텍처 개요](#전체-아키텍처-개요)
2. [환경별 비교표](#환경별-비교표)
3. [네트워크 구성 (VPC/Subnet)](#네트워크-구성-vpcsubnet)
4. [보안 구성 (Firewall/IAM)](#보안-구성-firewalliam)
5. [컴퓨팅 리소스 (Cloud Run)](#컴퓨팅-리소스-cloud-run)
6. [데이터베이스 (Cloud SQL)](#데이터베이스-cloud-sql)
7. [메시징 (NATS JetStream)](#메시징-nats-jetstream)
8. [시크릿 관리](#시크릿-관리)
9. [모니터링/알림](#모니터링알림)
10. [비용 최적화](#비용-최적화)

---

## 전체 아키텍처 개요

### 인프라 전체 구성도

```mermaid
flowchart TB
    subgraph GCP["GCP Project: uniyous-319808<br/>Region: asia-northeast3 (Seoul)"]

        subgraph SHARED["Shared Resources"]
            AR[("Artifact<br/>Registry")]
            FH[("Firebase<br/>Hosting")]
            SM[("Secret<br/>Manager")]
            CM[("Cloud<br/>Monitoring")]
        end

        subgraph DEV["Development Environment"]
            subgraph DEV_VPC["VPC: parkgolf-dev (10.1.0.0/16)"]
                subgraph DEV_PUB["Public Subnet<br/>10.1.1.0/24"]
                    DEV_LB["Reserved<br/>(Load Balancer)"]
                end
                subgraph DEV_PRIV["Private Subnet<br/>10.1.2.0/24"]
                    DEV_NATS["NATS VM<br/>e2-small"]
                    DEV_CONN["VPC Connector<br/>10.1.10.0/28"]
                end
                subgraph DEV_DATA["Data Subnet<br/>10.1.3.0/24"]
                    DEV_SQL[("Cloud SQL<br/>db-f1-micro<br/>Private IP")]
                end
            end
            subgraph DEV_CR["Cloud Run Services (Scale to Zero)"]
                DEV_AUTH["auth-service"]
                DEV_COURSE["course-service"]
                DEV_BOOK["booking-service"]
                DEV_NOTIFY["notify-service"]
                DEV_ADMIN["admin-api"]
                DEV_USER["user-api"]
            end
        end

        subgraph PROD["Production Environment"]
            subgraph PROD_VPC["VPC: parkgolf-prod (10.0.0.0/16)"]
                subgraph PROD_PUB["Public Subnet<br/>10.0.1.0/24"]
                    PROD_LB["Reserved<br/>(Load Balancer)"]
                end
                subgraph PROD_PRIV["Private Subnet<br/>10.0.2.0/24"]
                    PROD_NATS["NATS VM<br/>e2-medium"]
                    PROD_CONN["VPC Connector<br/>10.0.10.0/28"]
                end
                subgraph PROD_DATA["Data Subnet<br/>10.0.3.0/24"]
                    PROD_SQL[("Cloud SQL<br/>HA + Backup<br/>Private IP")]
                end
            end
            subgraph PROD_CR["Cloud Run Services (Always On)"]
                PROD_AUTH["auth-service"]
                PROD_COURSE["course-service"]
                PROD_BOOK["booking-service"]
                PROD_NOTIFY["notify-service"]
                PROD_ADMIN["admin-api"]
                PROD_USER["user-api"]
            end
        end
    end

    INTERNET((Internet))

    INTERNET --> FH
    INTERNET --> DEV_CR
    INTERNET --> PROD_CR

    DEV_CR <--> DEV_CONN
    DEV_CONN <--> DEV_NATS
    DEV_CONN <--> DEV_SQL

    PROD_CR <--> PROD_CONN
    PROD_CONN <--> PROD_NATS
    PROD_CONN <--> PROD_SQL

    AR --> DEV_CR
    AR --> PROD_CR
    SM --> DEV_CR
    SM --> PROD_CR
```

### 서비스 통신 흐름도

```mermaid
flowchart LR
    subgraph CLIENT["Client Layer"]
        WEB["Web Browser"]
        MOBILE["Mobile App"]
    end

    subgraph HOSTING["Firebase Hosting (CDN)"]
        ADMIN_UI["Admin Dashboard<br/>React + Vite"]
        USER_UI["User WebApp<br/>React + Vite"]
    end

    subgraph BFF["BFF Layer (Cloud Run)"]
        ADMIN_API["admin-api<br/>:8080"]
        USER_API["user-api<br/>:8080"]
    end

    subgraph SERVICES["Microservices (Cloud Run)"]
        AUTH["auth-service"]
        COURSE["course-service"]
        BOOKING["booking-service"]
        NOTIFY["notify-service"]
    end

    subgraph MESSAGING["Messaging (VPC)"]
        NATS["NATS JetStream<br/>:4222"]
    end

    subgraph DATA["Data Layer (VPC)"]
        SQL[("PostgreSQL<br/>Cloud SQL")]
        REDIS[("Redis<br/>(Optional)")]
    end

    WEB --> ADMIN_UI
    WEB --> USER_UI
    MOBILE --> USER_API

    ADMIN_UI -->|HTTPS| ADMIN_API
    USER_UI -->|HTTPS| USER_API

    ADMIN_API -->|NATS| NATS
    USER_API -->|NATS| NATS

    NATS <-->|Request/Response| AUTH
    NATS <-->|Request/Response| COURSE
    NATS <-->|Request/Response| BOOKING
    NATS <-->|Pub/Sub| NOTIFY

    AUTH --> SQL
    COURSE --> SQL
    BOOKING --> SQL
    NOTIFY --> SQL

    AUTH -.-> REDIS
    BOOKING -.-> REDIS
```

### 네트워크 보안 구성도

```mermaid
flowchart TB
    subgraph EXTERNAL["External Access"]
        INTERNET((Internet))
        IAP["Identity-Aware Proxy<br/>35.235.240.0/20"]
        HEALTH["Google Health Check<br/>35.191.0.0/16"]
    end

    subgraph CLOUDRUN["Cloud Run (Managed)"]
        CR_SVC["Cloud Run Services<br/>*.run.app"]
    end

    subgraph VPC["VPC Network"]
        subgraph FIREWALL["Firewall Rules"]
            FW_INT["allow-internal<br/>All VPC CIDR"]
            FW_HC["allow-health-check<br/>80, 443, 8080"]
            FW_SSH["allow-ssh<br/>Port 22"]
            FW_NATS["allow-nats<br/>4222, 6222, 8222"]
        end

        CONNECTOR["VPC Connector<br/>Cloud Run ↔ VPC"]

        subgraph PRIVATE["Private Resources"]
            NATS_VM["NATS VM<br/>internal tag"]
            SQL_INST["Cloud SQL<br/>Private IP"]
        end
    end

    INTERNET -->|HTTPS| CR_SVC
    HEALTH -->|Health Check| CR_SVC
    CR_SVC <-->|VPC Connector| CONNECTOR

    CONNECTOR --> FW_INT
    FW_INT --> NATS_VM
    FW_INT --> SQL_INST

    HEALTH --> FW_HC
    IAP --> FW_SSH
    FW_SSH --> NATS_VM

    FW_NATS --> NATS_VM
```

### 환경별 배포 파이프라인

```mermaid
flowchart LR
    subgraph SOURCE["Source Control"]
        DEVELOP["develop branch"]
        MAIN["main branch"]
        TAG["Release Tag<br/>v1.x.x"]
    end

    subgraph CI["CI Pipeline"]
        LINT["Lint & Test"]
        BUILD["Build"]
        SCAN["Security Scan"]
    end

    subgraph CD["CD Pipeline"]
        DOCKER["Docker Build<br/>& Push"]
        TF_PLAN["Terraform Plan"]
        TF_APPLY["Terraform Apply"]
    end

    subgraph ENVS["Environments"]
        DEV_ENV["Development<br/>Auto Deploy"]
        STG_ENV["Staging<br/>Auto Deploy"]
        PROD_ENV["Production<br/>Manual Approval"]
    end

    DEVELOP --> LINT
    MAIN --> LINT

    LINT --> BUILD
    BUILD --> SCAN
    SCAN --> DOCKER

    DOCKER --> DEV_ENV
    MAIN --> STG_ENV
    TAG --> PROD_ENV

    DEVELOP --> TF_PLAN
    MAIN --> TF_PLAN
    TF_PLAN --> TF_APPLY
```

---

## 환경별 비교표

### 전체 리소스 비교

| 구분 | Development | Production |
|------|-------------|------------|
| **VPC CIDR** | 10.1.0.0/16 | 10.0.0.0/16 |
| **Public Subnet** | 10.1.1.0/24 (254 hosts) | 10.0.1.0/24 (254 hosts) |
| **Private Subnet** | 10.1.2.0/24 (254 hosts) | 10.0.2.0/24 (254 hosts) |
| **Data Subnet** | 10.1.3.0/24 (254 hosts) | 10.0.3.0/24 (254 hosts) |
| **VPC Connector** | 10.1.10.0/28 (14 hosts) | 10.0.10.0/28 (14 hosts) |
| **Cloud NAT** | Enabled | Enabled |
| **Cloud SQL Tier** | db-f1-micro | db-custom-2-4096 |
| **Cloud SQL HA** | Disabled | Enabled (Regional) |
| **Cloud SQL Backup** | Daily (7일 보관) | Daily (30일 보관) + PITR |
| **NATS VM** | e2-small (2 vCPU, 2GB) | e2-medium (2 vCPU, 4GB) |
| **Min Instances** | 0 (Scale to Zero) | 1-2 (Always On) |
| **Max Instances** | 2-3 | 10-20 |
| **삭제 보호** | Disabled | Enabled |
| **모니터링** | 기본 | 전체 + Uptime Check |
| **알림** | Email만 | Email + Slack |

---

## 네트워크 구성 (VPC/Subnet)

### VPC 네트워크 상세

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VPC Network Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────── Development VPC ──────────────────────────┐    │
│  │  Name: parkgolf-dev                                                  │    │
│  │  CIDR: 10.1.0.0/16 (65,536 IPs)                                     │    │
│  │  Routing Mode: REGIONAL                                              │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ PUBLIC SUBNET (parkgolf-public-dev)                          │    │    │
│  │  │ CIDR: 10.1.1.0/24 │ 254 usable IPs                          │    │    │
│  │  │ Purpose: Load Balancer, Bastion Host (if needed)            │    │    │
│  │  │ Private Google Access: Enabled                               │    │    │
│  │  │ Current Usage: Reserved for future use                       │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ PRIVATE SUBNET (parkgolf-private-dev)                        │    │    │
│  │  │ CIDR: 10.1.2.0/24 │ 254 usable IPs                          │    │    │
│  │  │ Purpose: Application workloads                               │    │    │
│  │  │ Resources:                                                   │    │    │
│  │  │   - NATS VM (10.1.2.x)                                       │    │    │
│  │  │   - VPC Connector → Cloud Run                                │    │    │
│  │  │ Private Google Access: Enabled                               │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ DATA SUBNET (parkgolf-data-dev)                              │    │    │
│  │  │ CIDR: 10.1.3.0/24 │ 254 usable IPs                          │    │    │
│  │  │ Purpose: Database and storage                                │    │    │
│  │  │ Resources:                                                   │    │    │
│  │  │   - Cloud SQL (Private IP via Service Networking)           │    │    │
│  │  │   - Redis (if deployed)                                      │    │    │
│  │  │ Private Google Access: Enabled                               │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ VPC CONNECTOR (parkgolf-connector-dev)                       │    │    │
│  │  │ CIDR: 10.1.10.0/28 │ 14 usable IPs                          │    │    │
│  │  │ Purpose: Cloud Run ↔ VPC 통신                                │    │    │
│  │  │ Min/Max Instances: 2-10                                      │    │    │
│  │  │ Machine Type: e2-micro                                       │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────── Production VPC ───────────────────────────┐    │
│  │  Name: parkgolf-prod                                                 │    │
│  │  CIDR: 10.0.0.0/16 (65,536 IPs)                                     │    │
│  │  Routing Mode: REGIONAL                                              │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ PUBLIC SUBNET (parkgolf-public-prod)                         │    │    │
│  │  │ CIDR: 10.0.1.0/24 │ 254 usable IPs                          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ PRIVATE SUBNET (parkgolf-private-prod)                       │    │    │
│  │  │ CIDR: 10.0.2.0/24 │ 254 usable IPs                          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ DATA SUBNET (parkgolf-data-prod)                             │    │    │
│  │  │ CIDR: 10.0.3.0/24 │ 254 usable IPs                          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ VPC CONNECTOR (parkgolf-connector-prod)                      │    │    │
│  │  │ CIDR: 10.0.10.0/28 │ 14 usable IPs                          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cloud NAT 구성

Cloud Run에서 외부 API 호출 시 고정 IP가 필요하거나, Private 서브넷의 VM이 인터넷 접근이 필요할 때 사용됩니다.

| 설정 | Development | Production |
|------|-------------|------------|
| **Router Name** | parkgolf-router-dev | parkgolf-router-prod |
| **NAT Name** | parkgolf-nat-dev | parkgolf-nat-prod |
| **IP 할당** | AUTO_ONLY | AUTO_ONLY (or MANUAL for 고정 IP) |
| **서브넷 범위** | ALL_SUBNETWORKS | ALL_SUBNETWORKS |
| **로깅** | ERRORS_ONLY | ALL (디버깅용) |

### Private Service Connection (Cloud SQL용)

Cloud SQL에 Private IP로 접근하기 위한 VPC Peering 설정입니다.

```
┌─────────────────┐     VPC Peering     ┌─────────────────┐
│   parkgolf VPC  │◄──────────────────►│ Google Services │
│   10.x.0.0/16   │                     │   VPC Network   │
└─────────────────┘                     └─────────────────┘
        │                                       │
        ▼                                       ▼
┌─────────────────┐                     ┌─────────────────┐
│  Cloud Run      │                     │   Cloud SQL     │
│  VPC Connector  │ ─────Private IP────►│   Private IP    │
└─────────────────┘                     └─────────────────┘
```

---

## 보안 구성 (Firewall/IAM)

### Firewall Rules 상세

#### 1. Internal 통신 허용

```hcl
# 모든 VPC 내부 통신 허용
firewall "parkgolf-allow-internal-{env}" {
  direction     = INGRESS
  priority      = 1000
  source_ranges = ["{VPC_CIDR}"]  # 10.1.0.0/16 or 10.0.0.0/16

  allow {
    protocol = "tcp"    # 모든 TCP 포트
    protocol = "udp"    # 모든 UDP 포트
    protocol = "icmp"   # Ping
  }
}
```

**적용 대상:**
- NATS VM ↔ Cloud Run (via VPC Connector)
- Cloud Run ↔ Cloud SQL
- 내부 서비스 간 통신

#### 2. Health Check 허용

```hcl
# Google Load Balancer Health Check 허용
firewall "parkgolf-allow-health-check-{env}" {
  direction     = INGRESS
  priority      = 1000

  # Google Health Check IP 범위
  source_ranges = [
    "35.191.0.0/16",    # Global LB Health Check
    "130.211.0.0/22"    # Legacy Health Check
  ]

  target_tags = ["http-server", "https-server"]

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080"]
  }
}
```

**적용 대상:**
- Cloud Run 서비스 Health Check
- VM 기반 서비스 Health Check

#### 3. SSH 접근 (IAP 경유)

```hcl
# Identity-Aware Proxy를 통한 SSH 접근
firewall "parkgolf-allow-ssh-{env}" {
  direction     = INGRESS
  priority      = 1000

  # IAP IP 범위
  source_ranges = ["35.235.240.0/20"]

  target_tags = ["ssh"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}
```

**사용 방법:**
```bash
# IAP 터널을 통한 SSH 접속
gcloud compute ssh nats-vm-dev --tunnel-through-iap
```

#### 4. NATS 통신 (내부 전용)

```hcl
# NATS 서버 포트 (내부 통신만 허용)
firewall "parkgolf-allow-nats-{env}" {
  direction = INGRESS
  priority  = 1000

  source_tags = ["internal"]
  target_tags = ["nats-server"]

  allow {
    protocol = "tcp"
    ports    = [
      "4222",   # Client connections
      "6222",   # Cluster routing
      "8222"    # HTTP monitoring
    ]
  }
}
```

### Firewall Rules 매트릭스

| Rule Name | Source | Target | Ports | Dev | Prod |
|-----------|--------|--------|-------|-----|------|
| allow-internal | VPC CIDR | All | All TCP/UDP/ICMP | ✅ | ✅ |
| allow-health-check | 35.191.0.0/16, 130.211.0.0/22 | http-server | 80, 443, 8080 | ✅ | ✅ |
| allow-ssh | 35.235.240.0/20 (IAP) | ssh | 22 | ✅ | ✅ |
| allow-nats | internal tag | nats-server | 4222, 6222, 8222 | ✅ | ✅ |
| deny-all-ingress | 0.0.0.0/0 | All | All | Implicit | Implicit |

### IAM 구성

#### Service Accounts

| Service Account | Purpose | Roles | Environment |
|-----------------|---------|-------|-------------|
| `auth-service-{env}@project.iam` | Auth Service | Cloud SQL Client, Secret Accessor | Both |
| `course-service-{env}@project.iam` | Course Service | Cloud SQL Client, Secret Accessor | Both |
| `booking-service-{env}@project.iam` | Booking Service | Cloud SQL Client, Secret Accessor | Both |
| `notify-service-{env}@project.iam` | Notify Service | Cloud SQL Client, Secret Accessor | Both |
| `admin-api-{env}@project.iam` | Admin BFF | Cloud SQL Client, Secret Accessor | Both |
| `user-api-{env}@project.iam` | User BFF | Cloud SQL Client, Secret Accessor | Both |

#### IAM Roles 상세

```hcl
# Cloud SQL 접근 권한
resource "google_project_iam_member" "sql_client" {
  role   = "roles/cloudsql.client"
  member = "serviceAccount:${service_account.email}"
}

# Secret Manager 읽기 권한
resource "google_secret_manager_secret_iam_member" "accessor" {
  role   = "roles/secretmanager.secretAccessor"
  member = "serviceAccount:${service_account.email}"
}

# Artifact Registry 읽기 권한 (Docker 이미지 Pull)
resource "google_project_iam_member" "artifact_reader" {
  role   = "roles/artifactregistry.reader"
  member = "serviceAccount:${service_account.email}"
}
```

### Security Best Practices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Security Architecture                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─── External Access ───┐                                                  │
│  │                       │                                                  │
│  │  Internet             │                                                  │
│  │      │                │                                                  │
│  │      ▼                │                                                  │
│  │  Cloud Run (HTTPS)    │  ← Public Endpoint (*.run.app)                  │
│  │  Firebase Hosting     │  ← Static Content (CDN)                         │
│  │                       │                                                  │
│  └───────────────────────┘                                                  │
│                                                                              │
│  ┌─── Internal Access ───┐                                                  │
│  │                       │                                                  │
│  │  Cloud Run            │                                                  │
│  │      │                │                                                  │
│  │      ▼ (VPC Connector)│                                                  │
│  │  Private Subnet       │                                                  │
│  │      │                │                                                  │
│  │      ├──► NATS VM     │  ← Private IP Only (10.x.2.x:4222)             │
│  │      │                │                                                  │
│  │      ▼ (VPC Peering)  │                                                  │
│  │  Cloud SQL            │  ← Private IP Only (No Public IP)               │
│  │                       │                                                  │
│  └───────────────────────┘                                                  │
│                                                                              │
│  ┌─── Admin Access ──────┐                                                  │
│  │                       │                                                  │
│  │  Developer PC         │                                                  │
│  │      │                │                                                  │
│  │      ▼ (IAP Tunnel)   │                                                  │
│  │  NATS VM (SSH)        │  ← IAP 인증 필수                                 │
│  │  Cloud SQL (Proxy)    │  ← cloud_sql_proxy 사용                          │
│  │                       │                                                  │
│  └───────────────────────┘                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 컴퓨팅 리소스 (Cloud Run)

### 서비스별 스펙 비교

#### Development Environment

| Service | CPU | Memory | Min | Max | Scale to Zero | Timeout |
|---------|-----|--------|-----|-----|---------------|---------|
| auth-service | 1 | 512Mi | 0 | 3 | ✅ | 300s |
| course-service | 1 | 512Mi | 0 | 3 | ✅ | 300s |
| booking-service | 1 | 512Mi | 0 | 3 | ✅ | 300s |
| notify-service | 1 | 256Mi | 0 | 2 | ✅ | 300s |
| admin-api | 1 | 512Mi | 0 | 3 | ✅ | 300s |
| user-api | 1 | 512Mi | 0 | 3 | ✅ | 300s |

#### Production Environment

| Service | CPU | Memory | Min | Max | Scale to Zero | Timeout |
|---------|-----|--------|-----|-----|---------------|---------|
| auth-service | 2 | 1Gi | 1 | 10 | ❌ | 300s |
| course-service | 2 | 1Gi | 1 | 10 | ❌ | 300s |
| booking-service | 2 | 1Gi | 1 | 15 | ❌ | 300s |
| notify-service | 1 | 512Mi | 1 | 5 | ❌ | 300s |
| admin-api | 2 | 1Gi | 1 | 10 | ❌ | 300s |
| user-api | 2 | 2Gi | 2 | 20 | ❌ | 300s |

### Cloud Run 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Cloud Run Service Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          Cloud Run Service                           │    │
│  │                                                                      │    │
│  │  ┌─── Revision 1 (Current) ────────────────────────────────────┐    │    │
│  │  │                                                              │    │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │    │    │
│  │  │  │Container │  │Container │  │Container │  ... (Auto-scale) │    │    │
│  │  │  │ Instance │  │ Instance │  │ Instance │                   │    │    │
│  │  │  └──────────┘  └──────────┘  └──────────┘                   │    │    │
│  │  │       │             │             │                          │    │    │
│  │  │       └─────────────┼─────────────┘                          │    │    │
│  │  │                     │                                        │    │    │
│  │  │              VPC Connector                                   │    │    │
│  │  │                     │                                        │    │    │
│  │  └─────────────────────│────────────────────────────────────────┘    │    │
│  │                        │                                              │    │
│  │  ┌─────────────────────▼────────────────────────────────────────┐    │    │
│  │  │                    VPC Network                                │    │    │
│  │  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │    │    │
│  │  │  │   NATS VM    │    │  Cloud SQL   │    │    Redis     │   │    │    │
│  │  │  │ 10.x.2.x:4222│    │  10.x.3.x    │    │  10.x.3.x    │   │    │    │
│  │  │  └──────────────┘    └──────────────┘    └──────────────┘   │    │    │
│  │  └───────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Container Configuration

```hcl
# Cloud Run Container 설정 예시
containers {
  image = "asia-northeast3-docker.pkg.dev/project/repo/service:tag"

  ports {
    container_port = 8080  # NestJS 기본 포트
  }

  resources {
    limits = {
      cpu    = "2"      # Production
      memory = "1Gi"
    }
    cpu_idle = false    # Production: Always allocated
  }

  # 환경 변수 (일반)
  env {
    name  = "NODE_ENV"
    value = "production"
  }

  # 환경 변수 (Secret)
  env {
    name = "DATABASE_URL"
    value_source {
      secret_key_ref {
        secret  = "db-password-prod"
        version = "latest"
      }
    }
  }

  # Startup Probe
  startup_probe {
    http_get {
      path = "/health"
      port = 8080
    }
    initial_delay_seconds = 5
    period_seconds        = 10
    failure_threshold     = 3
  }

  # Liveness Probe
  liveness_probe {
    http_get {
      path = "/health"
      port = 8080
    }
    period_seconds    = 30
    failure_threshold = 3
  }
}
```

---

## 데이터베이스 (Cloud SQL)

### 인스턴스 비교

| 설정 | Development | Production |
|------|-------------|------------|
| **Instance Name** | parkgolf-db-dev | parkgolf-db-prod |
| **PostgreSQL Version** | 15 | 15 |
| **Machine Type** | db-f1-micro | db-custom-2-4096 |
| **vCPU** | Shared | 2 Dedicated |
| **Memory** | 614 MB | 4 GB |
| **Storage** | 20 GB SSD | 100 GB SSD |
| **Storage Auto-resize** | Enabled | Enabled |
| **Availability** | Single Zone | Regional (HA) |
| **Backup** | Daily, 7일 보관 | Daily, 30일 보관 |
| **Point-in-Time Recovery** | Disabled | Enabled |
| **Maintenance Window** | Sunday 03:00 | Sunday 03:00 |
| **Deletion Protection** | Disabled | Enabled |
| **Public IP** | Disabled | Disabled |
| **Private IP** | Enabled | Enabled |
| **Max Connections** | 25 | 100 |

### 데이터베이스 구조

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Cloud SQL Instance: parkgolf-db-{env}                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                              Databases                                 │  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   auth_db   │  │  course_db  │  │ booking_db  │  │  notify_db  │  │  │
│  │  │             │  │             │  │             │  │             │  │  │
│  │  │ - users     │  │ - companies │  │ - bookings  │  │ - templates │  │  │
│  │  │ - sessions  │  │ - courses   │  │ - payments  │  │ - logs      │  │  │
│  │  │ - tokens    │  │ - holes     │  │ - schedules │  │ - queues    │  │  │
│  │  │ - roles     │  │ - time_slots│  │             │  │             │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           Connection Info                              │  │
│  │                                                                        │  │
│  │  Private IP: 10.x.3.x (via VPC Peering)                               │  │
│  │  Port: 5432                                                            │  │
│  │  User: parkgolf                                                        │  │
│  │                                                                        │  │
│  │  Connection String:                                                    │  │
│  │  postgresql://parkgolf:****@10.x.3.x:5432/{db_name}?schema=public     │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Production Features                            │  │
│  │                                                                        │  │
│  │  [✓] High Availability (Regional)                                     │  │
│  │      Primary: asia-northeast3-a                                        │  │
│  │      Standby: asia-northeast3-b (auto-failover)                       │  │
│  │                                                                        │  │
│  │  [✓] Automated Backups                                                │  │
│  │      Window: 03:00 - 04:00 KST                                        │  │
│  │      Retention: 30 days                                                │  │
│  │                                                                        │  │
│  │  [✓] Point-in-Time Recovery                                           │  │
│  │      Binary logging enabled                                            │  │
│  │      Recovery to any point in last 30 days                            │  │
│  │                                                                        │  │
│  │  [✓] Query Insights                                                   │  │
│  │      Query plans per minute: 5                                         │  │
│  │      Query string length: 1024                                         │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cloud SQL 접속 방법

```bash
# 1. Cloud SQL Proxy 사용 (로컬 개발)
cloud-sql-proxy uniyous-319808:asia-northeast3:parkgolf-db-dev \
  --private-ip \
  --port 5432

# 2. IAP 터널 + psql (직접 접속)
gcloud compute ssh nats-vm-dev --tunnel-through-iap -- \
  psql -h 10.1.3.x -U parkgolf -d auth_db

# 3. Cloud Run에서 (자동 연결)
# DATABASE_URL 환경변수로 자동 설정됨
```

---

## 메시징 (NATS JetStream)

NATS JetStream은 **모든 메시징 패턴**을 통합 처리합니다:
- **Request/Response**: 서비스 간 동기 호출
- **Pub/Sub**: 비동기 알림 처리
- **Event Sourcing**: 이벤트 로그 및 감사

### NATS VM 구성

| 설정 | Development | Production |
|------|-------------|------------|
| **VM Name** | parkgolf-nats-dev | parkgolf-nats-prod |
| **Machine Type** | e2-small | e2-medium |
| **vCPU** | 2 (Shared) | 2 (Dedicated) |
| **Memory** | 2 GB | 4 GB |
| **Disk** | 20 GB SSD | 50 GB SSD |
| **OS** | Container-Optimized OS | Container-Optimized OS |
| **NATS Version** | 2.10-alpine | 2.10-alpine |
| **JetStream Max Memory** | 512M | 2G |
| **JetStream Max File** | 5G | 20G |
| **Preemptible** | Yes (비용 절감) | No (안정성) |
| **Auto Restart** | No | Yes |
| **Internal IP** | 10.1.2.x | 10.0.2.x |
| **External IP** | None | None |

### NATS JetStream 아키텍처

```mermaid
flowchart TB
    subgraph VM["NATS Server VM"]
        subgraph NATS["NATS JetStream"]
            PORTS["Ports<br/>4222: Client<br/>6222: Cluster<br/>8222: Monitor"]

            subgraph STREAMS["JetStream Streams"]
                S1["SERVICES<br/>Request/Response<br/>auth.*, course.*, booking.*"]
                S2["NOTIFICATIONS<br/>Pub/Sub (Work Queue)<br/>notification.>"]
                S3["EVENTS<br/>Event Sourcing<br/>events.>"]
            end

            subgraph CONSUMERS["Consumers"]
                C1["email-worker"]
                C2["push-worker"]
                C3["sms-worker"]
                C4["notify-service"]
            end
        end

        DISK[("/data<br/>Persistent SSD")]
    end

    subgraph CLOUDRUN["Cloud Run Services"]
        AUTH["auth-service"]
        COURSE["course-service"]
        BOOKING["booking-service"]
        NOTIFY["notify-service"]
        ADMIN["admin-api"]
        USER["user-api"]
    end

    CONNECTOR["VPC Connector"]

    CLOUDRUN --> CONNECTOR
    CONNECTOR -->|"nats://10.x.2.x:4222"| PORTS

    S2 --> C1
    S2 --> C2
    S2 --> C3
    S2 --> C4

    STREAMS --> DISK
```

### NATS Container 설정 (중요)

NATS 2.10 버전에서 JetStream 설정을 위한 **올바른 명령줄 인수**:

```bash
# 올바른 NATS 컨테이너 실행 명령
docker run -d --name nats \
  -p 4222:4222 \
  -p 6222:6222 \
  -p 8222:8222 \
  -v /var/nats-data:/data \
  nats:2.10-alpine \
  -js \           # JetStream 활성화
  -sd /data \     # Storage directory
  -m 8222         # Monitoring port

# ⚠️ 주의: 다음 옵션들은 NATS 2.10에서 지원되지 않음
# --jetstream_max_memory (X) - 설정 파일에서만 지원
# --jetstream_max_file (X) - 설정 파일에서만 지원
```

JetStream 메모리/파일 제한 설정이 필요한 경우, 설정 파일(nats.conf)을 사용해야 합니다:

```conf
# nats.conf 예시
jetstream {
  store_dir: /data
  max_memory_store: 1G
  max_file_store: 10G
}
```

### Cloud Run에서 NATS 연결

Cloud Run 서비스는 VPC Connector를 통해 NATS VM에 연결합니다:

```typescript
// NestJS 서비스에서 NATS 연결 설정 (auth.module.ts 예시)
ClientsModule.registerAsync([
  {
    name: 'NATS_CLIENT',
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.NATS,
      options: {
        servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
      },
    }),
    inject: [ConfigService],
  },
]),
```

환경변수 설정:
- **Development**: `NATS_URL=nats://10.1.2.x:4222` (Private IP)
- **Production**: `NATS_URL=nats://10.0.2.x:4222` (Private IP)

### JetStream Streams 구성

| Stream | Purpose | Subjects | Retention | Max Age |
|--------|---------|----------|-----------|---------|
| **SERVICES** | Request/Response | `auth.*`, `course.*`, `booking.*`, `users.*` | limits | 24h |
| **NOTIFICATIONS** | Pub/Sub 알림 | `notification.>` | workqueue | 7d |
| **EVENTS** | Event Sourcing | `events.>` | limits | 30d |

### JetStream Consumers (NOTIFICATIONS)

| Consumer | Filter | Purpose | Max Deliver |
|----------|--------|---------|-------------|
| email-worker | `notification.email.>` | 이메일 발송 | 5 |
| push-worker | `notification.push.>` | 푸시 알림 | 5 |
| sms-worker | `notification.sms.>` | SMS 발송 | 3 |
| notify-service | `notification.>` | 전체 알림 처리 | 5 |

### Message Patterns

```mermaid
flowchart LR
    subgraph REQ_RES["Request/Response Pattern"]
        A1[admin-api] -->|"course.findAll"| NATS1((NATS))
        NATS1 -->|response| A1
        NATS1 -->|"course.findAll"| CS[course-service]
        CS -->|response| NATS1
    end

    subgraph PUB_SUB["Pub/Sub Pattern"]
        B1[booking-service] -->|"notification.email.booking_created"| NATS2((NATS))
        NATS2 -->|consume| EW[email-worker]
        NATS2 -->|consume| PW[push-worker]
    end

    subgraph EVENT["Event Sourcing Pattern"]
        C1[auth-service] -->|"events.user.login"| NATS3((NATS))
        NATS3 -.->|store| DISK[(JetStream)]
        NATS3 -.->|replay| ANALYTICS[Analytics]
    end
```

### 서비스별 Message Patterns

| Service | Subscribe (Request) | Publish (Event/Notification) |
|---------|---------------------|------------------------------|
| auth-service | `auth.*`, `users.*`, `auth.admin.*` | `events.user.*`, `notification.email.welcome` |
| course-service | `course.*`, `hole.*`, `company.*`, `time-slot.*` | `events.course.*` |
| booking-service | `booking.*` | `events.booking.*`, `notification.email.booking_*`, `notification.push.reminder` |
| notify-service | `notification.>` (Consumer) | - |
| admin-api | - | `auth.admin.*`, `course.*`, `booking.*` |
| user-api | - | `auth.*`, `booking.*`, `course.findAll` |

### JetStream 초기화

```bash
# JetStream 초기화 스크립트 실행
cd scripts/nats
NATS_URL=nats://10.1.2.x:4222 ./init-jetstream.sh

# 또는 개별 Stream 생성
nats stream add NOTIFICATIONS \
  --subjects "notification.>" \
  --retention work \
  --max-age 7d \
  --server nats://10.1.2.x:4222
```

---

## 시크릿 관리

### Secret Manager 구성

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Secret Manager                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────── Development Secrets ──────────────────────────────┐   │
│  │                                                                       │   │
│  │  db-password-dev          ─► Database password                       │   │
│  │  jwt-secret-dev           ─► JWT signing key (32+ chars)             │   │
│  │  jwt-refresh-secret-dev   ─► JWT refresh key                         │   │
│  │                                                                       │   │
│  │  Access: auth-service-dev, course-service-dev, ...                   │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────── Production Secrets ───────────────────────────────┐   │
│  │                                                                       │   │
│  │  db-password-prod          ─► Database password (Strong)             │   │
│  │  jwt-secret-prod           ─► JWT signing key (64+ chars)            │   │
│  │  jwt-refresh-secret-prod   ─► JWT refresh key                        │   │
│  │  slack-webhook-token       ─► Slack notification token               │   │
│  │  firebase-admin-key        ─► Firebase Admin SDK (Optional)          │   │
│  │                                                                       │   │
│  │  Access: auth-service-prod, course-service-prod, ...                 │   │
│  │  Rotation: Recommended every 90 days                                 │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cloud Run에서 Secret 사용

```hcl
# Terraform 설정
env {
  name = "DATABASE_URL"
  value_source {
    secret_key_ref {
      secret  = "db-password-prod"
      version = "latest"  # or specific version "1"
    }
  }
}

# Cloud Run YAML
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        key: latest
        name: db-password-prod
```

---

## 모니터링/알림

### 모니터링 구성 비교

| 기능 | Development | Production |
|------|-------------|------------|
| **Cloud Monitoring** | Basic | Full |
| **Alert Policies** | Limited | Complete |
| **Notification Channels** | Email only | Email + Slack |
| **Uptime Checks** | Disabled | Enabled |
| **Dashboard** | Basic | Custom |
| **Log Retention** | 30 days | 365 days |
| **Latency Threshold** | 3000ms | 1000ms |
| **Error Rate Threshold** | 10% | 5% |

### Alert Policies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Monitoring Dashboard                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─── High Latency Alert ────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Condition: request_latencies P95 > 1000ms (prod) / 3000ms (dev)      │  │
│  │  Duration:  60 seconds                                                 │  │
│  │  Services:  All Cloud Run services                                     │  │
│  │  Notify:    Email + Slack (prod)                                       │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─── High Error Rate Alert ─────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Condition: 5xx error rate > 5% (prod) / 10% (dev)                    │  │
│  │  Duration:  60 seconds                                                 │  │
│  │  Services:  All Cloud Run services                                     │  │
│  │  Notify:    Email + Slack (prod)                                       │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─── Max Instances Alert ───────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Condition: instance_count > 80% of max_instances                     │  │
│  │  Duration:  300 seconds                                                │  │
│  │  Action:    Scale review needed                                        │  │
│  │  Notify:    Email + Slack (prod)                                       │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─── Uptime Check Failed (Production Only) ─────────────────────────────┐  │
│  │                                                                        │  │
│  │  Targets:   admin-api-prod, user-api-prod                             │  │
│  │  Endpoint:  /health                                                    │  │
│  │  Interval:  60 seconds                                                 │  │
│  │  Timeout:   10 seconds                                                 │  │
│  │  Notify:    Email + Slack (immediate)                                  │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 비용 최적화

### 환경별 예상 비용 (월간)

#### Development Environment (최소 구성)

| 리소스 | 스펙 | 예상 비용 (USD) |
|--------|------|-----------------|
| Cloud Run (6 services) | Scale to Zero, 1 vCPU | ~$5-20 |
| Cloud SQL | db-f1-micro, 20GB | ~$10 |
| NATS VM | e2-small, Preemptible | ~$5 |
| VPC Connector | 2-10 instances | ~$10 |
| Cloud NAT | Light usage | ~$5 |
| Secret Manager | 3 secrets | ~$0.50 |
| Artifact Registry | ~5GB | ~$1 |
| **Total** | | **~$35-50/month** |

#### Production Environment (권장 구성)

| 리소스 | 스펙 | 예상 비용 (USD) |
|--------|------|-----------------|
| Cloud Run (6 services) | Always On, 2 vCPU | ~$150-300 |
| Cloud SQL | db-custom-2-4096, HA, 100GB | ~$150 |
| NATS VM | e2-medium | ~$30 |
| VPC Connector | 2-10 instances | ~$20 |
| Cloud NAT | Moderate usage | ~$15 |
| Cloud Monitoring | Full suite | ~$20 |
| Secret Manager | 5 secrets | ~$1 |
| Artifact Registry | ~10GB | ~$2 |
| Firebase Hosting | CDN bandwidth | ~$10-50 |
| **Total** | | **~$400-600/month** |

### 비용 절감 전략

1. **Development**
   - Cloud Run: Scale to Zero 활성화
   - VM: Preemptible 사용 (70% 절감)
   - Cloud SQL: Smallest tier (db-f1-micro)

2. **Production**
   - Committed Use Discounts (1-3년 약정)
   - Cloud Run: 최적의 min/max instances 설정
   - Cloud SQL: HA는 필수, 적절한 tier 선택

---

## Terraform State 관리

### Backend 구성

```hcl
# GCS Backend (권장)
terraform {
  backend "gcs" {
    bucket = "parkgolf-terraform-state"
    prefix = "environments/{env}"
  }
}
```

### State 버킷 생성

```bash
# Terraform State 버킷 생성
gsutil mb -p uniyous-319808 -l asia-northeast3 gs://parkgolf-terraform-state

# 버전 관리 활성화
gsutil versioning set on gs://parkgolf-terraform-state

# 접근 권한 설정
gsutil iam ch serviceAccount:terraform@uniyous-319808.iam.gserviceaccount.com:objectAdmin gs://parkgolf-terraform-state
```

---

## 배포 명령어

### 초기 설정

```bash
# 1. GCP 인증
gcloud auth application-default login

# 2. Terraform 초기화
cd infra/environments/dev
terraform init

# 3. 변수 파일 생성
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars 편집

# 4. Plan 확인
terraform plan

# 5. Apply
terraform apply
```

### 환경별 배포

```bash
# Development
cd infra/environments/dev
terraform apply

# Production (주의 필요)
cd infra/environments/prod
terraform plan -out=tfplan
# 검토 후
terraform apply tfplan
```

---

## NATS 트러블슈팅 가이드

### 일반적인 문제 및 해결 방법

#### 1. NATS VM이 TERMINATED 상태인 경우

```bash
# VM 상태 확인
gcloud compute instances list --filter="name~nats"

# VM 시작
gcloud compute instances start parkgolf-nats-dev \
  --zone=asia-northeast3-a \
  --project=parkgolf-uniyous
```

#### 2. NATS 컨테이너가 계속 재시작하는 경우

원인: 잘못된 명령줄 인수 (예: `--jetstream_max_memory`)

```bash
# SSH 접속 (IAP 터널 사용)
gcloud compute ssh parkgolf-nats-dev \
  --zone=asia-northeast3-a \
  --project=parkgolf-uniyous \
  --tunnel-through-iap

# 컨테이너 로그 확인
docker logs nats

# 기존 컨테이너 제거 및 올바른 설정으로 재시작
docker stop nats && docker rm nats
docker run -d --name nats \
  -p 4222:4222 \
  -p 6222:6222 \
  -p 8222:8222 \
  -v /var/nats-data:/data \
  nats:2.10-alpine \
  -js -sd /data -m 8222
```

#### 3. Cloud Run에서 NATS 연결 실패 (TIMEOUT/CONNECTION_REFUSED)

**체크리스트:**
1. NATS VM이 실행 중인지 확인
2. VPC Connector가 올바르게 설정되어 있는지 확인
3. Firewall 규칙이 4222 포트를 허용하는지 확인
4. Cloud Run 서비스에 올바른 `NATS_URL` 환경변수가 설정되어 있는지 확인

```bash
# NATS VM 내부 IP 확인
gcloud compute instances describe parkgolf-nats-dev \
  --zone=asia-northeast3-a \
  --format='get(networkInterfaces[0].networkIP)'

# Firewall 규칙 확인
gcloud compute firewall-rules list --filter="name~nats"

# Cloud Run 환경변수 확인
gcloud run services describe auth-service-dev \
  --region=asia-northeast3 \
  --format='value(spec.template.spec.containers[0].env)'
```

#### 4. Docker 이미지 Pull 실패 (VM에 외부 IP 없음)

```bash
# 임시로 외부 IP 추가
gcloud compute instances add-access-config parkgolf-nats-dev \
  --zone=asia-northeast3-a

# Docker 이미지 Pull 후 외부 IP 제거 (보안)
gcloud compute instances delete-access-config parkgolf-nats-dev \
  --zone=asia-northeast3-a \
  --access-config-name="external-nat"
```

### NATS 상태 확인 명령어

```bash
# 컨테이너 상태 확인
docker ps -a | grep nats

# NATS 서버 상태 확인 (HTTP 모니터링)
curl http://10.1.2.x:8222/varz

# JetStream 상태 확인
curl http://10.1.2.x:8222/jsz

# 연결 중인 클라이언트 확인
curl http://10.1.2.x:8222/connz
```

---

## 참고 자료

- [GCP VPC 네트워크 문서](https://cloud.google.com/vpc/docs)
- [Cloud Run 문서](https://cloud.google.com/run/docs)
- [Cloud SQL 문서](https://cloud.google.com/sql/docs)
- [Secret Manager 문서](https://cloud.google.com/secret-manager/docs)
- [NATS JetStream 문서](https://docs.nats.io/nats-concepts/jetstream)
- [NATS 명령줄 인수 참조](https://docs.nats.io/running-a-nats-service/configuration)
