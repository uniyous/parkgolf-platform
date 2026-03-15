# Infrastructure & CI/CD Guide (GKE Autopilot)

## 인프라 구성도

```mermaid
flowchart TB
    subgraph GCP["GCP Project: parkgolf-uniyous | Region: asia-northeast3 (Seoul)"]
        subgraph SHARED["Shared Resources"]
            AR[("Artifact Registry")]
            FH[("Firebase Hosting")]
        end

        subgraph GKE["GKE Autopilot Cluster: parkgolf-{env}-cluster"]
            subgraph INGRESS["Ingress Layer"]
                ING["GKE Ingress (Static IP)"]
            end

            subgraph BFF["BFF Layer"]
                ADMIN_API["admin-api"]
                USER_API["user-api"]
                CHAT_GW["chat-gateway"]
            end

            subgraph CORE["Core Services"]
                IAM["iam-service"]
                COURSE["course-service"]
                BOOKING["booking-service"]
                SAGA["saga-service"]
                PAY["payment-service"]
                PARTNER["partner-service"]
                NOTIFY["notify-service"]
                CHAT["chat-service"]
            end

            subgraph EXT["AI & External"]
                AGENT["agent-service"]
                WEATHER["weather-service"]
                LOCATION["location-service"]
            end

            subgraph INFRA["Infrastructure"]
                NATS["NATS (JetStream)"]
                PG["PostgreSQL (StatefulSet)"]
            end
        end
    end

    INTERNET((Internet)) --> FH
    INTERNET --> ING
    ING --> BFF
    BFF --> NATS
    NATS <--> CORE
    NATS <--> EXT
    CORE --> PG
    AR --> GKE
```

## 환경별 비교

| 구분 | Development | Production |
|------|-------------|------------|
| **Cluster** | parkgolf-dev-cluster | parkgolf-prod-cluster |
| **Namespace** | parkgolf-dev | parkgolf-prod |
| **CPU** | 50m req / 250m limit | 200m req / 500m limit |
| **Memory** | 128Mi req / 384Mi limit | 256Mi req / 512Mi limit |
| **PostgreSQL** | standard-rwo 10Gi | premium-rwo 50Gi |
| **NATS** | 1 replica | 3 replicas (HA) |
| **Replicas** | 1 each | 2+ each |

## Ingress 경로 라우팅

| Path | Service | Description |
|------|---------|-------------|
| `/api/admin/*` | admin-api | Admin/Platform API |
| `/api/user/*` | user-api | User API |
| `/socket.io/*` | chat-gateway | WebSocket (Socket.IO) |
| `/chat/*` | chat-gateway | 채팅 REST |
| `/notification/*` | chat-gateway | 알림 REST |
| `/webhook/*` | payment-service | 결제 웹훅 (Toss) |

> chat-gateway: BackendConfig (WebSocket timeout 3600s, session affinity), 2 replicas, PDB

## 데이터베이스

| Database | Service | Models |
|----------|---------|--------|
| iam_db | iam-service | Users, Admins, Roles, Friends, CompanyMembers, Menus |
| course_db | course-service | Companies, Clubs, Courses, Games, TimeSlots, Schedules |
| booking_db | booking-service | Bookings, Refunds, NoShowRecords, Policies |
| saga_db | saga-service | SagaExecutions, SagaSteps, OutboxEvents |
| payment_db | payment-service | Payments, BillingKeys, Refunds, WebhookLogs |
| partner_db | partner-service | PartnerConfigs, CourseMappings, SlotMappings, BookingMappings, SyncLogs |
| chat_db | chat-service | ChatRooms, Messages |
| notify_db | notify-service | Notifications, Templates |

```bash
# DB 접속
kubectl exec -it postgres-0 -n parkgolf-dev -- psql -U parkgolf -d iam_db

# 로컬 포트포워딩
kubectl port-forward svc/postgres 5432:5432 -n parkgolf-dev

# Prisma 스키마 적용
DATABASE_URL="postgresql://parkgolf:PASSWORD@localhost:5432/booking_db" npx prisma db push
```

## Secrets & ConfigMap

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `GCP_SA_KEY` | GCP 서비스 계정 JSON 키 |
| `DB_PASSWORD` | PostgreSQL 비밀번호 |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | JWT 서명 키 (32자 이상) |
| `TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` / `TOSS_SECURITY_KEY` | Toss Payments 키 |
| `KMA_API_KEY` | 기상청 API 키 |
| `KAKAO_API_KEY` | 카카오 로컬 API 키 |
| `FIREBASE_TOKEN` | Firebase CLI 배포 토큰 |

### K8s 주입 방식

