---
issue: UNI-112
pr:
---

# UNI-112 — 폴더 재구조화 (shared·marketplace·manager·platform + infra 분산)

> Linear: https://linear.app/uniyous/issue/UNI-112/2-폴더-재구조화-sharedmarketplacemanagerplatform-infra-분산
> 설계: docs/architecture/erp-booking-split.md "폴더 / 레포 전략"

단일레포 유지하되 **미래 3레포 분리(parkgolf-shared·marketplace·manager)를 폴더 경계로 미리 그린다**. 모노레포 워크스페이스(pnpm/npm)는 폐기 — 폴더만 재배치하고 미래엔 `git filter-repo`로 무손실 분리. **기능변경 0**, 청크별 PR.

## 핵심 결정: 경로 이동은 "빌드/CI/배포 인터페이스" 변경

코드 동작은 안 바뀌지만, 폴더가 곧 계약인 지점이 4곳 — 이걸 동시에 안 맞추면 회귀 발생:

| 인터페이스 | 현재 | 변경 후 | 깨지는 지점 |
|---|---|---|---|
| **CI 서비스 경로** | `cd-services.yml` 하드코딩 `services/$SERVICE`, `services/$SERVICE/Dockerfile`, `[ -d "services/$SERVICE" ]` | 서비스→제품폴더 매핑(`<product>/services/$SERVICE`) | 이동 시 디렉터리 미발견 → 빌드 skip |
| **Docker 빌드 컨텍스트** | `COPY . .`, context=서비스 디렉터리(자기완결) | `shared/packages/*` 의존 서비스는 context를 **레포 루트**로 올려 shared 포함 + 빌드 stage에서 shared 선빌드 | shared 의존 서비스만 (chunk1: marketplace-saga-service) |
| **패키지 참조** | 서비스별 독립 npm·`package-lock.json` | `@uniyous/*`를 **`file:` 로컬 의존성**으로 참조(pnpm). node_modules 심볼릭 → tsconfig paths·런타임 트릭 불필요. 미래 workspace 전환 시 `file:` → `workspace:*` | 추출 패키지 참조 시 |
| **k8s 차트** | 단일 umbrella `k8s/charts/parkgolf` | 제품별 분산 `<product>/infra/k8s` + 전역 infra(terraform·argocd)만 루트 | values·ArgoCD app 경로 |

> **불변(이번 PR에서 안 바뀜)**: NATS subject/패턴, 응답 shape, DB명, 서비스 자기식별 문자열, 런타임 동작. 순수 이동 + 경로 갱신.

## 결정 2026-06-26 — pnpm CLI 전환 + `file:` 의존 (workspace 보류)

