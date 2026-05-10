# ArgoCD 접속 가이드

| 환경 | 클러스터 | Application | local port | 도메인 |
|---|---|---|---|---|
| dev | `parkgolf-dev-cluster` (zonal `asia-northeast3-a`) | `parkgolf-dev` | **8081** | `dev-api.parkgolfmate.com` |
| prod | `parkgolf-prod-cluster` (regional `asia-northeast3`) | `parkgolf-prod` | **8082** | `api.parkgolfmate.com` |

## 1. 사전 요구사항

| 항목 | 확인 |
|---|---|
| `gcloud` CLI 인증 | `gcloud auth list`에 활성 계정 |
| `kubectl` 설치 | `kubectl version --client` |
| `gke-gcloud-auth-plugin` | `gcloud components install gke-gcloud-auth-plugin` |
| GKE 클러스터 권한 | `roles/container.developer` 이상 |

## 2. kubectl 컨텍스트 연결

### 2.1 dev

```bash
gcloud container clusters get-credentials parkgolf-dev-cluster \
  --zone=asia-northeast3-a \
  --project=parkgolf-uniyous

kubectl config rename-context \
  gke_parkgolf-uniyous_asia-northeast3-a_parkgolf-dev-cluster \
  parkgolf-dev
```

### 2.2 prod

```bash
gcloud container clusters get-credentials parkgolf-prod-cluster \
  --region=asia-northeast3 \
  --project=parkgolf-uniyous

kubectl config rename-context \
  gke_parkgolf-uniyous_asia-northeast3_parkgolf-prod-cluster \
  parkgolf-prod
```

### 2.3 컨텍스트 전환

```bash
kubectl config use-context parkgolf-dev      # dev
kubectl config use-context parkgolf-prod     # prod
kubectl config current-context                # 현재 컨텍스트 확인
```

## 3. 접속 방법

### 3.1 port-forward (권장)

dev/prod를 동시에 띄울 수 있도록 포트를 분리합니다.

```bash
# dev (port 8081)
kubectl --context=parkgolf-dev port-forward svc/argocd-server -n argocd 8081:443

# prod (port 8082)
kubectl --context=parkgolf-prod port-forward svc/argocd-server -n argocd 8082:443
```

브라우저:
- dev:  <https://localhost:8081>
- prod: <https://localhost:8082>

> self-signed 인증서 경고 → "고급 → 안전하지 않음으로 이동" 진행

### 3.2 백그라운드 실행

```bash
# dev
nohup kubectl --context=parkgolf-dev port-forward svc/argocd-server -n argocd 8081:443 \
  > /tmp/argocd-dev-pf.log 2>&1 &
echo $! > /tmp/argocd-dev-pf.pid

# prod
nohup kubectl --context=parkgolf-prod port-forward svc/argocd-server -n argocd 8082:443 \
  > /tmp/argocd-prod-pf.log 2>&1 &
echo $! > /tmp/argocd-prod-pf.pid

# 종료
kill $(cat /tmp/argocd-dev-pf.pid)
kill $(cat /tmp/argocd-prod-pf.pid)
```

### 3.3 LoadBalancer (옵션)

외부 노출이 필요하면 (CI/CD 등):

```bash
kubectl --context=parkgolf-dev patch svc argocd-server -n argocd \
  -p '{"spec": {"type": "LoadBalancer"}}'

kubectl --context=parkgolf-dev get svc argocd-server -n argocd -w
```

> ⚠️ 공개 노출 시 IAP / 방화벽 / OAuth로 접근 제한 권장

## 4. 인증

### 4.1 초기 admin 비밀번호

설치 직후 자동 생성된 임시 비밀번호:

```bash
# dev
kubectl --context=parkgolf-dev -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d; echo

# prod
kubectl --context=parkgolf-prod -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d; echo
```

| Username | `admin` |
| Password | 위 명령 출력값 |

### 4.2 비밀번호 변경

UI에서: 좌측 하단 User Info → Update Password

CLI:

```bash
brew install argocd

# dev
argocd login localhost:8081 --username admin --password <초기> --insecure
argocd account update-password

# prod
argocd login localhost:8082 --username admin --password <초기> --insecure
argocd account update-password
```

비밀번호 변경 후 초기 secret 삭제 가능:

```bash
kubectl --context=parkgolf-dev  -n argocd delete secret argocd-initial-admin-secret
kubectl --context=parkgolf-prod -n argocd delete secret argocd-initial-admin-secret
```

