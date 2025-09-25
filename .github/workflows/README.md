# GitHub Actions Workflows for GCP Cloud Run Deployment

## Overview
이 디렉토리는 Park Golf Platform의 마이크로서비스들을 Google Cloud Run에 자동 배포하기 위한 GitHub Actions workflow 파일들을 포함합니다.

## Workflows

### 1. Auth Service (`deploy-auth-service.yml`)
- **포트**: 3011
- **트리거**: `services/auth-service/` 경로 변경 시
- **기능**: JWT 인증, 사용자 관리, RBAC 권한 시스템

### 2. Course Service (`deploy-course-service.yml`)
- **포트**: NATS only (HTTP 없음)
- **트리거**: `services/course-service/` 경로 변경 시
- **기능**: 골프장/코스 관리, 타임슬롯 관리

### 3. Booking Service (`deploy-booking-service.yml`)
- **포트**: 3013
- **트리거**: `services/booking-service/` 경로 변경 시
- **기능**: 예약 생성/관리, 결제 처리

### 4. Admin API (`deploy-admin-api.yml`)
- **포트**: 3091
- **트리거**: `services/admin-api/` 경로 변경 시
- **기능**: 관리자 대시보드용 BFF, 다중 서비스 통합
- **특징**: 높은 메모리/CPU, VPC 연결

### 5. User API (`deploy-user-api.yml`)
- **포트**: 3092
- **트리거**: `services/user-api/` 경로 변경 시
- **기능**: 사용자 웹앱용 BFF, 공개 API
- **특징**: 높은 동시성, Rate Limiting

## 필요한 GitHub Secrets

### GCP 관련
- `GCP_PROJECT_ID`: GCP 프로젝트 ID
- `GCP_SA_KEY`: 서비스 계정 JSON 키
- `SERVICE_ACCOUNT_EMAIL`: Cloud Run 서비스 계정 이메일
- `CLOUDSQL_CONNECTION_NAME`: Cloud SQL 연결 이름

### 데이터베이스
- `AUTH_DATABASE_URL`: Auth 서비스 DB URL
- `COURSE_DATABASE_URL`: Course 서비스 DB URL  
- `BOOKING_DATABASE_URL`: Booking 서비스 DB URL

### Redis
- `REDIS_HOST`: Redis 호스트 주소
- `REDIS_PORT`: Redis 포트 (기본: 6379)
- `REDIS_PASSWORD`: Redis 비밀번호

### NATS
- `NATS_URL`: NATS 서버 URL
- `NATS_USER`: NATS 사용자명
- `NATS_PASSWORD`: NATS 비밀번호

### JWT
- `JWT_SECRET`: JWT 액세스 토큰 시크릿
- `JWT_REFRESH_SECRET`: JWT 리프레시 토큰 시크릿

### 결제 (Booking Service)
- `PAYMENT_GATEWAY`: 결제 게이트웨이 (예: toss, kakao)
- `PAYMENT_API_KEY`: 결제 API 키
- `PAYMENT_SECRET_KEY`: 결제 시크릿 키

## GCP 설정 사전 준비

### 1. Artifact Registry 생성
```bash
gcloud artifacts repositories create parkgolf \
  --repository-format=docker \
  --location=asia-northeast3 \
  --description="Park Golf Platform Docker images"
```

### 2. Cloud SQL 인스턴스 생성
```bash
gcloud sql instances create parkgolf-db \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=asia-northeast3
```

### 3. 서비스 계정 생성 및 권한 부여
```bash
# 서비스 계정 생성
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deploy"

# 필요한 권한 부여
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# 키 생성
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
```

### 4. VPC Connector 생성 (Private 서비스용)
```bash
gcloud compute networks vpc-access connectors create parkgolf-connector \
  --region=asia-northeast3 \
  --subnet=default \
  --subnet-project=PROJECT_ID \
  --min-instances=2 \
  --max-instances=10
```

## 배포 프로세스

1. **코드 푸시**: main 또는 develop 브랜치에 푸시
2. **Docker 빌드**: Multi-stage 빌드로 최적화된 이미지 생성
3. **Artifact Registry 푸시**: 빌드된 이미지를 GCP에 업로드
4. **Cloud Run 배포**: 새 리비전 생성 및 트래픽 라우팅
5. **헬스 체크**: 배포 완료 후 서비스 상태 확인

## 수동 배포
워크플로우는 `workflow_dispatch` 이벤트도 지원하므로 GitHub Actions 탭에서 수동으로 실행 가능합니다.

## 모니터링
- Cloud Run 콘솔: https://console.cloud.google.com/run
- Cloud Logging: https://console.cloud.google.com/logs
- Cloud Monitoring: https://console.cloud.google.com/monitoring

## 트러블슈팅

### 빌드 실패
- Dockerfile 경로 확인
- package.json 의존성 확인
- Prisma 스키마 유효성 확인

### 배포 실패
- GCP 권한 확인
- Secret 값 확인
- Cloud SQL 연결 확인

### 런타임 에러
- 환경변수 설정 확인
- NATS 연결 확인
- 데이터베이스 마이그레이션 상태 확인