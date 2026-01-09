# Infrastructure Cost Optimization

> 인프라 리소스 비용 최적화 스펙 정보

## 환경별 개요

| 환경 | 목적 | 비용 전략 |
|------|------|----------|
| Dev | 개발/테스트 | 최소 비용, 필수 서비스만 상시 실행 |
| Prod | 운영 | 안정성 우선, 적정 스펙 |

---

## Dev 환경 스펙

### 1. Cloud Run 서비스

| 서비스 | CPU | Memory | Min Instances | Max Instances | CPU Throttling |
|--------|-----|--------|---------------|---------------|----------------|
| auth-service | 1 vCPU | 512Mi | 1 | 1 | **No** |
| course-service | 0.5 vCPU | 128Mi | 0 | 1 | Yes |
| booking-service | 0.5 vCPU | 128Mi | 0 | 1 | Yes |
| notify-service | 0.5 vCPU | 128Mi | 0 | 1 | Yes |
| admin-api | 0.5 vCPU | 128Mi | 0 | 1 | Yes |
| user-api | 0.5 vCPU | 128Mi | 0 | 1 | Yes |

**CPU Throttling 설명:**
- `No (--no-cpu-throttling, cpu_idle=false)`: CPU 항상 할당, NATS 메시지 리스닝/백그라운드 작업에 필수
- `Yes (cpu_idle=true)`: 요청 처리 시에만 CPU 할당, 비용 절감

**auth-service가 min_instances=1인 이유:**
- NATS 메시지 리스닝을 위해 항상 실행 필요
- 다른 서비스들의 인증 요청 처리

### 2. PostgreSQL VM (Database)

| 항목 | 스펙 |
|------|------|
| Instance | parkgolf-postgres-dev |
| Machine Type | e2-small (0.5 vCPU shared, 2GB) |
| Storage | 10GB pd-standard (HDD) |
| OS | Ubuntu 22.04 LTS |
| PostgreSQL | 15 |
| Databases | auth_db, course_db, booking_db, notify_db |

### 3. NATS VM (Messaging)

| 리소스 | CPU | Memory | Disk Type | Disk Size | JetStream Memory | JetStream File | Spot |
|--------|-----|--------|-----------|-----------|------------------|----------------|------|
| NATS VM | 0.25 vCPU | 1GB | pd-standard | 10GB | 128MB | 1GB | No |

### 4. VPC 네트워킹

| 항목 | 설정 | 비용 |
|------|------|------|
| VPC Connector | 비활성화 | $0 |
| Cloud NAT | 비활성화 | $0 |
| Direct VPC Egress | 비활성화 | $0 (External IP 방식 사용) |

**External IP 방식 (Option A):**
- Cloud Run이 VM의 External IP로 직접 접속
- Serverless IP 문제 없음 (terraform destroy 시 문제 해결)
- 애플리케이션 레벨 인증으로 보안 유지 (DB 비밀번호, NATS 인증)

### 5. Firebase Hosting (Web Apps)

| 앱 | 타입 | 저장 용량 | 전송량 | 비용 |
|----|------|----------|--------|------|
| admin-webapp | 정적 (CDN) | 무료 티어 | 무료 티어 | $0 |
| user-webapp | 정적 (CDN) | 무료 티어 | 무료 티어 | $0 |

**Firebase Hosting 특성:**
- CPU/Memory 설정 없음 (정적 파일 호스팅)
- Google CDN 기반 자동 스케일링
- Cold Start 없음
- SSL/커스텀 도메인 무료

**무료 티어 한도:**
- 저장 용량: 10GB
- 전송량: 360MB/일

### 6. 기타 리소스

| 항목 | 설정 | 비용 |
|------|------|------|
| Monitoring | 비활성화 | $0 (Cloud Logging으로 대체) |
| Secrets | 3개 (db_password, jwt_secret, jwt_refresh_secret) | $0 (무료 티어) |
| Database | PostgreSQL VM (e2-small) | ~$13/월 |

### Dev 환경 월 예상 비용

| 항목 | 계산 | 월 비용 |
|------|------|---------|
| auth-service (min=1, no-throttling) | 1 vCPU + 512Mi 상시 | ~$55 |
| 나머지 5개 서비스 (min=0, throttling) | idle 시 | ~$0 |
| PostgreSQL VM | e2-small + 10GB HDD | ~$13 |
| NATS VM | e2-micro + 10GB HDD | ~$6-7 |
| Firebase Hosting (2개 앱) | 무료 티어 | $0 |
| **합계** | | **~$75/월** |

---

## Prod 환경 스펙

