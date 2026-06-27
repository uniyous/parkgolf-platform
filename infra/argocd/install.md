# ArgoCD + External Secrets 설치 가이드

신규 GKE Standard 클러스터에 적용. `kubectl` 컨텍스트가 새 클러스터로 설정된 상태에서 실행.

## 1. ArgoCD 설치

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 외부 노출 (dev — LoadBalancer)
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# 초기 admin 비밀번호
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
```

## 2. External Secrets Operator 설치

```bash
kubectl create namespace external-secrets

helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  -n external-secrets \
  --set installCRDs=true

# Workload Identity 연결: KSA → GCP SA
kubectl annotate serviceaccount external-secrets \
  -n external-secrets \
  iam.gke.io/gcp-service-account=parkgolf-eso@parkgolf-uniyous.iam.gserviceaccount.com
```

(Workload Identity 바인딩은 cd-infra Phase 2 단계에서 미리 처리됨)

## 3. GitHub Repo 자격증명 등록 (private repo인 경우)

```bash
# Personal Access Token 또는 deploy key
argocd repo add https://github.com/uniyous/parkgolf-platform.git \
  --username <user> \
  --password <github-pat>
```

## 4. Application 적용

```bash
# app-of-apps 루트 적용 (제품별 child app: platform/marketplace/manager 자동 생성)
kubectl apply -f infra/argocd/root-dev.yaml
# 또는
kubectl apply -f infra/argocd/root-prod.yaml

# 상태 확인 (루트 + 제품별 child)
argocd app get parkgolf-root-dev
kubectl -n argocd get applications        # platform-dev·marketplace-dev·manager-dev
argocd app sync platform-dev marketplace-dev manager-dev
```

> ⚠️ 구 단일 차트 Application(`parkgolf-dev`/`parkgolf-prod`)에서 전환 시: 새 root 적용 후 구 app 삭제 — `argocd app delete parkgolf-dev --cascade=false` (워크로드 보존, 새 child app이 인수). 차트 분할은 렌더 동일(helm diff=0)이라 워크로드 재생성 없음.

## 5. DB 백업 복원

새 postgres-0 ready 후:
```bash
USER=$(kubectl get secret parkgolf-secrets -n parkgolf-dev -o jsonpath='{.data.POSTGRES_USER}' | base64 -d)
PASS=$(kubectl get secret parkgolf-secrets -n parkgolf-dev -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d)

for DB in iam_db club_db booking_db billing_db marketplace_saga_db chat_db notify_db partner_db; do
  kubectl exec -i -n parkgolf-dev postgres-0 -- env PGPASSWORD="$PASS" \
    pg_restore -U "$USER" -d "$DB" --clean --if-exists --no-owner \
    < backup/20260510-174141/${DB}.dump
done
```
