---
issue: UNI-127
pr:
---

# UNI-127 ② — saga 엔진 포트화 + manager-saga-service 신설

> Linear: https://linear.app/uniyous/issue/UNI-127
> 설계: docs/architecture/erp-booking-split.md "saga 처리 — 엔진 공유·서비스 분리"
> 선결: UNI-112 폴더 재구조화(✅ `shared/packages/saga-engine` 계약 표면 추출 완료)

UNI-127 ①(리네임)은 완료(archive). ②는 **런타임 엔진을 포트화**해 `shared/packages/saga-engine`로 이관, marketplace·manager 두 saga 서비스가 **복제 없이 공유**하게 만든다. 엔진 추출(chunk A)은 **기능변경 0**, manager-saga 신설(chunk B)이 신규 기능.

## 현재 결합 (포트화 대상)

`SagaEngineService`(marketplace-saga 내)가 구체에 직접 의존 → 공유 불가:

| 결합 | 현재 | 포트 |
|---|---|---|
| DB 영속 | Drizzle `this.db`로 `sagaExecutions`/`sagaSteps` ~20개 인라인 쿼리(select·insert·update·delete·tx·findMany·count) | **`SagaStorePort`** |
| step 실행 | `StepExecutorService` — NATS `ClientProxy` 6토큰(BOOKING/CLUB/BILLING/NOTIFICATION/IAM/PARTNER) 주입 | **`StepExecutorPort`** (chunk1 정의됨) |
| 타임아웃 잡 | `PgBossService` send/cancel | **`JobSchedulerPort`** |
| 제품 특화 | `definition.name === 'CREATE_BOOKING'` + `payload.bookingId`로 payment-timeout 스케줄(엔진 안에 하드코딩) | **definition 라이프사이클 훅** (엔진은 제품 무지) |
| 응답 | `NatsResponse.withSaga/success/paginated` (`@uniyous/nats-common`) | 그대로(이미 공유 패키지) |

## 수용 기준

### chunk A — 엔진 포트화 (기능변경 0) ✅ 구현 완료
- [x] `shared/packages/saga-engine`에 런타임 엔진(`SagaEngine`) 이관 — NATS·DB·pgboss **직접 import 0**, 포트 인터페이스에만 의존
- [x] `SagaStorePort`·`JobSchedulerPort`·`SagaRegistryPort`·`SagaLogger` 정의(+ 기존 `StepExecutorPort`). 엔진 public API 보존: `startSaga`·`recoverTimedOutSaga`·`retrySaga`·`resolveSaga`·`listSagas`·`getSaga`·`getStats`
- [x] CREATE_BOOKING payment-timeout → `SagaDefinition.hooks.onStepCompleted`로 이관(per-execution `state` once-guard). 엔진은 `definition.name` 분기·`bookingId` 인지 0
- [x] marketplace-saga-service: 어댑터 3종(`DrizzleSagaStore`(쿼리 verbatim)·`PgBossJobScheduler`·`StepExecutorService`) + `SagaEngine` 팩토리 주입. 구 `engine/` 제거
- [x] 빌드 회귀: shared tsc · 서비스 tsc · 런타임 require · **Docker 빌드(레포 루트, shared-to-shared file: 의존)** · 컨테이너 런타임 4중 green. NATS subject 불변(컨트롤러 무변경)
- [~] **런타임 회귀(7정의 흐름·보상·타임아웃)**: 자동 saga 테스트 부재 → 쿼리 verbatim 이관 + 제어흐름 보존으로 코드 동등성 확보. **배포 전 통합/카나리 필수**
- [x] DB 스키마(`sagaExecutions`/`sagaSteps`) 불변 — 어댑터가 동일 테이블 사용

### chunk B — manager-saga-service 신설 (신규) ✅ 구현 완료 (정의는 contract-first)
- [x] `manager/services/manager-saga-service` 신설(marketplace-saga 템플릿) — 같은 `@uniyous/saga-engine` import + 매니저 어댑터(`DrizzleSagaStore`=manager_saga_db, `StepExecutorService`=FRONTDESK/CLUB/PAYMENT/NOTIFICATION/IAM 토큰, `PgBossJobScheduler`)
- [x] 매니저 정의: `CREATE_DESK_BOOKING`(데스크·전화·워크인), `KIOSK_CHECKIN`(키오스크 현장수납). ⚠️ frontdesk·payment(수납) greenfield → step action은 **NATS 계약(contract-first)**, 서비스 생성 전엔 실행 시 타임아웃. `slot.reserve`는 club-service 공통
- [x] 진입 subject 분리: `saga.deskbooking.create`·`saga.kiosk.checkin` (마켓 `saga.booking.*`와 충돌 X)
- [x] **관리 subject 네임스페이스 분리**: 매니저는 `manager.saga.list/get/retry/resolve/stats` (마켓 `saga.*` 라운드로빈 충돌 회피)
- [x] `manager_saga_db` — platform postgres `databases` 추가 + manager 차트 서비스 등록(values/dev/prod) + `cd-services`(목록·제품매핑·root 컨텍스트)·`ci`(자동발견) 등록
- [x] 검증: 서비스 tsc · helm 렌더(Deployment+`manager-saga-service-db` ExternalSecret+postgres-init `manager_saga_db`) · Docker 빌드(레포 루트) · 컨테이너 런타임 green
- [~] **런타임 desk-booking 흐름**: frontdesk·payment(수납) 미존재 → 계약 수준. 두 서비스 구현(G3) 후 통합테스트로 완결

## 계약 (포트 인터페이스)

