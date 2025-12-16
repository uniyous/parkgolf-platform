# Park Golf Platform CI/CD 가이드

## 목차
1. [개요](#개요)
2. [워크플로우 구성](#워크플로우-구성)
3. [배포 순서](#배포-순서)
4. [워크플로우 상세](#워크플로우-상세)
5. [GitHub Secrets 설정](#github-secrets-설정)
6. [사용 예시](#사용-예시)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

Park Golf Platform은 **수동 실행(workflow_dispatch)** 기반의 CI/CD 파이프라인을 사용합니다.

### 주요 특징
- 모든 워크플로우는 수동으로만 실행
- 환경별(dev/staging/prod) 분리 배포
- 인프라(Terraform)와 애플리케이션(서비스, 앱) 분리
- 선택적 서비스/앱 배포 지원

### 기술 스택
| 구성요소 | 기술 |
|---------|------|
| 인프라 관리 | Terraform + GCP |
| 백엔드 서비스 | Cloud Run |
| 프론트엔드 앱 | Firebase Hosting |
| 컨테이너 레지스트리 | Artifact Registry |
| CI/CD | GitHub Actions |

---

## 워크플로우 구성

| 워크플로우 | 파일 | 용도 | 트리거 |
|-----------|------|------|--------|
| **CD Infrastructure** | `cd-infra.yml` | Terraform 인프라 배포 | 수동 |
| **CD Services** | `cd-services.yml` | 백엔드 서비스 배포 (Cloud Run) | 수동 |
| **CD Apps** | `cd-apps.yml` | 프론트엔드 앱 배포 (Firebase) | 수동 |
| **CI Pipeline** | `ci.yml` | 코드 품질 검증 (lint, test, build) | 수동 |
| **Rollback** | `rollback.yml` | 서비스 롤백 | 수동 |

---

## 배포 순서

### 최초 환경 구축 시

```
1. CD Infrastructure (plan) → 변경사항 확인
           ↓
2. CD Infrastructure (apply) → 인프라 생성
           ↓
3. CD Services (all) → 백엔드 서비스 배포
           ↓
4. CD Apps (all) → 프론트엔드 앱 배포
```

### 일반 배포 시

```
코드 변경 → CD Services 또는 CD Apps 실행
```

### 인프라 변경 시

```
Terraform 코드 변경 → CD Infrastructure (plan) → 확인 → CD Infrastructure (apply)
```

---

## 워크플로우 상세

### 1. CD Infrastructure (`cd-infra.yml`)

Terraform을 사용하여 GCP 인프라를 관리합니다.

**입력 옵션:**
| 옵션 | 설명 | 값 |
|------|------|-----|
| environment | 대상 환경 | `dev`, `staging`, `prod` |
| action | Terraform 작업 | `plan`, `apply`, `destroy` |

**실행 단계:**
1. `plan` - 변경사항 미리보기 (필수)
2. `apply` - 변경사항 적용
3. `destroy` - 리소스 삭제 (주의 필요)

**생성되는 리소스:**
- VPC 네트워크 / 서브넷
- VPC Connector (Cloud Run ↔ 내부 네트워크)
- Secret Manager (DB 비밀번호, JWT 시크릿)
- Cloud Run 서비스
- Monitoring / Alert Policy

**사용 예:**
```
GitHub Actions → CD Infrastructure
- environment: dev
- action: plan      # 먼저 확인
```

```
GitHub Actions → CD Infrastructure
- environment: dev
- action: apply     # 적용
```

---

### 2. CD Services (`cd-services.yml`)

백엔드 서비스를 Cloud Run에 배포합니다.

**입력 옵션:**
| 옵션 | 설명 | 값 |
|------|------|-----|
| environment | 대상 환경 | `dev`, `staging`, `prod` |
| services | 배포할 서비스 | `all` 또는 서비스명 (콤마 구분) |

**대상 서비스:**
- `auth-service` - 인증/인가
- `course-service` - 골프장/코스 관리
- `booking-service` - 예약 관리
- `notify-service` - 알림 (이메일, 푸시)
- `admin-api` - 관리자 BFF
- `user-api` - 사용자 BFF

**실행 단계:**
1. Docker 이미지 빌드
2. Artifact Registry에 푸시
3. Cloud Run에 배포
4. 서비스 URL 출력

**환경별 설정:**
| 환경 | Min Instances | Max Instances | Memory | CPU |
|------|--------------|---------------|--------|-----|
| dev | 0 | 2 | 512Mi | 1 |
| staging | 0 | 5 | 512Mi | 1 |
| prod | 1 | 10 | 1Gi | 2 |

**사용 예:**
```
# 전체 서비스 배포
GitHub Actions → CD Services
- environment: dev
- services: all
```

```
# 특정 서비스만 배포
GitHub Actions → CD Services
- environment: dev
- services: auth-service,user-api
```

---

### 3. CD Apps (`cd-apps.yml`)

프론트엔드 앱을 Firebase Hosting에 배포합니다.

**입력 옵션:**
| 옵션 | 설명 | 값 |
|------|------|-----|
| environment | 대상 환경 | `dev`, `staging`, `prod` |
| apps | 배포할 앱 | `all` 또는 앱명 (콤마 구분) |

**대상 앱:**
- `admin-dashboard` - 관리자 대시보드
- `user-webapp` - 사용자 웹앱

**실행 단계:**
1. npm ci → 의존성 설치
2. npm run build → 빌드
3. Firebase Hosting에 배포

**환경별 API URL:**
| 환경 | API URL |
|------|---------|
| dev | `https://dev-api.parkgolf.app` |
| staging | `https://staging-api.parkgolf.app` |
| prod | `https://api.parkgolf.app` |

**사용 예:**
```
# 전체 앱 배포
GitHub Actions → CD Apps
- environment: dev
- apps: all
```

```
# 관리자 대시보드만 배포
GitHub Actions → CD Apps
- environment: dev
- apps: admin-dashboard
```

---

### 4. CI Pipeline (`ci.yml`)

코드 품질을 검증합니다.

**입력 옵션:**
| 옵션 | 설명 | 값 |
|------|------|-----|
| target | 검증 대상 | `all`, `apps`, `services` |

**실행 단계:**
1. Lint - 코드 스타일 검사
2. Type Check - TypeScript 타입 검사
3. Test - 단위 테스트
4. Build - 빌드 검증
5. Security Scan - Trivy 보안 스캔

---

### 5. Rollback (`rollback.yml`)

Cloud Run 서비스를 이전 버전으로 롤백합니다.

**입력 옵션:**
| 옵션 | 설명 | 값 |
|------|------|-----|
| environment | 대상 환경 | `dev`, `staging`, `prod` |
| service | 롤백할 서비스 | 서비스명 또는 `all` |
| revision | 대상 리비전 | 빈값 = 이전 버전, 또는 특정 리비전명 |

**실행 단계:**
1. 현재/대상 리비전 확인
2. 트래픽 전환
3. Health Check 검증

**사용 예:**
```
# 이전 버전으로 롤백
GitHub Actions → Rollback
- environment: dev
- service: auth-service
- revision: (빈값)
```

---

## GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets and variables → Actions

### 필수 Secrets

| Secret | 설명 | 예시 |
|--------|------|------|
| `GCP_SA_KEY` | GCP 서비스 계정 JSON 키 | `{ "type": "service_account", ... }` |
| `DB_PASSWORD` | PostgreSQL 비밀번호 | `MySecureP@ssw0rd!2024` |
| `JWT_SECRET` | JWT 서명 키 (32자 이상) | `your-super-secret-jwt-key-min-32-chars` |
| `JWT_REFRESH_SECRET` | JWT 리프레시 키 | `your-refresh-secret-key-min-32-chars` |
| `ALERT_EMAIL` | 알림 수신 이메일 | `dev@example.com` |

### Dev 환경 전용

| Secret | 설명 |
|--------|------|
| `DEV_DB_HOST` | Dev 환경 DB 호스트 |
| `DEV_DB_USERNAME` | Dev 환경 DB 사용자명 |

### Prod 환경 전용

| Secret | 설명 |
|--------|------|
| `OPS_EMAIL` | 운영팀 이메일 |
| `SLACK_CHANNEL` | Slack 알림 채널 |
| `SLACK_TOKEN` | Slack Webhook 토큰 |

### Secret 생성 방법

```bash
# GCP Service Account 키 생성
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com

# 키 내용을 GCP_SA_KEY Secret으로 등록

# 랜덤 비밀번호/시크릿 생성
openssl rand -base64 32
```

---

## 사용 예시

### 시나리오 1: Dev 환경 전체 배포

```
1. GitHub Actions → CD Infrastructure
   - environment: dev
   - action: plan

2. (결과 확인 후)
   GitHub Actions → CD Infrastructure
   - environment: dev
   - action: apply

3. GitHub Actions → CD Services
   - environment: dev
   - services: all

4. GitHub Actions → CD Apps
   - environment: dev
   - apps: all
```

### 시나리오 2: 특정 서비스 업데이트

```
GitHub Actions → CD Services
- environment: dev
- services: auth-service
```

### 시나리오 3: 서비스 롤백

```
GitHub Actions → Rollback
- environment: dev
- service: auth-service
- revision: (빈값 = 이전 버전)
```

### 시나리오 4: 프로덕션 배포

```
1. GitHub Actions → CD Services
   - environment: staging
   - services: all

2. (Staging 테스트 후)
   GitHub Actions → CD Services
   - environment: prod
   - services: all
```

---

## 트러블슈팅

### 1. "Permission denied" 오류

**원인:** GCP 서비스 계정 권한 부족

**해결:**
```bash
# 필요한 역할 확인
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions"

# 권한 추가
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/run.admin"
```

### 2. "Image not found" 오류

**원인:** Docker 이미지가 Artifact Registry에 없음

**해결:**
1. CD Services 워크플로우로 이미지 먼저 빌드
2. 또는 Terraform에서 플레이스홀더 이미지 사용

### 3. "Container failed to start" 오류

**확인사항:**
1. Dockerfile CMD/ENTRYPOINT 확인
2. 포트가 8080인지 확인
3. 환경변수 누락 여부

**로그 확인:**
```bash
gcloud run services logs read SERVICE_NAME-dev \
  --region=asia-northeast3 \
  --limit=50
```

### 4. Terraform "PORT env is reserved" 오류

**원인:** PORT는 Cloud Run 예약 환경변수

**해결:** env_vars에서 PORT 제거 (Cloud Run이 자동 설정)

### 5. Terraform State Lock 오류

**해결:**
```bash
cd infra/environments/dev
terraform force-unlock LOCK_ID
```

---

## 로그 확인 명령어

### Cloud Run 로그
```bash
# 최근 로그
gcloud run services logs read SERVICE_NAME-dev \
  --region=asia-northeast3 \
  --limit=100

# 실시간 로그
gcloud run services logs tail SERVICE_NAME-dev \
  --region=asia-northeast3
```

### Cloud Build 로그
```bash
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### Cloud Run 서비스 상태
```bash
# 서비스 목록
gcloud run services list --region=asia-northeast3

# 서비스 상세
gcloud run services describe SERVICE_NAME-dev \
  --region=asia-northeast3
```

---

## 참고 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
- [ROADMAP.md](./ROADMAP.md) - 개발 로드맵
- [Claude Code Skills](../.claude/skills/) - 자동화 도구
