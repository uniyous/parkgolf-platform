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
kubectl apply -f k8s/argocd/application.yaml

# 상태 확인
argocd app get parkgolf
argocd app sync parkgolf
```

## 5. DB 백업 복원

새 postgres-0 ready 후:
```bash
USER=$(kubectl get secret parkgolf-secrets -n parkgolf-dev -o jsonpath='{.data.POSTGRES_USER}' | base64 -d)
PASS=$(kubectl get secret parkgolf-secrets -n parkgolf-dev -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d)

for DB in iam_db course_db booking_db payment_db saga_db chat_db notify_db partner_db; do
  kubectl exec -i -n parkgolf-dev postgres-0 -- env PGPASSWORD="$PASS" \
    pg_restore -U "$USER" -d "$DB" --clean --if-exists --no-owner \
    < backup/20260510-174141/${DB}.dump
done
```
