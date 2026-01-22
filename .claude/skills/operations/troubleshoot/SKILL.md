---
name: troubleshoot
description: Park Golf Platform 문제 해결 가이드. 배포 오류, Cloud Run 오류, Terraform 오류, 빌드 실패 진단 및 해결 방법 안내. "오류", "에러", "실패", "안됨", "문제" 관련 질문 시 사용합니다.
---

# 트러블슈팅 가이드

## 빠른 진단 체크리스트

1. **어떤 워크플로우에서 오류?** (CD Infra / CD Services / CD Apps)
2. **어떤 환경?** (dev / staging / prod)
3. **오류 메시지 확인** (GitHub Actions 로그)

---

## Terraform (CD Infrastructure) 오류

### "Sensitive values cannot be used as for_each arguments"

**원인:** sensitive 변수를 for_each에 사용

**해결:**
```hcl
# 변경 전 (오류)
variable "secrets" {
  type      = map(string)
  sensitive = true
}
resource "xxx" "yyy" {
  for_each = var.secrets  # 오류!
}

# 변경 후 (해결)
variable "secret_names" {
  type = list(string)  # non-sensitive
}
variable "secret_values" {
  type      = map(string)
  sensitive = true
}
resource "xxx" "yyy" {
  for_each = toset(var.secret_names)  # OK
}
```

### "Service account xxx does not exist"

**원인:** Cloud Run 서비스 생성 전에 IAM 바인딩 시도

**해결:**
```hcl
# infra/environments/dev/main.tf
module "secrets" {
  # ...
  service_accounts = []  # 빈 배열로 설정
}
```

### "PORT env is reserved"

**원인:** PORT는 Cloud Run 예약 환경변수

**해결:**
```hcl
# 변경 전 (오류)
env_vars = {
  NODE_ENV = "development"
  PORT     = "8080"  # 오류!
}

# 변경 후 (해결)
env_vars = {
  NODE_ENV = "development"
  # PORT 제거 (Cloud Run이 자동 설정)
}
```

### "Image not found"

**원인:** Docker 이미지가 Artifact Registry에 없음

**해결:**
1. CD Services 워크플로우로 이미지 먼저 빌드
2. 또는 플레이스홀더 이미지 사용:
```hcl
image = "gcr.io/cloudrun/hello"  # 플레이스홀더
```

### "Cannot apply incomplete plan"

**원인:** plan 파일 손상 또는 누락

**해결:**
1. plan 다시 실행
2. tfplan 파일 확인

---

## Cloud Run (CD Services) 오류

### "Container failed to start"

**확인사항:**
1. Dockerfile의 CMD/ENTRYPOINT 확인
2. 포트가 8080인지 확인
3. 환경변수 누락 여부

**로그 확인:**
```bash
gcloud run services logs read SERVICE_NAME-dev --region=asia-northeast3 --limit=50
```

### "Memory limit exceeded"

**해결:**
```yaml
# cd-services.yml에서 메모리 증가
--memory 1Gi  # 512Mi → 1Gi
```

### "Request timeout"

**해결:**
```yaml
--timeout 300  # 기본 300초, 필요시 증가
```

### "VPC connector not found"

**원인:** 인프라 미생성

**해결:**
1. CD Infrastructure 먼저 실행 (action: apply)
2. VPC Connector 생성 확인

---

## Docker 빌드 오류

### "npm ci failed"

**확인사항:**
1. package-lock.json 존재 여부
2. Node.js 버전 호환성

**해결:**
```dockerfile
# package-lock.json 재생성
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Regenerate package-lock.json"
```

### "TypeScript compilation error"

**해결:**
```bash
# 로컬에서 먼저 확인
cd services/SERVICE_NAME
npm run build
```

### "COPY failed: file not found"

**확인사항:**
1. Dockerfile 경로 확인
2. .dockerignore 확인

---

## Firebase (CD Apps) 오류

### "Firebase project not found"

**확인사항:**
1. PROJECT_ID 확인
2. Firebase 프로젝트 생성 여부
3. Hosting 사이트 생성 여부

### "Build failed"

**확인사항:**
1. 로컬에서 빌드 테스트
```bash
cd apps/admin-dashboard
npm ci
npm run build
```

---

## GitHub Actions 공통 오류

### "Permission denied"

**확인사항:**
1. `GCP_SA_KEY` Secret 설정 여부
2. 서비스 계정 권한:
   - Cloud Run Admin
   - Artifact Registry Writer
   - Secret Manager Accessor

### "Workflow failed: exit code 1"

**디버깅:**
1. GitHub Actions 로그 상세 확인
2. 실패한 step 찾기
3. 해당 명령어 로컬에서 테스트

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

### Terraform 상태
```bash
cd infra/environments/dev
terraform init
terraform plan
```

---

## 빠른 복구

### 서비스 롤백
```
GitHub Actions → Rollback 워크플로우
- environment: dev
- service: iam-service
- revision: (빈칸 = 이전 버전)
```

### 인프라 롤백
```
GitHub Actions → CD Infrastructure
- environment: dev
- action: plan  # 먼저 확인
```

### 강제 재배포
```
GitHub Actions → CD Services
- environment: dev
- services: iam-service  # 특정 서비스
```

---

## 도움 요청 시 포함할 정보

1. **오류 메시지** (전체 복사)
2. **워크플로우** (CD Infra / CD Services / CD Apps)
3. **환경** (dev / staging / prod)
4. **최근 변경사항** (코드, 설정)
