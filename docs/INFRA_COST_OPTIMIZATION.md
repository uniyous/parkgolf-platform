# Infrastructure Cost Optimization

> 인프라 리소스 비용 최적화 스펙 정보

## 환경별 개요

| 환경 | 목적 | 비용 전략 |
|------|------|----------|
| Dev | 개발/테스트 | 최소 비용, 필수 서비스만 상시 실행 |
| Prod | 운영 | 안정성 우선, 적정 스펙 |

---

## GCP 프로젝트 정보

| 항목 | 값 |
|------|-----|
| Project ID | parkgolf-uniyous |
| Region | asia-northeast3 (서울) |
| Terraform State | gs://parkgolf-uniyous-terraform-state |

---

## VPC IP 주소 정책 (Standard)

### 환경별 IP 대역

| 환경 | VPC CIDR | Public Subnet | Private Subnet | Data Subnet |
|------|----------|---------------|----------------|-------------|
| Reserved | 10.1.0.0/16 | - | - | - |
| **Dev** | **10.2.0.0/16** | 10.2.1.0/24 | 10.2.2.0/24 | 10.2.3.0/24 |
| **Prod** | **10.4.0.0/16** | 10.4.1.0/24 | 10.4.2.0/24 | 10.4.3.0/24 |

> **Note:** 10.1.x.x는 uniyous VPC와 충돌 방지를 위해 예약됨

### 서브넷 용도

| Subnet | 3rd Octet | 용도 | 배치 리소스 |
|--------|-----------|------|-------------|
| Public | x.x.1.0/24 | 외부 접근 가능 | Load Balancer, Bastion |
| Private | x.x.2.0/24 | 내부 서비스 | NATS VM, 내부 서비스 |
| Data | x.x.3.0/24 | 데이터베이스 | PostgreSQL VM, Redis |

### IP 정책 자동 적용

networking 모듈은 환경 변수에 따라 자동으로 IP 대역을 설정합니다:

```hcl
# 명시적 지정 없이 환경만 전달하면 자동 설정
module "networking" {
  source      = "../../modules/networking"
  environment = "dev"  # 자동으로 10.2.x.x 사용
  # vpc_cidr, subnet_cidrs 생략 가능
}
```

---

## Dev 환경 스펙

### 1. Compute Engine (VM)

| 이름 | Zone | 타입 | CPU | Memory | HDD | External IP | 월 비용 |
|------|------|------|-----|--------|-----|-------------|---------|
| parkgolf-nats-dev | asia-northeast3-a | e2-micro | 0.25 vCPU | 1GB | 10GB pd-standard | 34.50.55.9 | ~$7 |
| parkgolf-postgres-dev | asia-northeast3-a | e2-small | 0.5 vCPU | 2GB | 10GB pd-standard | 34.158.211.242 | ~$13 |

### 2. Cloud Run 서비스

| 서비스 | URL | CPU | Memory | Min/Max | Throttle | 월 비용 |
|--------|-----|-----|--------|---------|----------|---------|
| auth-service-dev | https://auth-service-dev-iihuzmuufa-du.a.run.app | 1 | 512Mi | 1/2 | No | ~$55 |
| admin-api-dev | https://admin-api-dev-iihuzmuufa-du.a.run.app | 0.5 | 128Mi | 0/1 | Yes | ~$0 |
| booking-service-dev | https://booking-service-dev-iihuzmuufa-du.a.run.app | 0.5 | 128Mi | 0/1 | Yes | ~$0 |
| course-service-dev | https://course-service-dev-iihuzmuufa-du.a.run.app | 0.5 | 128Mi | 0/1 | Yes | ~$0 |
| notify-service-dev | https://notify-service-dev-iihuzmuufa-du.a.run.app | 0.5 | 128Mi | 0/1 | Yes | ~$0 |
| user-api-dev | https://user-api-dev-iihuzmuufa-du.a.run.app | 0.5 | 128Mi | 0/1 | Yes | ~$0 |

**CPU Throttling 설명:**
- `No (--no-cpu-throttling)`: CPU 항상 할당, NATS 메시지 리스닝/백그라운드 작업에 필수
- `Yes (--cpu-throttling)`: 요청 처리 시에만 CPU 할당, 비용 절감