```ts
// @uniyous/saga-engine (shared)
export interface StepExecutorPort {            // chunk1 정의됨 — 유지
  executeStep(step: StepDefinition, req: Record<string, unknown>): Promise<StepResult>;
  executeCompensation(pattern: string, target: string, payload: Record<string, unknown>, timeoutMs: number): Promise<StepResult>;
}

export interface SagaStorePort {               // 신규 — DB 영속 추상화
  findByCorrelationId(correlationId: string): Promise<SagaExecutionRow | undefined>;
  createExecution(input: CreateExecutionInput): Promise<SagaExecutionRow>;
  createSteps(executionId: number, steps: NewStepRow[]): Promise<void>;
  deleteExecutionCascade(executionId: number): Promise<void>;     // FAILED 재시도 정리
  updateExecution(executionId: number, patch: Partial<ExecutionPatch>): Promise<void>;
  updateStep(executionId: number, stepIndex: number, patch: Partial<StepPatch>): Promise<void>;
  getStep(executionId: number, stepIndex: number): Promise<SagaStepRow | undefined>;
  findWithSteps(executionId: number): Promise<(SagaExecutionRow & { steps: SagaStepRow[] }) | undefined>;
  resetForRetry(executionId: number): Promise<void>;
  list(filters: ListFilters): Promise<{ rows: SagaExecutionRow[]; total: number }>;
  countByStatus(status?: SagaStatus, range?: DateRange): Promise<number>;
}

export interface JobSchedulerPort {            // 신규 — pgboss 추상화
  schedule(queue: string, data: object, opts: { startAfter: number; singletonKey: string; retryLimit: number }): Promise<string | null>;
  cancel(queue: string, jobId: string): Promise<void>;
}

// 제품 특화 제거: 엔진 라이프사이클 훅
export interface SagaHooks {
  onStepCompleted?(ctx: { definitionName: string; stepIndex: number; payload: Record<string, unknown>; scheduler: JobSchedulerPort }): Promise<void>;
}
export interface SagaDefinition<T extends string = string> {
  name: string;
  steps: StepDefinition<T>[];
  hooks?: SagaHooks;     // 신규 — CREATE_BOOKING payment-timeout 등 제품 로직
}

// 엔진은 포트를 생성자/팩토리로 주입받음 (NestJS DI 토큰은 각 서비스가 바인딩)
export class SagaEngine {
  constructor(deps: { store: SagaStorePort; executor: StepExecutorPort; scheduler: JobSchedulerPort; registry: SagaRegistryPort });
  startSaga(type, payload, triggeredBy?, triggeredById?): Promise<ApiResponse<...>>;
  // recoverTimedOutSaga·retrySaga·resolveSaga·listSagas·getSaga·getStats — 시그니처 보존
}
```

- **NATS 진입(불변, marketplace)**: `saga.booking.create/cancel/adminRefund` · `booking.paymentConfirmed/Deposited/Failed` · `saga.list/get/retry/resolve/stats`
- **NATS 진입(신규, manager)**: `saga.deskbooking.create` · `saga.kiosk.*` · `manager.saga.list/get/retry/resolve/stats`
- **응답 shape**: 불변 (`{success, data, saga?}`)
- **DB**: `marketplace_saga_db`(불변) / `manager_saga_db`(신규, 동일 스키마)

## 범위 / 변경 파일

chunk A (엔진 포트화):
- `shared/packages/saga-engine/src/` — `engine.ts`(이관된 `SagaEngine`)·`ports.ts`(SagaStorePort·JobSchedulerPort)·`registry.ts`(SagaRegistryPort)·`index.ts` 확장
- `marketplace/services/marketplace-saga-service/src/saga/` — `adapters/`(DrizzleSagaStore·PgBossJobScheduler·NatsStepExecutor) · `saga.module.ts`(포트 DI 바인딩) · `definitions/create-booking.saga.ts`(payment-timeout → hooks.onStepCompleted) · `engine/saga-engine.service.ts` 제거(엔진은 shared로)
- 컨트롤러·worker는 `SagaEngine`(shared) 주입으로 전환(시그니처 동일)

chunk B (manager-saga):
- `manager/services/manager-saga-service/` (신규 NestJS, marketplace-saga 구조 미러 + 매니저 정의/어댑터)
- `platform/infra/k8s/values*.yaml`(postgres.databases += `manager_saga_db`) · `manager/infra/k8s/values*.yaml`(서비스 등록) · `cd-services.yml`·`ci.yml`(서비스 목록)

## 배포 의존성

- **chunk A는 saga 응답·subject 불변** → 호출자(consumer-bff·manager-bff·booking-service) 재배포 불필요. marketplace-saga-service만 재배포.
- chunk A 머지 후 marketplace-saga-service **선배포** → 회귀 모니터(분산 트랜잭션 핵심이라 카나리 권장).
- chunk B: manager-saga-service 신규 → `manager_saga_db` 생성(platform postgres-init `CREATE DATABASE WHERE NOT EXISTS`) 선행 + frontdesk-service([6])·payment-service(수납) 의존(greenfield, G3). frontdesk 미존재 시 정의는 stub/계약만.
- 엔진은 `shared/packages/saga-engine` `file:` 의존 — Docker 레포 루트 컨텍스트(UNI-112 marketplace-saga 패턴 재사용).

## 청크

1. **`feat/UNI-127-saga-engine-port`** (chunk A) — 엔진 이관·포트·훅·marketplace 어댑터. 기능변경 0. ⟵ 본 spec 우선 대상
2. **`feat/UNI-127-manager-saga`** (chunk B) — manager-saga-service 신설 + 매니저 정의·subject·DB. frontdesk 의존은 계약 우선.
