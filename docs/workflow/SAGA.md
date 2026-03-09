# Saga 오케스트레이션 워크플로우

> 버전: 1.0
> 최종 수정: 2026-03-09

## 목차

1. [개요](#1-개요)
2. [아키텍처](#2-아키텍처)
3. [데이터 모델](#3-데이터-모델)
4. [Saga 정의](#4-saga-정의)
5. [트랜잭션 흐름](#5-트랜잭션-흐름)
6. [보상 및 재시도](#6-보상-및-재시도)
7. [NATS 패턴](#7-nats-패턴)
8. [모니터링 및 디버깅](#8-모니터링-및-디버깅)

---

## 1. 개요

파크골프 예약 시스템은 **Orchestration 기반 Saga 패턴**으로 분산 트랜잭션을 처리합니다.
`saga-service`가 중앙 오케스트레이터 역할을 하며, 각 마이크로서비스는 Saga Step 핸들러만 노출합니다.

### 1.1 주요 구성 요소

| 서비스 | Saga 역할 | 데이터베이스 |
|--------|----------|-------------|
| **saga-service** | Saga 오케스트레이션, Step 실행/보상, 이력 관리 | saga_db |
| **booking-service** | Step 핸들러 (`booking.saga.*` 패턴) | booking_db |
| **course-service** | Step 핸들러 (`slot.reserve`, `slot.release`) | course_db |
| **payment-service** | Step 핸들러 (`payment.cancelByBookingId`) | payment_db |
| **notify-service** | Step 핸들러 (`notification.booking.*`) | notify_db |
| **iam-service** | Step 핸들러 (`iam.companyMembers.addByBooking`) | iam_db |

### 1.2 사용 기술

- **메시징**: NATS (Request-Reply)
- **패턴**: Saga Orchestration, Transactional Outbox, Compensation
- **ORM**: Prisma
- **인프라**: GKE Autopilot, PostgreSQL (in-cluster)

---

## 2. 아키텍처

### 2.1 전체 구조

```mermaid
flowchart TB
    subgraph Triggers["Saga 트리거"]
        UA[user-api / admin-api]
        PS[payment-service]
        JOB[job-service]
    end

    subgraph Orchestrator["saga-service"]
        CTRL[SagaNatsController]
        ENGINE[SagaEngineService]
        DEFS[Saga Definitions]
        DB_S[(saga_db)]
    end

    subgraph StepHandlers["Step Handlers"]
        BS[booking-service<br/>booking.saga.*]
        CS[course-service<br/>slot.reserve/release]
        PAY[payment-service<br/>payment.cancelByBookingId]
        NS[notify-service<br/>notification.booking.*]
        IAM[iam-service<br/>iam.companyMembers.*]
    end

    subgraph MsgBroker["메시지 브로커"]
        NATS{NATS}
    end

    UA -->|saga.booking.create/cancel| NATS
    PS -->|booking.paymentConfirmed| NATS
    JOB -->|saga.booking.cancel| NATS
    NATS --> CTRL
    CTRL --> ENGINE
    ENGINE --> DEFS
    ENGINE --> DB_S
    ENGINE -->|Step 실행| NATS
    NATS --> BS & CS & PAY & NS & IAM
```

### 2.2 Saga Engine 처리 흐름

```mermaid
flowchart LR
    START[startSaga] --> CREATE[SagaExecution 생성]
    CREATE --> LOOP{다음 Step?}
    LOOP -->|있음| EXEC[Step 실행<br/>NATS send]
    EXEC --> WAIT[응답 대기<br/>timeout]
    WAIT -->|성공| MERGE[응답 병합<br/>mergeResponse]
    MERGE --> NEXT[currentStep++]
    NEXT --> LOOP
    WAIT -->|실패| COMP[보상 실행<br/>compensate]
    COMP --> FAIL[FAILED / REQUIRES_MANUAL]
    LOOP -->|없음| DONE[COMPLETED]
```

- **Step 실행**: NATS Request-Reply (`send`)로 대상 서비스 호출
- **응답 병합**: Step 응답을 Saga payload에 누적 (`mergeResponse`)
- **조건부 Step**: `condition` 함수로 실행 여부 결정 (예: 현장결제면 알림 Skip)
- **Optional Step**: `optional: true`면 실패해도 Saga 계속 진행

---

## 3. 데이터 모델

### 3.1 ERD

```mermaid
erDiagram
    SagaExecution ||--o{ SagaStep : "1:N"
    OutboxEvent

    SagaExecution {
        int id PK
        string sagaType "CREATE_BOOKING 등"
        string correlationId UK "booking:123"
        SagaStatus status "STARTED"
        int currentStep
        int totalSteps
        json payload "공유 컨텍스트"
        string failReason "nullable"
        string triggeredBy "USER/ADMIN/SYSTEM"
        int triggeredById "nullable"
        datetime startedAt
        datetime completedAt "nullable"
        datetime failedAt "nullable"
    }

    SagaStep {
        int id PK
        int sagaExecutionId FK
        int stepIndex
        string stepName "RESERVE_SLOT 등"
        string actionPattern "slot.reserve"
        StepStatus status "PENDING"
        int retryCount
        json requestPayload "nullable"
        json responsePayload "nullable"
        string errorMessage "nullable"
        boolean isCompensation
        string compensatePattern "nullable"
        datetime startedAt "nullable"
        datetime completedAt "nullable"
    }

    OutboxEvent {
        int id PK
        string aggregateType
        string aggregateId
        string eventType
        json payload
        OutboxStatus status "PENDING"
        int retryCount
        string lastError "nullable"
        datetime createdAt
        datetime processedAt "nullable"
    }
```

### 3.2 Enum 정의

**SagaStatus**:

| 값 | 의미 |
|----|------|
| `STARTED` | Saga 시작됨 |
| `STEP_EXECUTING` | Step 실행 중 |
| `STEP_COMPLETED` | Step 완료 (다음 Step 대기) |
| `COMPLETED` | 모든 Step 완료 |
| `STEP_FAILED` | Step 실패 |
| `COMPENSATING` | 보상 실행 중 |
| `COMPENSATION_COMPLETED` | 보상 완료 |
| `COMPENSATION_FAILED` | 보상 실패 |
| `FAILED` | Saga 실패 |
| `REQUIRES_MANUAL` | 수동 개입 필요 |

**StepStatus**:

| 값 | 의미 |
|----|------|
| `PENDING` | 실행 대기 |
| `EXECUTING` | 실행 중 |
| `COMPLETED` | 완료 |
| `FAILED` | 실패 |
| `COMPENSATED` | 보상 완료 |
| `SKIPPED` | 조건 미충족으로 건너뜀 |

---

## 4. Saga 정의

### 4.1 Saga 목록

| Saga | 트리거 | 설명 |
|------|--------|------|
| `CREATE_BOOKING` | `saga.booking.create` | 예약 생성 → 슬롯 예약 → 상태 갱신 → 알림 → 가맹점 회원 등록 |
| `CANCEL_BOOKING` | `saga.booking.cancel` | 취소 정책 검증 → 환불 계산 → 예약 취소 → 결제 환불 → 슬롯 복구 → 알림 |
| `ADMIN_REFUND` | `saga.booking.adminRefund` | 환불 정책 검증 → 예약 취소 → 결제 환불 → 슬롯 복구 → 확정 → 알림 |
| `PAYMENT_CONFIRMED` | `booking.paymentConfirmed` | 예약 확정 → 알림 → 가맹점 회원 등록 |
| `PAYMENT_TIMEOUT` | scheduler / job-service | 예약 FAILED → 슬롯 복구 → 알림 |

### 4.2 CREATE_BOOKING

예약 생성 Saga. 현장결제(`onsite`)는 슬롯 예약 후 즉시 CONFIRMED, 카드결제(`card`)는 SLOT_RESERVED 상태에서 대기.

| Step | Action | Compensate | Target | 조건 |
|------|--------|-----------|--------|------|
| 1. CREATE_BOOKING_RECORD | `booking.saga.create` | `booking.saga.markFailed` | booking | - |
| 2. RESERVE_SLOT | `slot.reserve` | `slot.release` | course | - |
| 3. UPDATE_BOOKING_STATUS | `booking.saga.slotReserved` | - | booking | - |
| 4. SEND_CONFIRMATION | `notification.booking.confirmed` | - | notify | CONFIRMED일 때만 |
| 5. REGISTER_COMPANY_MEMBER | `iam.companyMembers.addByBooking` | - | iam | CONFIRMED + userId 있을 때 |

### 4.3 CANCEL_BOOKING

사용자/관리자 예약 취소 Saga.

| Step | Action | Compensate | Target | 조건 |
|------|--------|-----------|--------|------|
| 1. CHECK_CANCELLATION_POLICY | `policy.cancellation.resolve` | - | booking | - |
| 2. CALCULATE_REFUND | `policy.refund.resolve` | - | booking | - |
| 3. CANCEL_BOOKING_RECORD | `booking.saga.cancel` | `booking.saga.restoreStatus` | booking | - |
| 4. CANCEL_PAYMENT | `payment.cancelByBookingId` | - | payment | 카드결제일 때만 |
| 5. RELEASE_SLOT | `slot.release` | - | course | - |
| 6. SEND_CANCELLATION_NOTICE | `notification.booking.cancelled` | - | notify | optional |

### 4.4 ADMIN_REFUND

관리자 환불 Saga.

| Step | Action | Compensate | Target | 조건 |
|------|--------|-----------|--------|------|
| 1. CHECK_REFUND_POLICY | `policy.refund.resolve` | - | booking | - |
| 2. CANCEL_BOOKING_RECORD | `booking.saga.adminCancel` | `booking.saga.restoreStatus` | booking | - |
| 3. PROCESS_REFUND | `payment.cancelByBookingId` | - | payment | - |
| 4. RELEASE_SLOT | `slot.release` | - | course | - |
| 5. FINALIZE_BOOKING | `booking.saga.finalizeCancelled` | - | booking | - |
| 6. SEND_REFUND_NOTICE | `notification.booking.refundCompleted` | - | notify | optional |

### 4.5 PAYMENT_CONFIRMED

카드결제 완료 후속 Saga. payment-service가 결제 승인 후 `booking.paymentConfirmed` 이벤트를 발행하면 트리거.

| Step | Action | Compensate | Target | 조건 |
|------|--------|-----------|--------|------|
| 1. CONFIRM_BOOKING | `booking.saga.confirmPayment` | - | booking | - |
| 2. SEND_CONFIRMATION | `notification.booking.confirmed` | - | notify | optional |
| 3. REGISTER_COMPANY_MEMBER | `iam.companyMembers.addByBooking` | - | iam | optional |

### 4.6 PAYMENT_TIMEOUT

결제 타임아웃 Saga. SLOT_RESERVED 상태에서 10분 이상 결제 미완료 시 트리거.

| Step | Action | Compensate | Target | 조건 |
|------|--------|-----------|--------|------|
| 1. MARK_BOOKING_FAILED | `booking.saga.paymentTimeout` | - | booking | - |
| 2. RELEASE_SLOT | `slot.release` | - | course | - |
| 3. NOTIFY_TIMEOUT | `notification.booking.paymentTimeout` | - | notify | optional |

---

## 5. 트랜잭션 흐름

### 5.1 현장결제 예약 시퀀스

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend
    participant API as user-api
    participant SAGA as saga-service
    participant BS as booking-service
    participant CS as course-service
    participant IAM as iam-service

    Client->>API: POST /bookings (paymentMethod=onsite)
    API->>SAGA: saga.booking.create (NATS)

    Note over SAGA: Step 1: CREATE_BOOKING_RECORD
    SAGA->>BS: booking.saga.create
    BS-->>SAGA: { bookingId, paymentMethod=onsite, ... }

    Note over SAGA: Step 2: RESERVE_SLOT
    SAGA->>CS: slot.reserve (bookingId, slotId, playerCount)
    CS-->>SAGA: { success: true }

    Note over SAGA: Step 3: UPDATE_BOOKING_STATUS
    SAGA->>BS: booking.saga.slotReserved
    BS-->>SAGA: { status: CONFIRMED }

    Note over SAGA: Step 4: SEND_CONFIRMATION (CONFIRMED → 실행)
    SAGA->>SAGA: notification.booking.confirmed (optional)

    Note over SAGA: Step 5: REGISTER_COMPANY_MEMBER
    SAGA->>IAM: iam.companyMembers.addByBooking (optional)

    SAGA-->>API: Saga COMPLETED
    API-->>Client: 예약 완료
```

### 5.2 카드결제 예약 시퀀스

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend
    participant API as user-api
    participant SAGA as saga-service
    participant BS as booking-service
    participant CS as course-service
    participant PS as payment-service
    participant TOSS as 토스페이먼츠

    Client->>API: POST /bookings (paymentMethod=card)
    API->>SAGA: saga.booking.create (NATS)

    Note over SAGA: CREATE_BOOKING Saga
    SAGA->>BS: booking.saga.create
    BS-->>SAGA: { bookingId, paymentMethod=card }
    SAGA->>CS: slot.reserve
    CS-->>SAGA: { success }
    SAGA->>BS: booking.saga.slotReserved
    BS-->>SAGA: { status: SLOT_RESERVED }
    Note over SAGA: SLOT_RESERVED → 알림 조건 미충족, Skip
    SAGA-->>API: Saga COMPLETED (SLOT_RESERVED)
    API-->>Client: booking (SLOT_RESERVED)

    Note over Client: 결제 준비 + Toss 위젯 결제
    Client->>API: POST /payments/prepare
    API->>PS: payment.prepare
    PS-->>Client: { orderId }
    Client->>TOSS: requestPayment
    TOSS-->>Client: redirect /payment/success
    Client->>API: POST /payments/confirm
    API->>PS: payment.confirm
    PS->>TOSS: 서버 승인
    TOSS-->>PS: 승인 완료

    Note over PS: 결제 완료 → Outbox
    PS->>SAGA: booking.paymentConfirmed

    Note over SAGA: PAYMENT_CONFIRMED Saga
    SAGA->>BS: booking.saga.confirmPayment
    BS-->>SAGA: { status: CONFIRMED }
    SAGA->>SAGA: notification.booking.confirmed (optional)
    SAGA->>SAGA: iam.companyMembers.addByBooking (optional)
```

### 5.3 예약 취소 시퀀스 (카드결제)

```mermaid
sequenceDiagram
    autonumber
    participant User as 고객/관리자
    participant API as API
    participant SAGA as saga-service
    participant BS as booking-service
    participant PS as payment-service
    participant CS as course-service
    participant TOSS as 토스페이먼츠

    User->>API: 취소 요청
    API->>SAGA: saga.booking.cancel

    Note over SAGA: CANCEL_BOOKING Saga
    SAGA->>BS: policy.cancellation.resolve
    BS-->>SAGA: 취소 정책
    SAGA->>BS: policy.refund.resolve
    BS-->>SAGA: 환불 정책
    SAGA->>BS: booking.saga.cancel
    BS-->>SAGA: { previousStatus, gameTimeSlotId, ... }
    SAGA->>PS: payment.cancelByBookingId
    PS->>TOSS: POST /payments/{paymentKey}/cancel
    TOSS-->>PS: 환불 완료
    PS-->>SAGA: { cancelAmount }
    SAGA->>CS: slot.release
    CS-->>SAGA: { success }
    SAGA->>SAGA: notification.booking.cancelled (optional)
    SAGA-->>API: Saga COMPLETED
    API-->>User: 취소 완료
```

### 5.4 결제 타임아웃 시퀀스

```mermaid
sequenceDiagram
    participant JOB as job-service
    participant SAGA as saga-service
    participant BS as booking-service
    participant CS as course-service

    Note over JOB: SLOT_RESERVED 10분 초과 감지
    JOB->>SAGA: saga.booking.cancel (timeout)

    Note over SAGA: PAYMENT_TIMEOUT Saga
    SAGA->>BS: booking.saga.paymentTimeout
    BS-->>SAGA: { gameTimeSlotId, playerCount }
    SAGA->>CS: slot.release
    CS-->>SAGA: { success }
    SAGA->>SAGA: notification.booking.paymentTimeout (optional)
```

---

## 6. 보상 및 재시도

### 6.1 보상 (Compensation)

Step 실패 시, 이미 완료된 Step의 `compensate` 패턴을 **역순**으로 실행합니다.

```mermaid
flowchart LR
    FAIL[Step N 실패] --> COMP_N1[Step N-1 보상]
    COMP_N1 --> COMP_N2[Step N-2 보상]
    COMP_N2 --> DONE[COMPENSATION_COMPLETED]
    COMP_N2 -->|보상 실패| MANUAL[REQUIRES_MANUAL]
```

**예시: CREATE_BOOKING Step 2 (RESERVE_SLOT) 실패 시**:
1. Step 1 보상: `booking.saga.markFailed` → 예약 FAILED 처리
2. Saga 상태: `COMPENSATION_COMPLETED`

### 6.2 보상 실패

보상 Step도 실패하면 Saga는 `REQUIRES_MANUAL` 상태가 됩니다.
관리자가 `saga.resolve` 패턴으로 수동 해결할 수 있습니다.

### 6.3 재시도

관리자가 `saga.retry` 패턴으로 실패한 Saga를 재시도할 수 있습니다.
마지막 실패한 Step부터 재실행합니다.

### 6.4 Optional Step

`optional: true`인 Step은 실패해도 보상을 트리거하지 않고 다음 Step으로 진행합니다.
알림, CompanyMember 등록 등 부가 기능에 적용됩니다.

---

## 7. NATS 패턴

### 7.1 Saga 트리거 (Inbound)

| 패턴 | 타입 | 발신 | 설명 |
|------|------|------|------|
| `saga.booking.create` | `@MessagePattern` | user-api, agent-service | 예약 생성 Saga |
| `saga.booking.cancel` | `@MessagePattern` | user-api, admin-api, job-service | 예약 취소 Saga |
| `saga.booking.adminRefund` | `@MessagePattern` | admin-api | 관리자 환불 Saga |
| `booking.paymentConfirmed` | `@MessagePattern` | payment-service | 결제 완료 후속 Saga |
| `booking.paymentDeposited` | `@MessagePattern` | payment-service | 가상계좌 입금 후속 Saga |

### 7.2 Saga 관리 (Admin)

| 패턴 | 설명 |
|------|------|
| `saga.list` | Saga 실행 목록 조회 (필터: sagaType, status, 페이지네이션) |
| `saga.get` | Saga 실행 상세 (Steps 포함) |
| `saga.retry` | 실패한 Saga 재시도 |
| `saga.resolve` | 수동 해결 (REQUIRES_MANUAL → COMPLETED) |
| `saga.stats` | Saga 통계 (기간별) |

### 7.3 Step 핸들러 (Outbound)

saga-service가 Step 실행 시 호출하는 패턴. 각 마이크로서비스가 `@MessagePattern`으로 처리.

| 패턴 | 대상 서비스 | 용도 |
|------|-----------|------|
| `booking.saga.create` | booking-service | 예약 레코드 생성 (PENDING) |
| `booking.saga.markFailed` | booking-service | 예약 FAILED 처리 (보상) |
| `booking.saga.slotReserved` | booking-service | 슬롯 예약 완료 후 상태 갱신 |
| `booking.saga.confirmPayment` | booking-service | 결제 확인 후 CONFIRMED |
| `booking.saga.cancel` | booking-service | 예약 취소 처리 |
| `booking.saga.adminCancel` | booking-service | 관리자 취소 처리 |
| `booking.saga.restoreStatus` | booking-service | 취소 보상 (상태 복원) |
| `booking.saga.finalizeCancelled` | booking-service | 취소 확정 처리 |
| `booking.saga.paymentTimeout` | booking-service | 결제 타임아웃 FAILED 처리 |
| `slot.reserve` | course-service | 슬롯 예약 |
| `slot.release` | course-service | 슬롯 해제 (보상) |
| `payment.cancelByBookingId` | payment-service | 결제 환불 |
| `notification.booking.confirmed` | notify-service | 예약 확정 알림 |
| `notification.booking.cancelled` | notify-service | 예약 취소 알림 |
| `notification.booking.refundCompleted` | notify-service | 환불 완료 알림 |
| `notification.booking.paymentTimeout` | notify-service | 결제 타임아웃 알림 |
| `iam.companyMembers.addByBooking` | iam-service | 가맹점 회원 등록 |

### 7.4 NATS Client 구성

saga-service는 5개의 Named NATS Client를 사용:

| Client 이름 | 대상 |
|-------------|------|
| `BOOKING_SERVICE` | booking-service |
| `COURSE_SERVICE` | course-service |
| `PAYMENT_SERVICE` | payment-service |
| `NOTIFICATION_SERVICE` | notify-service |
| `IAM_SERVICE` | iam-service |

---

## 8. 모니터링 및 디버깅

### 8.1 로그 태그

| 태그 | 서비스 | 용도 |
|------|--------|------|
| `[Saga]` | saga-service | Saga 시작/완료/실패 |
| `[SagaEngine]` | saga-service | Step 실행/보상 |
| `[booking.saga.*]` | booking-service | Step 핸들러 처리 |
| `[Saga]` | course-service | 슬롯 예약/해제 |

### 8.2 Saga 상태 조회

```bash
# admin-api를 통한 Saga 목록 조회
# GET /admin/sagas?sagaType=CREATE_BOOKING&status=FAILED

# NATS 직접 호출 (디버깅용)
# saga.list { sagaType: 'CREATE_BOOKING', status: 'FAILED', page: 1, limit: 10 }
# saga.get { sagaExecutionId: 123 }
# saga.stats { startDate: '2026-03-01', endDate: '2026-03-09' }
```

### 8.3 수동 개입

REQUIRES_MANUAL 상태의 Saga는 관리자가 원인을 분석한 후 처리합니다:

```bash
# 재시도 (마지막 실패 Step부터 재실행)
# saga.retry { sagaExecutionId: 123 }

# 수동 해결 (관리자가 직접 보상 처리 후 완료 처리)
# saga.resolve { sagaExecutionId: 123, adminNote: '수동 슬롯 해제 완료' }
```

### 8.4 K8s 디버깅

```bash
# saga-service 로그
kubectl logs -l app=saga-service -n parkgolf-{env} --tail=100

# 특정 Saga 추적
kubectl logs -l app=saga-service -n parkgolf-{env} | grep "bookingId=15"

# saga_db 접속
kubectl exec -it postgres-0 -n parkgolf-{env} -- psql -U parkgolf -d saga_db

# Saga 실행 이력 조회
# SELECT * FROM saga_executions WHERE saga_type = 'CREATE_BOOKING' ORDER BY started_at DESC LIMIT 10;
# SELECT * FROM saga_steps WHERE saga_execution_id = 123 ORDER BY step_index;
```

### 8.5 파일 구조

```
services/saga-service/src/
├── main.ts
├── app.module.ts
├── saga/
│   ├── controller/
│   │   └── saga-nats.controller.ts    # NATS 핸들러 (트리거 + 관리)
│   ├── engine/
│   │   └── saga-engine.service.ts     # Saga 실행 엔진
│   ├── definitions/
│   │   ├── saga-definition.interface.ts
│   │   ├── create-booking.saga.ts     # CREATE_BOOKING 정의
│   │   ├── cancel-booking.saga.ts     # CANCEL_BOOKING 정의
│   │   ├── admin-refund.saga.ts       # ADMIN_REFUND 정의
│   │   ├── payment-confirmed.saga.ts  # PAYMENT_CONFIRMED 정의
│   │   ├── payment-timeout.saga.ts    # PAYMENT_TIMEOUT 정의
│   │   └── index.ts
│   └── saga.module.ts
├── outbox/
│   └── outbox.service.ts              # Outbox 처리
└── common/
    ├── constants/
    │   └── nats.constants.ts          # NATS 타임아웃 상수
    └── health.controller.ts
```

---

**Last Updated**: 2026-03-09
