---
name: cicd
description: 인프라 및 CI/CD 가이드. GKE Autopilot 배포, Firebase Hosting, GitHub Actions 워크플로우, 트러블슈팅. 트리거 키워드 - 배포, deploy, 인프라, infrastructure, GKE, CI/CD, 파이프라인, Kubernetes, kubectl
---

# Infrastructure & CI/CD Guide

GKE Autopilot + Firebase Hosting + GitHub Actions 기반 배포 가이드

---

## 1. 인프라 개요

| 컴포넌트 | 기술 | 용도 |
|---------|------|------|
| Backend 런타임 | GKE Autopilot | NestJS 서비스 배포 |
| Frontend 호스팅 | Firebase Hosting | React 앱 배포 |
| 컨테이너 레지스트리 | Artifact Registry | Docker 이미지 저장 |
| 네트워크 | Terraform (VPC) | VPC, Subnet 관리 |
| DB | PostgreSQL (K8s StatefulSet) | 서비스별 DB |
| 메시지 브로커 | NATS (K8s Deployment) | 서비스 간 통신 |
| SSL | GKE ManagedCertificate | HTTPS 인증서 |
| 리전 | asia-northeast3 (서울) | - |

### 도메인

| 환경 | API | 프론트엔드 |
|------|-----|-----------|
| dev | `dev-api.parkgolfmate.com` | Firebase 자동 URL |
| prod | `api.parkgolfmate.com` | Firebase 자동 URL |

---

## 2. GitHub Actions 워크플로우

| 파일 | 이름 | 용도 | 트리거 |
|------|------|------|--------|
| `ci.yml` | CI Pipeline | Lint, Test, Build, Security Scan | workflow_dispatch |
| `cd-services.yml` | CD Services | Backend → GKE 배포 | workflow_dispatch |
| `cd-apps.yml` | CD Apps | Frontend → Firebase 배포 | workflow_dispatch |
| `cd-infra.yml` | CD Infrastructure | VPC/GKE 클러스터 관리 | workflow_dispatch |

---

## 3. 배포 전략

### 환경 분리

- `develop` 브랜치 → **dev** 환경
- `main` 브랜치 → **prod** 환경

### 선택적 서비스 배포

```
# CD Services 워크플로우에서 선택
services: "iam-service,course-service"  # 쉼표 구분
services: "all"                         # 전체 배포
```

### 서비스 전체 목록

```
iam-service, course-service, booking-service, payment-service,
chat-service, notify-service, admin-api, user-api, chat-gateway,
weather-service, location-service, job-service, agent-service
```

---

## 4. Backend 배포 (cd-services.yml)

### 파이프라인

```
Setup → Build & Push (Docker → Artifact Registry) → Deploy (K8s) → Setup Ingress
```

### 서비스별 리소스

| 서비스 | CPU (req/lim) | Memory (req/lim) | DB |
|--------|--------------|-------------------|-----|
| iam-service | 50m/250m | 128Mi/384Mi | iam_db |
| course-service | 50m/250m | 128Mi/384Mi | course_db |
| booking-service | 50m/250m | 128Mi/384Mi | booking_db |
| payment-service | 50m/250m | 128Mi/384Mi | payment_db |
| chat-service | 50m/250m | 128Mi/384Mi | chat_db |
| notify-service | 50m/250m | 128Mi/384Mi | notify_db |
| chat-gateway | 100m/300m | 128Mi/384Mi | - |
| job-service | 50m/200m | 64Mi/256Mi | - |
| 기타 (BFF, etc.) | 50m/250m | 128Mi/384Mi | - |

### K8s Probe 설정

```yaml
startupProbe:    /health      # failureThreshold: 12, period: 5s
readinessProbe:  /health/ready # initialDelay: 5s, period: 5s
livenessProbe:   /health/live  # initialDelay: 30s, period: 10s
```

### Ingress 라우팅

| 경로 | 서비스 |
|------|--------|
| `/api/admin/*` | admin-api |
| `/api/user/*` | user-api |
| `/socket.io/*`, `/chat/*`, `/notification/*` | chat-gateway |
| `/webhook/*` | payment-service |

---

## 5. Frontend 배포 (cd-apps.yml)

### 파이프라인

```
Setup → Build (Vite) → Deploy (Firebase Hosting)
```

### 앱 목록

| 앱 | Firebase Site (dev) | Firebase Site (prod) |
|----|--------------------|--------------------|
| admin-dashboard | parkgolf-admin-dev | parkgolf-admin |
| platform-dashboard | parkgolf-platform-dev | parkgolf-platform |
| user-app-web | parkgolf-user-dev | parkgolf-user |

### 빌드 환경변수