**auth-service가 min_instances=1인 이유:**
- NATS 메시지 리스닝을 위해 항상 실행 필요
- bcrypt 비밀번호 해싱이 CPU 집약적
- 다른 서비스들의 인증 요청 처리

### 3. PostgreSQL VM (Database)

| 항목 | 스펙 |
|------|------|
| Instance | parkgolf-postgres-dev |
| Machine Type | e2-small (0.5 vCPU shared, 2GB) |
| Storage | 10GB pd-standard (HDD) |
| OS | Ubuntu 22.04 LTS |
| PostgreSQL | 15 |
| Databases | auth_db, course_db, booking_db, notify_db |
| External IP | 34.158.211.242 |
| pg_hba.conf | 0.0.0.0/0 허용 (애플리케이션 레벨 인증) |

### 4. NATS VM (Messaging)

| 항목 | 스펙 |
|------|------|
| Instance | parkgolf-nats-dev |
| Machine Type | e2-micro (0.25 vCPU, 1GB) |
| Disk | 10GB pd-standard |
| NATS Version | 2.10-alpine |
| JetStream Memory | 128MB |
| JetStream File | 1GB |
| External IP | 34.50.55.9 |
| Port | 4222 |

### 5. VPC 네트워킹

| 항목 | 설정 | 비용 |
|------|------|------|
| VPC | parkgolf-dev | $0 |
| VPC Connector | 비활성화 | $0 |
| Cloud NAT | 비활성화 | $0 |
| Direct VPC Egress | 비활성화 | $0 |

**External IP 방식:**
- Cloud Run이 VM의 External IP로 직접 접속
- Serverless IP 문제 없음 (terraform destroy 시 문제 해결)
- 애플리케이션 레벨 인증으로 보안 유지 (DB 비밀번호)

### 6. Firewall Rules

| 규칙 | 포트 | Source | 용도 |
|------|------|--------|------|
| allow-health-check | 80, 443, 8080 | Google Health Check IPs | Cloud Run 헬스체크 |
| allow-internal | all | 10.2.0.0/16 | VPC 내부 통신 |
| allow-nats-external | 4222 | 0.0.0.0/0 | Cloud Run → NATS |
| allow-postgres | 5432 | 0.0.0.0/0 | Cloud Run → PostgreSQL |
| allow-ssh | 22 | 35.235.240.0/20 | IAP SSH 접속 |

### 7. Secret Manager

| Secret | 용도 |
|--------|------|
| db_password-dev | PostgreSQL parkgolf 사용자 비밀번호 |
| jwt_secret-dev | JWT 서명 키 |
| jwt_refresh_secret-dev | JWT Refresh 토큰 키 |

### 8. Artifact Registry

| 항목 | 값 |
|------|-----|
| Repository | parkgolf |
| Format | Docker |
| Location | asia-northeast3 |
| Size | ~32GB |
| 월 비용 | ~$3 |

### 9. Firebase Hosting (Web Apps)

| 앱 | 타입 | API URL | 비용 |
|----|------|---------|------|
| admin-dashboard | 정적 (CDN) | https://admin-api-dev-iihuzmuufa-du.a.run.app/api | $0 |
| user-app-web | 정적 (CDN) | https://user-api-dev-iihuzmuufa-du.a.run.app | $0 |

**Firebase Hosting 특성:**
- CPU/Memory 설정 없음 (정적 파일 호스팅)
- Google CDN 기반 자동 스케일링
- Cold Start 없음
- SSL/커스텀 도메인 무료

**무료 티어 한도:**
- 저장 용량: 10GB
- 전송량: 360MB/일

### Dev 환경 월 예상 비용

