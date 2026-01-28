# GCP 인프라 세부 구성 가이드 (GKE Autopilot)

## 목차
1. [전체 아키텍처 개요](#전체-아키텍처-개요)
2. [환경별 비교표](#환경별-비교표)
3. [GKE Autopilot 클러스터](#gke-autopilot-클러스터)
4. [네트워크 구성](#네트워크-구성)
5. [서비스 배포](#서비스-배포)
6. [데이터베이스 (PostgreSQL)](#데이터베이스-postgresql)
7. [메시징 (NATS)](#메시징-nats)
8. [Ingress 구성](#ingress-구성)
9. [시크릿 관리](#시크릿-관리)
10. [모니터링](#모니터링)
11. [비용 최적화](#비용-최적화)
12. [트러블슈팅](#트러블슈팅)

---

## 전체 아키텍처 개요

### 인프라 전체 구성도

```mermaid
flowchart TB
    subgraph GCP["GCP Project: uniyous-319808<br/>Region: asia-northeast3 (Seoul)"]

        subgraph SHARED["Shared Resources"]
            AR[("Artifact<br/>Registry")]
            FH[("Firebase<br/>Hosting")]
            SM[("Secret<br/>Manager")]
        end

        subgraph GKE["GKE Autopilot Cluster: parkgolf-cluster-{env}"]
            subgraph INGRESS["Ingress Layer"]
                ING["GKE Ingress<br/>Static IP: 34.160.211.91"]
            end

            subgraph APPS["Application Deployments"]
                ADMIN_API["admin-api"]
                USER_API["user-api"]
                CHAT_GW["chat-gateway"]
                IAM["iam-service"]
                COURSE["course-service"]
                BOOKING["booking-service"]
                NOTIFY["notify-service"]
                CHAT["chat-service"]
            end

            subgraph INFRA["Infrastructure"]
                NATS["NATS<br/>Deployment"]
                PG["PostgreSQL<br/>StatefulSet"]
                PVC[("PVC<br/>Persistent Volume")]
            end
        end
    end

    INTERNET((Internet))

    INTERNET --> FH
    INTERNET --> ING

    ING --> ADMIN_API
    ING --> USER_API
    ING --> CHAT_GW

    ADMIN_API --> NATS
    USER_API --> NATS
    CHAT_GW --> NATS

    NATS <--> IAM
    NATS <--> COURSE
    NATS <--> BOOKING
    NATS <--> NOTIFY
    NATS <--> CHAT

    IAM --> PG
    COURSE --> PG
    BOOKING --> PG
    NOTIFY --> PG
    CHAT --> PG

    PG --> PVC

    AR --> GKE
    SM --> GKE
```

### 서비스 통신 흐름도

```mermaid
flowchart LR
    subgraph CLIENT["Client Layer"]
        WEB["Web Browser"]
        MOBILE["Mobile App"]
    end

    subgraph HOSTING["Firebase Hosting (CDN)"]
        ADMIN_UI["Admin Dashboard"]
        USER_UI["User WebApp"]
    end

    subgraph GKE["GKE Autopilot Cluster"]
        subgraph INGRESS["Ingress"]
            ING["Static IP<br/>34.160.211.91"]
        end

        subgraph BFF["BFF Layer"]
            ADMIN_API["admin-api<br/>:8080"]
            USER_API["user-api<br/>:8080"]
        end

        subgraph SERVICES["Microservices"]
            IAM["iam-service"]
            COURSE["course-service"]
            BOOKING["booking-service"]
            NOTIFY["notify-service"]
        end

        subgraph MESSAGING["Messaging"]
            NATS["NATS<br/>:4222"]
        end

        subgraph DATA["Data Layer"]
            SQL[("PostgreSQL<br/>:5432")]
        end
    end

    WEB --> ADMIN_UI
    WEB --> USER_UI
    MOBILE --> ING

    ADMIN_UI -->|HTTPS| ING
    USER_UI -->|HTTPS| ING

    ING --> ADMIN_API
    ING --> USER_API

    ADMIN_API -->|NATS| NATS
    USER_API -->|NATS| NATS

    NATS <-->|Request/Response| IAM
    NATS <-->|Request/Response| COURSE
    NATS <-->|Request/Response| BOOKING
    NATS <-->|Pub/Sub| NOTIFY

    IAM --> SQL
    COURSE --> SQL
    BOOKING --> SQL
    NOTIFY --> SQL
```

---

## 환경별 비교표

### 전체 리소스 비교

| 구분 | Development | Production |
|------|-------------|------------|
| **GKE Cluster** | parkgolf-cluster-dev | parkgolf-cluster-prod |
| **Cluster Type** | Autopilot | Autopilot |
| **Region** | asia-northeast3 | asia-northeast3 |
| **Static IP** | 34.160.211.91 | (Production IP) |
| **Service CPU** | 100m request, 300m limit | 200m request, 500m limit |
| **Service Memory** | 128Mi request, 256Mi limit | 256Mi request, 512Mi limit |
| **PostgreSQL Storage** | standard-rwo (Balanced PD) | premium-rwo (SSD) |
| **PostgreSQL Size** | 10Gi | 50Gi |
| **NATS** | 1 replica | 3 replicas (HA) |
| **Min Replicas** | 1 | 2 |
| **Max Replicas** | 3 | 10 |

---

## GKE Autopilot 클러스터

### 클러스터 특징

GKE Autopilot은 노드 관리가 자동화된 Kubernetes 서비스입니다:

- **노드 관리 자동화**: 노드 프로비저닝, 업그레이드, 보안 패치 자동 처리
- **Pod 기반 과금**: 실제 사용한 Pod 리소스만 과금
- **보안 강화**: 기본적으로 보안 모범 사례 적용
- **Workload 최적화**: Pod 요청에 맞게 노드 자동 할당

### 클러스터 생성 (cd-infra.yml - gke-setup)

```yaml
# GitHub Actions workflow에서 GKE 클러스터 생성
gcloud container clusters create-auto parkgolf-cluster-$ENVIRONMENT \
  --region=$REGION \
  --project=$PROJECT_ID
```

### 클러스터 접근

```bash
# 클러스터 인증 정보 획득
gcloud container clusters get-credentials parkgolf-cluster-dev \
  --region asia-northeast3 \
  --project uniyous-319808

# 클러스터 정보 확인
kubectl cluster-info

# 노드 확인 (Autopilot은 노드가 자동 관리됨)
kubectl get nodes
```

---

## 네트워크 구성

### Kubernetes 네트워크 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GKE Autopilot Cluster                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          Ingress Layer                               │    │
│  │                                                                      │    │
│  │  Static IP: 34.160.211.91                                           │    │
│  │  Path Routing:                                                       │    │
│  │    /api/admin/* → admin-api:8080                                    │    │
│  │    /api/user/*  → user-api:8080                                     │    │
│  │    /socket.io/* → chat-gateway:8080                                 │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Services (ClusterIP)                          │    │
│  │                                                                      │    │
│  │  admin-api:8080      user-api:8080       chat-gateway:8080          │    │
│  │  iam-service:8080    course-service:8080 booking-service:8080       │    │
│  │  chat-service:8080   notify-service:8080                            │    │
│  │  nats:4222           postgresql:5432                                │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Internal DNS:                                                              │
│    - http://admin-api:8080                                                  │
│    - http://user-api:8080                                                   │
│    - http://iam-service:8080                                                │
│    - nats://nats:4222                                                       │
│    - postgresql://postgresql:5432                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Static IP 예약

```bash
# Global Static IP 예약 (Ingress용)
gcloud compute addresses create parkgolf-ingress-ip \
  --global \
  --project uniyous-319808

# IP 주소 확인
gcloud compute addresses describe parkgolf-ingress-ip \
  --global \
  --format="get(address)"
# 결과: 34.160.211.91
```

---

## 서비스 배포

### Deployment 구성

모든 백엔드 서비스는 Kubernetes Deployment로 배포됩니다.

```yaml
# 서비스 Deployment 예시 (cd-services.yml에서 생성)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iam-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: iam-service
  template:
    metadata:
      labels:
        app: iam-service
    spec:
      containers:
      - name: iam-service
        image: asia-northeast3-docker.pkg.dev/uniyous-319808/parkgolf/iam-service:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "300m"
            memory: "256Mi"
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8080"
        - name: NATS_URL
          value: "nats://nats:4222"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: iam-url
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: iam-service
spec:
  selector:
    app: iam-service
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
```

### 서비스 목록

| Service | Type | Port | Purpose |
|---------|------|------|---------|
| admin-api | Deployment + ClusterIP | 8080 | Admin BFF |
| user-api | Deployment + ClusterIP | 8080 | User BFF |
| chat-gateway | Deployment + ClusterIP | 8080 | WebSocket Gateway |
| iam-service | Deployment + ClusterIP | 8080 | Authentication |
| course-service | Deployment + ClusterIP | 8080 | Course Management |
| booking-service | Deployment + ClusterIP | 8080 | Booking Management |
| chat-service | Deployment + ClusterIP | 8080 | Chat Backend |
| notify-service | Deployment + ClusterIP | 8080 | Notifications |
| nats | Deployment + ClusterIP | 4222 | Message Broker |
| postgresql | StatefulSet + ClusterIP | 5432 | Database |

### 리소스 스펙

| Environment | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-------------|-------------|-----------|----------------|--------------|
| **Development** | 100m | 300m | 128Mi | 256Mi |
| **Production** | 200m | 500m | 256Mi | 512Mi |

---

## 데이터베이스 (PostgreSQL)

### PostgreSQL StatefulSet

PostgreSQL은 GKE 내부에 StatefulSet으로 배포됩니다.

```yaml
# PostgreSQL StatefulSet (cd-infra.yml에서 생성)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgresql
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          value: "parkgolf"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard-rwo  # dev: standard-rwo, prod: premium-rwo
      resources:
        requests:
          storage: 10Gi
```

### 데이터베이스 목록

| Database | Service | Purpose |
|----------|---------|---------|
| iam_db | iam-service | Users, Admins, Roles, Friends |
| course_db | course-service | Companies, Clubs, Courses, TimeSlots |
| booking_db | booking-service | Bookings, Payments, History |
| chat_db | chat-service | ChatRooms, Messages |
| notify_db | notify-service | Notifications, Templates |

### Storage Class

| Environment | Storage Class | Type | IOPS |
|-------------|--------------|------|------|
| Development | standard-rwo | Balanced PD | ~3,000 |
| Production | premium-rwo | SSD PD | ~15,000+ |

### 데이터베이스 접속

```bash
# PostgreSQL Pod에 직접 접속
kubectl exec -it postgresql-0 -- psql -U parkgolf -d iam_db

# 로컬에서 포트 포워딩으로 접속
kubectl port-forward svc/postgresql 5432:5432
psql -h localhost -U parkgolf -d iam_db
```

### 백업 및 복원

```bash
# 백업 (kubectl exec 사용)
kubectl exec postgresql-0 -- pg_dump -U parkgolf iam_db > iam_db_backup.sql

# 복원
kubectl exec -i postgresql-0 -- psql -U parkgolf iam_db < iam_db_backup.sql
```

---

## 메시징 (NATS)

### NATS Deployment

```yaml
# NATS Deployment (cd-infra.yml에서 생성)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
      - name: nats
        image: nats:2.10-alpine
        args:
        - "-js"        # JetStream 활성화
        - "-m"
        - "8222"       # Monitoring port
        ports:
        - containerPort: 4222
          name: client
        - containerPort: 8222
          name: monitoring
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: nats
spec:
  selector:
    app: nats
  ports:
  - name: client
    port: 4222
    targetPort: 4222
  - name: monitoring
    port: 8222
    targetPort: 8222
  type: ClusterIP
```

### NATS 연결 정보

| 설정 | 값 |
|------|-----|
| **Internal URL** | nats://nats:4222 |
| **Monitoring** | http://nats:8222 |
| **JetStream** | Enabled |

### NATS 상태 확인

```bash
# NATS Pod 로그 확인
kubectl logs -l app=nats

# NATS 모니터링 접근 (포트 포워딩)
kubectl port-forward svc/nats 8222:8222
curl http://localhost:8222/varz

# JetStream 상태 확인
curl http://localhost:8222/jsz
```

---

## Ingress 구성

### GKE Ingress

```yaml
# Ingress 리소스 (cd-services.yml에서 생성)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: parkgolf-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: parkgolf-ingress-ip
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
  - http:
      paths:
      - path: /api/admin/*
        pathType: ImplementationSpecific
        backend:
          service:
            name: admin-api
            port:
              number: 8080
      - path: /api/user/*
        pathType: ImplementationSpecific
        backend:
          service:
            name: user-api
            port:
              number: 8080
      - path: /socket.io/*
        pathType: ImplementationSpecific
        backend:
          service:
            name: chat-gateway
            port:
              number: 8080
```

### 경로 라우팅

| Path | Service | Port | Description |
|------|---------|------|-------------|
| `/api/admin/*` | admin-api | 8080 | Admin API |
| `/api/user/*` | user-api | 8080 | User API |
| `/socket.io/*` | chat-gateway | 8080 | WebSocket (Socket.IO) |

### Ingress 상태 확인

```bash
# Ingress 상태 확인
kubectl get ingress parkgolf-ingress

# Ingress 상세 정보
kubectl describe ingress parkgolf-ingress

# 외부 IP 확인
kubectl get ingress parkgolf-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

---

## 시크릿 관리

### Kubernetes Secrets

```yaml
# Secret 생성 (cd-infra.yml에서 생성)
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  password: "${DB_PASSWORD}"
  iam-url: "postgresql://parkgolf:${DB_PASSWORD}@postgresql:5432/iam_db"
  course-url: "postgresql://parkgolf:${DB_PASSWORD}@postgresql:5432/course_db"
  booking-url: "postgresql://parkgolf:${DB_PASSWORD}@postgresql:5432/booking_db"
  chat-url: "postgresql://parkgolf:${DB_PASSWORD}@postgresql:5432/chat_db"
  notify-url: "postgresql://parkgolf:${DB_PASSWORD}@postgresql:5432/notify_db"

---
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secrets
type: Opaque
stringData:
  jwt-secret: "${JWT_SECRET}"
  jwt-refresh-secret: "${JWT_REFRESH_SECRET}"
```

### Secret 사용

```yaml
# Deployment에서 Secret 사용
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: db-credentials
      key: iam-url
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: jwt-secrets
      key: jwt-secret
```

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `GCP_SA_KEY` | GCP 서비스 계정 JSON 키 |
| `DB_PASSWORD` | PostgreSQL 비밀번호 |
| `JWT_SECRET` | JWT 서명 키 |
| `JWT_REFRESH_SECRET` | JWT 리프레시 키 |

---

## 모니터링

### Health Checks

모든 서비스는 `/health` 엔드포인트를 제공합니다:

```typescript
// NestJS Health Controller
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

### 클러스터 모니터링

```bash
# Pod 상태 확인
kubectl get pods

# Pod 리소스 사용량
kubectl top pods

# 특정 서비스 로그
kubectl logs -l app=iam-service --tail=100

# 실시간 로그 스트리밍
kubectl logs -l app=user-api -f
```

### GKE 대시보드

GCP Console에서 GKE 클러스터 모니터링:
- **Workloads**: Deployment, StatefulSet 상태
- **Services & Ingress**: 서비스 및 외부 접근 상태
- **Storage**: PVC 상태
- **Logs**: Cloud Logging 연동

---

## 비용 최적화

### 예상 비용 (월간, USD)

#### Development Environment

| 리소스 | 스펙 | 예상 비용 |
|--------|------|-----------|
| GKE Autopilot (8 services) | 100m CPU, 128Mi 각 | ~$30-50 |
| PostgreSQL PVC | 10Gi standard-rwo | ~$2 |
| NATS | 100m CPU, 128Mi | ~$5 |
| Static IP | 1 IP | ~$5 |
| Artifact Registry | ~5GB | ~$1 |
| **Total** | | **~$45-65/month** |

#### Production Environment

| 리소스 | 스펙 | 예상 비용 |
|--------|------|-----------|
| GKE Autopilot (8 services) | 200m CPU, 256Mi 각 | ~$80-150 |
| PostgreSQL PVC | 50Gi premium-rwo | ~$20 |
| NATS (3 replicas) | 100m CPU, 128Mi 각 | ~$15 |
| Static IP | 1 IP | ~$5 |
| Artifact Registry | ~10GB | ~$2 |
| Firebase Hosting | CDN bandwidth | ~$10-50 |
| **Total** | | **~$130-250/month** |

### 비용 절감 전략

1. **Autopilot 자동 스케일링**: 사용량에 따라 자동 조절
2. **리소스 요청 최적화**: 실제 사용량에 맞게 requests/limits 조정
3. **standard-rwo 사용**: 개발 환경에서 저렴한 스토리지 사용
4. **Pod 통합**: 트래픽이 적은 서비스는 리소스 공유 고려

---

## 트러블슈팅

### 1. Pod가 Pending 상태인 경우

```bash
# Pod 상태 확인
kubectl describe pod <pod-name>

# 일반적인 원인:
# - 리소스 부족 (Autopilot이 노드 프로비저닝 중)
# - PVC 바인딩 대기
# - 이미지 Pull 실패
```

### 2. 서비스 연결 실패

```bash
# 서비스 엔드포인트 확인
kubectl get endpoints <service-name>

# DNS 해석 테스트
kubectl run -it --rm debug --image=busybox -- nslookup nats

# 서비스 포트 확인
kubectl get svc <service-name>
```

### 3. Ingress가 작동하지 않는 경우

```bash
# Ingress 상태 확인
kubectl describe ingress parkgolf-ingress

# Backend 서비스 상태 확인
kubectl get pods -l app=admin-api

# GCE 백엔드 상태 (GCP Console)
# Network services → Load balancing → Backend services
```

### 4. NATS 연결 실패

```bash
# NATS Pod 상태 확인
kubectl get pods -l app=nats

# NATS 로그 확인
kubectl logs -l app=nats

# 서비스에서 NATS 연결 테스트
kubectl exec -it <service-pod> -- nc -zv nats 4222
```

### 5. PostgreSQL 연결 실패

```bash
# PostgreSQL Pod 상태 확인
kubectl get pods -l app=postgresql

# PostgreSQL 로그 확인
kubectl logs postgresql-0

# 연결 테스트
kubectl exec -it <service-pod> -- nc -zv postgresql 5432
```

### 6. 이미지 Pull 실패

```bash
# Pod 이벤트 확인
kubectl describe pod <pod-name>

# Artifact Registry 인증 확인
gcloud auth configure-docker asia-northeast3-docker.pkg.dev

# 이미지 존재 확인
gcloud artifacts docker images list \
  asia-northeast3-docker.pkg.dev/uniyous-319808/parkgolf
```

---

## 유용한 명령어

### 클러스터 관리

```bash
# 클러스터 인증
gcloud container clusters get-credentials parkgolf-cluster-dev \
  --region asia-northeast3

# 모든 리소스 확인
kubectl get all

# 네임스페이스별 리소스
kubectl get all -n default
```

### 디버깅

```bash
# Pod 내부 쉘 접근
kubectl exec -it <pod-name> -- /bin/sh

# 로그 확인 (최근 100줄)
kubectl logs <pod-name> --tail=100

# 이전 Pod 로그 (재시작된 경우)
kubectl logs <pod-name> --previous

# 리소스 사용량
kubectl top pods
kubectl top nodes
```

### 배포 관리

```bash
# Deployment 롤아웃 상태
kubectl rollout status deployment/<name>

# 롤백
kubectl rollout undo deployment/<name>

# 스케일 조정
kubectl scale deployment/<name> --replicas=3

# 이미지 업데이트
kubectl set image deployment/<name> <container>=<new-image>
```

---

## 참고 자료

- [GKE Autopilot 문서](https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview)
- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [NATS 문서](https://docs.nats.io/)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)

---

**Document Version**: 2.0.0
**Last Updated**: 2026-01-28
**Architecture**: GKE Autopilot (migrated from Cloud Run)
