---
name: deploy-guide
description: Park Golf Platform 배포 가이드. 인프라 구성, 서비스 배포, 앱 배포 순서와 방법 안내. "배포", "deploy", "인프라", "Cloud Run", "Firebase" 관련 질문 시 사용합니다.
---

# Park Golf Platform 배포 가이드

## 프로젝트 구조

```
parkgolf/
├── apps/                    # 프론트엔드 애플리케이션
│   ├── admin-dashboard/     # 관리자 대시보드
│   └── user-app-web/         # 사용자 웹앱
├── services/                # 백엔드 서비스
│   ├── admin-api/           # 관리자 BFF
│   ├── user-api/            # 사용자 BFF
│   ├── iam-service/         # IAM 서비스 (인증/권한)
│   ├── booking-service/     # 예약 서비스
│   ├── course-service/      # 코스 서비스
│   └── notify-service/      # 알림 서비스
├── infra/                   # Terraform 인프라
│   ├── environments/
│   │   ├── dev/
│   │   └── prod/
│   └── modules/
└── .github/workflows/       # CI/CD 파이프라인
```

## GitHub Actions 워크플로우

| 워크플로우 | 파일 | 용도 |
|-----------|------|------|
| CD Infrastructure | `cd-infra.yml` | Terraform 인프라 배포 |
| CD Services | `cd-services.yml` | 백엔드 서비스 배포 (Cloud Run) |
| CD Apps | `cd-apps.yml` | 프론트엔드 앱 배포 (Firebase) |
| CI Pipeline | `ci.yml` | 코드 품질 검증 |
| Rollback | `rollback.yml` | 서비스 롤백 |

---

## 전체 새로 구성 시 배포 순서

### Step 1: 인프라 생성 (CD Infrastructure)

**GitHub Actions → CD Infrastructure 실행**

```
입력값:
- environment: dev (또는 prod)
- action: plan    ← 먼저 plan으로 변경사항 확인
```

plan 확인 후:

```
입력값:
- environment: dev
- action: apply   ← 실제 인프라 생성
```

**생성되는 리소스:**
- VPC 네트워크, 서브넷
- VPC Connector (Cloud Run ↔ 내부 네트워크)
- Secret Manager (DB 비밀번호, JWT 시크릿)
- NATS JetStream (메시징)
- Cloud Run 서비스 (플레이스홀더 이미지)
- Monitoring, Alert Policy

### Step 2: 백엔드 서비스 배포 (CD Services)

**GitHub Actions → CD Services 실행**

```
입력값:
- environment: dev
- services: all   ← 전체 서비스 배포
```

**배포되는 서비스:**
- iam-service
- course-service
- booking-service
- notify-service
- admin-api
- user-api

### Step 3: 프론트엔드 앱 배포 (CD Apps)

**GitHub Actions → CD Apps 실행**

```
입력값:
- environment: dev
- apps: all   ← 전체 앱 배포
```

**배포되는 앱:**
- admin-dashboard → Firebase Hosting
- user-app-web → Firebase Hosting

---

## 특정 서비스만 배포

### 단일 서비스 배포

```
워크플로우: CD Services
입력값:
- environment: dev
- services: iam-service
```

### 복수 서비스 배포

```
워크플로우: CD Services
입력값:
- environment: dev
- services: iam-service,user-api   ← 콤마로 구분
```

### 특정 앱만 배포

```
워크플로우: CD Apps
입력값:
- environment: dev
- apps: admin-dashboard
```

---

## 환경별 설정

| 환경 | 브랜치 | 리소스 | 특징 |
|------|--------|--------|------|
| dev | develop | 최소 | min: 0, max: 2, Scale to Zero |
| staging | - | 중간 | min: 0, max: 5 |
| prod | main | 최대 | min: 1, max: 10, HA |

---

## 롤백

**GitHub Actions → Rollback 실행**

```
입력값:
- environment: dev
- service: iam-service (또는 all)
- revision: (빈칸 = 이전 버전)
```

---

## 트러블슈팅

### 이미지를 찾을 수 없음 (Image not found)

**원인:** Docker 이미지가 Artifact Registry에 없음

**해결:**
1. CD Services 워크플로우로 이미지 빌드/푸시 먼저 실행
2. 또는 infra에서 플레이스홀더 이미지 사용 설정

### Service Account 오류

**원인:** Cloud Run 서비스 생성 전에 IAM 바인딩 시도

**해결:**
- `infra/environments/dev/main.tf`에서 `service_accounts = []` 설정
- 서비스 배포 후 IAM 바인딩 추가

### PORT 환경변수 오류

**원인:** PORT는 Cloud Run 예약 변수

**해결:**
- env_vars에서 PORT 제거 (Cloud Run이 자동 설정)

---

## 필요한 Secrets (GitHub Repository Settings)

| Secret | 용도 |
|--------|------|
| `GCP_SA_KEY` | GCP 서비스 계정 JSON 키 |
| `DB_PASSWORD` | 데이터베이스 비밀번호 |
| `JWT_SECRET` | JWT 서명 시크릿 |
| `JWT_REFRESH_SECRET` | JWT 리프레시 토큰 시크릿 |
| `ALERT_EMAIL` | 알림 수신 이메일 |
| `DEV_DB_HOST` | (dev) 외부 DB 호스트 |
| `DEV_DB_USERNAME` | (dev) 외부 DB 사용자명 |

---

## 빠른 명령어

### 상태 확인
```bash
# Cloud Run 서비스 목록
gcloud run services list --region=asia-northeast3

# 특정 서비스 상태
gcloud run services describe iam-service-dev --region=asia-northeast3
```

### 로그 확인
```bash
# 서비스 로그
gcloud run services logs read iam-service-dev --region=asia-northeast3

# 실시간 로그
gcloud run services logs tail iam-service-dev --region=asia-northeast3
```
