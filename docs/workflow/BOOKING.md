# 예약 워크플로우 및 Saga 아키텍처

> 버전: 5.2
> 최종 수정: 2026-03-04
> 이전 문서: BOOKING_SAGA_ARCHITECTURE.md, booking-workflow-design.md (통합됨)

## 목차

1. [개요](#1-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [예약 상태 정의](#3-예약-상태-정의)
4. [Saga 트랜잭션 흐름](#4-saga-트랜잭션-흐름)
5. [멱등성 처리](#5-멱등성-처리)
6. [동시성 제어](#6-동시성-제어)
7. [타임아웃 및 재시도 설정](#7-타임아웃-및-재시도-설정)
8. [취소 및 환불 프로세스](#8-취소-및-환불-프로세스)
9. [모니터링 및 디버깅](#9-모니터링-및-디버깅)
10. [그룹 예약 (Group Booking) — 3-Phase 구조](#10-그룹-예약-group-booking--3-phase-구조)
11. [더치페이 (Split Payment)](#11-더치페이-split-payment)

---

## 1. 개요

파크골프 예약 시스템은 **Choreography 기반 Saga 패턴**으로 분산 트랜잭션을 처리합니다.

### 1.1 주요 구성 요소

| 서비스 | 역할 | 데이터베이스 |
|--------|------|-------------|
| **booking-service** | 예약 생성, 팀 선정, 그룹 예약, Saga 오케스트레이션, Outbox 처리 | booking_db |
| **course-service** | 타임슬롯 관리, 슬롯 예약/해제 | course_db |
| **iam-service** | 인증/사용자/CompanyMember 관리 | iam_db |
| **user-api** | BFF, 클라이언트 요청 처리 | - |
| **payment-service** | 결제 준비/승인/취소, 더치페이 분할결제 | payment_db |
| **notify-service** | 알림 발송 | notify_db |
| **agent-service** | AI 예약 에이전트 (booking.create 호출) | - (in-memory) |

> AI 에이전트 예약 워크플로우 상세는 [AGENT_BOOKING_WORKFLOW.md](./AGENT_BOOKING_WORKFLOW.md) 섹션 11 참조

### 1.2 사용 기술

- **메시징**: NATS (Request-Reply + Event 패턴)
- **패턴**: Transactional Outbox, Saga, Optimistic Locking
- **결제**: 토스페이먼츠 SDK (위젯 결제)
- **ORM**: Prisma
- **인프라**: GKE Autopilot, PostgreSQL (in-cluster)

### 1.3 주요 액터

- **고객(User)**: 예약 생성, 결제, 취소 요청
- **관리자(Admin)**: 예약 확정, 취소 처리, 노쇼 처리
- **시스템(System)**: Saga 오케스트레이션, 자동 상태 전이

---

## 2. 시스템 아키텍처

### 2.1 전체 시스템 구조

```mermaid
flowchart TB
    subgraph "Frontend"
        A[User WebApp / iOS / Android]
    end

    subgraph "API Gateway"
        B[user-api]
    end

    subgraph "Microservices"
        C[booking-service]
        D[course-service]
        P[payment-service]
        IAM[iam-service]
        E[notify-service]
        AG[agent-service]
    end

    subgraph "Message Broker"
        NATS[NATS]
    end

    subgraph "Databases"
        F[(booking_db)]
        G[(course_db)]
        H[(payment_db)]
        I[(iam_db)]
    end

    subgraph "External"
        TOSS[토스페이먼츠 API]
    end

    A -->|REST API| B
    B -->|NATS Request| C
    B -->|NATS Request| P
    B -->|NATS Request| AG
    AG -->|booking.create| NATS
    C -->|slot.reserve| NATS
    NATS -->|slot.reserve| D
    D -.->|"Response {success/fail}"| C
    P -->|booking.paymentConfirmed| NATS
    NATS -->|booking.paymentConfirmed| C
    C -->|booking.confirmed| NATS
    C -->|iam.companyMembers.addByBooking| NATS
    NATS --> E
    NATS -->|addByBooking| IAM
    P -->|결제 승인| TOSS
    C --- F
    D --- G
    P --- H
    IAM --- I
```

### 2.2 Saga 컴포넌트 구조

```mermaid
flowchart LR
    subgraph "booking-service"
        A[BookingService]
        B[OutboxProcessor]
        C[SagaHandler]
        D[SagaScheduler]
        TS[TeamSelectionService]
        E[(OutboxEvent)]
        F[(IdempotencyKey)]
    end

    subgraph "course-service"
        G[GameSagaController]
        H[GameTimeSlotService]
        I[(ProcessedSlotReservation)]
        J[(GameTimeSlot)]
    end

    subgraph "payment-service"
        K[PaymentService]
        L[TossApiService]
        M[OutboxProcessor]
        N[(Payment)]
    end

    A -->|1. Create| E
    A -->|2. Create| F
    B -->|3. Poll & Send| E
    B -->|4. slot.reserve| G
    G -->|5. Check| I
    G -->|6. Reserve| H
    H -->|7. Update| J
    G -.->|8. Response| B
    B -->|9. handleSlotReserved| C
    C -->|10. SLOT_RESERVED| A
    K -->|11. payment.confirmed| M
    M -->|12. booking.paymentConfirmed| C
    C -->|13. CONFIRMED| A
    D -->|14. Cleanup| A
```

---

## 3. 예약 상태 정의

### 3.1 BookingStatus (예약 상태)

```
┌───────────────┬──────────────────────────────────────────────────────────┐
│ PENDING       │ 예약 생성됨, Saga 진행 중 (슬롯 예약 대기)                 │
│ SLOT_RESERVED │ 슬롯 예약 완료, 결제 대기 (카드결제 시)                    │
│ CONFIRMED     │ 예약 확정 (현장결제: 슬롯 완료 즉시 / 카드결제: 결제 완료) │
│ COMPLETED     │ 이용 완료                                                  │
│ CANCELLED     │ 취소됨                                                     │
│ NO_SHOW       │ 노쇼 (미방문)                                              │
│ FAILED        │ Saga 실패 (슬롯 예약 실패, 결제 실패, 타임아웃 등)        │
└───────────────┴──────────────────────────────────────────────────────────┘
```

### 3.2 상태 전이 다이어그램

결제 방법에 따라 Saga 경로가 분기됩니다.

```mermaid
stateDiagram-v2
    [*] --> PENDING: 예약 생성

    PENDING --> SLOT_RESERVED: slot.reserved (카드결제)
    PENDING --> CONFIRMED: slot.reserved (현장결제)
    PENDING --> FAILED: slot.reserve.failed 수신
    PENDING --> FAILED: Saga Timeout (60초)
    PENDING --> CANCELLED: 사용자/관리자 취소

    SLOT_RESERVED --> CONFIRMED: booking.paymentConfirmed 수신
    SLOT_RESERVED --> FAILED: 결제 타임아웃 (10분)
    SLOT_RESERVED --> CANCELLED: 사용자 취소 (슬롯 해제)

    CONFIRMED --> CANCELLED: 취소 (슬롯 해제 + 환불)
    CONFIRMED --> COMPLETED: 이용 완료 처리
    CONFIRMED --> NO_SHOW: 노쇼 처리

    FAILED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
    NO_SHOW --> [*]
```

### 3.3 결제 방법별 Saga 경로

| 결제 방법 | Saga 경로 | 설명 |
|----------|-----------|------|
| **현장결제 (onsite)** | `PENDING → CONFIRMED` | 슬롯 예약 완료 시 즉시 확정 (v2.0 동일) |
| **카드결제 (card)** | `PENDING → SLOT_RESERVED → CONFIRMED` | 슬롯 예약 후 결제 완료 시 확정 |

### 3.4 OutboxEvent 상태

```mermaid
stateDiagram-v2
    [*] --> PENDING: 이벤트 생성

    PENDING --> PROCESSING: OutboxProcessor 처리 시작

    PROCESSING --> SENT: NATS 발행 성공
    PROCESSING --> PENDING: NATS 타임아웃 (retry_count++)
    PROCESSING --> FAILED: Max Retry 초과 (5회)

    SENT --> [*]
    FAILED --> [*]
```

### 3.5 PaymentStatus (결제 상태)

```mermaid
stateDiagram-v2
    [*] --> READY: payment.prepare

    READY --> IN_PROGRESS: payment.confirm 시작
    READY --> ABORTED: 사용자 취소 / 타임아웃
    READY --> EXPIRED: 결제 만료 (가상계좌)

    IN_PROGRESS --> DONE: 토스 API 승인 성공
    IN_PROGRESS --> WAITING_FOR_DEPOSIT: 가상계좌 입금 대기
    IN_PROGRESS --> ABORTED: 토스 API 승인 실패

    WAITING_FOR_DEPOSIT --> DONE: 입금 완료 (Webhook)
    WAITING_FOR_DEPOSIT --> EXPIRED: 입금 기한 초과

    DONE --> CANCELED: 전체 환불
    DONE --> PARTIAL_CANCELED: 부분 환불
```

### 3.6 TimeSlotStatus (타임슬롯 상태)

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: 슬롯 생성

    AVAILABLE --> AVAILABLE: 부분 예약 (bookedPlayers < maxPlayers)
    AVAILABLE --> FULLY_BOOKED: 만석 (bookedPlayers >= maxPlayers)

    FULLY_BOOKED --> AVAILABLE: 예약 취소

    AVAILABLE --> CLOSED: 관리자 마감
    FULLY_BOOKED --> CLOSED: 관리자 마감

    CLOSED --> AVAILABLE: 관리자 재개
```

### 3.7 정산 상태 (파생 — 조회 시 계산)

그룹 예약 정산 상태는 별도 컬럼 없이 `BookingParticipant` 상태에서 **조회 시 계산**합니다.

```typescript
// 같은 groupId의 모든 BookingParticipant 조회
const participants = await prisma.bookingParticipant.findMany({
  where: { booking: { groupId } },
});
const paidCount = participants.filter(p => p.status === 'PAID').length;
const totalCount = participants.length;

const allPaid = paidCount === totalCount && totalCount >= booking.playerCount;
const settlementStatus =
  allPaid ? 'COMPLETED' :
  paidCount > 0 ? 'PARTIAL' : 'PENDING';
```

| 파생 상태 | 조건 |
|----------|------|
| `PENDING` | 결제한 참여자 없음 (`paidCount === 0`) |
| `PARTIAL` | 일부 참여자 결제 (`0 < paidCount < totalCount`) |
| `COMPLETED` | 전원 결제 완료 (`paidCount === totalCount && totalCount >= playerCount`) |

> **Single Source of Truth**: `booking.settlementStatus` NATS 패턴으로 정산 상태를 조회합니다. `allPaid` 판단은 booking-service의 `markParticipantPaid()`에서 `paidCount === totalCount && totalCount >= playerCount` 공식으로 통일되며, agent-service는 이 API에 위임합니다.

### 3.7.1 TeamSelectionStatus (팀 선정 상태)

```
┌───────────┬──────────────────────────────────────┐
│ SELECTING │ 멤버 선택 진행 중                       │
│ READY     │ 모든 팀 구성 완료                       │
│ BOOKING   │ 예약(Saga) 진행 중                      │
│ COMPLETED │ 모든 팀 예약 완료                       │
│ CANCELLED │ 취소                                    │
└───────────┴──────────────────────────────────────┘
```

### 3.8 ParticipantStatus (참여자 결제 상태)

```
┌───────────┬──────────────────────────────────────┐
│ PENDING   │ 결제 대기                              │
│ PAID      │ 결제 완료                              │
│ CANCELLED │ 참여 취소                              │
│ REFUNDED  │ 환불 완료                              │
└───────────┴──────────────────────────────────────┘
```

### 3.9 SplitStatus (분할결제 상태)

```
┌───────────┬──────────────────────────────────────┐
│ PENDING   │ 결제 대기                              │
│ PAID      │ 결제 완료                              │
│ EXPIRED   │ 결제 기한 만료                         │
│ CANCELLED │ 취소                                   │
│ REFUNDED  │ 환불                                   │
└───────────┴──────────────────────────────────────┘
```

---

## 4. Saga 트랜잭션 흐름

### 4.1 현장결제 시퀀스 (기존 동일)

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend
    participant API as user-api
    participant BS as booking-service
    participant DB1 as booking-db
    participant NATS as NATS
    participant CS as course-service
    participant DB2 as course-db
    participant IAM as iam-service

    Client->>API: POST /bookings (paymentMethod=onsite)
    API->>BS: booking.create (NATS)

    Note over BS: Step 1~3: 멱등성 검증 + PENDING 예약 생성
    BS->>DB1: INSERT booking (PENDING, paymentMethod=onsite)
    BS->>DB1: INSERT outbox_event (slot.reserve)
    BS-->>API: 예약 생성 완료 (PENDING)
    API-->>Client: booking (PENDING)
    Client->>Client: /booking-complete 이동

    Note over BS: Step 4~6: Outbox → 슬롯 예약 (Request-Reply)
    BS->>NATS: slot.reserve (send)
    NATS->>CS: slot.reserve
    CS->>DB2: UPDATE bookedPlayers++, version++
    CS-->>BS: Response {success: true}
    Note over BS: OutboxProcessor → SagaHandler 직접 호출
    BS->>BS: handleSlotReserved()

    Note over BS: Step 7: paymentMethod=onsite → 바로 CONFIRMED
    BS->>DB1: UPDATE booking SET status=CONFIRMED
    BS->>NATS: emit booking.confirmed

    Note over BS: Step 8: CompanyMember 자동 등록 (fail-safe)
    BS->>CS: club.findOne → companyId 조회
    BS->>IAM: iam.companyMembers.addByBooking (upsert)
```

> **AI 에이전트 경유 예약**: agent-service의 `tool-executor`에서 `booking.create` 후 `waitForSagaCompletion()`으로 폴링(300ms × 최대 20회)하여 Saga 완료를 확인합니다. 현장결제는 CONFIRMED, 카드결제는 SLOT_RESERVED까지 대기 후 프론트엔드에 응답합니다. 상세는 [AGENT_BOOKING_WORKFLOW.md](./AGENT_BOOKING_WORKFLOW.md) 섹션 11.4 참조.

### 4.2 카드결제 시퀀스 (신규)

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend
    participant API as user-api
    participant BS as booking-service
    participant DB1 as booking-db
    participant NATS as NATS
    participant CS as course-service
    participant PS as payment-service
    participant DB3 as payment-db
    participant TOSS as 토스페이먼츠
    participant IAM as iam-service

    Client->>API: POST /bookings (paymentMethod=card)
    API->>BS: booking.create (NATS)

    Note over BS: Step 1~3: 멱등성 검증 + PENDING 예약 생성
    BS->>DB1: INSERT booking (PENDING, paymentMethod=card)
    BS->>DB1: INSERT outbox_event (slot.reserve)
    BS-->>API: 예약 생성 완료 (PENDING)
    API-->>Client: booking (PENDING)

    Note over BS: Step 4~6: Outbox → 슬롯 예약 (Request-Reply)
    BS->>NATS: slot.reserve (send)
    NATS->>CS: slot.reserve
    CS-->>BS: Response {success: true}
    Note over BS: OutboxProcessor → SagaHandler 직접 호출
    BS->>BS: handleSlotReserved()

    Note over BS: Step 7: paymentMethod=card → SLOT_RESERVED (결제 대기)
    BS->>DB1: UPDATE booking SET status=SLOT_RESERVED

    Note over Client: Step 8: 결제 준비
    Client->>API: POST /payments/prepare (bookingId, amount)
    API->>PS: payment.prepare (NATS)
    PS->>DB3: INSERT payment (READY, orderId 발급)
    PS-->>API: { orderId, amount, orderName }
    API-->>Client: orderId

    Note over Client: Step 9: 토스 위젯 결제
    Client->>Client: /checkout (토스 위젯 렌더링)
    Client->>TOSS: requestPayment (orderId)
    TOSS-->>Client: redirect /payment/success?paymentKey&orderId&amount

    Note over Client: Step 10: 결제 승인
    Client->>API: POST /payments/confirm (paymentKey, orderId, amount)
    API->>PS: payment.confirm (NATS)
    PS->>TOSS: POST /payments/confirm (서버 승인)
    TOSS-->>PS: 승인 완료
    PS->>DB3: UPDATE payment SET status=DONE
    PS->>DB3: INSERT outbox_event (payment.confirmed)
    PS-->>API: 결제 완료
    API-->>Client: 결제 완료

    Note over PS: Step 11: payment-service Outbox (Background)
    PS->>NATS: booking.paymentConfirmed
    NATS-->>BS: booking.paymentConfirmed

    Note over BS: Step 12: SLOT_RESERVED → CONFIRMED
    BS->>DB1: UPDATE booking SET status=CONFIRMED
    BS->>NATS: emit booking.confirmed

    Note over BS: Step 13: CompanyMember 자동 등록 (fail-safe)
    BS->>CS: club.findOne → companyId 조회
    BS->>IAM: iam.companyMembers.addByBooking (upsert)

    Client->>Client: /booking-complete 이동
```

### 4.3 단계별 상세 코드

#### Step 1: 멱등성 키 확인 (booking-service)

```typescript
// booking.service.ts
const existingIdempotencyKey = await this.prisma.idempotencyKey.findUnique({
  where: { key: dto.idempotencyKey },
});

if (existingIdempotencyKey?.aggregateId) {
  // 이미 처리된 요청 → 기존 예약 반환
  return await this.getBookingById(Number(existingIdempotencyKey.aggregateId));
}
```

#### Step 3: Transactional Outbox Pattern

```typescript
// booking.service.ts

// 가격 계산 (슬롯 조회 후)
const pricePerPerson = slot.price;
const totalAmount = pricePerPerson * dto.playerCount;
const serviceFee = Math.floor(totalAmount * 0.03); // 3% 서비스 수수료
const totalPrice = totalAmount + serviceFee;

const booking = await this.prisma.$transaction(async (tx) => {
  // 1. 예약 생성 (PENDING 상태)
  const newBooking = await tx.booking.create({
    data: {
      status: BookingStatus.PENDING,
      paymentMethod: dto.paymentMethod, // 'onsite' | 'card'
      pricePerPerson,
      serviceFee,
      totalPrice,
      // ... other fields
    },
  });

  // 2. OutboxEvent 생성 (같은 트랜잭션)
  await tx.outboxEvent.create({
    data: {
      eventType: 'slot.reserve',
      payload: { bookingId: newBooking.id, ... },
      status: OutboxStatus.PENDING,
    },
  });

  // 3. 멱등성 키 저장
  await tx.idempotencyKey.create({
    data: {
      key: dto.idempotencyKey,
      aggregateId: String(newBooking.id),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간
    },
  });

  // 4. 히스토리 기록
  await tx.bookingHistory.create({
    data: { bookingId: newBooking.id, action: 'SAGA_STARTED', ... },
  });

  return newBooking;
});
```

#### Step 4: Outbox Processor

```typescript
// outbox-processor.service.ts
const POLL_INTERVAL_MS = 3000;    // 3초마다 폴링 (안전망)
const BATCH_SIZE = 10;            // 한 번에 처리할 이벤트 수
const MAX_RETRY_COUNT = 5;        // 최대 재시도 횟수
const PROCESSING_LOCK_MS = 30000; // 처리 중 락 시간 (30초)

// FOR UPDATE SKIP LOCKED로 동시 처리 방지
const events = await this.prisma.$queryRaw`
  SELECT * FROM outbox_events
  WHERE status = 'PENDING'
  ORDER BY created_at ASC
  LIMIT ${BATCH_SIZE}
  FOR UPDATE SKIP LOCKED
`;
```

#### Outbox 즉시 트리거

예약 생성·취소 후 Outbox 이벤트를 즉시 처리하기 위해 `setImmediate`로 트리거합니다.
3초 폴링은 안전망 역할이며, 대부분의 이벤트는 즉시 처리됩니다.

```typescript
// booking.service.ts — 예약 생성/취소 후
setImmediate(() => this.outboxProcessor.triggerImmediate());

// outbox-processor.service.ts
async triggerImmediate(): Promise<void> {
  if (!this.isProcessing) {
    await this.processOutboxEvents();
  }
}
```

#### Outbox 이벤트 라우팅

이벤트 타입에 따라 대상 서비스 NATS 클라이언트를 자동 선택합니다:

| 이벤트 접두사 | 대상 서비스 | 통신 방식 |
|-------------|-----------|----------|
| `slot.*`, `gameTimeSlots.*` | course-service | Request-Reply |
| `payment.*` | payment-service | Request-Reply |
| `booking.*`, `notification.*` | notify-service | Event (Fire-and-forget) |

Request-Reply 이벤트는 응답을 대기하고 성공 여부를 확인합니다.
Saga 이벤트(`slot.reserve`, `slot.release`)는 응답 수신 후 OutboxProcessor가 SagaHandler를 **직접 호출**하여 후속 처리합니다 (course-service fire-and-forget emit 제거).
Event 방식은 발행 후 즉시 SENT로 마킹합니다.

#### Step 6: Optimistic Locking (course-service)

```typescript
// game-time-slot.service.ts
const currentVersion = slot.version;

const updatedSlot = await tx.gameTimeSlot.updateMany({
  where: {
    id: timeSlotId,
    version: currentVersion,  // Optimistic Lock
  },
  data: {
    bookedPlayers: slot.bookedPlayers + playerCount,
    status: newStatus,
    version: currentVersion + 1,
  },
});

if (updatedSlot.count === 0) {
  throw new ConflictException('Concurrent modification detected');
}
```

#### Step 7: Saga 분기 (booking-service)

```typescript
// saga-handler.service.ts - handleSlotReserved()
const booking = await this.prisma.booking.findUnique({
  where: { id: data.bookingId },
});

const isOnsitePayment = !booking.paymentMethod || booking.paymentMethod === 'onsite';

if (isOnsitePayment) {
  // 현장결제: PENDING → CONFIRMED (즉시 확정)
  await this.prisma.$transaction(async (prisma) => {
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    // 그룹 예약: teamSelectionId가 있으면 BookingParticipant 자동 생성
    if (booking.teamSelectionId && booking.teamNumber) {
      await this.createParticipantsFromTeamSelection(
        prisma, data.bookingId, booking.teamSelectionId, booking.teamNumber, pricePerPerson,
      );
    }
  });
  // emit booking.confirmed

  // CompanyMember 자동 등록 (fail-safe)
  await this.registerCompanyMember(booking.clubId, booking.userId);
} else {
  // 카드결제: PENDING → SLOT_RESERVED (결제 대기)
  await this.prisma.booking.update({
    where: { id: data.bookingId },
    data: { status: BookingStatus.SLOT_RESERVED },
  });
}
```

#### Step 12: 결제 확인 후 확정 (booking-service)

```typescript
// saga-handler.service.ts - handlePaymentConfirmed()
// booking.paymentConfirmed 이벤트 수신 시
const booking = await this.prisma.booking.findUnique({
  where: { id: data.bookingId },
});

if (booking.status === BookingStatus.SLOT_RESERVED) {
  await this.prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CONFIRMED },
  });
  // emit booking.confirmed → notify-service

  // CompanyMember 자동 등록 (fail-safe)
  await this.registerCompanyMember(booking.clubId, booking.userId);
}
```

### 4.4 CompanyMember 자동 등록

예약이 **CONFIRMED** 상태로 전이될 때, 해당 골프장의 가맹점(Company)에 예약자를 회원으로 자동 등록합니다.

#### 호출 지점 (3곳)

| 위치 | 시나리오 | 상태 전이 |
|------|---------|----------|
| `SagaHandlerService.handleSlotReserved()` | 현장결제 예약 | PENDING → CONFIRMED |
| `SagaHandlerService.handlePaymentConfirmed()` | 카드결제 예약 | SLOT_RESERVED → CONFIRMED |
| `BookingService.confirmBooking()` | 관리자 수동 확정 | PENDING → CONFIRMED |

#### 처리 흐름

```
예약 CONFIRMED → club.findOne(clubId) → companyId 조회
              → iam.companyMembers.addByBooking({ companyId, userId }) → upsert
```

#### 코드

```typescript
// booking-service: SagaHandlerService / BookingService 공통 헬퍼
private async registerCompanyMember(clubId: number | null, userId: number | null): Promise<void> {
  if (!clubId || !userId || !this.courseService || !this.iamService) return;

  try {
    // 1. club.findOne으로 companyId 조회 (COURSE_SERVICE)
    const clubResponse = await firstValueFrom(
      this.courseService.send('club.findOne', { id: clubId }),
    );
    const companyId = clubResponse?.data?.companyId;
    if (!companyId) return;

    // 2. iam.companyMembers.addByBooking 호출 (IAM_SERVICE, upsert)
    await firstValueFrom(
      this.iamService.send('iam.companyMembers.addByBooking', { companyId, userId }),
    );
  } catch (error) {
    // 실패해도 예약 확정 흐름에 영향 없음 (fail-safe)
    this.logger.warn(`Failed to register CompanyMember`, error?.message);
  }
}
```

#### 설계 원칙

- **실패 무해(fail-safe)**: try-catch로 감싸서 등록 실패가 예약 확정을 막지 않음
- **비회원 예약 무시**: `userId`가 null이면 호출하지 않음 (guest 예약)
- **멱등성**: iam-service의 `addByBooking`이 upsert이므로 중복 호출 안전

---

## 5. 멱등성 처리

### 5.1 계층별 멱등성 보장

```mermaid
flowchart TB
    subgraph "Layer 1: API Level (24시간)"
        A[Client idempotencyKey]
        B[(IdempotencyKey Table)]
        A --> B
    end

    subgraph "Layer 2: Outbox Level"
        C[OutboxEvent status]
        D[PENDING → PROCESSING → SENT]
        C --> D
    end

    subgraph "Layer 3: Saga Level (60초)"
        E[(ProcessedSlotReservation Table)]
        F[bookingId + gameTimeSlotId]
        E --> F
    end

    subgraph "Layer 4: DB Level"
        G[GameTimeSlot.version]
        H[Optimistic Lock]
        G --> H
    end

    subgraph "Layer 5: Payment Level"
        I[orderId unique]
        J[bookingId unique]
        I --> J
    end

    B -.->|중복 예약 요청 방지| C
    D -.->|중복 이벤트 발행 방지| E
    F -.->|중복 슬롯 예약 방지| G
    J -.->|중복 결제 방지| I
```

### 5.2 각 계층별 역할

| 계층 | 위치 | 저장소 | TTL | 목적 |
|------|------|--------|-----|------|
| **API Level** | booking-service | PostgreSQL (idempotency_keys) | 24시간 | 클라이언트 중복 요청 방지 |
| **Outbox Level** | booking-service | PostgreSQL (outbox_events) | - | 이벤트 중복 발행 방지 |
| **Saga Level** | course-service | PostgreSQL (processed_slot_reservations) | 60초 | 슬롯 중복 예약 방지 |
| **DB Level** | course-service | PostgreSQL (game_time_slots.version) | - | 동시성 제어 (Optimistic Lock) |
| **Payment Level** | payment-service | PostgreSQL (payments.orderId, payments.bookingId) | - | 중복 결제 방지 |

### 5.3 Saga 레벨 멱등성 (course-service)

```typescript
// game-time-slot.service.ts
const IDEMPOTENCY_TTL_MS = 60000; // 60초 TTL

// 1. 중복 요청 확인
const existingReservation = await this.prisma.processedSlotReservation.findUnique({
  where: {
    bookingId_gameTimeSlotId: { bookingId, gameTimeSlotId: timeSlotId },
  },
});

if (existingReservation) {
  return { success: true }; // 즉시 성공 반환 (슬롯 수정 안 함)
}

// 2. 슬롯 예약 처리 후 레코드 저장
await this.prisma.processedSlotReservation.create({
  data: {
    bookingId,
    gameTimeSlotId: timeSlotId,
    expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
  },
});

// 3. 5분마다 만료된 레코드 정리 (Cleanup Job)
```

---

## 6. 동시성 제어

### 6.1 Optimistic Locking

GameTimeSlot 테이블의 `version` 필드를 사용하여 동시성 제어:

```sql
-- 슬롯 예약 시
UPDATE game_time_slots
SET booked_players = booked_players + :playerCount,
    version = version + 1,
    status = CASE WHEN booked_players + :playerCount >= max_players
             THEN 'FULLY_BOOKED' ELSE 'AVAILABLE' END
WHERE id = :slotId AND version = :currentVersion;

-- affected rows = 0 이면 버전 충돌 → 재시도
```

### 6.2 재시도 로직

```typescript
// course-service: 최대 3회 재시도, 지수 백오프
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 50;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    return await this.reserveSlotWithLock(timeSlotId, playerCount);
  } catch (error) {
    if (error instanceof ConflictException && attempt < MAX_RETRIES) {
      await sleep(BASE_DELAY_MS * attempt); // 50ms, 100ms, 150ms
      continue;
    }
    throw error;
  }
}
```

### 6.3 Outbox 동시 처리 방지

```sql
-- FOR UPDATE SKIP LOCKED: 이미 처리 중인 이벤트 건너뛰기
SELECT * FROM outbox_events
WHERE status = 'PENDING'
ORDER BY created_at ASC
LIMIT 10
FOR UPDATE SKIP LOCKED;
```

---

## 7. 타임아웃 및 재시도 설정

### 7.1 현재 설정값

```mermaid
flowchart LR
    subgraph "booking-service"
        A[Outbox Poll: 3초]
        B[NATS Timeout: 30초]
        C[Max Retry: 5회]
        D[Saga Timeout: 60초 PENDING]
        D2[Payment Timeout: 10분 SLOT_RESERVED]
        E[Idempotency TTL: 24시간]
    end

    subgraph "course-service"
        F[TX Timeout: 30초]
        G[TX MaxWait: 10초]
        H[Lock Retry: 3회]
        I[Idempotency TTL: 60초]
    end

    subgraph "payment-service"
        J[Outbox Poll: 5초]
        K[Max Retry: 5회]
        L[Toss HTTP Timeout: 60초]
    end

    A --> F
    B --> F
    D2 --> J
```

### 7.2 설정 상세

| 설정 | 값 | 서비스 | 용도 |
|------|-----|--------|------|
| `POLL_INTERVAL_MS` | 3,000ms | booking | Outbox 폴링 주기 (안전망) |
| `BATCH_SIZE` | 10 | booking | 한 번에 처리할 이벤트 수 |
| `MAX_RETRY_COUNT` | 5 | booking | Outbox 최대 재시도 |
| `PROCESSING_LOCK_MS` | 30,000ms | booking | Outbox 처리 중 락 시간 |
| `NATS_TIMEOUT` | 30,000ms | booking | NATS 요청 타임아웃 |
| `NATS_RETRY_COUNT` | 2 | booking | 캐시 조회 NATS 재시도 횟수 |
| `SAGA_TIMEOUT_MS` | 60,000ms | booking | PENDING 상태 타임아웃 |
| `PAYMENT_TIMEOUT_MS` | 600,000ms (10분) | booking | SLOT_RESERVED 결제 대기 타임아웃 |
| `IDEMPOTENCY_KEY_TTL` | 24시간 | booking | 멱등성 키 보관 기간 |
| `TX_TIMEOUT` | 30,000ms | course | Prisma 트랜잭션 타임아웃 |
| `TX_MAX_WAIT` | 10,000ms | course | 트랜잭션 대기 최대 시간 |
| `LOCK_RETRY_COUNT` | 3 | course | Optimistic Lock 재시도 |
| `SLOT_IDEMPOTENCY_TTL` | 60,000ms | course | 슬롯 예약 멱등성 TTL |
| `PAYMENT_OUTBOX_POLL` | 5,000ms | payment | 결제 Outbox 폴링 주기 (Cron) |
| `PAYMENT_SEND_TIMEOUT` | 10,000ms | payment | 결제 Outbox NATS 전송 타임아웃 |
| `PAYMENT_MAX_RETRIES` | 5 | payment | 결제 Outbox 최대 재시도 |
| `TOSS_HTTP_TIMEOUT` | 60,000ms | payment | 토스페이먼츠 API HTTP 타임아웃 (공식 권장) |
| `SPLIT_EXPIRATION` | 30분 | payment | 더치페이 결제 기한 (기본값) |

### 7.3 정리 작업 스케줄

| 작업 | 주기 | 대상 | 서비스 |
|------|------|------|--------|
| PENDING 예약 타임아웃 | 1분마다 | 60초 이상 PENDING 예약 → FAILED | booking |
| SLOT_RESERVED 결제 타임아웃 | 1분마다 | 10분 이상 SLOT_RESERVED 예약 → FAILED + 슬롯 해제 | booking |
| 오래된 Outbox 이벤트 삭제 | 매일 자정 | 7일 이상 된 SENT 이벤트 | booking |
| 만료된 슬롯 예약 레코드 삭제 | 5분마다 | TTL 만료된 레코드 | course |

---

## 8. 취소 및 환불 프로세스

### 8.1 취소 유형

| 취소 유형 | 요청자 | 시점 제한 | 환불 | 슬롯 해제 |
|----------|--------|----------|------|----------|
| **고객 취소** | 고객 | 정책에 따름 | 정책에 따름 | O |
| **관리자 취소** | 관리자 | 제한 없음 | 전액 | O |
| **시스템 취소** | 시스템 | 자동 | 전액 | O |
| **결제 타임아웃** | 시스템 | SLOT_RESERVED 10분 초과 | - (미결제) | O |
| **Saga 실패** | 시스템 | PENDING 상태 | - | X (미예약) |

### 8.2 취소 프로세스 (현장결제)

```mermaid
sequenceDiagram
    autonumber
    actor User as 고객/관리자
    participant API as API
    participant BS as booking-service
    participant DB as booking-db
    participant CS as course-service
    participant NS as notify-service

    User->>API: 취소 요청 (bookingId, reason)
    API->>BS: cancelBooking()

    BS->>BS: 상태 검증 (PENDING/CONFIRMED)
    BS->>BS: 취소 정책 검증

    alt 취소 가능
        BS->>DB: status → CANCELLED (트랜잭션)
        BS->>DB: GameTimeSlotCache 복원 (bookedPlayers--, availablePlayers++)

        Note over BS: 트랜잭션 커밋 후 (Direct Emit)
        BS->>CS: gameTimeSlots.release (NATS emit)
        CS->>CS: bookedPlayers 감소, version++

        BS->>NS: booking.cancelled (NATS emit)
        NS-->>User: 취소 알림

        BS-->>API: 취소 완료
    else 취소 불가
        BS-->>API: 취소 불가 (사유)
    end
```

> **참고**: 현장결제 취소는 Outbox를 사용하지 않고 **Direct NATS Emit**으로 처리합니다.
> 로컬 `GameTimeSlotCache`는 트랜잭션 내에서 즉시 복원하고, course-service에는 비동기 emit으로 알립니다.

### 8.3 취소 프로세스 (카드결제 — 환불 포함)

```mermaid
sequenceDiagram
    autonumber
    actor User as 고객/관리자
    participant API as API
    participant BS as booking-service
    participant DB1 as booking-db
    participant NATS as NATS
    participant CS as course-service
    participant PS as payment-service
    participant TOSS as 토스페이먼츠
    participant NS as notify-service

    User->>API: 취소 요청 (bookingId, reason)
    API->>BS: booking.cancel (NATS)

    BS->>BS: 상태 검증 (SLOT_RESERVED/CONFIRMED)
    BS->>BS: 취소 정책 검증

    alt 취소 가능
        BS->>DB1: status → CANCELLED (트랜잭션)
        BS->>DB1: GameTimeSlotCache 복원 (bookedPlayers--, availablePlayers++)
        BS->>DB1: OutboxEvent 생성 (payment.cancelByBookingId)
        BS-->>API: 취소 완료
        API-->>User: 취소 완료 응답

        Note over BS: 트랜잭션 커밋 후 (Direct Emit)
        BS->>CS: gameTimeSlots.release (NATS emit)
        CS->>CS: bookedPlayers 감소, version++
        BS->>NS: booking.cancelled (NATS emit)

        Note over BS: Outbox Processing (비동기)
        BS->>NATS: payment.cancelByBookingId
        NATS->>PS: payment.cancelByBookingId (멱등)
        PS->>TOSS: POST /payments/{paymentKey}/cancel
        TOSS-->>PS: 환불 완료
        PS->>DB1: Refund 레코드 생성
        PS->>DB1: OutboxEvent 생성 (payment.canceled)

        Note over PS: Payment Outbox Processing (비동기)
        PS->>NATS: booking.paymentCanceled
        NATS-->>BS: booking.paymentCanceled
        BS->>DB1: BookingHistory (REFUND_COMPLETED)
        BS->>NATS: booking.refundCompleted
        NATS->>NS: booking.refundCompleted
        NS-->>User: 환불 완료 알림
    end
```

> **참고**: `payment.cancelByBookingId`는 멱등성이 보장됩니다. 결제 내역이 없거나, 이미 취소된 경우, 또는 paymentKey가 없는 경우 `{ skipped: true }` 를 반환합니다.

### 8.4 결제 타임아웃 Compensation (SLOT_RESERVED → FAILED)

```typescript
// saga-handler.service.ts — cleanupPaymentTimedOutBookings()
// (SagaSchedulerService에서 매 분마다 호출)
const PAYMENT_TIMEOUT_MS = 600000; // 10분

const timedOutBookings = await this.prisma.booking.findMany({
  where: {
    status: BookingStatus.SLOT_RESERVED,
    updatedAt: { lt: new Date(Date.now() - PAYMENT_TIMEOUT_MS) },
  },
});

for (const booking of timedOutBookings) {
  await this.prisma.$transaction(async (prisma) => {
    // 1. SLOT_RESERVED → FAILED
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.FAILED,
        sagaFailReason: 'Payment timeout - payment not completed within 10 minutes',
      },
    });

    await prisma.bookingHistory.create({
      data: {
        bookingId: booking.id,
        action: 'PAYMENT_TIMEOUT',
        userId: booking.userId,
        details: { timeoutMs: PAYMENT_TIMEOUT_MS },
      },
    });

    // 2. OutboxEvent 생성 → 슬롯 해제
    await prisma.outboxEvent.create({
      data: {
        eventType: 'slot.release',
        payload: {
          bookingId: booking.id,
          gameTimeSlotId: booking.gameTimeSlotId,
          playerCount: booking.playerCount,
          reason: 'Payment timeout',
        },
        status: OutboxStatus.PENDING,
      },
    });
  });
}
```

> **참고**: 결제 타임아웃 시점에서는 미결제 상태이므로 `payment.cancelByBookingId` Outbox 이벤트는 생성하지 않습니다.
> 단, 타임아웃 이후 결제가 도착하는 엣지 케이스는 아래 8.4.1에서 처리합니다.

#### 8.4.1 결제 타임아웃 이후 결제 도착 시 자동 환불

사용자가 Toss 결제 위젯에서 10분 이상 결제를 지연한 경우:
1. 스케줄러가 SLOT_RESERVED → FAILED 처리 + 슬롯 해제
2. 이후 사용자가 결제를 완료하면 payment-service가 `booking.paymentConfirmed` 이벤트 발행
3. `handlePaymentConfirmed()`에서 booking이 FAILED 상태임을 감지 → **자동 환불** 트리거

```typescript
// saga-handler.service.ts — handlePaymentConfirmed 내부
if (booking.status === BookingStatus.FAILED) {
  // 1. BookingHistory에 AUTO_REFUND_REQUESTED 기록
  await prisma.bookingHistory.create({
    data: {
      bookingId: data.bookingId,
      action: 'AUTO_REFUND_REQUESTED',
      details: {
        reason: 'Payment arrived after booking timeout',
        paymentId: data.paymentId,
        amount: data.amount,
      },
    },
  });

  // 2. payment.cancelByBookingId Outbox 이벤트 → payment-service가 Toss 환불 API 호출
  await prisma.outboxEvent.create({
    data: {
      eventType: 'payment.cancelByBookingId',
      payload: { bookingId: data.bookingId, cancelReason: 'Auto-refund: payment arrived after booking timeout' },
      status: OutboxStatus.PENDING,
    },
  });
}
```

> **흐름**: `handlePaymentConfirmed` → Outbox `payment.cancelByBookingId` → payment-service 환불 → `booking.paymentCanceled` 이벤트 → `handlePaymentCanceled`에서 `REFUND_COMPLETED` 기록 + 알림

### 8.5 슬롯 해제 (Compensation)

```typescript
// course-service: releaseSlotForSaga
async releaseSlotForSaga(timeSlotId: number, playerCount: number) {
  return await this.prisma.$transaction(async (tx) => {
    const slot = await tx.gameTimeSlot.findUnique({
      where: { id: timeSlotId },
    });

    const newBookedPlayers = Math.max(0, slot.bookedPlayers - playerCount);
    const newStatus = newBookedPlayers < slot.maxPlayers
      ? TimeSlotStatus.AVAILABLE
      : TimeSlotStatus.FULLY_BOOKED;

    await tx.gameTimeSlot.update({
      where: { id: timeSlotId },
      data: {
        bookedPlayers: newBookedPlayers,
        status: newStatus,
        version: { increment: 1 },
      },
    });
  }, {
    timeout: 30000,
    maxWait: 10000,
  });
}
```

### 8.6 환불 정책 (동적 계층 정책)

환불 정책은 **3-tier 계층 구조**로 관리됩니다. 골프장(Club)별로 다른 환불 규칙을 설정할 수 있으며,
설정이 없으면 상위 스코프(Company → Platform)의 정책으로 자동 폴백합니다.

#### 정책 스코프

```
PLATFORM (플랫폼 기본값)
  └── COMPANY (가맹점별 설정)
        └── CLUB (골프장별 설정)
```

| 스코프 | 설정 주체 | 폴백 |
|--------|----------|------|
| `PLATFORM` | 시스템 관리자 | - (최종 기본값) |
| `COMPANY` | 가맹점 관리자 | → PLATFORM |
| `CLUB` | 골프장 관리자 | → COMPANY → PLATFORM |

#### RefundPolicy 모델

```typescript
interface RefundPolicy {
  scopeLevel: 'PLATFORM' | 'COMPANY' | 'CLUB';
  companyId?: number;
  clubId?: number;
  name: string;                   // "기본 환불 정책"

  adminCancelRefundRate: number;  // 관리자 취소 환불율 (기본: 100%)
  systemCancelRefundRate: number; // 시스템 취소 환불율 (기본: 100%)

  minRefundAmount: number;        // 최소 환불 금액 (기본: 0원)
  refundFee: number;              // 환불 수수료 (정액, KRW)
  refundFeeRate: number;          // 환불 수수료 (정률, %)

  tiers: RefundTier[];            // 시간 기반 환불율 계단
}

interface RefundTier {
  minHoursBefore: number;         // 예약 시작 N시간 전 (하한)
  maxHoursBefore?: number;        // 예약 시작 N시간 전 (상한, null=무한)
  refundRate: number;             // 환불율 (%)
  label?: string;                 // "7일 전", "당일" 등
}
```

#### 기본 환불율 (PLATFORM 기본값 예시)

| 취소 시점 | 환불율 | label |
|----------|--------|-------|
| 예약일 7일 전 (168시간+) | 100% | 7일 전 |
| 예약일 3~7일 전 (72~168시간) | 80% | 3~7일 전 |
| 예약일 1~3일 전 (24~72시간) | 50% | 1~3일 전 |
| 예약일 24시간 이내 | 0% (환불 불가) | 당일 |

| 취소 유형 | 환불율 |
|----------|--------|
| 관리자 취소 (`adminCancelRefundRate`) | 100% |
| 시스템 취소 (`systemCancelRefundRate`) | 100% |
| 결제 타임아웃 | 타임아웃 시점에서는 미결제이므로 환불 불필요. 단, 타임아웃 후 결제 도착 시 자동 환불 (8.4.1) |
| 노쇼 | 0% (별도 NoShowPolicy로 관리) |

#### Resolve 패턴 (policy.refund.resolve)

```typescript
// booking-service에서 환불 정책 조회 시
const policy = await this.natsClient.send('policy.refund.resolve', {
  scopeLevel: 'CLUB',
  companyId: booking.companyId,
  clubId: booking.clubId,
});

// 응답: { ...policy, inherited: boolean, inheritedFrom: 'PLATFORM' | 'COMPANY' | null }
// CLUB에 설정이 없으면 COMPANY → PLATFORM 순으로 폴백
```

#### 취소 유형 (CancellationType)

```
USER_NORMAL      // 일반 고객 취소 (기한 내)
USER_LATE        // 지연 고객 취소 (1~3일 전)
USER_LASTMINUTE  // 긴급 취소 (24시간 이내)
ADMIN            // 관리자 취소
SYSTEM           // 시스템 취소 (Saga 실패 등)
```

---

## 9. 모니터링 및 디버깅

### 9.1 로그 태그

| 태그 | 서비스 | 용도 |
|------|--------|------|
| `[REQ-xxx]` | booking-service | 요청 추적 ID |
| `[Outbox]` | booking-service | Outbox 이벤트 처리 |
| `[SagaHandler]` | booking-service | Saga 상태 전이 |
| `[Saga]` | course-service | 슬롯 예약 처리 |
| `[Payment]` | payment-service | 결제 처리 |

### 9.2 로그 예시

```
# 현장결제 정상 흐름
[REQ-123-abc] ========== BOOKING CREATE START ==========
[REQ-123-abc] Step 1: Parallel query - idempotency key + slot cache...
[REQ-123-abc] Step 1: Parallel queries completed in 3ms
[REQ-123-abc] Step 2: Slot validation passed
[REQ-123-abc] Step 3: COMPLETED - Booking BK-A1B2C3D4-E5F6 created with PENDING status
[REQ-123-abc] ========== BOOKING CREATE SUCCESS (bookingId=15, total=45ms) ==========
[Outbox] Processing event 42 (slot.reserve) for bookingId=15, retry=0
[Saga] SLOT_RESERVE SUCCESS in 18ms - bookingId=15
[Outbox] Saga handleSlotReserved completed for bookingId=15
[SagaHandler] Booking 15 CONFIRMED (onsite) in 25ms
CompanyMember registered: companyId=3, userId=42

# 카드결제 정상 흐름
[REQ-456-def] ========== BOOKING CREATE START ==========
[REQ-456-def] Step 3: COMPLETED - Booking BK-D1E2F3G4-H5I6 created with PENDING status
[REQ-456-def] ========== BOOKING CREATE SUCCESS (bookingId=16, total=38ms) ==========
[Outbox] Processing event 43 (slot.reserve) for bookingId=16, retry=0
[Saga] SLOT_RESERVE SUCCESS in 15ms - bookingId=16
[Outbox] Saga handleSlotReserved completed for bookingId=16
[SagaHandler] Booking 16 SLOT_RESERVED (awaiting payment) in 20ms
[Payment] Prepare: orderId=ORD-1707123456789-a1b2c3d4, amount=50000
[Payment] Confirm: orderId=ORD-1707123456789-a1b2c3d4, paymentKey=tgen_xxx
[Payment] Outbox: emit booking.paymentConfirmed for bookingId=16
[SagaHandler] Booking 16 CONFIRMED (payment completed) in 30ms
CompanyMember registered: companyId=3, userId=42

# 결제 타임아웃
[SagaHandler] Found 1 payment-timed-out SLOT_RESERVED bookings
[SagaHandler] Booking BK-G7H8I9-J0K1 marked as FAILED due to payment timeout, slot release requested
```

### 9.3 GCP Cloud Logging 쿼리

```
# Saga 관련 로그 조회
resource.type="cloud_run_revision"
resource.labels.service_name="course-service-dev"
textPayload:("[Saga]")

# 특정 예약 추적
resource.type="cloud_run_revision"
textPayload:("bookingId=15")

# 결제 관련 로그 조회
resource.type="cloud_run_revision"
resource.labels.service_name="payment-service-dev"
textPayload:("[Payment]")

# Outbox 이벤트 처리 추적
resource.type="cloud_run_revision"
resource.labels.service_name="booking-service-dev"
textPayload:("[Outbox]")
```

### 9.4 성능 메트릭

| 단계 | 예상 소요 시간 |
|------|---------------|
| Idempotency Check | 1-5ms |
| Slot Query | 3-10ms |
| Slot Update (with lock) | 5-15ms |
| Total Saga - 현장결제 (booking → confirmed) | 50-200ms |
| Total Saga - 카드결제 (booking → slot_reserved) | 50-200ms |
| Payment Prepare | 10-50ms |
| Payment Confirm (토스 API) | 200-500ms |
| Total Saga - 카드결제 (slot_reserved → confirmed) | 300-600ms |

---

## 10. 그룹 예약 (Group Booking) — 3-Phase 구조

### 10.1 개요

그룹 예약은 **3단계(Phase)** 구조로 진행됩니다:

1. **Phase 1 — 팀 선정 (TeamSelection)**: 채팅방에서 멤버 선택 → DB 영속화
2. **Phase 2 — 팀별 부킹 (기존 Saga)**: `booking.create`로 팀별 독립 Saga 실행
3. **Phase 3 — 더치페이 결제 (기존 그대로)**: 참여자별 분할결제

`BookingGroup` 테이블은 제거되었으며, 그룹 식별은 `Booking.groupId` (GRP-xxx 문자열)로 관리합니다.
정산 상태는 `BookingParticipant` 상태에서 **조회 시 파생** (Section 3.7 참조).

### 10.2 데이터 모델

```mermaid
erDiagram
    TeamSelection ||--o{ TeamSelectionMember : "1:N (팀별 멤버)"
    TeamSelection ||..o{ Booking : "groupId로 연결"
    Booking ||--o{ BookingParticipant : "1:N (참여자)"
    Booking ||--o{ OutboxEvent : "1:N (Saga 이벤트)"

    TeamSelection {
        int id PK
        string groupId UK "GRP-YYYYMMDD-XXXXXX"
        string chatRoomId
        int bookerId
        string bookerName
        int clubId
        string clubName
        string date "YYYY-MM-DD"
        int teamCount
        TeamSelectionStatus status "SELECTING"
    }

    TeamSelectionMember {
        int id PK
        int teamSelectionId FK
        int teamNumber "1, 2, 3..."
        int userId
        string userName
        string userEmail
        ParticipantRole role "BOOKER|MEMBER"
    }

    Booking {
        int id PK
        string groupId "nullable, GRP-xxx"
        int teamNumber "nullable, 1, 2, 3..."
        int teamSelectionId "nullable"
        string status "PENDING"
    }

    BookingParticipant {
        int id PK
        int bookingId FK
        int userId
        string userName
        ParticipantRole role "BOOKER|MEMBER"
        ParticipantStatus status "PENDING"
        int amount
        datetime paidAt "nullable"
    }
```

### 10.3 NATS 패턴

| 패턴 | 설명 | 요청 |
|------|------|------|
| `teamSelection.create` | 팀 선정 세션 생성 | `{ chatRoomId, bookerId, bookerName, clubId, clubName, date }` |
| `teamSelection.addMembers` | 팀에 멤버 추가 | `{ teamSelectionId?, groupId?, teamNumber, members[] }` |
| `teamSelection.get` | 팀 선정 조회 | `{ id?, groupId? }` |
| `teamSelection.ready` | 팀 구성 완료 | `{ id?, groupId? }` |
| `teamSelection.cancel` | 팀 선정 취소 | `{ id?, groupId? }` |
| `booking.participant.paid` | 참여자 결제 완료 처리 | `{ bookingId, userId }` |
| `bookingGroup.cancel` | 그룹 예약 전체 취소 | `{ groupId: string }` |

### 10.4 Phase 1: 팀 선정

```mermaid
sequenceDiagram
    autonumber
    participant Agent as agent-service
    participant BS as booking-service
    participant DB as booking-db

    Agent->>BS: teamSelection.create (chatRoomId, clubId, date)
    BS->>DB: INSERT TeamSelection (groupId=GRP-xxx, SELECTING)
    BS-->>Agent: teamSelection (groupId, id)

    loop 팀별 멤버 추가
        Agent->>BS: teamSelection.addMembers (teamNumber, members[])
        BS->>DB: UPSERT TeamSelectionMember[]
        BS-->>Agent: updated teamSelection
    end

    Agent->>BS: teamSelection.ready (groupId)
    BS->>DB: status → READY
    BS-->>Agent: teamSelection (READY)
```

#### TeamSelectionStatus 전이

```mermaid
stateDiagram-v2
    [*] --> SELECTING: teamSelection.create
    SELECTING --> READY: teamSelection.ready
    READY --> BOOKING: 예약 시작
    BOOKING --> COMPLETED: 모든 팀 예약 완료
    SELECTING --> CANCELLED: teamSelection.cancel
    READY --> CANCELLED: teamSelection.cancel
```

### 10.5 Phase 2: 팀별 부킹 (기존 Saga)

TeamSelection이 READY 상태가 되면, agent-service가 팀별로 `booking.create`를 호출합니다.
각 팀의 Booking은 **독립적인 Saga**로 실행됩니다.

```mermaid
sequenceDiagram
    autonumber
    participant Agent as agent-service
    participant BS as booking-service
    participant DB as booking-db
    participant NATS as NATS
    participant CS as course-service

    Note over Agent: TeamSelection READY 상태

    loop 팀별 (teamNumber = 1, 2, ...)
        Agent->>BS: booking.create (groupId, teamNumber, teamSelectionId, gameTimeSlotId)
        BS->>DB: INSERT Booking (PENDING, groupId=GRP-xxx, teamNumber=N)
        BS->>DB: INSERT OutboxEvent (slot.reserve)
        BS-->>Agent: booking (PENDING)

        Note over BS: Saga (비동기)
        BS->>NATS: slot.reserve (Request-Reply)
        NATS->>CS: slot.reserve
        CS-->>BS: Response {success}
        BS->>BS: OutboxProcessor → handleSlotReserved()
        BS->>DB: CONFIRMED + BookingParticipant 자동 생성
    end
```

#### BookingParticipant 자동 생성

Saga에서 Booking이 CONFIRMED될 때, `teamSelectionId`가 있으면 해당 팀의 `TeamSelectionMember`를 조회하여 `BookingParticipant`를 자동 생성합니다:

```typescript
// saga-handler.service.ts — handleSlotReserved / handlePaymentConfirmed
if (booking.teamSelectionId && booking.teamNumber) {
  const members = await prisma.teamSelectionMember.findMany({
    where: { teamSelectionId: booking.teamSelectionId, teamNumber: booking.teamNumber },
  });

  for (const member of members) {
    await prisma.bookingParticipant.upsert({
      where: { bookingId_userId: { bookingId, userId: member.userId } },
      update: {},
      create: {
        bookingId,
        userId: member.userId,
        userName: member.userName,
        userEmail: member.userEmail,
        role: member.role,
        status: ParticipantStatus.PENDING,
        amount: pricePerPerson,
      },
    });
  }
}
```

### 10.6 Phase 3: 더치페이 결제

Section 11 참조. 기존 `payment.splitPrepare` → `payment.splitConfirm` → `booking.participant.paid` 흐름 그대로입니다.

### 10.7 정산 상태 파생 + 실시간 알림

참여자 결제 완료 시 `groupId` 기반으로 전체 정산 상태를 파생하고, 채팅방에 브로드캐스트합니다.

```mermaid
sequenceDiagram
    participant PS as payment-service
    participant BS as booking-service
    participant Chat as chat-service
    participant GW as chat-gateway

    PS->>BS: booking.participant.paid (NATS emit)
    BS->>BS: markParticipantPaid()
    BS->>BS: groupId 기반 정산 상태 파생 (PENDING/PARTIAL/COMPLETED)

    par 채팅 메시지 저장
        BS->>Chat: chat.messages.save (NATS send)
    and 실시간 브로드캐스트
        BS->>GW: chat.message.room (NATS emit)
        GW-->>GW: Socket.IO → 채팅방 클라이언트
    end
```

### 10.8 그룹 예약 취소

```typescript
// team-selection.service.ts
async cancelGroupBookings(groupId: string) {
  await this.prisma.$transaction(async (tx) => {
    // 1. 같은 groupId의 모든 Booking → CANCELLED
    const bookings = await tx.booking.findMany({ where: { groupId } });
    for (const booking of bookings) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      });

      // 2. 참여자 전체 → CANCELLED
      await tx.bookingParticipant.updateMany({
        where: { bookingId: booking.id },
        data: { status: ParticipantStatus.CANCELLED },
      });
    }

    // 3. TeamSelection도 CANCELLED
    await tx.teamSelection.updateMany({
      where: { groupId },
      data: { status: TeamSelectionStatus.CANCELLED },
    });
  });
}
```

---

## 11. 더치페이 (Split Payment)

### 11.1 개요

그룹 예약의 참여자 각자가 개별적으로 결제하는 분할결제 시스템입니다.
payment-service의 `PaymentSplitService`가 담당합니다.

### 11.2 데이터 모델

```prisma
model PaymentSplit {
  id              Int          @id @default(autoincrement())
  paymentId       Int?         // Toss 결제 완료 후 연결
  groupId         String?      // 그룹 ID (GRP-xxx)
  bookingId       Int          // 연결된 예약
  userId          Int
  userName        String
  userEmail       String
  amount          Int          // 개인 부담 금액 (KRW)
  status          SplitStatus  @default(PENDING)
  orderId         String       @unique  // SPL-{timestamp}-{uuid}
  paidAt          DateTime?
  expiredAt       DateTime?    // 결제 기한

  @@index([groupId, status])
  @@index([bookingId])
  @@index([userId, status])
}
```

### 11.3 NATS 패턴

| 패턴 | 설명 | 요청 |
|------|------|------|
| `payment.splitPrepare` | 분할결제 준비 (참여자별 orderId 발급) | `SplitPrepareDto` |
| `payment.splitConfirm` | 개별 참여자 결제 승인 | `{ orderId, paymentKey, amount }` |
| `payment.splitGet` | 분할결제 현황 조회 | `{ groupId? \| bookingId? \| orderId? }` |

### 11.4 더치페이 전체 흐름

```mermaid
sequenceDiagram
    autonumber
    participant Agent as agent-service
    participant BS as booking-service
    participant PS as payment-service
    participant DB as payment-db
    participant Client as Frontend
    participant TOSS as 토스페이먼츠

    Note over Agent: 1. 그룹 예약 생성 (Section 10)
    Agent->>BS: teamSelection → booking.create × N (dutchpay)
    BS-->>Agent: 팀별 예약 완료 (SLOT_RESERVED)

    Note over Agent: 2. 분할결제 준비
    Agent->>PS: payment.splitPrepare
    PS->>DB: PaymentSplit × N명 생성 (SPL-xxx orderId)
    PS-->>Agent: splits[] (참여자별 orderId, amount, expiredAt)

    Note over Client: 3. 각 참여자 개별 결제
    Client->>TOSS: requestPayment (SPL-xxx orderId)
    TOSS-->>Client: redirect /payment/success

    Note over Client: 4. 결제 승인
    Client->>PS: payment.splitConfirm (paymentKey, orderId, amount)
    PS->>PS: 검증 (상태, 만료, 금액)
    PS->>DB: PaymentSplit status → PAID
    PS-->>Client: 결제 완료

    Note over PS: 5. 참여자 결제 알림
    PS->>BS: booking.participant.paid (NATS emit)
    BS->>BS: markParticipantPaid() → 정산 상태 갱신
    BS->>BS: 채팅방 정산 카드 브로드캐스트
```

### 11.5 주문 ID 체계

| 서비스 | 접두사 | 형식 | 예시 |
|--------|-------|------|------|
| 일반 결제 | `ORD-` | `ORD-{timestamp}-{uuid8}` | `ORD-1707123456789-a1b2c3d4` |
| 분할결제 | `SPL-` | `SPL-{timestamp}-{uuid8}` | `SPL-1707123456789-e5f6g7h8` |
| 정기결제 | `BILLING-` | `BILLING-{timestamp}-{uuid8}` | `BILLING-1707123456789-i9j0k1l2` |

### 11.6 분할결제 검증

`splitConfirm` 시 다음 순서로 검증합니다:

| 검증 | 실패 시 |
|------|--------|
| Split 존재 여부 (orderId) | `Errors.Split.NOT_FOUND` |
| 이미 결제 완료 | `Errors.Split.ALREADY_PAID` |
| PENDING 상태 확인 | `Errors.Split.INVALID_STATUS` |
| 결제 기한 초과 | `Errors.Split.EXPIRED` |
| 금액 일치 | `Errors.Payment.AMOUNT_MISMATCH` |

### 11.7 만료 처리

```typescript
// payment-split.service.ts
async expirePendingSplits() {
  // PENDING 상태이면서 expiredAt < now인 분할결제 일괄 만료
  await this.prisma.paymentSplit.updateMany({
    where: {
      status: SplitStatus.PENDING,
      expiredAt: { lt: new Date() },
    },
    data: { status: SplitStatus.EXPIRED },
  });
}
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 5.2 | 2026-03-04 | **Saga 아키텍처 변경**: course-service fire-and-forget emit(`slot.reserved`/`slot.reserve.failed`/`slot.released`) 제거 → OutboxProcessor Request-Reply 응답 수신 후 SagaHandler 직접 호출, `booking.settlementStatus` NATS 패턴 추가 (allPaid SSOT), 정산 allPaid 공식 통일 |
| 5.1 | 2026-03-03 | **문서 현행화**: action: CREATED→SAGA_STARTED 수정, Saga 분기 코드 실제 구현 반영(isOnsitePayment 패턴), 취소 프로세스 Outbox→Direct Emit 수정(slot.release는 직접 emit), Section 8.4 파일 참조 saga-handler.service.ts로 수정, 로그 예시 실제 형식 반영, TeamSelectionService 컴포넌트 다이어그램 추가 |
| 5.0 | 2026-03-03 | **그룹 예약 리팩토링**: BookingGroup 테이블 제거 → TeamSelection/TeamSelectionMember로 팀 선정 분리, Booking에 groupId/teamSelectionId 흡수, 정산 상태 파생(조회 시 계산), 3-Phase 구조(팀 선정 → 부킹 → 결제) |
| 4.0 | 2026-03-03 | 그룹 예약(BookingGroup, BookingParticipant) 섹션 추가, 더치페이(PaymentSplit) 분할결제 섹션 추가, Outbox 즉시 트리거·이벤트 라우팅·Request-Reply 패턴 문서화, 누락 상수 추가 (PROCESSING_LOCK_MS, NATS_RETRY_COUNT, PAYMENT_SEND_TIMEOUT, SPLIT_EXPIRATION), 새 상태 enum 추가 (SettlementStatus, ParticipantStatus, SplitStatus) |
| 3.4 | 2026-02-24 | 결제 타임아웃 이후 결제 도착 시 자동 환불 (handlePaymentConfirmed → AUTO_REFUND_REQUESTED) |
| 3.3 | 2026-02-24 | AI 에이전트 Saga 폴링 노트 추가, Toss HTTP Timeout 60초 설정 반영 |
| 3.2 | 2026-02-23 | 결제 관련 보완: PaymentStatus 누락 상태 추가, serviceFee 계산 반영, Outbox 폴링 주기 수정 (1s→3s), 카드결제 취소 시퀀스 Outbox 기반으로 수정, 환불 정책 3-tier 동적 계층 시스템 반영, agent-service 크로스 레퍼런스 추가 |
| 3.1 | 2026-02-15 | 예약 확정 시 CompanyMember 자동 등록 (iam-service 연동) 추가 |
| 3.0 | 2026-02-10 | 토스페이먼츠 결제 연동, SLOT_RESERVED 상태 활성화, 결제 타임아웃 Compensation 추가 |
| 2.0 | 2026-01-21 | BOOKING_SAGA_ARCHITECTURE.md, booking-workflow-design.md 통합 및 소스 코드 반영 |
| 1.0 | 2026-01-12 | booking-workflow-design.md 초안 작성 |
| 1.0 | 2026-01-06 | BOOKING_SAGA_ARCHITECTURE.md 작성 |

---

## 참고 자료

- [Microservices Patterns - Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Optimistic Locking - Prisma](https://www.prisma.io/docs/concepts/components/prisma-client/transactions#optimistic-concurrency-control)
- [토스페이먼츠 결제 위젯 연동](https://docs.tosspayments.com/guides/v2/widget/integration)