- **npm → pnpm 전환**(CLI만). 단 **pnpm workspace는 보류** — repo 전역 workspace는 ①설계 "워크스페이스 폐기" 결정과 충돌하고 ②미래 polyglot(Go·Python) 서비스는 JS 패키지매니저가 관리 못 함. workspace door는 `shared/packages/` 폴더 구조로 이미 열려 있어, 필요 시 `pnpm-workspace.yaml` 한 장 + `file:`→`workspace:*` 치환으로 trivial 전환.
- **shared 참조 = `file:` 로컬 의존**(tsconfig path alias 아님). 빌드된 dist를 node_modules 심볼릭으로 정상 resolve → tsc·node 트릭 0. shared 패키지는 자기 `tsc` 빌드(dist) 필요 → 의존 서비스 Docker는 레포 루트 컨텍스트에서 shared 선빌드.
- pnpm 전환은 **건드린 패키지부터 점진**(chunk1: shared/* + marketplace-saga-service). 나머지 14서비스·앱 일괄 pnpm 전환은 후속(별도 청크/이슈) — 서비스별 lock·Dockerfile 독립이라 점진 안전.

## 목표 폴더 구조

```
parkgolf/
├── shared/packages/   saga-engine · contracts · nats-common   → parkgolf-shared (배포X·import)
├── marketplace/       apps · services · infra/k8s             → parkgolf-marketplace 🟧
├── manager/           apps · services · infra/k8s             → parkgolf-manager 🟦
├── platform/          services(공유코어) · infra/k8s          공유
├── infra/             terraform · argocd                       전역
└── docs/ scripts/
```

### 서비스 → 제품 폴더 매핑 (이동 대상)

| 폴더 | services | apps |
|---|---|---|
| `marketplace/` 🟧 | marketplace-saga-service · booking-service · billing-service · consumer-bff · concierge-service · chat-service · chat-gateway · partner-service | marketplace-console · user-app-web/ios/android |
| `manager/` 🟦 | manager-bff · club-service | manager-console |
| `platform/` 🟨 | iam-service · notify-service · location-service · weather-service · job-service | — |

> 미생성 서비스(frontdesk-service·payment-service수납·manager-saga-service)는 향후 해당 폴더에 신설. 이번 범위는 **현존 15서비스 이동만**.

## 수용 기준 (검증 가능하게)

- [x] **(chunk1)** `shared/packages/` 골격 + `@uniyous/nats-common`·`@uniyous/saga-engine` 추출. 의존 방향 services → packages만(역방향 0)
- [x] **(chunk1)** saga-engine 순수성: NATS·DB import 0 — 상태 enum·step/saga 정의·`StepExecutorPort`만(순수 계약 표면). 런타임 엔진(SagaEngineService) **포트화·이관은 UNI-127 ②**
- [x] **(chunk1)** marketplace-saga-service가 `file:` 의존(@uniyous/*)으로 참조 전환 + 로컬 사본 삭제 + pnpm 전환. 로컬 tsc·런타임·Docker 빌드·컨테이너 런타임 resolve 4중 green
- [ ] `@uniyous/contracts` — 현 cross-service DTO 부재로 **보류**(실 콘텐츠 생기면 생성, 빈 placeholder 금지)
- [x] **(chunk2)** 현존 15서비스가 위 매핑대로 `<product>/services/`로 `git mv`(히스토리 유지). marketplace-saga-service는 `file:` 경로(`../../../shared`)·Dockerfile·lock 보정 후 Docker 재검증 green
- [x] **(chunk2)** `cd-services.yml`·`ci.yml`이 서비스→제품폴더 매핑 + PM 자동감지(pnpm/npm) + shared 선빌드로 경로 해석. dev 스크립트 resolver 견고화
- [x] **(chunk3)** 제품 앱 5개 이동: marketplace-console·user-app-web/ios/android → `marketplace/apps/`, manager-console → `manager/apps/`. `e2e-dev-api`(테스트 하니스, 제품 앱 아님)는 루트 `apps/` 유지. `ci.yml`·`cd-apps.yml` 앱→제품경로 매핑
- [ ] 나머지 14서비스·앱 npm → pnpm 일괄 전환 (chunk2b — 현재 13 npm + 1 pnpm 혼재, CI는 PM 자동감지로 양립)
- [x] **(chunk4)** k8s 차트 제품별 분할(`marketplace/manager/platform/infra/k8s`) + 라이브러리 차트(`shared/charts/parkgolf-lib`) + 전역 infra(`infra/argocd` app-of-apps, terraform 유지). **helm template diff dev·prod = 0 검증**(기능변경 0). cd-services serviceImageTags 제품 라우팅. 설계: `docs/architecture/k8s-product-split.md`
- [ ] dev 기동 회귀 0 (전 서비스 부팅·NATS 연결·헬스체크 green) — 머지 후 ArgoCD 싱크 확인
- [ ] `docs/`·`CLAUDE.md`·`README` 경로 표기 갱신, 잔존 구경로 참조 0

## 청크 (각각 별도 PR, 순서대로)

기능변경 0을 유지하려면 "추출 → 이동 → CI/k8s" 순으로 쪼갠다(한 PR에 몰면 회귀 추적 불가):

1. **`feat/UNI-112-shared-skeleton`** ✅ — `shared/packages/` 골격 + `@uniyous/nats-common`·`@uniyous/saga-engine`(순수 계약 표면) 추출, `file:` 의존 + pnpm 전환. marketplace-saga-service만 참조 전환·로컬 사본 삭제(회귀 0). ⟵ **UNI-127 ②(엔진 포트화·이관)의 선결**
2. **`feat/UNI-112-move-services`** — 15서비스를 `<product>/services/`로 git mv + `cd-services.yml` 경로 매핑 + Dockerfile 컨텍스트 갱신 + 나머지 서비스 pnpm 전환
3. **`feat/UNI-112-move-apps`** — 앱 7개 `<product>/apps/` 이동 + 앱 CI(`cd-apps.yml`) 경로 갱신
4. **`feat/UNI-112-k8s-split`** ✅ — 단일 umbrella 차트 → 라이브러리 차트(`shared/charts/parkgolf-lib`) + 제품 3차트(`<product>/infra/k8s`) + app-of-apps(`infra/argocd`). dev는 단일 클러스터·ns에 3 release. helm diff dev·prod=0. 설계 `docs/architecture/k8s-product-split.md`

## 범위 / 변경 파일

추출(청크1, ✅ 완료):
- `shared/packages/nats-common/`(신규 — `NatsResponse`·응답 타입, 구 `common/types/response.types.ts`) · `shared/packages/saga-engine/`(신규 — `SagaStatus`/`StepStatus` enum·`StepDefinition`/`SagaDefinition`·`StepResult`·`StepExecutorPort`, 구 `contracts/enums.ts`+`saga-definition.interface.ts`+`step-executor`의 StepResult)
- 루트 `.dockerignore`(신규)
- marketplace-saga-service: `package.json`(`file:` 의존 2개 + `packageManager: pnpm`) · `pnpm-lock.yaml`(구 `package-lock.json` 대체) · `Dockerfile`(레포 루트 컨텍스트·pnpm·shared 선빌드) · 임포트 repoint(`schema.ts`·`saga-engine.service.ts`·`step-executor.service.ts`·`saga-definition.interface.ts`)
- `.github/workflows/cd-services.yml`(marketplace-saga-service만 `CONTEXT="."`)

이동(청크2·3, git mv):
- `services/*` → `marketplace|manager|platform/services/*` (위 매핑)
- `apps/*` → `marketplace|manager/apps/*`

CI/인프라(청크2·3·4):
- `.github/workflows/cd-services.yml`(서비스→폴더 매핑) · `cd-apps.yml` · `ci.yml`
- 각 서비스 `Dockerfile`(shared import 시 컨텍스트)
- `k8s/charts/parkgolf` → `marketplace|manager|platform/infra/k8s/` 분할 · `k8s/argocd` app 경로

문서:
- `CLAUDE.md`(프로젝트 구조 트리) · `README.md` · `docs/architecture/erp-booking-split.md`(이행 완료 노트) · `docs/guides/*` 경로

## 배포 의존성

- **NATS·응답·DB 불변** → 서비스 간 재배포 순서 의존 없음(무중단 관점에선 순수 경로 이동).
- **CI/GitOps 정합성이 핵심 리스크**: `cd-services.yml`·`cd-apps.yml` 경로 매핑과 ArgoCD app 경로를 폴더 이동과 **같은 PR**에서 갱신해야 함. 매핑 누락 시 해당 서비스 빌드 skip(무경고 배포 누락) → 청크2·4에서 전 서비스 1회 빌드/싱크 검증.
- **청크1이 UNI-127 ②의 선결**: `shared/packages/saga-engine` 추출이 manager-saga-service 신설·marketplace-saga-service의 엔진 import 전환의 전제(설계 "saga 처리").
- dev 단일 클러스터 공존 유지 — 폴더 이동이 prod 클러스터 분리(UNI-94·UNI-100)를 의미하지 않음(논리 경계만).