```
VITE_API_URL        → https://{env}-api.parkgolfmate.com
VITE_CHAT_SOCKET_URL → https://{env}-api.parkgolfmate.com
VITE_ENV            → dev | prod
VITE_TOSS_CLIENT_KEY → GitHub Secret
VITE_KAKAO_JS_KEY   → GitHub Secret
```

---

## 6. 인프라 관리 (cd-infra.yml)

### Actions

| Action | 설명 |
|--------|------|
| `status` | VPC, GKE, Pod, Service, Ingress 상태 확인 |
| `network-apply` | Terraform으로 VPC/Subnet 생성 |
| `gke-setup` | GKE 클러스터 + PostgreSQL + NATS + Secrets/ConfigMap 생성 |
| `gke-update` | Secrets/ConfigMap 업데이트 + Deployment 재시작 |
| `gke-destroy` | GKE 클러스터 삭제 (dev만, confirm 필수) |
| `network-destroy` | VPC/Subnet 삭제 (dev만, confirm 필수) |

### K8s 리소스 구조

```
Namespace: parkgolf-{env}
├── Secret: parkgolf-secrets (JWT, DB, API Keys)
├── ConfigMap: parkgolf-config (NATS_URL, NODE_ENV, ...)
├── StatefulSet: postgres (PostgreSQL 15)
├── Deployment: nats (NATS 2.10)
├── Deployment: {service} × 13
├── Service: {service} × 13 (port 8080)
├── Ingress: parkgolf-ingress
├── ManagedCertificate: parkgolf-cert
└── BackendConfig: websocket-backend-config (chat-gateway)
```

---

## 7. CI Pipeline (ci.yml)

```
Setup → CI Apps (matrix) + CI Services (matrix) + Security Scan → CI Status
```

| 단계 | 내용 |
|------|------|
| CI Apps | npm ci → lint → typecheck → test → build |
| CI Services | npm ci → lint → test → build |
| Security Scan | Trivy (CRITICAL, HIGH) |

---

## 8. 트러블슈팅

### Pod Pending

```bash
kubectl describe pod {pod-name} -n parkgolf-{env}
# 원인: 리소스 부족 → GKE Autopilot이 노드 자동 프로비저닝 대기
# 해결: 몇 분 대기, 지속되면 리소스 요청량 확인
```

### NATS 연결 실패

```bash
kubectl logs {service-pod} -n parkgolf-{env}
# 원인: NATS Pod 미실행 또는 NATS_URL 잘못 설정
# 확인: kubectl get pods -n parkgolf-{env} | grep nats
# ConfigMap: NATS_URL=nats://nats:4222
```

### Ingress 접속 불가

```bash
kubectl get ingress -n parkgolf-{env}
kubectl describe ingress parkgolf-ingress -n parkgolf-{env}
# 확인: Static IP 할당, ManagedCertificate 상태, DNS 설정
# ManagedCertificate: Active 상태까지 최대 15분 소요
```

### DB 연결 실패

```bash
kubectl exec -it postgres-0 -n parkgolf-{env} -- psql -U parkgolf -l
# 확인: DB 존재 여부, DATABASE_URL Secret 설정
```

### 이미지 Pull 실패

```bash
kubectl describe pod {pod-name} -n parkgolf-{env}
# 원인: Artifact Registry 권한 또는 이미지 태그 오류
# 확인: gcloud auth configure-docker asia-northeast3-docker.pkg.dev
```

---

## 9. 유용한 명령어

### kubectl

```bash
# 클러스터 인증
gcloud container clusters get-credentials parkgolf-{env}-cluster --region=asia-northeast3

# 리소스 조회
kubectl get pods -n parkgolf-{env}
kubectl get svc -n parkgolf-{env}
kubectl get ingress -n parkgolf-{env}

# 로그 확인
kubectl logs -f deployment/{service} -n parkgolf-{env}
kubectl logs {pod-name} -n parkgolf-{env} --previous  # 이전 크래시 로그

# 배포 상태
kubectl rollout status deployment/{service} -n parkgolf-{env}
kubectl rollout restart deployment/{service} -n parkgolf-{env}

# Secrets/ConfigMap 확인
kubectl get secret parkgolf-secrets -n parkgolf-{env} -o jsonpath='{.data}'
kubectl get configmap parkgolf-config -n parkgolf-{env} -o yaml

# DB 접속
kubectl exec -it postgres-0 -n parkgolf-{env} -- psql -U parkgolf -d {db_name}

# NATS 모니터링
kubectl port-forward svc/nats 8222:8222 -n parkgolf-{env}
# 브라우저: http://localhost:8222/connz
```

### gcloud

```bash
# 클러스터 목록
gcloud container clusters list

# Artifact Registry 이미지
gcloud artifacts docker images list asia-northeast3-docker.pkg.dev/{project}/parkgolf

# Static IP 확인
gcloud compute addresses list --global
```
