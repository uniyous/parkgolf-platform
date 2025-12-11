# GitOps 환경 구축 제안서

## 목차
1. [현재 상태 분석](#현재-상태-분석)
2. [제안 디렉토리 구조](#제안-디렉토리-구조)
3. [멀티 클라우드 Terraform 아키텍처](#멀티-클라우드-terraform-아키텍처)
4. [CI/CD 파이프라인 설계](#cicd-파이프라인-설계)
5. [환경별 배포 전략](#환경별-배포-전략)
6. [마이그레이션 계획](#마이그레이션-계획)

---

## 현재 상태 분석

### 현재 인프라 구성
| 구성요소 | 현재 상태 | 기술 스택 |
|---------|----------|----------|
| Frontend | Firebase Hosting | React 19, Vite |
| Backend API | Cloud Run | NestJS 11 |
| Database | VM + Cloud SQL | PostgreSQL 15 |
| Cache | VM | Redis 7 |
| Messaging | VM | NATS JetStream |
| Container Registry | GCR | asia-northeast3 |

### 현재 디렉토리 구조의 문제점
```
parkgolf/
├── services/          # 앱 + 프론트엔드 혼재
├── deploy/            # 인프라 + 배포 스크립트 혼재
├── docker/            # 로컬 개발용만 존재
└── .github/workflows/ # 단순 배포만 존재
```

**문제점:**
- 애플리케이션 코드와 인프라 코드가 명확히 분리되지 않음
- 환경별(dev/staging/prod) 설정이 GitHub Secrets에만 의존
- Terraform 코드가 GCP에 강하게 결합됨
- GitOps 원칙(Single Source of Truth) 미적용

---

## 제안 디렉토리 구조

```
parkgolf/
├── apps/                           # 애플리케이션 소스 코드
│   ├── frontend/
│   │   ├── admin-dashboard/        # Admin UI (Firebase Hosting)
│   │   └── user-webapp/            # User UI (Firebase Hosting)
│   ├── gateway/
│   │   ├── admin-api/              # Admin BFF (Cloud Run)
│   │   └── user-api/               # User BFF (Cloud Run)
│   └── services/
│       ├── auth-service/           # 인증 서비스
│       ├── course-service/         # 코스 관리
│       ├── booking-service/        # 예약 서비스
│       ├── notify-service/         # 알림 서비스
│       ├── search-service/         # 검색 서비스 (planned)
│       └── ml-service/             # ML 서비스 (planned)
│
├── infra/                          # 인프라 코드 (Terraform)
│   ├── modules/                    # 재사용 가능한 모듈
│   │   ├── cloud-run/              # Cloud Run (GCP) / App Runner (AWS) / Container Apps (Azure)
│   │   ├── database/               # Cloud SQL / RDS / Azure SQL
│   │   ├── cache/                  # Memorystore / ElastiCache / Azure Cache
│   │   ├── messaging/              # NATS VM / Pub/Sub / SNS+SQS / Service Bus
│   │   ├── networking/             # VPC, Subnets, Connectors
│   │   ├── secrets/                # Secret Manager
│   │   └── monitoring/             # Cloud Monitoring / CloudWatch / Azure Monitor
│   │
│   ├── providers/                  # 클라우드별 Provider 설정
│   │   ├── gcp/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── aws/                    # (Future)
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── azure/                  # (Future)
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   │
│   └── environments/               # 환경별 설정
│       ├── dev/
│       │   ├── main.tf             # 모듈 호출
│       │   ├── terraform.tfvars    # 환경 변수
│       │   └── backend.tf          # State 저장소
│       ├── staging/
│       │   ├── main.tf
│       │   ├── terraform.tfvars
│       │   └── backend.tf
│       └── prod/
│           ├── main.tf
│           ├── terraform.tfvars
│           └── backend.tf
│
├── deploy/                         # 배포 설정
│   ├── kubernetes/                 # K8s 매니페스트 (선택적)
│   │   ├── base/
│   │   └── overlays/
│   │       ├── dev/
│   │       ├── staging/
│   │       └── prod/
│   ├── cloudrun/                   # Cloud Run 설정
│   │   ├── base/
│   │   │   └── service.yaml        # 기본 서비스 템플릿
│   │   └── overlays/
│   │       ├── dev/
│   │       ├── staging/
│   │       └── prod/
│   └── firebase/                   # Firebase 설정
│       ├── firebase.json
│       └── .firebaserc
│
├── docker/                         # Docker 설정
│   ├── base/                       # 베이스 이미지
│   │   ├── node.Dockerfile
│   │   └── python.Dockerfile
│   ├── services/                   # 서비스별 Dockerfile
│   │   ├── auth-service.Dockerfile
│   │   ├── course-service.Dockerfile
│   │   └── ...
│   └── compose/                    # Docker Compose
│       ├── docker-compose.yml      # 로컬 개발
│       ├── docker-compose.test.yml # 테스트
│       └── docker-compose.e2e.yml  # E2E 테스트
│
├── .github/                        # CI/CD 파이프라인
│   └── workflows/
│       ├── ci.yml                  # 통합 CI (lint, test, build)
│       ├── cd-apps.yml             # 애플리케이션 배포
│       ├── cd-infra.yml            # 인프라 배포 (Terraform)
│       ├── preview.yml             # PR Preview 환경
│       └── rollback.yml            # 롤백 자동화
│
├── scripts/                        # 유틸리티 스크립트
│   ├── local/                      # 로컬 개발
│   │   ├── start-all.sh
│   │   ├── stop-all.sh
│   │   └── health-check.sh
│   ├── deploy/                     # 배포 헬퍼
│   │   ├── deploy-service.sh
│   │   └── rollback-service.sh
│   └── db/                         # DB 관리
│       ├── migrate.sh
│       └── seed.sh
│
├── config/                         # 환경 설정 템플릿
│   ├── env.template.json           # 환경변수 템플릿
│   ├── dev.json                    # 개발 환경 (비밀정보 제외)
│   ├── staging.json
│   └── prod.json
│
└── docs/                           # 문서
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT.md
    ├── GITOPS_PROPOSAL.md          # 이 문서
    └── RUNBOOK.md                  # 운영 가이드
```

---

## 멀티 클라우드 Terraform 아키텍처

### 모듈 설계 원칙

클라우드 간 이식성을 위해 **추상화 레이어** 적용:

```
┌─────────────────────────────────────────────────────────────┐
│                    Environment Layer                        │
│              (dev / staging / prod)                         │
├─────────────────────────────────────────────────────────────┤
│                    Provider Layer                           │
│              (GCP / AWS / Azure)                            │
├─────────────────────────────────────────────────────────────┤
│                    Module Layer                             │
│    (cloud-run, database, cache, messaging, etc.)            │
└─────────────────────────────────────────────────────────────┘
```

### 예시: Cloud Run 모듈 (멀티 클라우드)

```hcl
# infra/modules/cloud-run/main.tf

variable "provider_type" {
  type        = string
  description = "Cloud provider: gcp, aws, azure"
}

variable "service_name" {
  type = string
}

variable "image" {
  type = string
}

variable "environment" {
  type = string
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 10
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

# GCP Cloud Run
resource "google_cloud_run_v2_service" "service" {
  count    = var.provider_type == "gcp" ? 1 : 0
  name     = "${var.service_name}-${var.environment}"
  location = var.region

  template {
    containers {
      image = var.image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
  }
}

# AWS App Runner (Future)
resource "aws_apprunner_service" "service" {
  count        = var.provider_type == "aws" ? 1 : 0
  service_name = "${var.service_name}-${var.environment}"

  source_configuration {
    image_repository {
      image_identifier      = var.image
      image_repository_type = "ECR"
    }
  }

  instance_configuration {
    cpu    = var.cpu == "1" ? "1024" : "2048"
    memory = var.memory == "512Mi" ? "2048" : "4096"
  }
}

# Azure Container Apps (Future)
resource "azurerm_container_app" "service" {
  count               = var.provider_type == "azure" ? 1 : 0
  name                = "${var.service_name}-${var.environment}"
  resource_group_name = var.resource_group_name

  template {
    container {
      name   = var.service_name
      image  = var.image
      cpu    = var.cpu
      memory = "${var.memory}Gi"
    }

    min_replicas = var.min_instances
    max_replicas = var.max_instances
  }
}

# 통합 Output
output "service_url" {
  value = coalesce(
    try(google_cloud_run_v2_service.service[0].uri, null),
    try(aws_apprunner_service.service[0].service_url, null),
    try(azurerm_container_app.service[0].latest_revision_fqdn, null)
  )
}
```

### 환경별 설정 예시

```hcl
# infra/environments/dev/main.tf

terraform {
  backend "gcs" {
    bucket = "parkgolf-terraform-state"
    prefix = "dev"
  }
}

locals {
  environment   = "dev"
  provider_type = "gcp"
  project_id    = "uniyous-319808"
  region        = "asia-northeast3"

  services = {
    "auth-service"    = { cpu = "1", memory = "512Mi", port = 8080 }
    "course-service"  = { cpu = "1", memory = "512Mi", port = 8080 }
    "booking-service" = { cpu = "1", memory = "512Mi", port = 8080 }
    "notify-service"  = { cpu = "1", memory = "256Mi", port = 8080 }
    "admin-api"       = { cpu = "1", memory = "512Mi", port = 8080 }
    "user-api"        = { cpu = "1", memory = "512Mi", port = 8080 }
  }
}

module "networking" {
  source        = "../../modules/networking"
  provider_type = local.provider_type
  environment   = local.environment
  region        = local.region
}

module "database" {
  source        = "../../modules/database"
  provider_type = local.provider_type
  environment   = local.environment
  vpc_id        = module.networking.vpc_id

  databases = ["auth_db", "course_db", "booking_db", "notify_db"]
}

module "services" {
  for_each = local.services
  source   = "../../modules/cloud-run"

  provider_type = local.provider_type
  service_name  = each.key
  environment   = local.environment
  image         = "asia-northeast3-docker.pkg.dev/${local.project_id}/parkgolf/${each.key}:latest"
  cpu           = each.value.cpu
  memory        = each.value.memory

  env_vars = {
    NODE_ENV     = local.environment
    PORT         = each.value.port
    DATABASE_URL = module.database.connection_urls[each.key]
    NATS_URL     = module.messaging.nats_url
  }
}
```

---

## CI/CD 파이프라인 설계

### 전체 파이프라인 흐름

```
┌──────────────────────────────────────────────────────────────────────┐
│                         GitOps 워크플로우                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PR 생성                                                            │
│      ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  CI Pipeline (ci.yml)                                        │   │
│   │  ├── Lint Check                                              │   │
│   │  ├── Unit Tests                                              │   │
│   │  ├── Build Check                                             │   │
│   │  └── Security Scan (optional)                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│      ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Preview Pipeline (preview.yml) - 선택적                      │   │
│   │  ├── Deploy Preview Environment                              │   │
│   │  └── Run E2E Tests                                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│      ↓                                                               │
│   PR Merge to develop                                                │
│      ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  CD Apps Pipeline (cd-apps.yml)                              │   │
│   │  ├── Build Docker Images                                     │   │
│   │  ├── Push to Container Registry                              │   │
│   │  ├── Deploy to Dev Environment                               │   │
│   │  └── Health Check                                            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│      ↓                                                               │
│   PR Merge to main                                                   │
│      ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  CD Apps Pipeline (cd-apps.yml) - Production                 │   │
│   │  ├── Build & Push                                            │   │
│   │  ├── Deploy to Staging (자동)                                 │   │
│   │  ├── Approval Gate (수동 승인)                                │   │
│   │  └── Deploy to Production                                    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                         인프라 변경 시                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   infra/** 변경 + PR 생성                                            │
│      ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  CD Infra Pipeline (cd-infra.yml)                            │   │
│   │  ├── Terraform fmt check                                     │   │
│   │  ├── Terraform validate                                      │   │
│   │  ├── Terraform plan (PR Comment로 출력)                       │   │
│   │  └── [Merge 시] Terraform apply                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 통합 CI 워크플로우

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  pull_request:
    branches: [develop, main]
    paths:
      - 'apps/**'
      - 'docker/**'

concurrency:
  group: ci-${{ github.head_ref }}
  cancel-in-progress: true

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.changes.outputs.frontend }}
      backend: ${{ steps.changes.outputs.backend }}
      services: ${{ steps.changes.outputs.services }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            frontend:
              - 'apps/frontend/**'
            backend:
              - 'apps/gateway/**'
              - 'apps/services/**'
            services:
              - 'apps/services/**'

  lint-and-test:
    needs: detect-changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: admin-dashboard
            path: apps/frontend/admin-dashboard
            condition: ${{ needs.detect-changes.outputs.frontend == 'true' }}
          - name: user-webapp
            path: apps/frontend/user-webapp
            condition: ${{ needs.detect-changes.outputs.frontend == 'true' }}
          - name: admin-api
            path: apps/gateway/admin-api
            condition: ${{ needs.detect-changes.outputs.backend == 'true' }}
          - name: user-api
            path: apps/gateway/user-api
            condition: ${{ needs.detect-changes.outputs.backend == 'true' }}
          - name: auth-service
            path: apps/services/auth-service
            condition: ${{ needs.detect-changes.outputs.services == 'true' }}
          - name: course-service
            path: apps/services/course-service
            condition: ${{ needs.detect-changes.outputs.services == 'true' }}
          - name: booking-service
            path: apps/services/booking-service
            condition: ${{ needs.detect-changes.outputs.services == 'true' }}
          - name: notify-service
            path: apps/services/notify-service
            condition: ${{ needs.detect-changes.outputs.services == 'true' }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: ${{ matrix.path }}/package-lock.json

      - name: Install dependencies
        working-directory: ${{ matrix.path }}
        run: npm ci

      - name: Lint
        working-directory: ${{ matrix.path }}
        run: npm run lint --if-present

      - name: Test
        working-directory: ${{ matrix.path }}
        run: npm test --if-present

      - name: Build
        working-directory: ${{ matrix.path }}
        run: npm run build

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
```

### 애플리케이션 CD 워크플로우

```yaml
# .github/workflows/cd-apps.yml
name: CD Apps Pipeline

on:
  push:
    branches:
      - develop
      - main
    paths:
      - 'apps/**'
      - 'docker/**'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod
      services:
        description: 'Services to deploy (comma-separated or "all")'
        required: true
        default: 'all'

env:
  REGISTRY: asia-northeast3-docker.pkg.dev
  PROJECT_ID: uniyous-319808
  REPOSITORY: parkgolf

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.environment }}
      services: ${{ steps.services.outputs.services }}
    steps:
      - id: env
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            echo "environment=${{ github.event.inputs.environment }}" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
          else
            echo "environment=dev" >> $GITHUB_OUTPUT
          fi

      - uses: actions/checkout@v4
      - id: services
        run: |
          if [ "${{ github.event.inputs.services }}" == "all" ] || [ -z "${{ github.event.inputs.services }}" ]; then
            SERVICES='["auth-service","course-service","booking-service","notify-service","admin-api","user-api"]'
          else
            SERVICES=$(echo '${{ github.event.inputs.services }}' | jq -R 'split(",")')
          fi
          echo "services=$SERVICES" >> $GITHUB_OUTPUT

  build-and-push:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.setup.outputs.services) }}
    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker ${{ env.REGISTRY }}

      - name: Determine app path
        id: path
        run: |
          if [[ "${{ matrix.service }}" == *"-api" ]]; then
            echo "path=apps/gateway/${{ matrix.service }}" >> $GITHUB_OUTPUT
          else
            echo "path=apps/services/${{ matrix.service }}" >> $GITHUB_OUTPUT
          fi

      - name: Build and Push
        run: |
          IMAGE=${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ matrix.service }}
          docker build \
            -f docker/services/${{ matrix.service }}.Dockerfile \
            -t $IMAGE:${{ github.sha }} \
            -t $IMAGE:${{ needs.setup.outputs.environment }}-latest \
            ${{ steps.path.outputs.path }}
          docker push $IMAGE --all-tags

  deploy:
    needs: [setup, build-and-push]
    runs-on: ubuntu-latest
    environment: ${{ needs.setup.outputs.environment }}
    strategy:
      matrix:
        service: ${{ fromJson(needs.setup.outputs.services) }}
    steps:
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - uses: google-github-actions/setup-gcloud@v2

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ matrix.service }}-${{ needs.setup.outputs.environment }} \
            --image ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ matrix.service }}:${{ github.sha }} \
            --region asia-northeast3 \
            --platform managed \
            --allow-unauthenticated \
            --vpc-connector parkgolf-connector \
            --set-env-vars "NODE_ENV=${{ needs.setup.outputs.environment }}"

      - name: Health Check
        run: |
          URL=$(gcloud run services describe ${{ matrix.service }}-${{ needs.setup.outputs.environment }} \
            --region asia-northeast3 --format 'value(status.url)')
          curl -sf "$URL/health" || exit 1

  deploy-frontend:
    needs: setup
    if: contains(github.event.paths, 'apps/frontend')
    runs-on: ubuntu-latest
    environment: ${{ needs.setup.outputs.environment }}
    strategy:
      matrix:
        app: [admin-dashboard, user-webapp]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install and Build
        working-directory: apps/frontend/${{ matrix.app }}
        run: |
          npm ci
          npm run build
        env:
          VITE_API_URL: ${{ secrets.API_URL }}

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: ${{ needs.setup.outputs.environment == 'prod' && 'live' || needs.setup.outputs.environment }}
          projectId: ${{ env.PROJECT_ID }}
          target: ${{ matrix.app }}

  notify:
    needs: [setup, deploy]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Slack Notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 인프라 CD 워크플로우

```yaml
# .github/workflows/cd-infra.yml
name: CD Infrastructure (Terraform)

on:
  pull_request:
    branches: [develop, main]
    paths:
      - 'infra/**'
  push:
    branches:
      - develop
      - main
    paths:
      - 'infra/**'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod
      action:
        description: 'Terraform action'
        required: true
        type: choice
        options:
          - plan
          - apply
          - destroy

env:
  TF_VERSION: '1.6.0'

jobs:
  detect-environment:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.environment }}
    steps:
      - id: env
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            echo "environment=${{ github.event.inputs.environment }}" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "environment=prod" >> $GITHUB_OUTPUT
          else
            echo "environment=dev" >> $GITHUB_OUTPUT
          fi

  terraform-plan:
    needs: detect-environment
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra/environments/${{ needs.detect-environment.outputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        continue-on-error: true

      - name: Comment PR with Plan
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan 📖

            **Environment:** \`${{ needs.detect-environment.outputs.environment }}\`

            <details><summary>Show Plan</summary>

            \`\`\`terraform
            ${{ steps.plan.outputs.stdout }}
            \`\`\`

            </details>

            *Pushed by: @${{ github.actor }}, Action: \`${{ github.event_name }}\`*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            })

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-${{ needs.detect-environment.outputs.environment }}
          path: infra/environments/${{ needs.detect-environment.outputs.environment }}/tfplan

  terraform-apply:
    needs: [detect-environment, terraform-plan]
    if: |
      (github.event_name == 'push' && github.ref == 'refs/heads/main') ||
      (github.event_name == 'workflow_dispatch' && github.event.inputs.action == 'apply')
    runs-on: ubuntu-latest
    environment: ${{ needs.detect-environment.outputs.environment }}
    defaults:
      run:
        working-directory: infra/environments/${{ needs.detect-environment.outputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - uses: actions/download-artifact@v4
        with:
          name: tfplan-${{ needs.detect-environment.outputs.environment }}
          path: infra/environments/${{ needs.detect-environment.outputs.environment }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
```

---

## 환경별 배포 전략

### 환경 정의

| 환경 | 브랜치 | 배포 방식 | 목적 |
|-----|-------|---------|-----|
| **dev** | develop | 자동 | 개발자 테스트 |
| **staging** | main | 자동 | QA/통합 테스트 |
| **prod** | main + tag | 수동 승인 | 프로덕션 |

### 배포 전략

```
Feature Branch → develop (자동 → Dev)
                      ↓
              PR Review + Merge
                      ↓
                    main (자동 → Staging)
                      ↓
              QA 검증 + 수동 승인
                      ↓
             Release Tag (v1.0.0) → Production
```

### 롤백 전략

```yaml
# .github/workflows/rollback.yml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      service:
        description: 'Service to rollback'
        required: true
      revision:
        description: 'Revision to rollback to (e.g., previous, 2)'
        required: true
        default: 'previous'

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Rollback Cloud Run
        run: |
          REVISION=${{ github.event.inputs.revision }}
          if [ "$REVISION" == "previous" ]; then
            REVISION=$(gcloud run revisions list \
              --service ${{ github.event.inputs.service }} \
              --region asia-northeast3 \
              --limit 2 \
              --format 'value(name)' | tail -1)
          fi
          gcloud run services update-traffic ${{ github.event.inputs.service }} \
            --region asia-northeast3 \
            --to-revisions $REVISION=100
```

---

## 마이그레이션 계획

### Phase 1: 디렉토리 구조 변경

1. **apps/ 디렉토리 생성 및 이동**
   ```bash
   mkdir -p apps/{frontend,gateway,services}
   mv services/admin-dashboard apps/frontend/
   mv services/user-webapp apps/frontend/
   mv services/admin-api apps/gateway/
   mv services/user-api apps/gateway/
   mv services/* apps/services/
   ```

2. **infra/ 디렉토리 재구성**
   - 모듈화된 Terraform 구조 생성
   - 환경별 설정 분리

3. **docker/ 디렉토리 정리**
   - 서비스별 Dockerfile 생성
   - compose 파일 분리

### Phase 2: CI/CD 파이프라인 업데이트

1. 통합 CI 워크플로우 구현
2. 변경 감지 기반 빌드/배포
3. 환경별 배포 분리

### Phase 3: 인프라 코드 모듈화

1. 멀티 클라우드 모듈 구현
2. 환경별 Terraform 설정 분리
3. State 관리 개선 (Remote State)

### Phase 4: 문서화 및 최적화

1. 운영 가이드 (RUNBOOK) 작성
2. 롤백/장애 대응 절차 문서화
3. 모니터링/알림 설정

---

## 예상 이점

| 항목 | Before | After |
|-----|--------|-------|
| **배포 속도** | 수동 10-15분 | 자동 3-5분 |
| **롤백** | 수동 재배포 | 1-click 롤백 |
| **환경 일관성** | 환경별 차이 발생 | IaC로 동일 보장 |
| **클라우드 이식성** | GCP 종속 | 멀티 클라우드 지원 |
| **배포 추적** | 로그 확인 | Git 히스토리 |
| **보안** | Secrets 분산 | Secret Manager 통합 |

---

## 다음 단계

1. 디렉토리 구조 변경 실행
2. 새 CI/CD 워크플로우 구현
3. Terraform 모듈 개발
4. 기존 서비스 마이그레이션 테스트
5. 프로덕션 적용