### 1. Cloud Run 서비스

| 서비스 | CPU | Memory | Min Instances | Max Instances | CPU Throttling |
|--------|-----|--------|---------------|---------------|----------------|
| auth-service | 1 vCPU | 1Gi | 0 | 10 | No |
| course-service | 1 vCPU | 1Gi | 0 | 10 | No |
| booking-service | 1 vCPU | 1Gi | 0 | 15 | No |
| notify-service | 1 vCPU | 1Gi | 0 | 5 | No |
| admin-api | 1 vCPU | 1Gi | 0 | 10 | No |
| user-api | 1 vCPU | 1Gi | 0 | 20 | No |

### 2. NATS VM (Messaging)

| 리소스 | CPU | Memory | Disk Type | Disk Size | JetStream Memory | JetStream File | Spot |
|--------|-----|--------|-----------|-----------|------------------|----------------|------|
| NATS VM | 0.25 vCPU | 1GB | pd-ssd | 20GB | 512MB | 10GB | No |

### 3. Database (Cloud SQL)

| 항목 | 스펙 |
|------|------|
| Tier | db-custom-2-4096 (2 vCPU, 4GB) |
| Storage | 100GB SSD |
| High Availability | Yes |
| Backup | Daily (03:00) |

### 4. VPC 네트워킹

| 항목 | 설정 |
|------|------|
| VPC Connector | 비활성화 (Direct VPC Egress 사용) |
| Cloud NAT | 활성화 |
| Private Service Connection | 활성화 (Cloud SQL용) |

### 5. Firebase Hosting (Web Apps)

| 앱 | 타입 | 저장 용량 | 전송량 | 비용 |
|----|------|----------|--------|------|
| admin-webapp | 정적 (CDN) | 무료 티어 | 사용량 기반 | ~$0 |
| user-webapp | 정적 (CDN) | 무료 티어 | 사용량 기반 | ~$0 |

---

## 비용 최적화 전략

### 1. Cloud Run 최적화

```hcl
# CPU Throttling 활성화 (비용 절감, API Gateway 역할)
cpu_idle = true   # 요청 시에만 CPU 할당

# CPU Throttling 비활성화 (백그라운드 서비스, NATS 리스닝)
cpu_idle = false  # --no-cpu-throttling, CPU 항상 할당
```

**적용 가이드:**
- NATS 메시지 리스닝이 필요한 서비스: `cpu_idle = false`
- HTTP 요청만 처리하는 API Gateway: `cpu_idle = true`
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

**External IP 방식 (Option A) - 권장:**
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
```

---

## 환경별 비용 요약

| 환경 | Cloud Run | NATS VM | Database | Firebase Hosting | 네트워킹 | 기타 | 월 합계 |
|------|-----------|---------|----------|------------------|----------|------|---------|
| Dev | ~$55 | ~$7 | ~$13 | $0 | $0 | $0 | **~$75** |
| Prod | 사용량 기반 | ~$8 | ~$80 | ~$0 | ~$10 | ~$5 | **~$100+** |

---

## Terraform 설정 예시

### Dev 환경 서비스 정의

```hcl
services = {
  "auth-service" = {
    cpu           = "1"     # Must be >= 1 when cpu_idle=false
    memory        = "512Mi" # Must be >= 512Mi when cpu_idle=false
    min_instances = 1       # Always running for NATS
    max_instances = 1
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
| 2026-01-10 | Direct VPC Egress → External IP 방식 변경 (Serverless IP 문제 해결) |
| 2026-01-09 | Cloud SQL → PostgreSQL VM 변경 (비용 절감: ~$25 → ~$13) |
| 2026-01-09 | Dev Cloud SQL (db-g1-small) 추가 |
| 2026-01-09 | auth-service memory 512Mi로 변경 (cpu_idle=false 시 최소 512Mi 필요) |
| 2026-01-09 | auth-service CPU 1 vCPU로 변경 (cpu_idle=false 요구사항) |
| 2026-01-09 | Direct VPC egress 네트워크 포맷 수정 |
| 2025-01-09 | VPC Connector → Direct VPC Egress 변경 |
| 2025-01-09 | Dev Monitoring 모듈 제거 |
| 2025-01-09 | Dev Cloud Run 스펙 최적화 (0.5 vCPU, 128Mi) |
| 2025-01-09 | auth-service만 min_instances=1, no-cpu-throttling 적용 |
| 2025-01-09 | NATS VM 일반 인스턴스로 유지 (Spot 제외) |
| 2025-01-09 | Firebase Hosting (Web Apps) 섹션 추가 |
