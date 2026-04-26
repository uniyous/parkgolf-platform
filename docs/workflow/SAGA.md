# Saga 오케스트레이션 워크플로우

> 버전: 3.2
> 최종 수정: 2026-04-26

## 목차

1. [개요](#1-개요)
2. [전체 그림](#2-전체-그림)
3. [데이터 모델](#3-데이터-모델)
4. [Saga 정의](#4-saga-정의)
5. [라이프사이클](#5-라이프사이클)
6. [결제 실패 처리](#6-결제-실패-처리)
7. [NATS 패턴](#7-nats-패턴)
8. [응답 형식](#8-응답-형식)
9. [알려진 결함 및 작업 계획](#9-알려진-결함-및-작업-계획)

---

## 1. 개요

`saga-service`가 중앙 오케스트레이터로 분산 트랜잭션을 처리하고, 각 마이크로서비스는 Saga Step 핸들러만 노출합니다.

| 서비스 | 역할 |
|--------|------|
| saga-service | Saga 오케스트레이션 / Step 실행 / 보상 / 이력 |
| booking-service | `booking.saga.*` Step 핸들러 |
| course-service | `slot.reserve` / `slot.release` |
| payment-service | `payment.cancelByBookingId` / `payment.markAborted` / outbox 발행 |
| notify-service | `notification.booking.*` |
| iam-service | `iam.companyMembers.addByBooking` |
| partner-service | `partner.config.*` / `partner.booking.*` |
| job-service | iam(deletion-reminder/executor), partner-sync 등 도메인 Cron (booking-payment-timeout은 saga-scheduler로 이전됨) |

**기술 스택**: NATS (Request-Reply), Saga Orchestration, Transactional Outbox, Compensation, Prisma.

---

## 2. 전체 그림

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#E3F2FD','primaryTextColor':'#000','primaryBorderColor':'#1565C0','lineColor':'#37474F','clusterBkg':'#ECEFF1','fontSize':'13px'}}}%%
flowchart TB
    subgraph Triggers["📨 Saga 트리거"]
        UA["👥 user-api / admin-api / agent-service"]
        PS_OBX["📤 payment-service<br/>(outbox processor)"]
        SCHED["⏱️ saga-scheduler<br/>(매분, SLOT_RESERVED 정리)"]
    end

    subgraph Orchestrator["🧠 saga-service"]
        CTRL["SagaNatsController"]
        ENGINE["SagaEngineService"]
        DEFS["Saga Definitions<br/>CREATE/CANCEL/ADMIN_REFUND<br/>PAYMENT_CONFIRMED/FAILED/TIMEOUT"]
        DB_S[("🗄️ saga_db")]
    end

    NATS{{"🌐 NATS"}}

    subgraph StepHandlers["⚙️ Step Handlers"]
        BS["📋 booking-service<br/>booking.saga.*"]
        CS["📅 course-service<br/>slot.reserve / slot.release"]
        PAY["💳 payment-service<br/>payment.cancelByBookingId<br/>payment.markAborted"]
        NS["🔔 notify-service<br/>notification.booking.*"]
        IAM["👤 iam-service<br/>iam.companyMembers.*"]
        PRT["🤝 partner-service<br/>partner.config / booking / slot"]
    end

    UA -->|"saga.booking.create / cancel / adminRefund"| NATS
    PS_OBX -->|"booking.paymentConfirmed<br/>booking.paymentFailed"| NATS
    SCHED -->|"booking.findExpiredSlotReserved<br/>+ startSaga(PAYMENT_TIMEOUT)"| NATS

    NATS --> CTRL --> ENGINE
    ENGINE <--> DEFS
    ENGINE <--> DB_S
    ENGINE -->|"Step 실행"| NATS
    NATS --> BS & CS & PAY & NS & IAM & PRT

    classDef trig fill:#795548,color:#fff,stroke:#4E342E,stroke-width:2px
    classDef orch fill:#6A1B9A,color:#fff,stroke:#4A148C,stroke-width:3px
    classDef bus fill:#0D47A1,color:#fff,stroke:#1A237E,stroke-width:3px
    classDef hand fill:#1565C0,color:#fff,stroke:#0D47A1,stroke-width:2px
    classDef store fill:#2E7D32,color:#fff,stroke:#1B5E20,stroke-width:2px
    classDef todo fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:2px,stroke-dasharray:5 5

    class UA,PS_OBX,SCHED trig
    class CTRL,ENGINE,DEFS orch
    class NATS bus
    class BS,CS,PAY,NS,IAM,PRT hand
    class DB_S store
```

### 2.1 Saga Engine 처리 흐름

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#E3F2FD','primaryTextColor':'#000','primaryBorderColor':'#1565C0','lineColor':'#37474F','fontSize':'13px'}}}%%
flowchart LR
    START["▶️ startSaga"] --> CREATE["📝 SagaExecution 생성"]
    CREATE --> LOOP{"다음 Step?"}
    LOOP -->|있음| EXEC["📤 NATS send<br/>(Step 실행)"]
    EXEC --> WAIT["⏳ 응답 대기<br/>(timeout)"]
    WAIT -->|성공| MERGE["🔗 응답 병합<br/>mergeResponse"]
    MERGE --> NEXT["currentStep++"]
    NEXT --> LOOP
    WAIT -->|실패| COMP["↩️ 보상 실행<br/>compensate (역순)"]
    COMP --> FAIL["❌ FAILED /<br/>REQUIRES_MANUAL"]
    LOOP -->|없음| DONE["✅ COMPLETED"]

    classDef proc fill:#1565C0,color:#fff,stroke:#0D47A1,stroke-width:2px
    classDef ok fill:#2E7D32,color:#fff,stroke:#1B5E20,stroke-width:2px
    classDef fail fill:#C62828,color:#fff,stroke:#8E0000,stroke-width:2px
    classDef wait fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:2px

    class START,CREATE,EXEC,MERGE,NEXT,COMP proc
    class DONE ok
    class FAIL fail
    class LOOP,WAIT wait
```

- **Step 실행**: NATS Request-Reply (`send`)로 Step 대상 서비스 호출
- **응답 병합**: Step 응답을 Saga payload에 누적 (`mergeResponse`)
- **조건부 Step**: `condition`으로 실행 여부 결정 (예: onsite는 알림 Skip)
- **Optional Step**: `optional: true`면 실패해도 Saga 계속 진행

---

## 3. 데이터 모델

`saga_db` (PostgreSQL, Prisma) — saga-service 전용. 결제 이벤트 outbox는 `payment_db.payment_outbox_events`에 별도 존재 (saga-service 외부).

### 3.1 ERD

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#E3F2FD','primaryTextColor':'#000','primaryBorderColor':'#1565C0','lineColor':'#37474F','fontSize':'13px'}}}%%
erDiagram
    SagaExecution ||--o{ SagaStep : "1:N"

    SagaExecution {
        int id PK
        string saga_type "CREATE_BOOKING / CANCEL_BOOKING / ADMIN_REFUND / PAYMENT_CONFIRMED / PAYMENT_FAILED / PAYMENT_TIMEOUT"
        string correlation_id UK "예: booking:123"
        SagaStatus status "STARTED → STEP_EXECUTING → COMPLETED / FAILED ..."
        int current_step
        int total_steps
        json payload "Step 간 공유 컨텍스트 (mergeResponse 누적)"
        string fail_reason "nullable"
        string triggered_by "USER / ADMIN / SYSTEM / SCHEDULER"
        int triggered_by_id "nullable"
        datetime started_at
        datetime completed_at "nullable"
        datetime failed_at "nullable"
    }

    SagaStep {
        int id PK
        int saga_execution_id FK
        int step_index
        string step_name "RESERVE_SLOT 등"
        string action_pattern "slot.reserve 등 NATS 패턴"
        StepStatus status "PENDING → EXECUTING → COMPLETED / FAILED / SKIPPED / COMPENSATED"
        int retry_count
        json request_payload "nullable"
        json response_payload "nullable"
        string error_message "nullable"
        boolean is_compensation "보상 단계 여부"
        string compensate_pattern "nullable"
        datetime started_at "nullable"
        datetime completed_at "nullable"
    }
```

### 3.2 SagaExecution

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | Int PK | autoincrement |
| `saga_type` | String | `CREATE_BOOKING` 등 saga 정의 이름 |
| `correlation_id` | String UK | 외부 식별자. 형식 예: `booking:123`, `payment-confirmed:ORD-123`. 중복 saga 방지 |
| `status` | SagaStatus | 진행 상태 (아래 enum) |
| `current_step` | Int | 현재 실행 중/완료 step index (0-base) |
| `total_steps` | Int | 정의의 전체 step 수 |
| `payload` | Json | step 간 공유 컨텍스트. `mergeResponse`로 누적되어 다음 step의 `buildRequest` 입력으로 전달 |
| `fail_reason` | String? | 실패 시 사유 |
| `triggered_by` | String? | `USER` / `ADMIN` / `SYSTEM` (scheduler/outbox) |
| `triggered_by_id` | Int? | userId / adminId 등 |
| `started_at` | DateTime | 자동 (CURRENT_TIMESTAMP) |
| `completed_at` | DateTime? | COMPLETED 전이 시각 |
| `failed_at` | DateTime? | FAILED 전이 시각 |

**Index**: `(saga_type, status)`, `(correlation_id)` UK, `(status, started_at)`

### 3.3 SagaStep

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | Int PK | autoincrement |
| `saga_execution_id` | Int FK | `SagaExecution.id` (cascade delete) |
| `step_index` | Int | 0-base step 위치 |
| `step_name` | String | `RESERVE_SLOT` 등 |
| `action_pattern` | String | `slot.reserve` 등 NATS 패턴 |
| `status` | StepStatus | 진행 상태 (아래 enum) |
| `retry_count` | Int | 재시도 횟수 (default 0) |
| `request_payload` | Json? | step 호출 시 전달한 payload |
| `response_payload` | Json? | step 응답 본문 (mergeResponse 입력) |
| `error_message` | String? | 실패 사유 |
| `is_compensation` | Boolean | true면 보상 단계 |
| `compensate_pattern` | String? | 정의에 등록된 보상 NATS 패턴 |
| `started_at` | DateTime? | step 실행 시작 |
| `completed_at` | DateTime? | step 종료 |

**Index**: `(saga_execution_id, step_index)`, `(status)`

### 3.4 Enums

**SagaStatus**

| 값 | 의미 |
|----|------|
| `STARTED` | Saga 시작됨 |
| `STEP_EXECUTING` | 현재 step 실행 중 |
| `STEP_COMPLETED` | 직전 step 완료, 다음 step 대기 |
| `COMPLETED` | 모든 step 완료 |
| `STEP_FAILED` | 어느 step이 실패함 (보상 시작 직전) |
| `COMPENSATING` | 보상 진행 중 |
| `COMPENSATION_COMPLETED` | 보상 완료 |
| `COMPENSATION_FAILED` | 보상 실패 → REQUIRES_MANUAL로 전이 |
| `FAILED` | 보상 완료된 실패 (정상 종료) |
| `REQUIRES_MANUAL` | 보상도 실패하여 수동 개입 필요 |

**StepStatus**

| 값 | 의미 |
|----|------|
| `PENDING` | 실행 대기 |
| `EXECUTING` | 실행 중 |
| `COMPLETED` | 정상 완료 |
| `FAILED` | 실패 (saga 보상 트리거) |
| `COMPENSATED` | 보상 완료 |
| `SKIPPED` | `condition` 미충족으로 건너뜀 |

### 3.5 데이터 보존 / 정리

| 작업 | 주체 | 주기 | 동작 |
|------|------|------|------|
| 만료 saga FAILED 처리 | saga-scheduler | 매분 | STARTED/STEP_EXECUTING 5분 초과 → FAILED |
| 오래된 saga 삭제 | saga-scheduler | 매일 자정 | COMPLETED/FAILED + 30일 경과 행 DELETE |
| SLOT_RESERVED 만료 | saga-scheduler | 매분 | 10분 초과 booking에 PAYMENT_TIMEOUT Saga 시작 |

설정: `services/saga-service/src/common/constants/nats.constants.ts` 의 `SAGA_CONFIG.SAGA_TIMEOUT_MS` (5분), `SAGA_CONFIG.RETENTION_DAYS` (30일).

> **참고**: `payment_db.payment_outbox_events`는 payment-service 책임으로 본 saga_db 스키마와 분리되어 있음. `booking.paymentConfirmed` / `booking.paymentFailed` 이벤트가 saga-service에 도착하는 경로일 뿐 본 DB에는 영향 없음.

원본 스키마: `services/saga-service/prisma/schema.prisma`

---

## 4. Saga 정의

### 4.1 Saga 목록

| Saga | 트리거 | 설명 |
|------|--------|------|
| `CREATE_BOOKING` | `saga.booking.create` | 예약 생성 → 슬롯 예약 → 상태 갱신 → 알림 |
| `CANCEL_BOOKING` | `saga.booking.cancel` | 취소 정책 → 환불 → 슬롯 복구 → 알림 |
| `ADMIN_REFUND` | `saga.booking.adminRefund` | 환불 정책 → 취소 → 환불 → 슬롯 복구 → 알림 |
| `PAYMENT_CONFIRMED` | `booking.paymentConfirmed` | 결제 승인 후 booking CONFIRMED + 알림 |
| `PAYMENT_FAILED` 신규 | `booking.paymentFailed` | 결제 실패/취소 시 booking FAILED + 슬롯 복구 |
| `PAYMENT_TIMEOUT` | saga-scheduler | SLOT_RESERVED 10분 초과 시 동일 정리 |

### 4.2 CREATE_BOOKING

| Step | Action | Compensate | Target | 조건 |
|------|--------|-----------|--------|------|
| 1. CREATE_BOOKING_RECORD | `booking.saga.create` | `booking.saga.markFailed` | booking | - |
| 2. CHECK_PARTNER | `partner.config.checkByClub` | - | partner | clubId 존재 |
| 3. VERIFY_EXTERNAL | `partner.slot.verifyAvailability` | - | partner | 파트너 골프장 |
| 4. RESERVE_SLOT | `slot.reserve` | `slot.release` | course | - |
| 5. UPDATE_BOOKING_STATUS | `booking.saga.slotReserved` | - | booking | - |
| 6. NOTIFY_EXTERNAL | `partner.booking.notifyCreated` | `partner.booking.notifyCancelled` | partner | 파트너 + CONFIRMED |
| 7. SEND_CONFIRMATION | `notification.booking.confirmed` | - | notify | CONFIRMED (optional) |
| 8. REGISTER_COMPANY_MEMBER | `iam.companyMembers.addByBooking` | - | iam | CONFIRMED + userId (optional) |

Step 5 결과: `onsite` → CONFIRMED → 6~8 실행. `card`/`dutchpay` → SLOT_RESERVED → 6~8 SKIP, 결제 대기.

### 4.3 CANCEL_BOOKING

| Step | Action | Compensate | Target | 조건 |
|------|--------|-----------|--------|------|
| 1. CHECK_CANCELLATION_POLICY | `policy.cancellation.resolve` | - | booking | - |
| 2. CALCULATE_REFUND | `policy.refund.resolve` | - | booking | - |
| 3. CANCEL_BOOKING_RECORD | `booking.saga.cancel` | `booking.saga.restoreStatus` | booking | - |
| 4. CANCEL_PAYMENT | `payment.cancelByBookingId` | - | payment | non-onsite |
| 5. RELEASE_SLOT | `slot.release` | - | course | - |
| 6. CHECK_PARTNER | `partner.config.checkByClub` | - | partner | clubId 존재 |
| 7. NOTIFY_EXTERNAL_CANCEL | `partner.booking.notifyCancelled` | - | partner | 파트너 (optional) |
| 8. SEND_CANCELLATION_NOTICE | `notification.booking.cancelled` | - | notify | optional |

### 4.4 ADMIN_REFUND

| Step | Action | Compensate | Target |
|------|--------|-----------|--------|
| 1. CHECK_REFUND_POLICY | `policy.refund.resolve` | - | booking |
| 2. CANCEL_BOOKING_RECORD | `booking.saga.adminCancel` | `booking.saga.restoreStatus` | booking |
| 3. PROCESS_REFUND | `payment.cancelByBookingId` | - | payment |
| 4. RELEASE_SLOT | `slot.release` | - | course |
| 5. FINALIZE_BOOKING | `booking.saga.finalizeCancelled` | - | booking |
| 6. CHECK_PARTNER | `partner.config.checkByClub` | - | partner |
| 7. NOTIFY_EXTERNAL_CANCEL | `partner.booking.notifyCancelled` | - | partner |
| 8. SEND_REFUND_NOTICE | `notification.booking.refundCompleted` | - | notify |

### 4.5 PAYMENT_CONFIRMED

| Step | Action | Target |
|------|--------|--------|
| 1. CONFIRM_BOOKING | `booking.saga.confirmPayment` | booking |
| 2. SEND_CONFIRMATION | `notification.booking.confirmed` (optional) | notify |
| 3. REGISTER_COMPANY_MEMBER | `iam.companyMembers.addByBooking` (optional) | iam |

### 4.6 PAYMENT_FAILED / PAYMENT_TIMEOUT

두 saga는 동일 Step 구성을 공유합니다 (트리거 경로만 다름).

| Step | Action | Target |
|------|--------|--------|
| 1. MARK_BOOKING_FAILED | `booking.saga.paymentTimeout` | booking |
| 2. RELEASE_SLOT | `slot.release` | course |
| 3. NOTIFY | `notification.booking.paymentFailed` (FAILED) / `notification.booking.paymentTimeout` (TIMEOUT) | notify (optional) |

| 항목 | PAYMENT_FAILED | PAYMENT_TIMEOUT |
|------|----------------|-----------------|
| 트리거 | outbox 이벤트 (즉시) | scheduler/cron (10분 경과) |
| 트리거 패턴 | `booking.paymentFailed` | `saga.payment.timeout` |

---

## 5. 라이프사이클

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#E3F2FD','primaryTextColor':'#000','primaryBorderColor':'#1565C0','lineColor':'#37474F','clusterBkg':'#ECEFF1','fontSize':'13px'}}}%%
flowchart TD
    Start(["👤 클라이언트<br/>POST /bookings"]) --> CB["🔄 CREATE_BOOKING Saga"]
    CB --> CB1["📝 booking PENDING<br/>+ slot.reserve"]
    CB1 --> CB4{"💳 paymentMethod"}

    CB4 -->|onsite| CB5a["✅ booking CONFIRMED"]
    CB4 -->|card / dutchpay| CB5b["⏳ booking SLOT_RESERVED"]

    CB5a --> Done1(["🎉 Saga COMPLETED<br/>예약 확정"])

    CB5b --> Wait{"💰 결제 결과"}
    Wait -->|성공: payment.confirm| PaySuc["📤 outbox<br/>booking.paymentConfirmed"]
    Wait -->|실패/취소: client abandon| PayFail["📤 payment.markAborted<br/>outbox: booking.paymentFailed"]
    Wait -->|10분 초과| PayTO["⏱️ saga.payment.timeout"]
    Wait -->|webhook ABORTED/EXPIRED| PayFail

    PaySuc --> PC["🔄 PAYMENT_CONFIRMED Saga"]
    PC --> Done1

    PayFail --> PF["🔄 PAYMENT_FAILED Saga"]
    PayTO --> PT["🔄 PAYMENT_TIMEOUT Saga"]
    PF --> Cleanup["🧹 booking FAILED<br/>+ slot.release + 알림"]
    PT --> Cleanup
    Cleanup --> Done2(["⚠️ Saga COMPLETED<br/>슬롯 복구"])

    Done1 -.취소 요청.-> Cancel["🔄 CANCEL_BOOKING Saga"]
    Cancel --> CN["💸 정책 → booking CANCELLED<br/>+ Toss 환불 + slot.release"]
    CN --> Done3(["🎉 Saga COMPLETED<br/>취소 완료"])

    classDef ext fill:#795548,color:#fff,stroke:#4E342E,stroke-width:2px
    classDef saga fill:#6A1B9A,color:#fff,stroke:#4A148C,stroke-width:3px
    classDef proc fill:#1565C0,color:#fff,stroke:#0D47A1,stroke-width:2px
    classDef wait fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:3px
    classDef ok fill:#2E7D32,color:#fff,stroke:#1B5E20,stroke-width:2px
    classDef fail fill:#C62828,color:#fff,stroke:#8E0000,stroke-width:2px

    class Start ext
    class CB,PC,PF,PT,Cancel saga
    class CB1,PaySuc,PayFail,PayTO,Cleanup,CN proc
    class CB4,Wait wait
    class CB5a,Done1,Done3 ok
    class CB5b,Done2 fail
```

`SLOT_RESERVED` → `FAILED` 정리 경로 4종(클라이언트 abandon / Toss webhook / 사용자 취소 / 10분 타임아웃)은 모두 동일한 정리 핸들러(`booking.saga.paymentTimeout` + `slot.release`)를 재사용합니다.

---

## 6. 결제 실패 처리

### 6.1 흐름

```
Client (Web/iOS/Android)
  ↓ POST /api/user/payments/:orderId/abandon
  ↓ Body: { reason: 'failed'|'cancelled', errorCode?, errorMessage? }
user-api (BFF)
  ↓ NATS: payment.markAborted
payment-service (단일 트랜잭션)
  ↓ UPDATE payments SET status='ABORTED'
  ↓ INSERT payment_outbox_events (event_type='booking.paymentFailed', PENDING)
  ↓ 응답 200 OK
outbox processor (payment-service worker)
  ↓ NATS publish: booking.paymentFailed
saga-service
  ↓ PAYMENT_FAILED Saga
booking-service: booking.saga.paymentTimeout → status=FAILED
course-service:  slot.release
notify-service:  notification.booking.paymentFailed (optional)
```

### 6.2 BFF 엔드포인트 (신규)

```
POST /api/user/payments/:orderId/abandon
Authorization: Bearer <token>

Request:
  { reason: 'failed' | 'cancelled', errorCode?: string, errorMessage?: string }

Response:
  { success: true, data: BookingResponseDto, saga: SagaMeta }
```

### 6.3 클라이언트 호출 지점

| 플랫폼 | 호출 트리거 | 위치 |
|--------|------------|------|
| Web | Toss `failUrl` 리다이렉트 (errorCode/message 수신) | `BookingCompletePage.tsx` Scenario 2 |
| iOS | `TossPaymentView.onFail` / `onCancel` | `BookingFormView.handlePaymentResult` |
| Android | `handlePaymentFailure` / `handlePaymentCancelled` | `BookingFormViewModel` |

세 플랫폼 모두 동일한 BFF 엔드포인트(`POST /payments/:orderId/abandon`)를 호출합니다.

### 6.4 멱등성

- `payment.markAborted`는 멱등 (이미 ABORTED면 재발행 없이 성공 응답)
- saga correlationId(`payment-failed:{orderId}`)로 중복 saga 방지
- 클라이언트는 네트워크 재시도 안전

### 6.5 Outbox 재시도

- payment_outbox_events 발행 실패 시 지수 백오프 (1s → 2s → 4s, 최대 5회)
- 최종 실패: `status='FAILED'`, `last_error` 기록 → 운영자 수동 처리

---

## 7. NATS 패턴

### 7.1 Saga 트리거 (saga-service Inbound)

| 패턴 | 발신 | 비고 |
|------|------|------|
| `saga.booking.create` | user-api, agent-service | 동기 응답 |
| `saga.booking.cancel` | user-api, admin-api | 동기 응답 |
| `saga.booking.adminRefund` | admin-api | 동기 응답 |
| `booking.paymentConfirmed` | payment-service (outbox) | 비동기 |
| `booking.paymentFailed` 신규 | payment-service (outbox) | 비동기 |
| `PAYMENT_TIMEOUT (saga internal)` | saga-scheduler `startSaga` (1분 주기) | 백그라운드 |
| `booking.findExpiredSlotReserved` | saga-scheduler 만료 후보 조회 | 백그라운드 |

### 7.2 결제 실패 보조 패턴

| 패턴 | 발신 | 설명 |
|------|------|------|
| `payment.markAborted` | user-api → payment-service | payment.status=ABORTED + outbox INSERT |

### 7.3 Step 핸들러 (saga-service Outbound)

| 패턴 | 대상 |
|------|------|
| `booking.saga.create` / `markFailed` / `slotReserved` / `confirmPayment` / `cancel` / `adminCancel` / `restoreStatus` / `finalizeCancelled` / `paymentTimeout` | booking-service |
| `slot.reserve` / `slot.release` | course-service |
| `payment.cancelByBookingId` | payment-service |
| `partner.config.checkByClub` / `partner.slot.verifyAvailability` / `partner.booking.notifyCreated` / `partner.booking.notifyCancelled` | partner-service |
| `notification.booking.*` (confirmed / cancelled / refundCompleted / paymentTimeout / paymentFailed) | notify-service |
| `iam.companyMembers.addByBooking` | iam-service |

### 7.4 Saga 관리 (Admin)

| 패턴 | 설명 |
|------|------|
| `saga.list` / `saga.get` / `saga.stats` | 조회 |
| `saga.retry` | 실패 saga 재시도 |
| `saga.resolve` | REQUIRES_MANUAL 수동 해결 |

---

## 8. 응답 형식

BFF가 saga를 경유한 API 응답은 표준 도메인 shape에 `saga` 메타데이터를 부가합니다.

```json
{
  "success": true,
  "data": { /* 표준 BookingResponseDto */ },
  "saga": {
    "executionId": 123,
    "status": "COMPLETED",
    "failReason": null,
    "duplicate": false
  }
}
```

실패 시 (HTTP 400):
```json
{
  "success": false,
  "error": { "code": "SAGA_FAILED", "message": "..." },
  "saga": { "executionId": 123, "status": "FAILED", "failReason": "..." }
}
```

**적용 엔드포인트**: `POST /bookings`, `DELETE /bookings/:id`, `POST /payments/:orderId/abandon`, admin booking/refund.

**클라이언트**: `saga` 필드는 옵셔널이며 진행률 표시·디버깅에 활용. 도메인 파싱은 `data`만 사용.

구현: `services/{user,admin}-api/src/booking/booking.service.ts`의 `resolveSagaResponse()`.

---

## 9. 알려진 결함 및 작업 계획

### 9.1 결함 및 해결 현황 (2026-04-26 기준)

| # | 결함 | 영향 | 우선순위 | 상태 |
|---|-----|------|---------|------|
| 1 | payment.confirm catch가 outbox 미발행 → booking 미동기화 | SLOT_RESERVED 영구 점유 | P0 | ✅ 해결 (markPaymentAborted) |
| 2 | 클라이언트 3종 결제 실패 시 백엔드 통지 부재 | 결함 #1 트리거 | P0 | ✅ 해결 (Web/iOS/Android) |
| 3 | `payment.markAborted` 엔드포인트 미존재 | #2 해결 차단 | P0 | ✅ 해결 |
| 4 | PAYMENT_FAILED Saga 미정의 | #2 해결 차단 | P0 | ✅ 해결 |
| 5 | preparePayment 후 미진행 leak (READY 무한 잔존) | SLOT_RESERVED 영구 | P0 | 🟡 부분 해결 (saga-scheduler 10분 후 자동 정리) |
| 6 | `expireSlotReservedBookings`가 saga 우회 → `slot.release` 미호출 | course-service 슬롯 미복구 | P1 | ✅ 해결 (job-service `booking-payment-timeout` cron 제거 + booking-service 우회 경로 제거) |
| 7 | saga-scheduler 미구현 (1차 방어 부재) | job-service Cron만 존재 | P1 | ✅ 해결 |
| 8 | CREATE_BOOKING Step 4 compensate 부재 | 실패 시 booking PENDING 잔존 | P1 | ⏳ 미해결 |
| 9 | Toss webhook(ABORTED/EXPIRED) 라우트 미연동 | 외부 상태 미반영 | P1 | ⏳ 미해결 |
| 10 | payment-service outbox processor 동작 검증 필요 | confirmed 이벤트 누락 가능 | P1 | ✅ 검증 (5초 주기, retry 5회 동작 확인) |
| 11 | split payment에 saga 미적용 | 분할 결제 정합성 부재 | P2 | ⏳ 미해결 |

### 9.2 작업 계획

| Step | 영역 | 내용 | 상태 |
|------|------|------|------|
| 1 | payment-service | `payment.markAborted` 추가 (트랜잭션 + outbox INSERT), confirmPayment catch에서도 outbox 발행, outbox processor 매핑 추가 | ✅ 완료 (2026-04-26) |
| 2 | saga-service | PAYMENT_FAILED Saga 정의, registry 등록, `booking.paymentFailed` 트리거 | ✅ 완료 |
| 3 | user-api | `POST /api/user/payments/:orderId/abandon` 엔드포인트 + NATS publish | ✅ 완료 |
| 4 | notify-service | `notification.booking.paymentFailed` 핸들러 (MessagePattern) | ✅ 완료 |
| 5 | Web | `paymentApi.abandon()` + BookingCompletePage Scenario 2 호출 | ✅ 완료 |
| 6 | iOS | `PaymentService.abandonPayment()` + BookingFormView 호출 (paymentPrepareData.orderId 사용) | ✅ 완료 |
| 7 | Android | `PaymentApi.abandonPayment()` + BookingFormViewModel 호출 | ✅ 완료 |
| 8 | P1 | saga-scheduler `expireSlotReservedBookings` 추가 (1분 주기) + `booking.findExpiredSlotReserved` MessagePattern 추가 + job-service `booking-payment-timeout` cron 및 booking-service saga 우회 경로 제거 | ✅ 완료 |
| 9 | 검증 | 통합 테스트, 클라이언트 3종 동작, DB 정합성 | 미시작 (배포 후 진행) |

### 9.3 잔여 P1 작업

P0 완료 후 별도 작업 항목:
- CREATE_BOOKING Step 4 (UPDATE_BOOKING_STATUS)에 `compensate: 'booking.saga.markFailed'` 추가
- Toss webhook 라우트 등록 + ABORTED/EXPIRED 수신 시 `payment.markAborted` 트리거
- preparePayment(READY) 무한 잔존 방지 (별도 만료 정책)
- split payment에 saga 적용

### 9.4 검증 시 확인 항목

- 결제 실패 즉시 `bookings.status=FAILED`
- `game_time_slot_cache` 및 `game_time_slots` 양쪽 `booked_players` 복구
- `payment_outbox_events.status=PROCESSED`
- saga_executions에 PAYMENT_FAILED 1건 COMPLETED
- 사용자 알림 수신

---

**Last Updated**: 2026-04-26
