# Park Golf Platform - 배포 가이드

## 📋 목차
1. [개요](#개요)
2. [인프라 구성](#인프라-구성)
3. [사전 준비](#사전-준비)
4. [배포 프로세스](#배포-프로세스)
5. [트러블슈팅](#트러블슈팅)

---

## 개요

Park Golf Platform은 Google Cloud Platform(GCP)에서 운영되는 마이크로서비스 아키텍처입니다.

### 서비스 구성
- **Backend Services**: auth-service, course-service, booking-service
- **API Gateways**: admin-api, user-api
- **Frontend Apps**: admin-dashboard, user-webapp
- **Infrastructure**: PostgreSQL, NATS

## 인프라 구성

### GCP 리소스
```
┌─────────────────────────────────────────────────────┐
│                    GCP Project                      │
│                 (uniyous-319808)                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐        ┌──────────────┐         │
│  │  Cloud Run   │        │ Compute VMs  │         │
│  │  - Services  │◄──────►│ - PostgreSQL │         │
│  │  - APIs      │   VPC  │ - NATS       │         │
│  └──────────────┘        └──────────────┘         │
│         ▲                                          │
│         │                                          │
│  ┌──────────────┐                                 │
│  │   Firebase   │                                  │
│  │   Hosting    │                                  │
│  └──────────────┘                                 │
└─────────────────────────────────────────────────────┘
```

### VM 인스턴스
| 이름 | Zone | 내부 IP | 외부 IP | 용도 |
|------|------|---------|----------|------|
| uniyous-dev-db | asia-northeast3-a | 10.178.0.8 | 34.47.122.22 | PostgreSQL |
| uniyous-dev-nats | asia-northeast3-a | 10.178.0.7 | 34.64.85.225 | NATS |

### VPC Connector
- **이름**: parkgolf-connector
- **Region**: asia-northeast3
- **IP Range**: 10.10.0.0/28
- **용도**: Cloud Run → VM 내부 통신

## 사전 준비

### 1. 필수 도구 설치
```bash
# Google Cloud SDK
brew install google-cloud-sdk

# Node.js & npm
brew install node@20

# PostgreSQL 클라이언트 (선택)
brew install postgresql

# Firebase CLI
npm install -g firebase-tools
```

### 2. 인증 설정
```bash
# GCP 로그인
gcloud auth login
gcloud config set project uniyous-319808

# Firebase 로그인
firebase login
```

### 3. GitHub Secrets 설정

#### GCP_SA_KEY (Service Account JSON)
```bash
# Service Account 생성 및 키 다운로드
gcloud iam service-accounts create parkgolf-services
gcloud iam service-accounts keys create key.json \
  --iam-account=parkgolf-services@uniyous-319808.iam.gserviceaccount.com
```

#### DEV_ENV_CONFIG (환경변수 JSON)
```json
{
  "database": {
    "auth_url": "postgresql://postgres:postgres123@10.178.0.8:5432/auth_db?schema=public",
    "course_url": "postgresql://postgres:postgres123@10.178.0.8:5432/course_db?schema=public",
    "booking_url": "postgresql://postgres:postgres123@10.178.0.8:5432/booking_db?schema=public"
  },
  "server": {
    "port": "8080",
    "node_env": "development"
  },
  "jwt": {
    "secret": "dev-super-secret-jwt-key-change-in-production",
    "expires_in": "7d",
    "refresh_secret": "dev-refresh-secret-key",
    "refresh_expires_in": "30d"
  },
  "nats": {
    "url": "nats://10.178.0.7:4222"
  }
}
```

## 배포 프로세스

### 1. 데이터베이스 설정

#### 1.1 데이터베이스 생성
```bash
# SSH로 VM 접속
gcloud compute ssh uniyous-dev-db --zone=asia-northeast3-a

# PostgreSQL에서 DB 생성
sudo -u postgres psql
CREATE DATABASE auth_db;
CREATE DATABASE course_db;
CREATE DATABASE booking_db;
\q
exit
```

#### 1.2 테이블 생성 (Prisma)
```bash
# 각 서비스 디렉토리에서 실행
cd services/auth-service
DATABASE_URL="postgresql://postgres:postgres123@34.47.122.22:5432/auth_db?schema=public" \
npx prisma db push

cd ../course-service
DATABASE_URL="postgresql://postgres:postgres123@34.47.122.22:5432/course_db?schema=public" \
npx prisma db push

cd ../booking-service
DATABASE_URL="postgresql://postgres:postgres123@34.47.122.22:5432/booking_db?schema=public" \
npx prisma db push
```

### 2. VPC 설정

#### 2.1 VPC Connector 생성
```bash
# Connector 생성
gcloud compute networks vpc-access connectors create parkgolf-connector \
  --region=asia-northeast3 \
  --network=default \
  --range=10.10.0.0/28 \
  --min-instances=2 \
  --max-instances=10 \
  --machine-type=e2-micro
```

#### 2.2 방화벽 규칙 설정
```bash
# PostgreSQL 접근 허용
gcloud compute firewall-rules update uniyous-dev-db-postgresql-5432-access \
  --source-ranges="10.10.0.0/28" \
  --target-tags=postgres-server

# VM에 태그 추가
gcloud compute instances add-tags uniyous-dev-db \
  --tags=postgres-server \
  --zone=asia-northeast3-a
```

### 3. 서비스 배포

#### 3.1 GitHub Actions 배포 (권장)
1. GitHub 저장소 → Actions 탭
2. "Deploy Backend Services to GCP" 선택
3. "Run workflow" 클릭
4. 설정:
   - Services: `all` 또는 특정 서비스 (예: `auth-service`)
   - Environment: `development`
5. 실행

#### 3.2 수동 배포 (문제 해결용)
```bash
# Docker 빌드
cd services/auth-service
docker build -t asia-northeast3-docker.pkg.dev/uniyous-319808/parkgolf/auth-service:latest .

# 푸시
docker push asia-northeast3-docker.pkg.dev/uniyous-319808/parkgolf/auth-service:latest

# Cloud Run 배포
gcloud run deploy auth-service-dev \
  --image=asia-northeast3-docker.pkg.dev/uniyous-319808/parkgolf/auth-service:latest \
  --region=asia-northeast3 \
  --vpc-connector=parkgolf-connector \
  --vpc-egress=private-ranges-only \
  --allow-unauthenticated
```

### 4. Frontend 배포

```bash
# Admin Dashboard
cd services/admin-dashboard
npm run build
firebase deploy --only hosting:admin

# User Webapp
cd services/user-webapp
npm run build
firebase deploy --only hosting:user
```

## 트러블슈팅

### 문제 1: Cloud Run 시작 실패
**증상**: "Container failed to start and listen on PORT=8080"

**해결**:
1. Dockerfile에서 `EXPOSE 8080` 확인
2. main.ts에서 `process.env.PORT || 8080` 사용
3. `app.listen(port, '0.0.0.0')` 설정

### 문제 2: 데이터베이스 연결 실패
**증상**: "Connection timeout" 또는 "Connection refused"

**해결**:
1. VPC Connector 상태 확인
```bash
gcloud compute networks vpc-access connectors list --region=asia-northeast3
```
2. 내부 IP 사용 (10.178.0.8)
3. 방화벽 규칙 확인

### 문제 3: NATS 연결 실패
**증상**: "NATS connection failed"

**해결**:
1. NATS VM 상태 확인
2. 내부 IP 사용 (10.178.0.7)
3. 비동기 연결로 변경 (서비스가 시작되도록)

### 문제 4: Prisma 마이그레이션 실패
**증상**: "Database schema is not in sync"

**해결**:
```bash
# 개발환경: 강제 동기화
npx prisma db push --force-reset

# 운영환경: 마이그레이션 실행
npx prisma migrate deploy
```

## 환경별 설정

### 개발 환경 (develop 브랜치)
- **Branch**: develop
- **Suffix**: -dev (예: auth-service-dev)
- **Database**: 외부 IP 사용 가능
- **NODE_ENV**: development

### 운영 환경 (main 브랜치)
- **Branch**: main
- **Suffix**: -prod (예: auth-service-prod)
- **Database**: 내부 IP만 사용
- **NODE_ENV**: production

## 모니터링

### Cloud Run 로그
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=auth-service-dev" \
  --limit=50 --format=json
```

### VM 상태
```bash
gcloud compute instances list
```

### 서비스 상태
```bash
gcloud run services list --region=asia-northeast3
```

## 유용한 스크립트

| 스크립트 | 설명 |
|---------|------|
| `deploy/setup-databases.sh` | 데이터베이스 초기 설정 |
| `deploy/init-databases.sh` | Prisma 스키마 적용 |
| `deploy/init-migrations.sh` | 마이그레이션 초기화 |
| `deploy/setup-firewall.sh` | 방화벽 규칙 설정 |

## 체크리스트

### 초기 배포 체크리스트
- [ ] GCP 프로젝트 설정
- [ ] Service Account 생성
- [ ] GitHub Secrets 설정
- [ ] VPC Connector 생성
- [ ] 방화벽 규칙 설정
- [ ] 데이터베이스 생성
- [ ] Prisma 스키마 적용
- [ ] 서비스 배포
- [ ] Health Check 확인

### 업데이트 배포 체크리스트
- [ ] 코드 변경사항 확인
- [ ] 환경변수 업데이트 필요 여부
- [ ] 데이터베이스 마이그레이션 필요 여부
- [ ] GitHub Actions 실행
- [ ] 배포 완료 확인
- [ ] 서비스 정상 동작 테스트

## 연락처 및 참고

- **GCP Console**: https://console.cloud.google.com
- **GitHub Repo**: https://github.com/uniyous/parkgolf-platform
- **Firebase Console**: https://console.firebase.google.com

---

*Last Updated: 2025-09-28*