| 항목 | 스펙 | 월 비용 |
|------|------|---------|
| auth-service | 1 vCPU, 512Mi, min=1, no-throttling | ~$55 |
| 나머지 5개 서비스 | 0.5 vCPU, 128Mi, min=0, throttling | ~$0 (idle) |
| PostgreSQL VM | e2-small + 10GB HDD | ~$13 |
| NATS VM | e2-micro + 10GB HDD | ~$7 |
| Artifact Registry | ~32GB Docker images | ~$3 |
| Cloud Storage | Terraform state | ~$0.5 |
| Firebase Hosting | 무료 티어 | $0 |
| Secret Manager | 3개 시크릿 | $0 |
| **합계** | | **~$80/월** |

---

## Prod 환경 스펙

### 1. Cloud Run 서비스

| 서비스 | CPU | Memory | Min Instances | Max Instances | CPU Throttling |
|--------|-----|--------|---------------|---------------|----------------|
| auth-service | 2 vCPU | 1Gi | 1 | 10 | No |
| course-service | 1 vCPU | 512Mi | 0 | 10 | Yes |
| booking-service | 1 vCPU | 512Mi | 0 | 10 | Yes |
| notify-service | 1 vCPU | 512Mi | 0 | 5 | Yes |
| admin-api | 1 vCPU | 512Mi | 0 | 10 | Yes |
| user-api | 1 vCPU | 512Mi | 0 | 20 | Yes |

### 2. NATS VM (Messaging)

| 리소스 | CPU | Memory | Disk Type | Disk Size | JetStream Memory | JetStream File |
|--------|-----|--------|-----------|-----------|------------------|----------------|
| NATS VM | 0.25 vCPU | 1GB | pd-ssd | 20GB | 512MB | 10GB |

### 3. Database (Cloud SQL 또는 PostgreSQL VM)

| 항목 | 스펙 |
|------|------|
| Tier | db-custom-2-4096 (2 vCPU, 4GB) 또는 e2-standard-2 |
| Storage | 100GB SSD |
| High Availability | Yes (Prod) |
| Backup | Daily (03:00) |

### 4. VPC 네트워킹

| 항목 | 설정 |
|------|------|
| VPC Connector | 비활성화 (External IP 방식 사용) |
| Cloud NAT | 필요시 활성화 |
| Private Service Connection | Cloud SQL 사용 시 활성화 |

### 5. Firebase Hosting (Web Apps)

| 앱 | 타입 | 저장 용량 | 전송량 | 비용 |
|----|------|----------|--------|------|
| admin-webapp | 정적 (CDN) | 무료 티어 | 사용량 기반 | ~$0 |
| user-app-web | 정적 (CDN) | 무료 티어 | 사용량 기반 | ~$0 |

---

## 비용 최적화 전략

### 1. Cloud Run 최적화

```yaml
# .github/workflows/cd-services.yml 설정

# auth-service (항상 실행, NATS 리스닝)
min_instances: 1
cpu: 1
memory: 512Mi
cpu_throttling: false

# 나머지 서비스 (Scale-to-zero)
min_instances: 0
cpu: 0.5
memory: 128Mi
cpu_throttling: true
```

**적용 가이드:**
- NATS 메시지 리스닝이 필요한 서비스: `cpu_throttling = false`
- HTTP 요청만 처리하는 API Gateway: `cpu_throttling = true`
- `min_instances = 0`: Scale to zero, idle 시 비용 없음
- `min_instances = 1`: 항상 실행, Cold Start 없음

### 2. Compute Engine 최적화

```hcl
# Spot/Preemptible 인스턴스 (비필수 워크로드만)
preemptible = true  # 최대 70% 비용 절감, 24시간 내 중단 가능

# Standard Disk (Dev 환경)
disk_type = "pd-standard"  # SSD 대비 75% 저렴
```

**주의:** NATS VM은 마이크로서비스 통신에 필수이므로 Spot 인스턴스 사용 불가

### 3. 네트워킹 최적화

**External IP 방식 - 권장:**
```hcl
# Cloud Run에서 VPC 설정 제거
# VM에 External IP 부여, Firewall로 접근 제어

# PostgreSQL VM
network_interface {
  network    = module.networking.vpc_name
  subnetwork = module.networking.subnet_ids["data"]
  access_config {
    # Ephemeral external IP
  }
}

# Firewall - 모든 IP에서 접근 허용 (DB 비밀번호로 보안)
source_ranges = ["0.0.0.0/0"]
```

