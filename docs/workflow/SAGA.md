# Saga 오케스트레이션 워크플로우

> 버전: 3.5
> 최종 수정: 2026-05-13
> **연계 문서**: AI 예약 흐름 [`AGENT.md`](./AGENT.md) · 결제(현장·카드·더치페이) end-to-end [`AGENT_PAY.md`](./AGENT_PAY.md) · 예약/정산 상태 [`BOOKING.md`](./BOOKING.md)

## 목차

1. [개요](#1-개요)
2. [전체 그림](#2-전체-그림)
3. [데이터 모델](#3-데이터-모델)
4. [Saga 정의](#4-saga-정의)
5. [라이프사이클](#5-라이프사이클)
6. [결제 실패 처리](#6-결제-실패-처리)
   - 6.5 더치페이 예외 처리 흐름 (현재)
   - 6.6 더치페이 통합 워크플로우 (제안 — saga 일관화)
   - 6.7 Outbox 재시도
   - 6.8 cron 제거 및 pg-boss 전환
   - 6.9 confirmPayment race window 안전망
   - 6.10 webhook 멱등성 가드
   - 6.11 변경 파일 인벤토리
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

saga 처리에는 세 DB의 테이블이 관여합니다:

- **`saga_db`** (saga-service 소유): `SagaExecution`, `SagaStep` — saga 실행/이력
- **`payment_db`** (payment-service 소유): `payment_outbox_events` — 결제 이벤트 트리거 소스 (자주 사용)
- **`booking_db`** (booking-service 소유): `booking_outbox_events` — booking 도메인 이벤트 트리거 소스 (그룹 취소 등 희귀 케이스)

직접적인 FK 관계는 없으며, 각 outbox가 NATS로 이벤트를 publish하면 saga-service가 수신하여 새로운 `SagaExecution` 레코드를 생성하는 간접 연결입니다.

### 3.1 ERD

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#E3F2FD','primaryTextColor':'#000','primaryBorderColor':'#1565C0','lineColor':'#37474F','fontSize':'13px'}}}%%
erDiagram
    SagaExecution ||--o{ SagaStep : "1:N"
    PaymentOutboxEvent ||..o{ SagaExecution : "triggers via NATS<br/>(booking.paymentConfirmed / paymentFailed)"
    BookingOutboxEvent ||..o{ SagaExecution : "triggers via NATS<br/>(payment.cancelByBookingId 등)"

    SagaExecution {
        int id PK "saga_db.saga_executions"
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
        int id PK "saga_db.saga_steps"
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

    PaymentOutboxEvent {
        int id PK "payment_db.payment_outbox_events"
        string aggregate_type "Payment"
        string aggregate_id "payment.id"
        string event_type "payment.confirmed / payment.failed / payment.canceled / payment.deposited"
        json payload "bookingId, orderId, paymentKey, amount 등"
        OutboxStatus status "PENDING → PROCESSING → SENT / FAILED"
        int retry_count
        string last_error "nullable"
        datetime created_at
        datetime processed_at "nullable"
    }

    BookingOutboxEvent {
        int id PK "booking_db.booking_outbox_events"
        string aggregate_type "Booking"
        string aggregate_id "booking.id"
        string event_type "payment.cancelByBookingId 등"
        json payload "bookingId, cancelReason 등"
        OutboxStatus status "PENDING → PROCESSING → SENT / FAILED"
        int retry_count
        string last_error "nullable"
        datetime created_at
        datetime processed_at "nullable"
    }
```

> 점선 관계(`||..o{`)는 직접 FK가 아닌 **NATS 메시지 경유 트리거**를 의미합니다. payment-service의 outbox processor가 5초 주기로 PENDING 이벤트를 NATS publish → saga-service가 수신 → 새 SagaExecution 생성.

### 3.2 Enums

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

**OutboxStatus** (payment_db)

| 값 | 의미 |
|----|------|
| `PENDING` | 발행 대기 |
| `PROCESSING` | 발행 시도 중 |
| `SENT` | NATS publish 성공 |
| `FAILED` | 5회 재시도 모두 실패 → 운영자 수동 처리 (`retryFailedEvents()` API) |

### 3.3 데이터 보존 / 정리

| 작업 | 주체 | 주기 | 동작 | DB |
|------|------|------|------|----|
| 만료 saga FAILED 처리 | saga-scheduler | 매분 | STARTED/STEP_EXECUTING 5분 초과 → FAILED | saga_db |
| 오래된 saga 삭제 | saga-scheduler | 매일 자정 | COMPLETED/FAILED + 30일 경과 행 DELETE | saga_db |
| SLOT_RESERVED 만료 | saga-scheduler | 매분 | 5분 초과 booking에 PAYMENT_TIMEOUT Saga 시작 | booking_db (조회) |
| Outbox 이벤트 발행 | payment-service OutboxProcessor | 5초 | PENDING 이벤트 NATS publish, 최대 5회 재시도 | payment_db |

**설정 위치**:
- `services/saga-service/src/common/constants/nats.constants.ts` — `SAGA_CONFIG.SAGA_TIMEOUT_MS` (5분), `RETENTION_DAYS` (30일)
- `services/payment-service/src/payment/service/outbox-processor.service.ts` — `maxRetries=5`, `batchSize=10`, `sendTimeoutMs=10000`

**원본 스키마**:
- saga 측: `services/saga-service/prisma/schema.prisma`
- payment outbox: `services/payment-service/prisma/schema.prisma` (`PaymentOutboxEvent` 모델 → `payment_outbox_events`)
- booking outbox: `services/booking-service/prisma/schema.prisma` (`OutboxEvent` 모델 → `booking_outbox_events`)

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
| `PAYMENT_TIMEOUT` | saga-scheduler | SLOT_RESERVED 5분 초과 시 동일 정리 |

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

| 항목 | PAYMENT_FAILED | PAYMENT_TIMEOUT |
|------|----------------|-----------------|
| 트리거 | outbox 이벤트 (즉시) | saga-scheduler (1분 주기, 5분 초과) |
| 트리거 패턴 | `booking.paymentFailed` | scheduler가 직접 startSaga |

**PAYMENT_FAILED Saga**

| Step | Action | Target | 조건 |
|------|--------|--------|------|
| 1. MARK_BOOKING_FAILED | `booking.saga.paymentTimeout` | booking | - |
| 2. RELEASE_SLOT | `slot.release` | course | - |
| 3. NOTIFY_FAILURE | `notification.booking.paymentFailed` | notify | optional |

**PAYMENT_TIMEOUT Saga** (분할결제 환불 step 포함)

| Step | Action | Target | 조건 |
|------|--------|--------|------|
| 1. REFUND_PAID_SPLITS | `payment.refundPaidSplits` | payment | `paymentMethod === 'dutchpay'` |
| 2. MARK_BOOKING_FAILED | `booking.saga.paymentTimeout` | booking | - |
| 3. RELEASE_SLOT | `slot.release` | course | - |
| 4. NOTIFY_TIMEOUT | `notification.booking.paymentTimeout` | notify | optional |

Step 1은 더치페이일 때만 실행. PAID 상태인 PaymentSplit을 모두 Toss 환불 → REFUNDED, PENDING split은 EXPIRED로 변경. 환불 1건이라도 실패 시 saga가 REQUIRES_MANUAL로 전이되어 운영자 개입.

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
    Wait -->|5분 초과| PayTO["⏱️ saga.payment.timeout"]
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

`SLOT_RESERVED` → `FAILED` 정리 경로 4종(클라이언트 abandon / Toss webhook / 사용자 취소 / 5분 타임아웃)은 모두 동일한 정리 핸들러(`booking.saga.paymentTimeout` + `slot.release`)를 재사용합니다.

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

### 6.5 더치페이(분할결제) 예외 처리 흐름

분할결제는 단일결제보다 시나리오가 다양합니다. 4명 더치페이 기준 전체 흐름:

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#E3F2FD','primaryTextColor':'#000','primaryBorderColor':'#1565C0','lineColor':'#37474F','clusterBkg':'#ECEFF1','fontSize':'13px'}}}%%
flowchart TD
    Start(["👥 4명 더치페이 booking<br/>SLOT_RESERVED + 4 PaymentSplit(PENDING)"]) --> Branch{"⏱️ 시나리오"}

    Branch -->|"😀 4명 모두 결제 완료"| AllPaid["✅ booking.paymentConfirmed<br/>(payment-service outbox)"]
    Branch -->|"😟 1명 명시적 실패/취소<br/>(Toss onFail/onCancel)"| Explicit["📤 client → POST /payments/:orderId/abandon"]
    Branch -->|"😴 1명 잠수<br/>(앱 종료, 알림 무시)"| Silent["⏰ 5분 경과 대기"]
    Branch -->|"🔄 결제 후 변심<br/>(이미 PAID 후 취소 요청)"| Mind["💬 그룹 booking 취소"]

    AllPaid --> ConfirmedSaga["🔄 PAYMENT_CONFIRMED Saga"]
    ConfirmedSaga --> Confirmed["✅ booking CONFIRMED<br/>+ 알림"]

    Explicit --> AbandonAPI["🔧 payment.markAborted<br/>(split 인식 분기 — 신규)"]
    AbandonAPI --> SplitAborted["📝 PaymentSplit.status=ABORTED<br/>+ outbox: booking.paymentFailed"]
    SplitAborted --> FailedSaga["🔄 PAYMENT_FAILED Saga<br/>(REFUND_PAID_SPLITS step 추가 — 신규)"]

    Silent --> Scheduler["⏱️ saga-scheduler 매분 검사<br/>5분 초과 SLOT_RESERVED 검출"]
    Scheduler --> TimeoutSaga["🔄 PAYMENT_TIMEOUT Saga<br/>(REFUND_PAID_SPLITS step 이미 있음)"]

    Mind --> CancelSaga["🔄 CANCEL_BOOKING Saga<br/>(정책 결정 필요)"]
    CancelSaga --> CancelDone["✅ booking CANCELLED<br/>+ 4명 모두 환불"]

    FailedSaga --> Cleanup["🧹 공통 정리 단계"]
    TimeoutSaga --> Cleanup
    Cleanup --> Step1["1️⃣ REFUND_PAID_SPLITS<br/>PAID split → Toss 환불 → REFUNDED<br/>PENDING split → EXPIRED"]
    Step1 --> Step2["2️⃣ MARK_BOOKING_FAILED<br/>booking.status = FAILED"]
    Step2 --> Step3["3️⃣ RELEASE_SLOT<br/>course-service 슬롯 복구"]
    Step3 --> Step4["4️⃣ NOTIFY<br/>'X명에게 N원 자동 환불' 알림"]
    Step4 --> Done(["⚠️ 정리 완료<br/>4명 모두에게 알림"])

    classDef start fill:#795548,color:#fff,stroke:#4E342E,stroke-width:2px
    classDef branch fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:3px
    classDef saga fill:#6A1B9A,color:#fff,stroke:#4A148C,stroke-width:3px
    classDef proc fill:#1565C0,color:#fff,stroke:#0D47A1,stroke-width:2px
    classDef new fill:#C62828,color:#fff,stroke:#8E0000,stroke-width:3px,stroke-dasharray:5 5
    classDef ok fill:#2E7D32,color:#fff,stroke:#1B5E20,stroke-width:2px

    class Start start
    class Branch branch
    class ConfirmedSaga,FailedSaga,TimeoutSaga,CancelSaga saga
    class AbandonAPI,SplitAborted,Explicit,Silent,Mind,AllPaid proc
    class Step1,Step2,Step3,Step4 proc
    class Scheduler proc
    class Cleanup new
    class Confirmed,CancelDone,Done ok
```

> **빨간 점선** (`Cleanup`): 공통 정리 4단계. PAYMENT_FAILED와 PAYMENT_TIMEOUT 두 saga가 동일한 step을 공유하여 중복 코드 제거.

#### 시나리오별 처리 시점 비교

| 시나리오 | 트리거 시점 | Saga | 처리 지연 |
|---------|------------|------|----------|
| 1. 명시적 실패/취소 | client abandon API 즉시 | PAYMENT_FAILED | ~3초 (outbox processor) |
| 2. 잠수 (미응답) | saga-scheduler 매분 검사 | PAYMENT_TIMEOUT | 5~6분 |
| 3. 모두 완료 | 마지막 split confirm 즉시 | PAYMENT_CONFIRMED | ~3초 |
| 4. 결제 후 변심 | 사용자 명시적 cancel 요청 | CANCEL_BOOKING | 즉시 |

#### 현재 구현 상태 vs 신규 작업

| 항목 | 현재 상태 | 필요 작업 |
|------|----------|----------|
| PAYMENT_TIMEOUT의 REFUND_PAID_SPLITS | ✅ 구현됨 | - |
| PAYMENT_FAILED의 REFUND_PAID_SPLITS | ❌ 미구현 | **신규 step 추가 필요** |
| payment.markAborted의 split 분기 | ❌ 단일결제만 | **split 인식 로직 추가** |
| notify-service의 split 메시지 | ⚠️ paymentTimeout만 dutchpay 분기 | paymentFailed에도 동일 분기 |
| 시나리오 4 (결제 후 변심) 정책 | ❌ 미정의 | **정책 결정 필요** (UX 측) |
| Toss webhook 자동 동기화 | ❌ 미연동 | webhook 라우트 등록 |

#### 핵심 결정 포인트 (사용자 협의)

```
[Q1] 1명 명시적 실패 시 즉시 booking 정리 vs 5분 대기?
  - 즉시 정리 (제안): UX 명확, 다른 멤버 헛수고 방지
  - 5분 대기: 실패자가 재시도 기회 (단 PaymentSplit이 ABORTED라 새 split 생성 필요)
  → 권장: 즉시 정리 (PAYMENT_FAILED Saga 즉시 실행)

[Q2] 시나리오 4 정책 (이미 PAID 후 그룹 취소)
  - 옵션 a) 환불 거절 (5분 안 모두 결제 정책)
  - 옵션 b) 그룹 취소 허용 (CANCEL_BOOKING saga로 4명 모두 환불)
  → 비즈니스 정책 결정 필요

[Q3] PaymentSplit 재결제 허용?
  - ABORTED/EXPIRED 후 같은 멤버가 다시 결제 시도 가능?
  - 권장: 불허 (booking 자체를 새로 만들도록)
```

---

### 6.6 더치페이 통합 워크플로우 (제안)

#### 6.6.1 사용자 관점 시작 지점

더치페이 흐름을 사용자 입장에서 단순화한 4단계로 정의:

```
① 멤버 선택         (채팅방 + 최대 4명 팀 구성)
② 골프장 + 슬롯 선택  (지역/날짜/시간 결정)
③ 더치페이 결제     (settlement card → 각자 토스 결제)
④ 결과 카드         (성공 / 실패 / 타임아웃)
```

agent-service는 ①~③의 UI 카드를 발행하는 **드라이버**일 뿐,
**상태 변화의 권위(source of truth)는 saga + booking/payment-service**.

#### 6.6.2 변경 전 vs 변경 후

| 단계 | 현재 (변경 전) | 제안 (변경 후) |
|------|----------------|----------------|
| splitPrepare 호출 | agent-service의 tool-executor가 NATS 직접 호출 | `CREATE_BOOKING` saga의 신규 step에서 처리 |
| settlement card broadcast | agent-service가 직접 chat-gateway emit | saga 신규 step에서 처리 (실패 시 saga 보상) |
| 4명 모두 결제 완료 | booking-service가 직접 `notification.emit` + `iam.companyMembers` 호출 | booking-service가 outbox에 `booking.paymentConfirmed` 추가 → `PAYMENT_CONFIRMED` saga 트리거 |
| 알림 / CompanyMember 등록 | booking-service 직접 처리 | saga의 SEND_CONFIRMATION + REGISTER_COMPANY_MEMBER step |
| 추적성 | saga_executions 미기록 | 전 흐름이 saga_executions / saga_steps에 기록 |

→ 단건 카드 결제 흐름과 **완전 동일한 saga 경로**로 통일.

#### 6.6.3 흐름도 (변경 후)

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'13px'}}}%%
flowchart TD
    %% ── 사용자 인터랙션 (agent UI 카드) ──
    U1["① 멤버 선택<br/>(채팅방 + 최대 4명)"] --> U2["② 골프장 + 타임슬롯 선택"]
    U2 --> U3["③ 결제방법 = dutchpay<br/>(confirmBooking)"]

    %% ── CREATE_BOOKING saga (확장) ──
    U3 --> Trig1[("🎯 saga.booking.create<br/>CREATE_BOOKING saga 시작")]
    Trig1 --> S1["S1. CREATE_BOOKING_RECORD<br/>booking 생성 (paymentMethod=dutchpay)"]
    S1 --> S4["S4. RESERVE_SLOT<br/>course-service 슬롯 확보"]
    S4 --> S5["S5. UPDATE_BOOKING_STATUS<br/>= SLOT_RESERVED"]
    S5 --> SBR{"paymentMethod"}
    SBR -->|onsite| Sonsite["S6~S8. CONFIRMED + 알림<br/>(기존)"]
    SBR -->|card| Scard["결제 대기 (saga 종료)<br/>이후 토스 confirm → PAYMENT_CONFIRMED saga"]
    SBR -->|dutchpay| Sd1["S5.5. PREPARE_SPLIT 🆕<br/>payment.splitPrepare<br/>━━━━━━━━━━━<br/>4 PaymentSplit row 생성"]
    Sd1 --> Sd2["S5.6. BROADCAST_SETTLEMENT 🆕<br/>chat-gateway → 4 settlement cards"]
    Sd2 --> SagaDone["✓ saga 종료<br/>(4명 결제 대기)"]

    %% ── 사용자별 결제 (saga 외부, 실시간 인터랙션) ──
    SagaDone --> P1["④-a 각자 토스 위젯 결제<br/>→ POST /payments/split/confirm"]
    P1 --> P2["payment-split.confirmSplit<br/>PaymentSplit.status=PAID<br/>+ NATS emit booking.participant.paid"]
    P2 --> BS["booking-service.markParticipantPaid<br/>BookingParticipant.status=PAID"]
    BS --> Check{"allPaid?<br/>(paid == total >= playerCount)"}

    %% ── 성공 경로 (saga 일관화) ──
    Check -->|"✅ 4명 모두 PAID"| Out["booking-service 트랜잭션 안에서<br/>booking.status=CONFIRMED<br/>+ booking_outbox: booking.paymentConfirmed 🆕"]
    Out --> Trig2[("🎯 PAYMENT_CONFIRMED saga 시작")]
    Trig2 --> Pc1["1. CONFIRM_BOOKING (no-op, 이미 CONFIRMED)"]
    Pc1 --> Pc2["2. SEND_CONFIRMATION (notify)"]
    Pc2 --> Pc3["3. REGISTER_COMPANY_MEMBER (iam)"]
    Pc3 --> Card1["✅ 성공 카드<br/>(agent → chat broadcast)"]

    %% ── 실패/타임아웃 경로 ──
    Check -->|"❌ 5분 경과"| TimerTrig[("🎯 PAYMENT_TIMEOUT saga<br/>(pgboss timeout job)")]
    Check -->|"⚠️ 1명 명시적 실패"| FailTrig[("🎯 PAYMENT_FAILED saga<br/>(abandon API)")]
    TimerTrig --> Cleanup["1. REFUND_PAID_SPLITS<br/>2. MARK_BOOKING_FAILED<br/>3. RELEASE_SLOT<br/>4. NOTIFY_TIMEOUT"]
    FailTrig --> Cleanup
    Cleanup --> Card2["❌ 실패 카드<br/>(환불 안내)"]

    %% ── 색상 ──
    classDef ui      fill:#FFF3E0,stroke:#E65100,color:#000
    classDef saga    fill:#E1BEE7,stroke:#6A1B9A,color:#000,stroke-width:2px
    classDef step    fill:#E3F2FD,stroke:#1565C0,color:#000
    classDef newstep fill:#FFCDD2,stroke:#C62828,color:#000,stroke-width:2px,stroke-dasharray:5 5
    classDef result  fill:#C8E6C9,stroke:#2E7D32,color:#000

    class U1,U2,U3 ui
    class Trig1,Trig2,TimerTrig,FailTrig saga
    class S1,S4,S5,Sonsite,Scard,Pc1,Pc2,Pc3,P1,P2,BS step
    class Sd1,Sd2,Out newstep
    class Card1,Card2 result
```

#### 6.6.4 신규/제거 항목

| 항목 | 변경 |
|------|------|
| `CREATE_BOOKING` saga 신규 step | **PREPARE_SPLIT** (`payment.splitPrepare`) — paymentMethod=dutchpay 조건부 |
| `CREATE_BOOKING` saga 신규 step | **BROADCAST_SETTLEMENT** — chat-gateway 카드 발행, paymentMethod=dutchpay 조건부, optional |
| booking-service `markParticipantPaid` | allPaid 도달 시 outbox `booking.paymentConfirmed` 발행 |
| booking-service direct emit | `notificationPublisher.emit('booking.confirmed', ...)` **제거** |
| booking-service direct call | `iamService.addCompanyMember(...)` **제거** (saga로 위임) |
| agent-service `tool-executor` | `payment.splitPrepare` 직접 호출 **제거** (saga로 위임) |
| agent-service `tool-executor` | settlement card chat broadcast 직접 호출 **제거** (saga로 위임) |

#### 6.6.5 멱등성 / 안전성 점검

| 항목 | 점검 |
|------|------|
| PREPARE_SPLIT 보상 | splitPrepare 후 후속 step 실패 시 → PaymentSplit 4개 EXPIRED 처리 또는 saga rollback step 추가 |
| BROADCAST_SETTLEMENT 실패 | optional step. 실패 시 saga는 진행, 결제 path는 모바일 UI에서 직접 조회 가능해야 함 → 별도 `GET /api/user/payments/split/booking/:id` 노출 검토 |
| PAYMENT_CONFIRMED 중복 트리거 | 단건 카드의 `payment.confirmed` outbox와 더치페이의 `booking.paymentConfirmed` outbox가 **둘 다 동일 saga 트리거**. booking이 이미 CONFIRMED라면 step 1은 no-op로 처리되어 안전 |
| REGISTER_COMPANY_MEMBER 멱등 | `iam.companyMembers.addByBooking`가 이미 등록된 경우 noop이어야 함 — 별도 검증 필요 |

#### 6.6.6 우선순위 / 단계별 적용 제안

| 단계 | 변경 범위 | 위험 | 권장 시점 |
|------|----------|------|----------|
| Phase 1 | booking-service markParticipantPaid → outbox `booking.paymentConfirmed` | 낮음 (saga 측은 기존 listener 활용) | 즉시 |
| Phase 2 | booking-service direct emit / IAM 호출 제거 | 중간 (알림 누락 위험 — saga 통과 검증 필요) | Phase 1 검증 후 |
| Phase 3 | `CREATE_BOOKING` saga에 PREPARE_SPLIT step 추가 | 중간 (saga 정의 변경, agent와 책임 재분배) | Phase 2 안정화 후 |
| Phase 4 | agent-service의 splitPrepare/broadcast 직접 호출 제거 | 낮음 (saga가 책임 보유 후 정리) | Phase 3 후 |

→ Phase 1만 적용해도 **사용자 관점의 saga 일관성**(④ 결과 카드까지 saga가 책임)이 확보됨. Phase 3~4는 코드 정리 성격.

---

### 6.7 Outbox 재시도

- payment_outbox_events 발행 실패 시 지수 백오프 (1s → 2s → 4s, 최대 5회)
- 최종 실패: `status='FAILED'`, `last_error` 기록 → 운영자 수동 처리

### 6.8 payment-service cron 제거 및 pg-boss 전환 (2026-05-05)

폴링 기반 cron(`saga-scheduler.service.ts`)을 모두 제거하고 pg-boss(PostgreSQL job queue) 기반 이벤트 트리거로 전환했습니다.

| 서비스 | 이전 구조 | 현재 구조 |
|---|---|---|
| saga-service | `saga-scheduler` (1분 주기 cron) | pg-boss worker — saga timeout / payment timeout 자동 보상 |
| booking-service | `saga-scheduler` (1분 주기 cron) | pg-boss worker — outbox 즉시 트리거 |
| payment-service | cron 없음 (outbox processor만) | pg-boss worker — outbox 즉시 트리거 + reconcile |

**Outbox 처리 경로**:

```
[비즈로직]                        [pg-boss queue]              [worker]
createOutboxEvent
  ├─ paymentOutboxEvent INSERT
  └─ pgboss.send ───────────────▶ payment-outbox-publish ──▶ NATS publish
                                                              + status=SENT
```

**멀티 pod 안전성**: pg-boss는 `SELECT FOR UPDATE SKIP LOCKED` 내장 — 동일 job은 하나의 pod에서만 실행. `singletonKey`로 producer 측 중복 차단.

### 6.9 confirmPayment race window 안전망 (2026-05-06)

#### 핵심 통찰

토스페이먼츠 결제 흐름에서 `paymentKey` 발급은 **사용자 인증 완료**를 의미할 뿐 **카드사 승인은 발생하지 않습니다**. 실제 카드사 승인(돈 빠지는 시점)은 우리 서버의 토스 confirm API 호출 후입니다.

```
[1] 사용자 토스 위젯 인증 → paymentKey 발급         (카드사 승인 ❌)
[2] 클라이언트 → 우리 서버 confirmPayment 호출
[3] 우리 서버 → 토스 confirm API 호출  ★★★ 카드사 승인 트리거 ★★★
[4] 토스 → 카드사 승인 → 💸 돈 빠짐 → status=DONE
[5] 토스 응답 → 우리 DB update + outbox 발행
```

**함의**: `[3]`을 차단하면 돈 빠짐 자체가 차단됨. DB 상태 가드만 잘 두면 정합성이 자동으로 보장됨.

#### 3계층 안전망

```mermaid
flowchart LR
    L1["계층 1: 가드<br/>payment.service.ts:71<br/>status !== READY → throw"]
    L2["계층 2: 5분 reconcile<br/>PaymentReconcileService<br/>pg-boss worker"]
    L3["계층 3: 토스 webhook<br/>WebhookController<br/>외부 이벤트 동기화"]

    L1 -.->|"비정상 confirm 시도 차단"| BLOCK["💸 돈 빠짐 자동 방지"]
    L2 -.->|"confirm 응답 못 받은 race window"| RECON["DB ↔ 토스 동기화"]
    L3 -.->|"가상계좌 입금 / 토스 콘솔 환불"| SYNC["외부 이벤트 반영"]
```

| 계층 | 책임 | 트리거 시점 |
|---|---|---|
| 1. 가드 | 비정상 confirm 시도 차단 (READY 외 상태에선 throw) | 매 confirmPayment 호출 |
| 2. reconcile | 토스 getPayment로 실제 상태 조회 → DB·outbox 정정 | confirmPayment 진입 5분 후 |
| 3. webhook | 외부 발생 이벤트(가상계좌 입금, 토스 콘솔 직접 환불) 반영 | 토스가 능동 발신 |

#### confirmPayment 동작 (변경 후)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant P as payment-service
    participant DB as PostgreSQL
    participant T as Toss API
    participant Q as pg-boss queue

    C->>P: payment.confirm (paymentKey, orderId, amount)
    P->>DB: payment 조회
    Note over P: 가드: status === READY ?
    P->>DB: status=IN_PROGRESS + paymentKey 사전 저장
    P->>Q: pgboss.send('payment-reconcile', {paymentId},<br/>startAfter=300s, singletonKey)
    P->>T: confirmPayment (paymentKey, orderId, amount)
    alt 정상 응답 (DONE)
        T-->>P: 200 OK status=DONE
        P->>DB: status=DONE + paymentKey 등 update
        P->>DB: paymentOutboxEvent('payment.confirmed') INSERT
        P->>Q: pgboss.send('payment-outbox-publish')
    else 명시적 실패 (4xx)
        T-->>P: 400 ALREADY_PROCESSED / EXCEED_LIMIT 등
        P->>DB: $transaction(status=ABORTED + outbox payment.failed)
        P->>Q: pgboss.send (outbox 트리거)
    else 네트워크 불명 (TIMEOUT/UNAVAILABLE)
        Note over P,T: 토스가 처리했는지 알 수 없음
        P-->>C: 에러 응답 (status=IN_PROGRESS 유지)
        Note over Q: 5분 후 reconcile worker가 처리
    end
```

#### PaymentReconcileService (신규)

```ts
// payment-reconcile.service.ts
@Injectable()
export class PaymentReconcileService implements OnModuleInit {
  async onModuleInit() {
    await this.pgboss.createQueue('payment-reconcile');
    await this.pgboss.work('payment-reconcile', (job) =>
      this.paymentService.reconcilePayment(job.data.paymentId)
    );
  }
}
```

`reconcilePayment(paymentId)` 분기:

| 우리 DB | 토스 실제 | 동작 |
|---|---|---|
| 종결 상태 (DONE/ABORTED/CANCELED/PARTIAL_CANCELED/EXPIRED) | (조회 안 함) | skip |
| paymentKey 없음 | (조회 불가) | markPaymentAborted (위젯조차 안 띄우고 5분 경과 케이스) |
| IN_PROGRESS | DONE | updatePaymentFromToss + outbox `payment.confirmed` |
| IN_PROGRESS | ABORTED / EXPIRED | markPaymentAborted + outbox `payment.failed` |
| IN_PROGRESS | CANCELED / PARTIAL_CANCELED | DB 상태만 동기화 |
| IN_PROGRESS | WAITING_FOR_DEPOSIT | skip (가상계좌 — webhook이 처리) |
| IN_PROGRESS | IN_PROGRESS / READY | throw → pg-boss `retryBackoff`로 재시도 |

**멀티 pod 안전성**: `singletonKey: reconcile-${paymentId}` — 동일 paymentId 중복 schedule 차단. worker는 `SELECT FOR UPDATE SKIP LOCKED`로 한 pod에서만 실행.

#### 케이스별 동작 매트릭스

| 시나리오 | 결과 |
|---|---|
| 정상 성공 | confirm 시 즉시 DONE + outbox. reconcile은 5분 후 종결 상태 보고 skip |
| 명시적 실패 (한도초과 등 4xx) | 즉시 ABORTED + `payment.failed` outbox. reconcile은 skip |
| 네트워크 TIMEOUT/UNAVAILABLE | ABORTED 단정 안 함. status=IN_PROGRESS + paymentKey 유지. **5분 후 reconcile**이 토스 getPayment로 동기화 |
| Pod 죽음 (catch도 못 탐) | DB는 IN_PROGRESS + paymentKey. **5분 후 reconcile**이 토스 실제 상태로 동기화 |
| 위젯조차 안 띄우고 5분 경과 | paymentKey 없음 → reconcile이 ABORT 처리 |
| 늦게 paymentKey 도착 (사용자 confirmPayment 재시도) | 가드(status !== READY)로 차단 → 토스 confirm 미호출 → 돈 안 빠짐 |
| 토스 IN_PROGRESS인 채로 reconcile retry 소진 | DB IN_PROGRESS 잔존 → webhook 또는 운영자 개입 |

### 6.10 webhook 멱등성 가드 (2026-05-06)

토스 webhook은 통상 1회만 발신되지만, 우리 측 응답이 늦거나 실패하면 재전송될 수 있습니다. 모든 핸들러에 단순 status 가드를 추가했습니다.

| 핸들러 | 가드 | 추가 동작 |
|---|---|---|
| `handlePaymentStatusChanged` | 동일 status skip / 종결 상태 역행 webhook 무시 | — |
| `handleDepositCallback` | 이미 DONE이면 skip | — (이미 createOutboxEvent로 통일됨) |
| `handleCancelStatusChanged` | 이미 CANCELED skip | **payment.status 동기화 + `payment.canceled` outbox 발행** (토스 콘솔 직접 환불 시 booking-service 통보) |

**역행 무시 정책**: DONE/CANCELED/ABORTED 등 종결 상태에서 IN_PROGRESS·READY 같은 이전 단계 webhook이 도착하면 무시 (warn 로그). 토스가 자체 재시도 또는 시간차로 발신하는 경우 발생.

```mermaid
flowchart TB
    W["📨 토스 webhook"] --> H["webhook handler"]
    H --> Q1{"DB 상태 vs 토스 status"}
    Q1 -->|"같음"| SKIP["✅ skip (idempotent)"]
    Q1 -->|"다름"| Q2{"DB가 종결 상태?"}
    Q2 -->|"Yes (역행)"| IGNORE["⚠️ 무시 (warn)"]
    Q2 -->|"No"| UPD["DB update + outbox 발행"]
```

### 6.11 변경 파일 인벤토리 (2026-05-06)

| 파일 | 변경 내용 |
|---|---|
| `payment-service/src/payment/service/payment.service.ts` | confirmPayment에 paymentKey 사전 저장 + reconcile 잡 schedule + 네트워크 불명 catch 분기. `reconcilePayment` / `scheduleReconcile` / `isNetworkUncertainError` / `triggerOutboxJob` / `insertOutboxEvent` 추가. `markPaymentAborted` 트랜잭션 commit 후 트리거 패턴으로 리팩토링 |
| `payment-service/src/payment/service/payment-reconcile.service.ts` | 신규 — pg-boss worker. `paymentService.reconcilePayment` 위임 |
| `payment-service/src/payment/service/outbox-processor.service.ts` | pg-boss worker로 변경 (cron 제거). `OUTBOX_QUEUE = 'payment-outbox-publish'` |
| `payment-service/src/payment/controller/webhook.controller.ts` | 3개 핸들러 멱등 가드 추가. handleCancelStatusChanged에 outbox 발행 추가. handleDepositCallback `createOutboxEvent` 통일. `isTerminalStatus` 헬퍼 |
| `payment-service/src/common/pgboss/pgboss.service.ts` | 신규 — pg-boss 통합. send/work/createQueue/cancel |
| `payment-service/src/payment/payment.module.ts` | `PaymentReconcileService` provider 등록 |
| `saga-service/src/saga/scheduler/saga-pgboss-worker.service.ts` | 신규 — saga timeout / payment timeout pg-boss worker (cron 대체) |
| `saga-service/src/saga/scheduler/saga-scheduler.service.ts` | 삭제 |
| `booking-service/src/booking/service/saga-scheduler.service.ts` | 삭제 |

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
| `payment.refundPaidSplits` | payment-service (분할결제 일괄 환불) |
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

### 9.1 결함 및 해결 현황 (2026-05-06 기준)

| # | 결함 | 영향 | 우선순위 | 상태 |
|---|-----|------|---------|------|
| 1 | payment.confirm catch가 outbox 미발행 → booking 미동기화 | SLOT_RESERVED 영구 점유 | P0 | ✅ 해결 (markPaymentAborted) |
| 2 | 클라이언트 3종 결제 실패 시 백엔드 통지 부재 | 결함 #1 트리거 | P0 | ✅ 해결 (Web/iOS/Android) |
| 3 | `payment.markAborted` 엔드포인트 미존재 | #2 해결 차단 | P0 | ✅ 해결 |
| 4 | PAYMENT_FAILED Saga 미정의 | #2 해결 차단 | P0 | ✅ 해결 |
| 5 | preparePayment 후 미진행 leak (READY 무한 잔존) | SLOT_RESERVED 영구 | P0 | 🟡 부분 해결 (saga-scheduler 5분 후 자동 정리) |
| 6 | `expireSlotReservedBookings`가 saga 우회 → `slot.release` 미호출 | course-service 슬롯 미복구 | P1 | ✅ 해결 (job-service `booking-payment-timeout` cron 제거 + booking-service 우회 경로 제거) |
| 7 | saga-scheduler 미구현 (1차 방어 부재) | job-service Cron만 존재 | P1 | ✅ 해결 |
| 8 | CREATE_BOOKING Step 4 compensate 부재 | 실패 시 booking PENDING 잔존 | P1 | ⏳ 미해결 |
| 9 | Toss webhook(ABORTED/EXPIRED) 라우트 미연동 | 외부 상태 미반영 | P1 | ✅ 해결 (webhook 멱등 가드 + handleCancelStatusChanged outbox 발행, 6.9) |
| 10 | payment-service outbox processor 동작 검증 필요 | confirmed 이벤트 누락 가능 | P1 | ✅ 검증 (pg-boss 즉시 트리거로 전환, 6.7) |
| 11 | split payment에 saga 미적용 | 분할 결제 정합성 부재 | P2 | ✅ 해결 (PAYMENT_TIMEOUT Saga에 REFUND_PAID_SPLITS step 추가, 더치페이 일부 결제 시 자동 환불) |
| 12 | confirmPayment IN_PROGRESS race (토스 응답 못 받음 → 결제 결과 유실) | 결제됐는데 booking 미동기화 | P0 | ✅ 해결 (paymentKey 사전 저장 + 5분 reconcile + 네트워크 불명 catch 분기, 6.8) |
| 13 | webhook 핸들러 멱등성 부재 | 재전송 시 중복 outbox / 역행 update | P1 | ✅ 해결 (status 가드 3종 추가, 6.9) |
| 14 | payment-service raw outbox INSERT 2곳 (pg-boss 미트리거) | 영구 PENDING 누락 (가상계좌 입금 / handleAbort) | P1 | ✅ 해결 (createOutboxEvent / insertOutboxEvent 통일, 6.7) |
| 15 | payment-service cron (saga-scheduler) 잔존 | 멀티 pod 운영 시 중복 실행 위험 | P1 | ✅ 해결 (cron 제거, pg-boss로 통일, 6.7) |

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

### 9.3 잔여 작업

- CREATE_BOOKING Step 4 (UPDATE_BOOKING_STATUS)에 `compensate: 'booking.saga.markFailed'` 추가
- preparePayment(READY) 무한 잔존 방지 (별도 만료 정책)
- Outbox backup poller — pg-boss send 실패 시 PENDING 영구 잔존 차단 (1분 주기 PENDING 스캐너 또는 pg-boss recurring schedule)
- Outbox worker retry throw 위임 — 현재 self-managed retryCount는 pg-boss `retryLimit/retryBackoff`와 충돌. catch에서 throw하여 pg-boss에 위임 권장
- 토스 `Idempotency-Key` 헤더 적용 (confirm/cancel mutation)
- confirmPayment 외 cancelPayment / billingPayment에도 동일한 트랜잭션 일원화 패턴 적용 (status update + refund + outbox 단일 트랜잭션 → commit 후 트리거)

### 9.4 검증 시 확인 항목

- 결제 실패 즉시 `bookings.status=FAILED`
- `game_time_slot_cache` 및 `game_time_slots` 양쪽 `booked_players` 복구
- `payment_outbox_events.status=PROCESSED` (pg-boss 즉시 트리거 — 수ms 내)
- saga_executions에 PAYMENT_FAILED 1건 COMPLETED
- 사용자 알림 수신

#### confirmPayment race window 검증

- 정상 성공 케이스: DB.status=DONE, paymentKey 저장, outbox `payment.confirmed` SENT
- 명시적 실패 (4xx): DB.status=ABORTED, outbox `payment.failed` SENT
- 네트워크 TIMEOUT 시뮬레이션: DB.status=IN_PROGRESS 유지, paymentKey 저장됨, 5분 후 reconcile 잡 발동
- reconcile 후: 토스 실제 상태와 DB 일치, 적절한 outbox 발행
- 멀티 pod: 동일 paymentId 중복 schedule 차단 (singletonKey)

#### webhook 멱등성 검증

- 동일 webhook 재전송 시: 첫 처리 후 두 번째는 idempotent skip 로그
- 종결 상태에서 역행 webhook: warn 로그 + 무시
- 토스 콘솔 직접 환불 시: payment CANCELED + outbox `payment.canceled` 발행 → booking-service 통보

---

**Last Updated**: 2026-05-06
