# GKE Autopilot Workflows Guide

GKE Autopilot 클러스터 관리를 위한 GitHub Actions 워크플로우 가이드입니다.

## 워크플로우 목록

| 워크플로우 | 파일 | 용도 |
|-----------|------|------|
| Infrastructure Setup | `gke-infra-setup.yml` | 클러스터 및 인프라(PostgreSQL, NATS) 생성 |
| Deploy Services | `gke-deploy-services.yml` | 서비스 빌드 및 배포 |
| Destroy Cluster | `gke-destroy.yml` | 클러스터 삭제 (비용 절약) |

---

## 사전 준비

### 1. GCP 서비스 계정 생성

```bash
# 프로젝트 ID 설정
export PROJECT_ID=your-project-id

# 서비스 계정 생성
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions for GKE"

# 필요한 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# JSON 키 생성
gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# 키 내용 확인 (GitHub Secrets에 등록할 내용)
cat gcp-sa-key.json
```

### 2. GitHub Secrets 설정

Repository → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | 설명 | 예시 |
|-------------|------|------|
| `GCP_PROJECT_ID` | GCP 프로젝트 ID | `parkgolf-12345` |
| `GCP_SA_KEY` | 서비스 계정 JSON 키 전체 | `{"type":"service_account",...}` |
| `POSTGRES_PASSWORD` | PostgreSQL 비밀번호 | `SecureP@ssw0rd!` |
| `JWT_SECRET` | JWT 시크릿 (32자 이상) | `your-super-secret-jwt-key-min-32` |
| `JWT_REFRESH_SECRET` | JWT 리프레시 시크릿 | `your-refresh-secret-key` |

---

## 사용 방법

### 1단계: 인프라 구축 (최초 1회)

1. GitHub → Actions → **"GKE Autopilot Infrastructure Setup"**
2. "Run workflow" 클릭
3. 옵션 선택:
   - `action`: **create**
   - `cluster_name`: **parkgolf-dev** (기본값)
4. "Run workflow" 실행

**소요 시간**: 약 10-15분

**생성되는 리소스**:
- GKE Autopilot 클러스터
- Artifact Registry (Docker 이미지 저장소)
- Namespace: `parkgolf-dev`
- Secrets, ConfigMap
- PostgreSQL (StatefulSet + 10GB PVC)
- NATS (Deployment)
- 5개 데이터베이스: iam_db, course_db, booking_db, chat_db, notify_db

### 2단계: 서비스 배포

1. GitHub → Actions → **"Deploy Services to GKE"**
2. "Run workflow" 클릭
3. 옵션 선택:
   - `services`: **all** (또는 특정 서비스 지정)
   - `cluster_name`: **parkgolf-dev**
4. "Run workflow" 실행

**소요 시간**: 약 10-15분

**배포되는 서비스**:
- iam-service
- course-service
- booking-service
- chat-service
- notify-service
- admin-api
- user-api
- chat-gateway

**특정 서비스만 배포**:
```
services: iam-service,user-api
```

### 3단계: 접속 확인

배포 완료 후 Deployment Summary에서 IP 주소 확인:

```
Static IP: 34.xxx.xxx.xxx

Endpoints:
  - Admin API: http://34.xxx.xxx.xxx/api/admin
  - User API:  http://34.xxx.xxx.xxx/api/user
  - WebSocket: ws://34.xxx.xxx.xxx/socket.io
```

> ⚠️ Ingress 준비까지 5-10분 추가 소요될 수 있음

---

## 클러스터 삭제 (비용 절약)

개발 클러스터를 임시로 삭제하여 비용을 절약할 수 있습니다.

1. GitHub → Actions → **"Destroy GKE Cluster"**
2. "Run workflow" 클릭
3. 옵션 입력:
   - `confirm`: **destroy** (정확히 입력)
   - `cluster_name`: **parkgolf-dev**
   - `delete_ip`: **yes**
4. "Run workflow" 실행

**주의사항**:
- 모든 Pod, Service, PVC가 삭제됩니다
- PostgreSQL 데이터도 삭제됩니다
- Artifact Registry의 이미지는 보존됩니다
- `prod`가 포함된 클러스터는 삭제가 차단됩니다

---

## 비용 예상

### GKE Autopilot (서울 리전)

| 항목 | 리소스 | 월 비용 (USD) |
|------|--------|--------------|
| Pod CPU | ~2.5 vCPU | ~$80 |
| Pod Memory | ~5 GB | ~$18 |
| PVC (PostgreSQL) | 10 GB | ~$2 |
| Load Balancer | 1개 | ~$18 |
| **합계** | | **~$118 (~16만원)** |

### 비용 절약 팁

1. **개발 시간에만 클러스터 운영**
   - 퇴근 시: `gke-destroy.yml` 실행
   - 출근 시: `gke-infra-setup.yml` + `gke-deploy-services.yml` 실행

2. **리소스 최적화**
   - 개발 환경에서 replicas: 1 유지
   - 불필요한 서비스 중지

---

## 트러블슈팅

### 클러스터 생성 실패

```bash
# 직접 상태 확인
gcloud container clusters list
gcloud container clusters describe parkgolf-dev --region=asia-northeast3
```

### Pod 시작 실패

```bash
# kubectl 연결
gcloud container clusters get-credentials parkgolf-dev --region=asia-northeast3

# Pod 상태 확인
kubectl get pods -n parkgolf-dev
kubectl describe pod <pod-name> -n parkgolf-dev
kubectl logs <pod-name> -n parkgolf-dev
```

### 이미지 Pull 실패

```bash
# Artifact Registry 확인
gcloud artifacts repositories list --location=asia-northeast3
gcloud artifacts docker images list asia-northeast3-docker.pkg.dev/PROJECT_ID/parkgolf
```

### Ingress 준비 안 됨

```bash
# Ingress 상태 확인 (ADDRESS가 할당되어야 함)
kubectl get ingress -n parkgolf-dev

# Backend 상태 확인
kubectl describe ingress parkgolf-ingress -n parkgolf-dev
```

---

## 로컬 개발 환경 연결

GKE 클러스터의 서비스를 로컬에서 테스트:

```bash
# kubectl 연결
gcloud container clusters get-credentials parkgolf-dev --region=asia-northeast3

# 포트 포워딩
kubectl port-forward svc/user-api 3001:3000 -n parkgolf-dev
kubectl port-forward svc/postgres 5432:5432 -n parkgolf-dev
kubectl port-forward svc/nats 4222:4222 -n parkgolf-dev

# 이제 localhost:3001로 user-api 접근 가능
```

---

## Cloud Run과 비교

| 항목 | Cloud Run (현재) | GKE Autopilot |
|------|-----------------|---------------|
| Cold Start | 있음 (scale-to-zero) | 없음 (항상 실행) |
| 월 비용 | ~15-20만원 | ~15-18만원 |
| 관리 복잡도 | 낮음 | 중간 |
| WebSocket | min-instances 필요 | 기본 지원 |
| 실시간 응답 | 추가 비용 필요 | 기본 포함 |

**GKE Autopilot 권장 상황**:
- 실시간 서비스 필수 (WebSocket, 채팅)
- Cold Start 허용 불가
- 서비스 간 내부 통신 최적화 필요