## 5. 일상 사용

### 5.1 Application 이름

| 환경 | 이름 | 자동 sync |
|---|---|---|
| dev  | `parkgolf-dev`  | ✅ enabled (selfHeal + prune) |
| prod | `parkgolf-prod` | ❌ 수동 (UI에서 SYNC 클릭) |

### 5.2 자주 쓰는 작업

| 작업 | UI | CLI (dev) | CLI (prod) |
|---|---|---|---|
| 강제 sync | Application → SYNC | `argocd --server localhost:8081 app sync parkgolf-dev` | `argocd --server localhost:8082 app sync parkgolf-prod` |
| Hard refresh | REFRESH 드롭다운 → Hard Refresh | `argocd --server localhost:8081 app get parkgolf-dev --hard-refresh` | `argocd --server localhost:8082 app get parkgolf-prod --hard-refresh` |
| 특정 리소스 sync | Tree에서 우클릭 → Sync | `argocd --server localhost:8081 app sync parkgolf-dev --resource <kind>:<name>` | 동일 (port 8082) |
| Rollback | History → 이전 commit → Rollback | `argocd --server localhost:8081 app rollback parkgolf-dev <id>` | 동일 (port 8082) |
| 로그 | Tree → Pod 클릭 → LOGS | `kubectl --context=parkgolf-dev logs -n parkgolf-dev <pod>` | `kubectl --context=parkgolf-prod logs -n parkgolf-prod <pod>` |

### 5.3 sync 충돌 시

```
"another operation is already in progress"
  → 정상. 진행 중인 sync가 끝나면 자동 재시도. 무시 가능.

"unable to recognize ... no matches for kind"
  → CRD 미설치 또는 API 버전 mismatch
  → Hard Refresh로 해결되지 않으면 매니페스트 수정 필요.
```

## 6. 트러블슈팅

```
ArgoCD 접속 안 됨
   │
   ├─ port-forward 실행 중?
   │   ├─ No  → kubectl port-forward 재시작
   │   └─ Yes
   │        │
   │        ├─ kubectl get pods -n argocd 정상?
   │        │   ├─ No  → cd-infra > gke-setup 재실행
   │        │   └─ Yes
   │        │        │
   │        │        ├─ 브라우저 인증서 경고?
   │        │        │   ├─ Yes → 고급 → 진행 클릭
   │        │        │   └─ No  → admin 비밀번호 재확인
```

### 자주 보는 에러

| 증상 | 원인 | 해결 |
|---|---|---|
| `connection refused` localhost:8081/8082 | port-forward 안 됨 | `lsof -i :8081` (or 8082) 확인 후 재실행 |
| 로그인 후 Application 안 보임 | RBAC 미설정 | UI에서 admin 로그인 확인, `argocd-cm` ConfigMap의 `policy.csv` 점검 |
| OutOfSync 영구 지속 | 자동 sync 비활성 (prod 정상) | UI의 SYNC 클릭 또는 `syncPolicy.automated` 확인 |
| Application Missing | CRD/리소스 sync 실패 | Tree view에서 빨간색 리소스 → Events 확인 |
| Hard refresh 후에도 옛 manifest | repo cache | `kubectl rollout restart deploy/argocd-repo-server -n argocd` |
| Context 충돌 (dev/prod 혼동) | `current-context` 잘못됨 | `kubectl config current-context`로 확인, `use-context`로 전환 |

## 7. 주요 리소스 위치

| 리소스 | 위치 |
|---|---|
| ArgoCD 설치 매니페스트 | `https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml` |
| Application 정의 | `k8s/argocd/application-dev.yaml`, `application-prod.yaml` |
| 동기화 대상 Helm chart | `k8s/charts/parkgolf/` |
| 환경별 values | `values.yaml` (공통), `values-dev.yaml`, `values-prod.yaml` |
| 로컬 명령 가이드 | `k8s/argocd/install.md` |

## 8. 참고

- ArgoCD 공식 문서: <https://argo-cd.readthedocs.io>
- 배포 흐름:
  ```
  CD Services (GHA)
    └─ image build + values-{env}.yaml의 image tag commit
        └─ ArgoCD가 자동 감지 (dev) / 수동 SYNC (prod)
            └─ Helm chart로 K8s 리소스 sync
  ```
