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
| auth-service | 0.5 vCPU | 128Mi | 1 | 1 | **No** |
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

### 2. NATS VM (Messaging)

| 리소스 | CPU | Memory | Disk Type | Disk Size | JetStream Memory | JetStream File | Spot |
|--------|-----|--------|-----------|-----------|------------------|----------------|------|
| NATS VM | 0.25 vCPU | 1GB | pd-standard | 10GB | 128MB | 1GB | No |

### 3. VPC 네트워킹

| 항목 | 설정 | 비용 |
|------|------|------|
| VPC Connector | 비활성화 | $0 (Direct VPC Egress 사용) |
| Cloud NAT | 비활성화 | $0 (NATS VM External IP 사용) |
| Direct VPC Egress | 활성화 | $0 |

### 4. 기타 리소스

| 항목 | 설정 | 비용 |
|------|------|------|
| Monitoring | 비활성화 | $0 (Cloud Logging으로 대체) |
| Secrets | 2개 (jwt_secret, jwt_refresh_secret) | $0 (무료 티어) |
| Database | 외부 (uniyous-319808 프로젝트) | 별도 |

### Dev 환경 월 예상 비용

| 항목 | 계산 | 월 비용 |
|------|------|---------|
| auth-service (min=1, no-throttling) | 0.5 vCPU + 128Mi 상시 | ~$32 |
| 나머지 5개 서비스 (min=0, throttling) | idle 시 | ~$0 |
| NATS VM (일반 인스턴스) | e2-micro | ~$6-7 |
| NATS Disk | 10GB pd-standard | ~$0.4 |
| **합계** | | **~$39/월** |

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

```hcl
# VPC Connector → Direct VPC Egress
# 장점: VPC Connector 인스턴스 비용 제거, 성능 향상
vpc_access {
  network_interfaces {
    network    = var.vpc_network
    subnetwork = var.vpc_subnet
  }
  egress = "ALL_TRAFFIC"
}
```

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

| 환경 | Cloud Run | NATS VM | Database | 네트워킹 | 기타 | 월 합계 |
|------|-----------|---------|----------|----------|------|---------|
| Dev | ~$32 | ~$7 | 외부 | $0 | $0 | **~$39** |
| Prod | 사용량 기반 | ~$8 | ~$80 | ~$10 | ~$5 | **~$100+** |

---

## Terraform 설정 예시

### Dev 환경 서비스 정의

```hcl
services = {
  "auth-service" = {
    cpu           = "0.5"
    memory        = "128Mi"
    min_instances = 1     # Always running for NATS
    max_instances = 1
    cpu_idle      = false # No CPU throttling
  }
  "course-service" = {
    cpu           = "0.5"
    memory        = "128Mi"
    min_instances = 0     # Scale to zero
    max_instances = 1
    cpu_idle      = true  # CPU throttling
  }
  # ... 나머지 서비스도 동일
}
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2025-01-09 | VPC Connector → Direct VPC Egress 변경 |
| 2025-01-09 | Dev Monitoring 모듈 제거 |
| 2025-01-09 | Dev Cloud Run 스펙 최적화 (0.5 vCPU, 128Mi) |
| 2025-01-09 | auth-service만 min_instances=1, no-cpu-throttling 적용 |
| 2025-01-09 | NATS VM 일반 인스턴스로 유지 (Spot 제외) |
