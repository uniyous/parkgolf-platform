# GitHub Actions Workflows

Park Golf Platform CI/CD 파이프라인

## Workflows

| 파일 | 용도 | 트리거 |
|------|------|--------|
| `ci.yml` | CI (lint, test, build) | Manual |
| `cd-infra.yml` | 인프라 관리 (Network + GKE) | Manual |
| `cd-services.yml` | 백엔드 서비스 배포 | Manual |
| `cd-apps.yml` | 프론트엔드 앱 배포 | Manual |

---

## 1. CI Pipeline (`ci.yml`)

코드 품질 검증 파이프라인

```bash
# 실행
Actions > CI Pipeline > Run workflow
  - target: all / apps / services
```

| 단계 | 설명 |
|------|------|
| Lint | ESLint 검사 |
| Test | Jest 테스트 |
| Build | 빌드 검증 |
| Security | Trivy 취약점 스캔 |

---

## 2. Infrastructure (`cd-infra.yml`)

네트워크 및 GKE 클러스터 관리

```bash
# 실행
Actions > CD Infrastructure > Run workflow
  - environment: dev / prod
  - action: status / network-apply / gke-setup / gke-update / gke-destroy / network-destroy
  - confirm: "destroy" (삭제 시 필수)
```

### Actions

| Action | 설명 |
|--------|------|
| `status` | 인프라 상태 확인 |
| `network-apply` | VPC/Subnet 생성 (Terraform) |
| `gke-setup` | GKE 클러스터 + PostgreSQL + NATS 생성 |
| `gke-update` | Secret/ConfigMap 업데이트 |
| `gke-destroy` | GKE 클러스터 삭제 |
| `network-destroy` | VPC/Subnet 삭제 (Terraform) |

### 생성되는 리소스

**GKE Setup:**
- GKE Autopilot 클러스터
- Artifact Registry
- Kubernetes Namespace
- Secrets (DB 비밀번호, JWT)
- ConfigMap (환경변수)
- PostgreSQL StatefulSet + PVC (10Gi)
- NATS Deployment

---

## 3. Backend Services (`cd-services.yml`)

백엔드 마이크로서비스 배포

```bash
# 실행
Actions > CD Services > Run workflow
  - environment: dev / prod
  - services: all / iam-service,admin-api (쉼표 구분)
```

### 서비스 목록

| 서비스 | 포트 | DB |
|--------|------|-----|
| iam-service | 8080 | iam_db |
| course-service | 8080 | course_db |
| booking-service | 8080 | booking_db |
| chat-service | 8080 | chat_db |
| notify-service | 8080 | notify_db |
| admin-api | 8080 | - |
| user-api | 8080 | - |
| chat-gateway | 8080 | - |

### 배포 프로세스

1. Docker 이미지 빌드 & Artifact Registry 푸시
2. Kubernetes Deployment 적용
3. Ingress 설정 (Static IP)

---

## 4. Frontend Apps (`cd-apps.yml`)

프론트엔드 앱 Firebase Hosting 배포

```bash
# 실행
Actions > CD Apps > Run workflow
  - environment: dev / prod
  - apps: all / admin-dashboard,user-app-web
```

### 앱 목록

| 앱 | Firebase Site (dev) | Firebase Site (prod) |
|----|---------------------|----------------------|
| admin-dashboard | parkgolf-admin-dev | parkgolf-admin |
| user-app-web | parkgolf-user-dev | parkgolf-user |

---

## 배포 순서

### 최초 설정

```
1. cd-infra.yml (network-apply)  → VPC/Subnet 생성
2. cd-infra.yml (gke-setup)      → GKE 클러스터 생성
3. cd-services.yml               → 백엔드 서비스 배포
4. cd-apps.yml                   → 프론트엔드 배포
```

### 서비스 업데이트

```
cd-services.yml  → 변경된 서비스만 배포
cd-apps.yml      → 변경된 앱만 배포
```

### 설정 변경

```
cd-infra.yml (gke-update)  → Secret/ConfigMap 변경 후 서비스 재시작
```

### 클러스터 삭제 (비용 절감)

```
cd-infra.yml (gke-destroy)  → GKE 클러스터 삭제 (VPC 보존)
```

---

## GitHub Secrets

| Secret | 용도 |
|--------|------|
| `GCP_SA_KEY` | GCP 서비스 계정 JSON 키 |
| `DB_PASSWORD` | PostgreSQL 비밀번호 |
| `JWT_SECRET` | JWT 서명 키 |
| `JWT_REFRESH_SECRET` | JWT 리프레시 토큰 키 |

---

## 환경별 리소스

### Dev 환경

| 리소스 | 값 |
|--------|-----|
| GKE Cluster | parkgolf-dev-cluster |
| Namespace | parkgolf-dev |
| Static IP | 34.160.121.150 |
| VPC | parkgolf-dev |

### Prod 환경

| 리소스 | 값 |
|--------|-----|
| GKE Cluster | parkgolf-prod-cluster |
| Namespace | parkgolf-prod |
| Domain | api.parkgolf.com (예정) |
| VPC | parkgolf-prod |

---

## 문제 해결

### 클러스터 상태 확인

```bash
# GKE 클러스터
gcloud container clusters list

# 파드 상태
kubectl get pods -n parkgolf-dev

# 서비스 로그
kubectl logs -f deployment/iam-service -n parkgolf-dev
```

### Ingress 확인

```bash
# Ingress 상태
kubectl get ingress -n parkgolf-dev

# Static IP
gcloud compute addresses list --global
```

### 데이터베이스 접속

```bash
# PostgreSQL 파드 접속
kubectl exec -it postgres-0 -n parkgolf-dev -- psql -U parkgolf -d iam_db
```
