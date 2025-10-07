# GCP 인프라 구성 제안

## 📊 현재 구조 vs 제안 구조

### 현재 구조 (복잡)
```
개발: VM(PostgreSQL) + VM(NATS) + Cloud Run(Services) + VPC Connector
운영: 동일 구조 복제
```

### 제안 구조 (심플)
```
개발: Cloud SQL + Cloud Run(All Services)
운영: 동일 구조, 다른 리소스
```

## 🏗️ 제안 아키텍처

### Option 1: 최소 비용 구조 (추천) 💰

```yaml
Development (개발):
  Database:
    - Cloud SQL (PostgreSQL) - 공유 CPU, f1-micro
    - 자동 백업 OFF
    - 고가용성 OFF

  Services:
    - Cloud Run (min instances: 0)
    - 콜드 스타트 허용
    - CPU throttling 허용

  Message Queue:
    - Cloud Tasks (NATS 대체)
    - 또는 Pub/Sub Lite

  월 예상 비용: ~$30-50

Production (운영):
  Database:
    - Cloud SQL (PostgreSQL) - 전용 CPU
    - 자동 백업 ON
    - 고가용성 ON (선택)

  Services:
    - Cloud Run (min instances: 1)
    - CPU always allocated
    - 자동 스케일링

  Message Queue:
    - Cloud Pub/Sub (표준)

  월 예상 비용: ~$150-200
```

### Option 2: 관리 편의 구조 🛠️

```yaml
Shared Resources (공유):
  - Cloud SQL (단일 인스턴스)
    - 데이터베이스 분리: parkgolf_dev, parkgolf_prod
    - 비용 절감: 약 40%

  - Cloud NAT (공유)
  - Load Balancer (공유)

Environment Specific (환경별):
  Development:
    - Cloud Run (서비스명-dev)
    - Firebase Hosting (dev subdomain)

  Production:
    - Cloud Run (서비스명-prod)
    - Firebase Hosting (main domain)
    - Cloud CDN
```

### Option 3: 마이크로서비스 단순화 🎯

```yaml
서비스 통합:
  Before (현재):
    - auth-service (NATS)
    - course-service (NATS)
    - booking-service (NATS)
    - admin-api (HTTP)
    - user-api (HTTP)

  After (제안):
    - backend-api (통합 API)
      - /auth/*
      - /courses/*
      - /bookings/*
    - admin-api (관리자 전용)

  장점:
    - Cloud Run 인스턴스 5개 → 2개
    - NATS 제거 가능
    - 관리 포인트 감소 60%
```

## 🚀 구현 로드맵

### Phase 1: Database 마이그레이션 (1주)
```bash
# 1. Cloud SQL 생성
gcloud sql instances create parkgolf-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast3

# 2. 데이터 마이그레이션
pg_dump -h 34.47.122.22 > backup.sql
gcloud sql import sql parkgolf-db gs://bucket/backup.sql
```

### Phase 2: NATS → Cloud Pub/Sub (1주)
```typescript
// Before (NATS)
@MessagePattern('auth.validate')
async validate(data: any) { }

// After (Pub/Sub)
@EventPattern('auth-validate')
async validate(data: any) { }
```

### Phase 3: 서비스 통합 (2주)
```typescript
// 통합 API 구조
@Module({
  imports: [
    AuthModule,
    CourseModule,
    BookingModule,
  ],
})
export class BackendModule {}
```

## 💰 비용 비교

| 항목 | 현재 (월) | Option 1 | Option 2 | Option 3 |
|------|-----------|----------|----------|----------|
| VM (PostgreSQL) | $25 | - | - | - |
| VM (NATS) | $25 | - | - | - |
| Cloud SQL | - | $15 | $25 | $25 |
| Cloud Run | $50 | $30 | $30 | $20 |
| Pub/Sub | - | $10 | $10 | $5 |
| **총계** | **$100** | **$55** | **$65** | **$50** |
| **절감률** | - | 45% | 35% | 50% |

## 🔧 환경 분리 전략

### 1. 네임스페이스 기반
```yaml
Services:
  - auth-service-dev
  - auth-service-prod

Databases:
  - parkgolf_dev.auth_db
  - parkgolf_prod.auth_db

환경변수:
  - DEV_ENV_CONFIG
  - PROD_ENV_CONFIG
```

### 2. 프로젝트 기반 (대규모)
```yaml
Projects:
  - parkgolf-dev (개발)
  - parkgolf-prod (운영)

장점: 완전 격리, 권한 분리
단점: 관리 복잡도 증가
```

### 3. 라벨 기반 (권장)
```yaml
모든 리소스에 라벨:
  environment: dev/prod
  service: auth/course/booking
  version: v1/v2

장점:
  - 비용 추적 용이
  - 자동화 편리
  - 단일 프로젝트 관리
```

## 📝 GitHub Actions 수정

```yaml
name: Deploy to GCP
on:
  push:
    branches:
      - develop  # → 개발 환경
      - main     # → 운영 환경

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Set Environment
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "ENV=prod" >> $GITHUB_ENV
            echo "CLOUD_SQL=parkgolf-db-prod" >> $GITHUB_ENV
          else
            echo "ENV=dev" >> $GITHUB_ENV
            echo "CLOUD_SQL=parkgolf-db-dev" >> $GITHUB_ENV
          fi

      - name: Deploy
        run: |
          gcloud run deploy backend-api-${{ env.ENV }} \
            --add-cloudsql-instances=${{ env.CLOUD_SQL }}
```

## 🔐 보안 개선

### 1. Secret Manager 활용
```bash
# Secret 생성
echo -n "postgres123" | gcloud secrets create db-password --data-file=-

# Cloud Run에서 사용
gcloud run deploy backend-api \
  --set-secrets="DB_PASSWORD=db-password:latest"
```

### 2. Workload Identity
```bash
# Service Account 생성
gcloud iam service-accounts create backend-api

# Cloud SQL 권한 부여
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:backend-api@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

### 3. Private IP만 사용
```yaml
Cloud SQL:
  - Private IP: ✅
  - Public IP: ❌

Cloud Run:
  - VPC Connector: ✅
  - Direct Internet: ❌
```

## 🎯 추천 구성

### 스타트업/MVP (비용 최적화)
**→ Option 3: 서비스 통합**
- 단일 API로 통합
- Cloud SQL 공유
- 최소 인스턴스

### 성장기 (확장성)
**→ Option 1: 환경 완전 분리**
- 개발/운영 독립
- 자동 스케일링
- 모니터링 강화

### 엔터프라이즈 (안정성)
**→ Option 2 + 고가용성**
- Multi-region
- 자동 failover
- 99.95% SLA

## 📊 마이그레이션 체크리스트

- [ ] Cloud SQL 인스턴스 생성
- [ ] 데이터베이스 마이그레이션
- [ ] NATS → Pub/Sub 전환
- [ ] 서비스 통합 (선택)
- [ ] CI/CD 파이프라인 수정
- [ ] 환경변수 Secret Manager 이전
- [ ] 모니터링 설정
- [ ] 부하 테스트
- [ ] 롤백 계획 수립
- [ ] 운영 전환

## 🚨 주의사항

1. **데이터베이스 백업**: 마이그레이션 전 필수
2. **점진적 전환**: 한번에 모두 변경 X
3. **롤백 준비**: 각 단계별 롤백 계획
4. **비용 모니터링**: Budget Alert 설정

---

*이 제안은 Park Golf Platform의 현재 아키텍처를 기반으로 작성되었습니다.*