**장점:**
- Serverless IP 문제 없음 (terraform destroy 시 즉시 삭제 가능)
- VPC Connector 비용 없음
- 구성 단순화

### 4. Monitoring 최적화

- **Dev**: Cloud Logging만 사용 (무료)
- **Prod**: 커스텀 대시보드 + 알림 설정

---

## 비용 모니터링

### GCP 비용 확인 명령어

```bash
# 프로젝트별 비용 요약
gcloud billing accounts list
gcloud beta billing projects describe parkgolf-uniyous

# Cloud Run 사용량 확인
gcloud run services list --project=parkgolf-uniyous

# Compute Engine 인스턴스 확인
gcloud compute instances list --project=parkgolf-uniyous
```

### 로그 확인 (Monitoring 없이)

```bash
# Cloud Run 로그
gcloud logging read "resource.type=cloud_run_revision" \
  --project=parkgolf-uniyous \
  --limit=100

# 특정 서비스 로그
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=auth-service-dev" \
  --project=parkgolf-uniyous \
  --limit=50

# NATS VM 로그
gcloud compute ssh parkgolf-nats-dev --zone=asia-northeast3-a \
  --command="docker logs nats --tail 100"

# PostgreSQL VM 접속
gcloud compute ssh parkgolf-postgres-dev --zone=asia-northeast3-a --tunnel-through-iap
```

---

## 환경별 비용 요약

| 환경 | Cloud Run | VM (NATS+DB) | Storage | 기타 | 월 합계 |
|------|-----------|--------------|---------|------|---------|
| Dev | ~$55 | ~$20 | ~$3.5 | $0 | **~$80** |
| Prod | 사용량 기반 | ~$50+ | ~$10 | ~$10 | **~$100+** |

---

## Terraform 설정 예시

### Dev 환경 서비스 정의

```hcl
services = {
  "auth-service" = {
    cpu           = "1"     # Must be >= 1 when cpu_idle=false
    memory        = "512Mi" # Must be >= 512Mi when cpu_idle=false
    min_instances = 1       # Always running for NATS
    max_instances = 2
    cpu_idle      = false   # No CPU throttling
  }
  "course-service" = {
    cpu           = "0.5"
    memory        = "128Mi"
    min_instances = 0       # Scale to zero
    max_instances = 1
    cpu_idle      = true    # CPU throttling
  }
  # ... 나머지 서비스도 동일
}

# Cloud Run 모듈 호출 시 VPC 설정 없음 (External IP 방식)
module "services" {
  # ...
  # vpc_network, vpc_subnet 설정 제거
  # Cloud Run이 VM External IP로 직접 접속
}
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-10 | Cloud Run 리소스 최적화 (admin-api, booking, course, user-api → 0.5 CPU, 128Mi, min=0) |
| 2026-01-10 | pg_hba.conf 0.0.0.0/0 허용 추가 (Cloud Run External IP 접속용) |
| 2026-01-10 | parkgolf 사용자 테이블/시퀀스 권한 부여 |
| 2026-01-10 | API URL 업데이트 (admin-api, user-api → parkgolf-uniyous 프로젝트) |
| 2026-01-10 | VPC IP 주소 정책 표준화 (환경별 자동 IP 할당) |
| 2026-01-10 | Direct VPC Egress → External IP 방식 변경 (Serverless IP 문제 해결) |
| 2026-01-09 | Cloud SQL → PostgreSQL VM 변경 (비용 절감: ~$25 → ~$13) |
| 2026-01-09 | auth-service memory 512Mi로 변경 (cpu_idle=false 시 최소 512Mi 필요) |
| 2026-01-09 | auth-service CPU 1 vCPU로 변경 (cpu_idle=false 요구사항) |
| 2026-01-09 | VPC Connector → Direct VPC Egress 변경 |
| 2026-01-09 | Dev Monitoring 모듈 제거 |
| 2026-01-09 | NATS VM 일반 인스턴스로 유지 (Spot 제외) |
| 2026-01-09 | Firebase Hosting (Web Apps) 섹션 추가 |