```yaml
envFrom:
- configMapRef:
    name: parkgolf-config    # NODE_ENV, PORT, NATS_URL, DB_HOST
- secretRef:
    name: parkgolf-secrets   # DB_PASSWORD, JWT_SECRET, API keys
env:
- name: DATABASE_URL
  value: "postgresql://parkgolf:$(DB_PASSWORD)@postgres:5432/{db_name}"
```

---

## CI/CD Pipeline

### 워크플로우

```mermaid
graph LR
    CI[ci.yml] --> LINT[Lint + Type Check]
    CI --> TEST[Test]
    CI --> BUILD[Build]
    CI --> SCAN[Security Scan]

    INFRA[cd-infra.yml] --> NET[network-apply]
    INFRA --> SETUP[gke-setup]
    INFRA --> UPDATE[gke-update]
    INFRA --> DESTROY[gke-destroy]

    SERVICES[cd-services.yml] --> DOCKER[Docker Build]
    DOCKER --> AR[Artifact Registry]
    AR --> DEPLOY[K8s Deploy]

    APPS[cd-apps.yml] --> VITE[npm build]
    VITE --> FH[Firebase Hosting]
```

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI Pipeline | `ci.yml` | 수동 | Lint, Test, Build, Security Scan |
| CD Infrastructure | `cd-infra.yml` | 수동 | GKE 클러스터 및 인프라 관리 |
| CD Services | `cd-services.yml` | 수동 | 백엔드 서비스 배포 (GKE) |
| CD Apps | `cd-apps.yml` | 수동 | 프론트엔드 앱 배포 (Firebase) |

> 모든 워크플로우는 **수동 실행(workflow_dispatch)**, 환경별(dev/prod) 분리

### 배포 순서

```
최초 구축:  network-apply → gke-setup → cd-services(all) → cd-apps(all)
일반 배포:  cd-services(서비스명) 또는 cd-apps(앱명)
인프라 변경: cd-infra(gke-update)
```

### cd-infra.yml Actions

| Action | Description |
|--------|-------------|
| `status` | 인프라 상태 확인 |
| `network-apply` | VPC 네트워크 설정 (Terraform) |
| `gke-setup` | 클러스터 생성 (API → AR → GKE → NS → Secrets → PG → NATS → PDB) |
| `gke-update` | Secret/ConfigMap 재적용 + 전체 Pod 재시작 |
| `gke-destroy` | 클러스터 삭제 + 고아 PVC 정리 (**prod 차단**) |
| `network-destroy` | VPC 삭제 (**prod 차단**) |

### cd-services.yml

```bash
# 전체 배포
services: all

# 선택적 배포 (콤마 구분)
services: iam-service,user-api,agent-service
```

15개 서비스: admin-api, user-api, chat-gateway, iam-service, course-service, booking-service, saga-service, payment-service, partner-service, chat-service, notify-service, agent-service, weather-service, location-service, job-service

### cd-apps.yml

```bash
# 전체 배포
apps: all

# 선택적 배포
apps: admin-dashboard
```

3개 앱: admin-dashboard, platform-dashboard, user-app-web

| App | Dev Site | Prod Site |
|-----|----------|-----------|
| admin-dashboard | parkgolf-admin-dev | parkgolf-admin |
| platform-dashboard | parkgolf-platform-dev | parkgolf-platform |
| user-app-web | parkgolf-user-dev | parkgolf-user |

---

## 트러블슈팅

### 클러스터 접근

```bash
gcloud container clusters get-credentials parkgolf-dev-cluster \
  --region asia-northeast3 --project parkgolf-uniyous
kubectl config set-context --current --namespace=parkgolf-dev
```

### 주요 디버깅 명령어

```bash
kubectl get all                          # 전체 리소스
kubectl get pods                         # Pod 상태
kubectl logs -l app=<service> --tail=100 # 로그
kubectl logs -l app=<service> -f         # 실시간 로그
kubectl describe pod <pod-name>          # Pod 상세 (이벤트)
kubectl top pods                         # 리소스 사용량
kubectl exec -it <pod> -- /bin/sh        # Pod 쉘 접근
kubectl rollout status deployment/<name> # 배포 상태
kubectl rollout undo deployment/<name>   # 롤백
```

### 자주 발생하는 문제

| 문제 | 확인 명령 |
|------|----------|
| Pod Pending | `kubectl describe pod <name>` — 리소스/이미지 확인 |
| 서비스 연결 실패 | `kubectl get endpoints <svc>` — 엔드포인트 확인 |
| Ingress 불가 | `kubectl describe ingress parkgolf-ingress` |
| NATS 연결 실패 | `kubectl logs -l app=nats` |
| DB 연결 실패 | `kubectl logs postgres-0` + Secret 확인 |
| 이미지 Pull 실패 | `gcloud artifacts docker images list ...` |

---

**Last Updated**: 2026-03-15
