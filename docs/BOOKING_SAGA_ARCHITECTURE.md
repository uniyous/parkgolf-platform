# Booking Saga Architecture

파크골프 예약 시스템의 분산 트랜잭션 처리를 위한 Saga 패턴 아키텍처 문서입니다.

## 목차

1. [개요](#개요)
2. [아키텍처 다이어그램](#아키텍처-다이어그램)
3. [Saga 트랜잭션 흐름](#saga-트랜잭션-흐름)
4. [멱등성(Idempotency) 처리](#멱등성idempotency-처리)
5. [중복 방지 메커니즘](#중복-방지-메커니즘)
6. [타임아웃 및 재시도 설정](#타임아웃-및-재시도-설정)
7. [상태 전이 다이어그램](#상태-전이-다이어그램)
8. [에러 처리 및 보상 트랜잭션](#에러-처리-및-보상-트랜잭션)

---

## 개요

예약 시스템은 **booking-service**와 **course-service** 두 개의 마이크로서비스로 구성되며,
NATS 메시징을 통해 Saga 패턴으로 분산 트랜잭션을 처리합니다.

### 주요 구성 요소

| 서비스 | 역할 | 데이터베이스 |
|--------|------|-------------|
| booking-service | 예약 생성, 상태 관리, Outbox 처리 | parkgolf-booking |
| course-service | 슬롯 예약, 가용성 관리 | parkgolf-course |

### 사용 기술

- **메시징**: NATS (Request-Reply + Event 패턴)
- **패턴**: Transactional Outbox, Saga, Optimistic Locking
- **ORM**: Prisma
- **인프라**: GCP Cloud Run, Cloud SQL

---

## 아키텍처 다이어그램

### 전체 시스템 구조

```mermaid
flowchart TB
    subgraph "Frontend"
        A[User WebApp]
    end

    subgraph "API Gateway"
        B[user-api]
    end

    subgraph "Microservices"
        C[booking-service]
        D[course-service]
    end

    subgraph "Message Broker"
        E[NATS]
    end

    subgraph "Databases"
        F[(parkgolf-booking)]
        G[(parkgolf-course)]
    end

    A -->|REST API| B
    B -->|NATS Request| C
    C -->|slot.reserve| E
    E -->|slot.reserve| D
    D -->|slot.reserved / slot.reserve.failed| E
    E -->|Events| C
    C --- F
    D --- G
```

### Saga 컴포넌트 구조

```mermaid
flowchart LR
    subgraph "booking-service"
        A[BookingService]
        B[OutboxProcessor]
        C[SagaHandler]
        D[OutboxEvent Table]
        E[IdempotencyKey Table]
    end

    subgraph "course-service"
        F[GameSagaController]
        G[GameTimeSlotService]
        H[ProcessedSlotReservation Table]
    end

    A -->|1. Create| D
    A -->|2. Create| E
    B -->|3. Poll & Send| D
    B -->|4. slot.reserve| F
    F -->|5. Check DB| H
    F -->|6. Reserve| G
    G -->|7. slot.reserved| C
    C -->|8. Update Status| A
```

---

## Saga 트랜잭션 흐름

### 예약 생성 시퀀스

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

    Client->>API: POST /bookings
    API->>BS: booking.create (NATS)

    Note over BS: Step 1: Idempotency Check
    BS->>DB1: SELECT FROM idempotency_keys
    alt 이미 처리된 요청
        DB1-->>BS: 기존 키 반환
        BS-->>API: 기존 예약 반환
    else 새로운 요청
        Note over BS: Step 2: Slot Validation
        BS->>DB1: SELECT FROM game_time_slot_cache

        Note over BS: Step 3: Create PENDING Booking
        BS->>DB1: BEGIN TRANSACTION
        BS->>DB1: INSERT booking (PENDING)
        BS->>DB1: INSERT outbox_event (slot.reserve)
        BS->>DB1: INSERT idempotency_key
        BS->>DB1: COMMIT
        BS-->>API: 예약 생성 완료 (PENDING)
    end

    API-->>Client: 202 Accepted

    Note over BS: Step 4: Outbox Processing (Background)
    loop Every 1 second
        BS->>DB1: SELECT FROM outbox_events WHERE status=PENDING
        BS->>NATS: slot.reserve
        NATS->>CS: slot.reserve

        Note over CS: Step 5: Idempotency Check (Memory Cache)
        alt 중복 요청
            CS-->>NATS: success (cached)
        else 새로운 요청
            Note over CS: Step 6: Optimistic Lock Reserve
            CS->>DB2: BEGIN TRANSACTION (30s timeout)
            CS->>DB2: SELECT FROM game_time_slot WHERE version=X
            CS->>DB2: UPDATE SET bookedPlayers++, version=X+1
            CS->>DB2: COMMIT
            CS-->>NATS: slot.reserved
        end

        NATS-->>BS: slot.reserved

        Note over BS: Step 7: State Transition
        BS->>DB1: UPDATE booking SET status=CONFIRMED
        BS->>DB1: UPDATE outbox_event SET status=SENT
    end
```

### 단계별 상세 설명

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

#### Step 2-3: PENDING 예약 생성 + Outbox Event

```typescript
// booking.service.ts - Transactional Outbox Pattern
const booking = await this.prisma.$transaction(async (prisma) => {
  // 예약 생성 (PENDING 상태)
  const newBooking = await prisma.booking.create({
    data: {
      status: BookingStatus.PENDING,  // Saga 시작
      // ... other fields
    },
  });

  // OutboxEvent 생성 (같은 트랜잭션)
  await prisma.outboxEvent.create({
    data: {
      eventType: 'slot.reserve',
      payload: { bookingId: newBooking.id, ... },
      status: OutboxStatus.PENDING,
    },
  });

  // 멱등성 키 저장
  await prisma.idempotencyKey.create({
    data: { key: dto.idempotencyKey, aggregateId: String(newBooking.id) },
  });

  return newBooking;
});
```

#### Step 4: Outbox Processor (Background)

```typescript
// outbox-processor.service.ts
const POLL_INTERVAL_MS = 1000;    // 1초마다 폴링
const NATS_TIMEOUT_MS = 15000;    // 15초 타임아웃

// 1초마다 PENDING 이벤트 조회 및 발행
setInterval(async () => {
  const events = await this.prisma.$queryRaw`
    SELECT * FROM outbox_events
    WHERE status = 'PENDING'
    LIMIT 10
    FOR UPDATE SKIP LOCKED
  `;

  for (const event of events) {
    await this.processEvent(event);
  }
}, POLL_INTERVAL_MS);
```

#### Step 5: 중복 요청 방지 (course-service DB Table)

```typescript
// game-time-slot.service.ts
const IDEMPOTENCY_TTL_MS = 60000; // 1분 TTL

async reserveSlotForSaga(timeSlotId, playerCount, bookingId) {
  // DB에서 이미 처리된 요청인지 확인
  const existingReservation = await this.prisma.processedSlotReservation.findUnique({
    where: {
      bookingId_gameTimeSlotId: { bookingId, gameTimeSlotId: timeSlotId },
    },
  });

  if (existingReservation) {
    return { success: true }; // 즉시 성공 반환
  }

  // 슬롯 예약 처리...

  // 성공 시 DB에 저장 (1분 TTL)
  await this.prisma.processedSlotReservation.create({
    data: {
      bookingId,
      gameTimeSlotId: timeSlotId,
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    },
  });
}
```

#### Step 6: Optimistic Locking (course-service)

```typescript
// game-time-slot.service.ts
const result = await this.prisma.$transaction(async (tx) => {
  const slot = await tx.gameTimeSlot.findUnique({
    where: { id: timeSlotId },
  });

  // Version 체크로 동시성 제어
  const updatedSlot = await tx.gameTimeSlot.updateMany({
    where: {
      id: timeSlotId,
      version: slot.version,  // Optimistic Lock
    },
    data: {
      bookedPlayers: slot.bookedPlayers + playerCount,
      version: slot.version + 1,
    },
  });

  if (updatedSlot.count === 0) {
    throw new ConflictException('Concurrent modification');
  }
}, {
  timeout: 30000,  // 30초 타임아웃
  maxWait: 10000,  // 10초 대기
});
```

---

## 멱등성(Idempotency) 처리

### 계층별 멱등성 보장

```mermaid
flowchart TB
    subgraph "Layer 1: API Level"
        A[Client idempotencyKey]
        B[IdempotencyKey Table]
        A -->|24시간 TTL| B
    end

    subgraph "Layer 2: Outbox Level"
        C[OutboxEvent status]
        D[PENDING → PROCESSING → SENT]
        C --> D
    end

    subgraph "Layer 3: Saga Level"
        E[ProcessedSlotReservation Table]
        F[1분 TTL DB Record]
        E --> F
    end

    B -.->|중복 예약 요청 방지| C
    D -.->|중복 이벤트 발행 방지| E
    F -.->|중복 슬롯 예약 방지| G[최종 슬롯 상태]
```

### 1. API 레벨 멱등성 (booking-service)

**목적**: 클라이언트의 중복 예약 요청 방지

```
┌─────────────────────────────────────────────────────┐
│                 IdempotencyKey Table                │
├─────────────────────────────────────────────────────┤
│ key: "client-uuid-12345"                            │
│ aggregateType: "Booking"                            │
│ aggregateId: "42"                                   │
│ expiresAt: 2026-01-07T06:00:00Z (24시간 후)         │
└─────────────────────────────────────────────────────┘
```

**흐름**:
1. 클라이언트가 `idempotencyKey`를 포함하여 예약 요청
2. booking-service가 `idempotency_keys` 테이블에서 키 조회
3. 키가 존재하면 기존 예약 반환 (DB 조회)
4. 키가 없으면 새 예약 생성 + 키 저장

### 2. Outbox 레벨 중복 방지 (booking-service)

**목적**: 동일 이벤트 중복 발행 방지

```
OutboxEvent Status Flow:
PENDING → PROCESSING → SENT
                    ↘ FAILED (재시도)
```

**흐름**:
1. OutboxProcessor가 `PENDING` 상태 이벤트 조회 (`FOR UPDATE SKIP LOCKED`)
2. 처리 시작 시 `PROCESSING`으로 상태 변경
3. NATS 발행 성공 시 `SENT`로 변경
4. 실패 시 `retry_count` 증가 후 `PENDING`으로 복귀

### 3. Saga 레벨 멱등성 (course-service)

**목적**: 동일 예약에 대한 중복 슬롯 예약 방지

```sql
-- processed_slot_reservations 테이블
CREATE TABLE processed_slot_reservations (
  id              SERIAL PRIMARY KEY,
  booking_id      INT NOT NULL,
  game_time_slot_id INT NOT NULL,
  processed_at    TIMESTAMP DEFAULT NOW(),
  expires_at      TIMESTAMP NOT NULL,
  UNIQUE(booking_id, game_time_slot_id)
);
CREATE INDEX idx_expires_at ON processed_slot_reservations(expires_at);
```

**흐름**:
1. slot.reserve 요청 수신
2. `(bookingId, gameTimeSlotId)` 복합키로 DB 조회
3. 레코드 존재 → 즉시 success 반환 (슬롯 수정 안 함)
4. 레코드 없음 → 슬롯 예약 처리 → DB에 레코드 저장 (1분 TTL)

---

## 중복 방지 메커니즘

### 전체 중복 방지 흐름

```mermaid
flowchart TD
    A[예약 요청] --> B{IdempotencyKey 존재?}
    B -->|Yes| C[기존 예약 반환]
    B -->|No| D[새 예약 생성 + OutboxEvent]

    D --> E[OutboxProcessor]
    E --> F{이미 PROCESSING?}
    F -->|Yes| G[Skip]
    F -->|No| H[NATS 발행]

    H --> I[course-service]
    I --> J{DB 레코드 존재?}
    J -->|Yes| K[즉시 Success 반환]
    J -->|No| L[슬롯 예약]

    L --> M{Version Match?}
    M -->|Yes| N[예약 성공 + DB 저장]
    M -->|No| O[재시도 또는 실패]
```

### 각 계층별 역할

| 계층 | 위치 | 저장소 | TTL | 목적 |
|------|------|--------|-----|------|
| API Level | booking-service | PostgreSQL (idempotency_keys) | 24시간 | 클라이언트 중복 요청 |
| Outbox Level | booking-service | PostgreSQL (outbox_events) | - | 이벤트 중복 발행 |
| Saga Level | course-service | PostgreSQL (processed_slot_reservations) | 1분 | 슬롯 중복 예약 |
| DB Level | course-service | PostgreSQL (game_time_slots.version) | - | 동시성 (Optimistic Lock) |

---

## 타임아웃 및 재시도 설정

### 현재 설정값

```mermaid
flowchart LR
    subgraph "booking-service"
        A[NATS Timeout: 15초]
        B[Outbox Poll: 1초]
        C[Max Retry: 5회]
    end

    subgraph "course-service"
        D[Prisma TX Timeout: 30초]
        E[Prisma MaxWait: 10초]
        F[DB Record TTL: 1분]
    end

    A --> D
```

### 설정 파일 위치

```typescript
// booking-service/src/booking/service/outbox-processor.service.ts
const POLL_INTERVAL_MS = 1000;       // 1초마다 폴링
const BATCH_SIZE = 10;               // 한 번에 처리할 이벤트 수
const MAX_RETRY_COUNT = 5;           // 최대 재시도 횟수
const NATS_TIMEOUT_MS = 15000;       // NATS 호출 타임아웃 (15초)

// course-service/src/game/service/game-time-slot.service.ts
const IDEMPOTENCY_TTL_MS = 60000;    // DB Record TTL (1분)

// Prisma Transaction Options
{
  timeout: 30000,  // 30초 (Cloud Run cold start 대응)
  maxWait: 10000,  // 최대 10초 대기
}
```

### 타임아웃 발생 시 동작

```mermaid
sequenceDiagram
    participant BS as booking-service
    participant NATS
    participant CS as course-service

    BS->>NATS: slot.reserve
    NATS->>CS: slot.reserve

    Note over CS: 처리 중... (10초 경과)

    alt 15초 내 완료
        CS-->>NATS: slot.reserved
        NATS-->>BS: success
        BS->>BS: OutboxEvent → SENT
    else 15초 타임아웃
        BS->>BS: OutboxEvent → retry_count++
        BS->>BS: 1초 후 재시도
        Note over CS: 첫 번째 요청 완료
        CS-->>NATS: slot.reserved (첫 요청)

        BS->>NATS: slot.reserve (재시도)
        NATS->>CS: slot.reserve
        Note over CS: DB Record Hit!
        CS-->>NATS: success (from DB)
        NATS-->>BS: success
    end
```

---

## 상태 전이 다이어그램

### Booking 상태 전이

```mermaid
stateDiagram-v2
    [*] --> PENDING: 예약 생성

    PENDING --> CONFIRMED: slot.reserved 수신
    PENDING --> FAILED: slot.reserve.failed 수신
    PENDING --> FAILED: Saga Timeout (1분)

    CONFIRMED --> CANCELLED: 사용자 취소
    CONFIRMED --> COMPLETED: 플레이 완료

    FAILED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

### OutboxEvent 상태 전이

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

### GameTimeSlot 상태 전이

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

---

## 에러 처리 및 보상 트랜잭션

### 실패 시나리오별 처리

```mermaid
flowchart TD
    A[예약 요청] --> B{슬롯 가용성?}
    B -->|불가| C[즉시 실패 반환]
    B -->|가용| D[PENDING 예약 생성]

    D --> E[slot.reserve 발행]
    E --> F{course-service 응답?}

    F -->|성공| G[CONFIRMED]
    F -->|실패: 용량 부족| H[FAILED + 보상]
    F -->|실패: 버전 충돌| I[재시도]
    F -->|타임아웃| J[재시도]

    I --> E
    J --> E

    H --> K[slot.release 발행]
    K --> L[슬롯 가용성 복구]
```

### 보상 트랜잭션 (Compensation)

```typescript
// saga-handler.service.ts
async handleSlotReserveFailed(data: {
  bookingId: number;
  gameTimeSlotId: number;
  reason: string;
}) {
  // PENDING → FAILED 상태 전이
  await this.prisma.$transaction(async (prisma) => {
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: {
        status: BookingStatus.FAILED,
        sagaFailReason: data.reason,
      },
    });

    await prisma.bookingHistory.create({
      data: {
        bookingId: data.bookingId,
        action: 'SAGA_FAILED',
        details: { reason: data.reason },
      },
    });
  });
}
```

### Saga 타임아웃 처리

```typescript
// saga-handler.service.ts
const SAGA_TIMEOUT_MS = 60000; // 1분

async cleanupTimedOutBookings() {
  const timeoutThreshold = new Date(Date.now() - SAGA_TIMEOUT_MS);

  const timedOutBookings = await this.prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      createdAt: { lt: timeoutThreshold },
    },
  });

  for (const booking of timedOutBookings) {
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.FAILED,
        sagaFailReason: 'Saga timeout',
      },
    });
  }
}
```

---

## 모니터링 및 디버깅

### 로그 태그

| 태그 | 서비스 | 용도 |
|------|--------|------|
| `[REQ-xxx]` | booking-service | 요청 추적 ID |
| `[Outbox]` | booking-service | Outbox 이벤트 처리 |
| `[SagaHandler]` | booking-service | Saga 상태 전이 |
| `[Saga]` | course-service | 슬롯 예약 처리 |

### 로그 예시

```
# 정상 흐름
[REQ-123] ========== BOOKING CREATE START ==========
[REQ-123] Step 1: Idempotency key check passed
[REQ-123] Step 2: Slot validation passed
[REQ-123] Step 3: COMPLETED - Booking BK-ABC123 created with PENDING status
[Outbox] Processing event 42 (slot.reserve) for bookingId=15
[Saga] ========== reserveSlotForSaga START ==========
[Saga] Slot 848 reserved successfully (version: 1 -> 2)
[SagaHandler] Booking 15 CONFIRMED successfully

# 중복 요청 감지
[Saga] DUPLICATE REQUEST DETECTED: bookingId=15, slotId=848 - returning cached success
```

### GCP Cloud Logging 쿼리

```
# Saga 관련 로그 조회
resource.type="cloud_run_revision"
resource.labels.service_name="course-service-dev"
textPayload:("[Saga]")

# 특정 예약 추적
resource.type="cloud_run_revision"
textPayload:("bookingId=15")
```

---

## 참고 자료

- [Microservices Patterns - Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Optimistic Locking](https://www.prisma.io/docs/concepts/components/prisma-client/transactions#optimistic-concurrency-control)
