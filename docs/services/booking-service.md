# Booking Service - Architecture & Saga Pattern

## Overview

booking-service는 파크골프 예약 관리를 담당하는 핵심 마이크로서비스입니다. **Choreography 기반 Saga 패턴**을 사용하여 course-service와 분산 트랜잭션을 관리하며, **Transactional Outbox Pattern**과 **Optimistic Locking**을 통해 데이터 무결성을 보장합니다.

### Key Features (2025-12-29 Updated)
- **Saga Pattern**: booking-service ↔ course-service 간 분산 트랜잭션
- **Transactional Outbox**: 이벤트 발행 원자성 보장
- **Idempotency Key**: UUID 기반 중복 요청 방지
- **Optimistic Locking**: course-service의 GameTimeSlot 동시성 제어
- **Saga Scheduler**: 타임아웃 예약 자동 정리 (1분 주기)

---

## 1. Service Architecture

### 1.1 Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                        booking-service                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Prisma    │  │    NATS     │  │     Business Logic      │ │
│  │  (Local DB) │  │   Client    │  │   (BookingService)      │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                     │
          ▼                ▼                     │
   ┌──────────────┐  ┌─────────────┐            │
   │  PostgreSQL  │  │    NATS     │◄───────────┘
   │  (booking)   │  │   Server    │
   └──────────────┘  └──────┬──────┘
                            │
                            ▼
                    ┌───────────────┐
                    │course-service │
                    └───────────────┘
```

### 1.2 Local Database Tables

| Table | Purpose | Source of Truth |
|-------|---------|-----------------|
| `bookings` | 예약 데이터 (Saga 상태 포함) | booking-service (Primary) |
| `payments` | 결제 데이터 | booking-service (Primary) |
| `booking_history` | 예약 변경 이력 | booking-service (Primary) |
| `game_cache` | Game 정보 캐시 | course-service (Sync) |
| `game_time_slot_cache` | 타임슬롯 캐시 | course-service (Sync) |
| `outbox_events` | Transactional Outbox | booking-service (Primary) |
| `idempotency_keys` | 중복 요청 방지 | booking-service (Primary) |

### 1.3 Saga Components

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           booking-service                                  │
│  ┌─────────────────┐  ┌───────────────────┐  ┌────────────────────────┐  │
│  │ BookingService  │  │ SagaHandlerService │  │ OutboxProcessorService │  │
│  │ (Create/Cancel) │  │ (Event Handlers)   │  │ (Polling & Publish)    │  │
│  └────────┬────────┘  └─────────┬─────────┘  └───────────┬────────────┘  │
│           │                     │                        │                │
│  ┌────────▼────────┐  ┌─────────▼─────────┐  ┌──────────▼──────────────┐ │
│  │ OutboxEvent     │  │ BookingSaga       │  │ SagaSchedulerService    │ │
│  │ (DB Table)      │  │ Controller        │  │ (Timeout Cleanup)       │ │
│  └─────────────────┘  └───────────────────┘  └─────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                              NATS  │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           course-service                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ GameSagaController (slot.reserve / slot.release handlers)           │  │
│  │ GameTimeSlotService (reserveSlotForSaga / releaseSlotForSaga)       │  │
│  │ GameTimeSlot.version (Optimistic Locking)                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. NATS Message Patterns

### 2.1 Saga Patterns (Choreography)

**예약 생성 Saga:**

| Pattern | Direction | Purpose | Payload |
|---------|-----------|---------|---------|
| `slot.reserve` | booking → course | 슬롯 예약 요청 | `SlotReserveRequest` |
| `slot.reserved` | course → booking | 슬롯 예약 성공 | `SlotReservedEvent` |
| `slot.reserve.failed` | course → booking | 슬롯 예약 실패 | `SlotReserveFailedEvent` |
| `slot.release` | booking → course | 슬롯 해제 요청 | `SlotReleaseRequest` |

**Saga Event Payloads:**
```typescript
// booking → course: 슬롯 예약 요청
interface SlotReserveRequest {
  bookingId: number;
  bookingNumber: string;
  gameTimeSlotId: number;
  playerCount: number;
  requestedAt: string;
}

// course → booking: 슬롯 예약 성공
interface SlotReservedEvent {
  bookingId: number;
  gameTimeSlotId: number;
  playerCount: number;
  reservedAt: string;
}

// course → booking: 슬롯 예약 실패
interface SlotReserveFailedEvent {
  bookingId: number;
  gameTimeSlotId: number;
  reason: string;
  failedAt: string;
}
```

### 2.2 Request-Reply (동기 통신)

booking-service가 course-service에 데이터를 요청하는 패턴입니다.

| Pattern | Direction | Purpose |
|---------|-----------|---------|
| `gameTimeSlots.get` | booking → course | 특정 타임슬롯 조회 |
| `games.get` | booking → course | 게임 정보 조회 |

**Usage Example:**
```typescript
const slotResponse = await firstValueFrom(
  this.courseServiceClient.send('gameTimeSlots.get', { timeSlotId: gameTimeSlotId })
);
```

### 2.3 Notification Events (비동기 통신)

| Pattern | Direction | Purpose | Payload |
|---------|-----------|---------|---------|
| `booking.confirmed` | booking → notification | 예약 확정 알림 | `BookingConfirmedEvent` |
| `booking.cancelled` | booking → notification | 예약 취소 알림 | `BookingCancelledEvent` |

### 2.4 Event Subscription (수신)

booking-service가 구독하는 이벤트입니다.

| Pattern | Direction | Handler | Purpose |
|---------|-----------|---------|---------|
| `slot.reserved` | course → booking | `BookingSagaController` | Saga 성공 처리 |
| `slot.reserve.failed` | course → booking | `BookingSagaController` | Saga 실패 처리 |
| `booking.game.sync` | course → booking | - | Game 정보 동기화 |
| `booking.gameTimeSlot.sync` | course → booking | - | 타임슬롯 동기화 |

---

## 3. Saga Flow (Choreography)

### 3.1 예약 생성 Saga Flow

```
┌──────────┐    ┌─────────────┐    ┌──────────────────┐    ┌────────────────┐
│  Client  │    │  user-api   │    │ booking-service  │    │ course-service │
└────┬─────┘    └──────┬──────┘    └────────┬─────────┘    └───────┬────────┘
     │                 │                     │                      │
     │ POST /bookings  │                     │                      │
     │ (idempotencyKey)│                     │                      │
     │────────────────>│                     │                      │
     │                 │                     │                      │
     │                 │ booking.create      │                      │
     │                 │ (NATS send)         │                      │
     │                 │────────────────────>│                      │
     │                 │                     │                      │
     │                 │                     │ [1] Check IdempotencyKey
     │                 │                     │────────┐             │
     │                 │                     │        │ unique?     │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │                     │ [2] Validate input   │
     │                 │                     │ + Sync slot cache    │
     │                 │                     │─────────────────────>│
     │                 │                     │ gameTimeSlots.get    │
     │                 │                     │<─────────────────────│
     │                 │                     │                      │
     │                 │                     │ [3] Transaction:     │
     │                 │                     │ - Create Booking     │
     │                 │                     │   (status: PENDING)  │
     │                 │                     │ - Create OutboxEvent │
     │                 │                     │ - Save IdempotencyKey│
     │                 │                     │────────┐             │
     │                 │                     │        │             │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │ Booking (PENDING)   │                      │
     │                 │<────────────────────│                      │
     │ Accepted (202)  │                     │                      │
     │<────────────────│                     │                      │
     │                 │                     │                      │
     │                 │  [OutboxProcessor polls & publishes]       │
     │                 │                     │                      │
     │                 │                     │ [4] slot.reserve     │
     │                 │                     │ (from Outbox)        │
     │                 │                     │─────────────────────>│
     │                 │                     │                      │
     │                 │                     │                      │ [5] Optimistic Lock
     │                 │                     │                      │ version check
     │                 │                     │                      │ bookedPlayers++
     │                 │                     │                      │
     │                 │                     │ [6] slot.reserved    │
     │                 │                     │<─────────────────────│
     │                 │                     │                      │
     │                 │                     │ [7] Update Booking   │
     │                 │                     │ status → CONFIRMED   │
     │                 │                     │────────┐             │
     │                 │                     │        │             │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │                     │ [8] booking.confirmed│
     │                 │                     │ (emit to notify)     │
     │                 │                     │─────────────────────>│
```

### 3.2 Saga 실패 시나리오

```
예약 생성 → slot.reserve 전송 → course-service에서 슬롯 부족 감지
                                        │
                                        ▼
                               slot.reserve.failed 발행
                                        │
                                        ▼
              booking-service: status → FAILED, sagaFailReason 저장
```

### 3.3 Saga 타임아웃 시나리오

```
예약 생성 (PENDING) → 5분 이상 slot.reserved 미수신
                                │
                                ▼
                    SagaSchedulerService (매 분 실행)
                                │
                                ▼
                    status → FAILED, reason: "Saga timeout"
                    slot.release 발행 (보상 트랜잭션)
```

### 3.2 예약 취소 Flow

```
┌──────────┐    ┌─────────────┐    ┌──────────────────┐    ┌────────────────┐
│  Client  │    │  user-api   │    │ booking-service  │    │ course-service │
└────┬─────┘    └──────┬──────┘    └────────┬─────────┘    └───────┬────────┘
     │                 │                     │                      │
     │ DELETE booking  │                     │                      │
     │────────────────>│                     │                      │
     │                 │                     │                      │
     │                 │ booking.cancel      │                      │
     │                 │────────────────────>│                      │
     │                 │                     │                      │
     │                 │                     │ [1] Update booking   │
     │                 │                     │     status=CANCELLED │
     │                 │                     │────────┐             │
     │                 │                     │        │             │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │                     │ [2] Restore cache    │
     │                 │                     │ (bookedPlayers--)    │
     │                 │                     │────────┐             │
     │                 │                     │        │             │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │                     │ [3] gameTimeSlots    │
     │                 │                     │     .release (emit)  │
     │                 │                     │─────────────────────>│
     │                 │                     │                      │
     │                 │                     │ [4] booking.cancelled│
     │                 │                     │ (emit to notification)│
     │                 │                     │─────────────────────>│
     │                 │                     │                      │
     │                 │ Success             │                      │
     │                 │<────────────────────│                      │
     │                 │                     │                      │
     │ Success         │                     │                      │
     │<────────────────│                     │                      │
```

---

## 4. Cache Synchronization Strategy

### 4.1 On-Demand Sync (현재 구현)

캐시 미스 시 course-service에서 데이터를 조회하여 동기화합니다.

```typescript
// booking.service.ts
async createBooking(dto: CreateBookingRequestDto) {
  // 1. 로컬 캐시 확인
  let slotCache = await this.prisma.gameTimeSlotCache.findUnique({
    where: { gameTimeSlotId: dto.gameTimeSlotId }
  });

  // 2. 캐시 미스 시 course-service에서 조회
  if (!slotCache) {
    slotCache = await this.fetchAndSyncSlotFromCourseService(dto.gameTimeSlotId);
  }

  // 3. 예약 진행
  // ...
}
```

**장점:**
- 필요할 때만 동기화하여 리소스 효율적
- 캐시 테이블이 비어있어도 동작 가능

**단점:**
- 첫 예약 시 추가 latency 발생 (course-service 호출)
- course-service 장애 시 예약 불가

### 4.2 Proactive Sync (권장 - 향후 구현)

course-service에서 타임슬롯 생성/변경 시 자동으로 booking-service에 동기화합니다.

```
┌────────────────┐                    ┌──────────────────┐
│ course-service │                    │ booking-service  │
└───────┬────────┘                    └────────┬─────────┘
        │                                      │
        │ [Game 생성/수정 시]                   │
        │ booking.game.sync (emit)             │
        │─────────────────────────────────────>│
        │                                      │ upsert GameCache
        │                                      │
        │ [타임슬롯 생성 시]                    │
        │ booking.gameTimeSlot.sync (emit)     │
        │─────────────────────────────────────>│
        │                                      │ upsert GameTimeSlotCache
        │                                      │
```

---

## 5. Race Condition Handling

### 5.1 Optimistic Locking (course-service)

course-service에서 GameTimeSlot의 `version` 필드를 사용한 동시성 제어:

```typescript
// course-service: reserveSlotForSaga
async reserveSlotForSaga(
  timeSlotId: number,
  playerCount: number,
  bookingId: number
): Promise<{ success: boolean; reason?: string }> {
  const MAX_RETRY = 3;

  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const slot = await tx.gameTimeSlot.findUnique({
          where: { id: timeSlotId },
        });

        if (!slot) {
          return { success: false, reason: 'Time slot not found' };
        }

        const availablePlayers = slot.maxPlayers - slot.bookedPlayers;
        if (availablePlayers < playerCount) {
          return { success: false, reason: 'Not enough available slots' };
        }

        // Optimistic locking with version check
        const updatedSlot = await tx.gameTimeSlot.updateMany({
          where: {
            id: timeSlotId,
            version: slot.version,  // ← version 체크
          },
          data: {
            bookedPlayers: slot.bookedPlayers + playerCount,
            version: slot.version + 1,  // ← version 증가
          },
        });

        if (updatedSlot.count === 0) {
          throw new ConflictException('Concurrent modification detected');
        }

        return { success: true };
      });
    } catch (error) {
      if (attempt === MAX_RETRY) {
        return { success: false, reason: 'Concurrent modification - max retries exceeded' };
      }
      // 재시도
    }
  }
}
```

### 5.2 Transactional Outbox Pattern (구현 완료)

예약 생성과 이벤트 발행을 동일 트랜잭션에서 처리하여 원자성 보장:

```
┌──────────────────────────────────────────────────┐
│                  Transaction                      │
│  ┌──────────────┐  ┌─────────────────────────┐   │
│  │ Create       │  │ Insert into             │   │
│  │ Booking      │  │ outbox_events           │   │
│  │ (PENDING)    │  │ (slot.reserve)          │   │
│  └──────────────┘  └─────────────────────────┘   │
│  ┌──────────────┐                                │
│  │ Save         │                                │
│  │ IdempotencyKey│                               │
│  └──────────────┘                                │
└──────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────┐
│ OutboxProcessor    │  ◄── 별도 프로세스 (500ms 폴링)
│ - Poll PENDING     │
│ - Publish to NATS  │
│ - Mark as SENT     │
└────────┬───────────┘
         │
         ▼
   ┌───────────┐
   │   NATS    │ → course-service (slot.reserve)
   └───────────┘
```

**OutboxEvent 모델:**
```prisma
model OutboxEvent {
  id          Int      @id @default(autoincrement())
  eventType   String   @map("event_type")      // "slot.reserve"
  aggregateId String   @map("aggregate_id")    // bookingId
  payload     Json                              // SlotReserveRequest
  status      String   @default("PENDING")     // PENDING → SENT
  createdAt   DateTime @default(now())
  processedAt DateTime?
  retryCount  Int      @default(0)
}
```

### 5.3 Idempotency Key Pattern

중복 예약 요청 방지:

```typescript
// booking.service.ts
async createBooking(dto: CreateBookingRequestDto): Promise<BookingResponseDto> {
  // 1. 멱등성 체크 - 이미 처리된 요청인지 확인
  const existingKey = await this.prisma.idempotencyKey.findUnique({
    where: { key: dto.idempotencyKey },
  });

  if (existingKey) {
    // 이미 처리된 요청 → 기존 결과 반환
    const existingBooking = await this.prisma.booking.findUnique({
      where: { id: existingKey.bookingId },
    });
    return this.toResponseDto(existingBooking);
  }

  // 2. 트랜잭션으로 예약 생성 + 멱등성 키 저장
  const booking = await this.prisma.$transaction(async (tx) => {
    const newBooking = await tx.booking.create({ ... });

    await tx.idempotencyKey.create({
      data: {
        key: dto.idempotencyKey,
        bookingId: newBooking.id,
      },
    });

    await tx.outboxEvent.create({ ... });

    return newBooking;
  });

  return this.toResponseDto(booking);
}
```

---

## 6. NATS Message Specifications

### 6.1 gameTimeSlots.get (Request)

**Request:**
```typescript
{
  timeSlotId: number;  // GameTimeSlot ID
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: number;
    gameId: number;
    gameName: string;
    gameCode: string;
    frontNineCourseName: string;
    backNineCourseName: string;
    clubName: string;
    date: string;           // "2025-01-15"
    startTime: string;      // "09:00"
    endTime: string;        // "12:00"
    maxPlayers: number;
    bookedPlayers: number;
    price: number;
    isPremium: boolean;
    status: string;         // "AVAILABLE" | "FULLY_BOOKED" | "CLOSED"
    isActive: boolean;
  }
}
```

### 6.2 games.get (Request)

**Request:**
```typescript
{
  gameId: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: number;
    name: string;
    code: string;
    description: string;
    frontNineCourseId: number;
    frontNineCourseName: string;
    backNineCourseId: number;
    backNineCourseName: string;
    totalHoles: number;
    estimatedDuration: number;
    breakDuration: number;
    maxPlayers: number;
    basePrice: number;
    weekendPrice: number;
    holidayPrice: number;
    clubId: number;
    clubName: string;
    isActive: boolean;
  }
}
```

### 6.3 gameTimeSlots.book (Event)

**Payload:**
```typescript
{
  timeSlotId: number;
  playerCount: number;
}
```

### 6.4 gameTimeSlots.release (Event)

**Payload:**
```typescript
{
  timeSlotId: number;
  playerCount: number;
}
```

### 6.5 booking.confirmed (Event)

**Payload:**
```typescript
{
  bookingId: number;
  bookingNumber: string;
  userId: number;
  gameId: number;
  gameName: string;
  frontNineCourseName: string;
  backNineCourseName: string;
  bookingDate: string;       // ISO format
  timeSlot: string;          // "09:00"
  playerCount: number;
  totalPrice: number;
  userEmail: string;
  userName: string;
}
```

---

## 7. Error Handling

### 7.1 Course-Service 장애 시

```typescript
private async fetchAndSyncSlotFromCourseService(gameTimeSlotId: number): Promise<any> {
  if (!this.courseServiceClient) {
    this.logger.error('COURSE_SERVICE client is not available');
    return null;  // 캐시 미스로 처리 → 예약 불가
  }

  try {
    const slotResponse = await firstValueFrom(
      this.courseServiceClient.send('gameTimeSlots.get', { timeSlotId: gameTimeSlotId })
    );
    // ...
  } catch (error) {
    this.logger.error(`Failed to fetch slot: ${error.message}`);
    return null;  // 예약 불가
  }
}
```

### 7.2 권장 개선사항

1. **Timeout 설정**: NATS 호출에 timeout 추가
2. **Circuit Breaker**: 연속 실패 시 빠른 실패 반환
3. **Fallback**: 캐시된 데이터 사용 (stale data 허용 시)

```typescript
// 권장 구현
const slotResponse = await firstValueFrom(
  this.courseServiceClient.send('gameTimeSlots.get', { timeSlotId }).pipe(
    timeout(5000),  // 5초 타임아웃
    retry(2),       // 2회 재시도
    catchError((err) => {
      this.logger.error(`Course service call failed: ${err.message}`);
      return of(null);  // null 반환으로 graceful 실패
    })
  )
);
```

---

## 8. Monitoring & Observability

### 8.1 Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `booking.created.count` | 생성된 예약 수 | - |
| `booking.cancelled.count` | 취소된 예약 수 | - |
| `cache.miss.rate` | 캐시 미스 비율 | > 10% |
| `course_service.latency` | course-service 호출 latency | > 500ms |
| `nats.publish.failures` | NATS 발행 실패 수 | > 0 |

### 8.2 Logging Best Practices

```typescript
// 중요 이벤트 로깅
this.logger.log(`Booking ${booking.bookingNumber} created successfully.`);
this.logger.log(`Slot cache miss for gameTimeSlotId: ${dto.gameTimeSlotId}`);
this.logger.log(`GameTimeSlotCache synced for gameTimeSlotId: ${slot.id}`);
this.logger.error(`Failed to create booking: ${error.message}`);
```

---

## 9. Configuration

### 9.1 Environment Variables

```env
# NATS Configuration
NATS_URL=nats://localhost:4222

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/booking

# Service Identification
SERVICE_NAME=booking-service
```

### 9.2 NATS Module Configuration

```typescript
// src/common/nats/nats.config.ts
export const NATS_CLIENT_OPTIONS: ClientsProviderAsyncOptions[] = [
  {
    name: 'COURSE_SERVICE',
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.NATS,
      options: {
        servers: [configService.get<string>('NATS_URL')],
      },
    }),
    inject: [ConfigService],
  },
  {
    name: 'NOTIFICATION_SERVICE',
    // ... similar config
  },
];
```

---

## 10. Future Improvements

### 10.1 Proactive Cache Sync

course-service에서 Game/GameTimeSlot 변경 시 자동으로 booking-service에 동기화:

```typescript
// course-service에 추가 필요
@EventPattern('games.created')
@EventPattern('games.updated')
async onGameChanged(data: GameData) {
  // booking-service로 sync 이벤트 발행
  this.natsClient.emit('booking.game.sync', data);
}

@EventPattern('gameTimeSlots.generated')
async onTimeSlotsGenerated(data: TimeSlotData[]) {
  for (const slot of data) {
    this.natsClient.emit('booking.gameTimeSlot.sync', slot);
  }
}
```

### 10.2 Transactional Outbox Pattern

이벤트 발행 보장을 위한 outbox 테이블 도입:

```prisma
model OutboxEvent {
  id          Int      @id @default(autoincrement())
  eventType   String   @map("event_type")
  payload     Json
  status      String   @default("PENDING")  // PENDING, SENT, FAILED
  createdAt   DateTime @default(now())
  processedAt DateTime?
  retryCount  Int      @default(0)
}
```

### 10.3 Cache Invalidation Strategy

캐시 유효 기간 및 갱신 정책:

```typescript
// 캐시 유효성 검사
const CACHE_TTL = 5 * 60 * 1000; // 5분

if (slotCache && Date.now() - slotCache.lastSyncAt.getTime() > CACHE_TTL) {
  // 캐시 만료 - 재동기화
  slotCache = await this.fetchAndSyncSlotFromCourseService(dto.gameTimeSlotId);
}
```

---

## Appendix: File Structure

```
services/booking-service/
├── src/
│   ├── booking/
│   │   ├── controller/
│   │   │   ├── booking.controller.ts      # NATS message handlers (booking.*)
│   │   │   └── booking-saga.controller.ts # Saga event handlers (slot.*)
│   │   ├── dto/
│   │   │   └── booking.dto.ts             # DTOs & Saga event types
│   │   ├── service/
│   │   │   ├── booking.service.ts         # Business logic & sync
│   │   │   ├── saga-handler.service.ts    # Saga state transitions
│   │   │   ├── outbox-processor.service.ts# Outbox polling & publishing
│   │   │   └── saga-scheduler.service.ts  # Timeout cleanup (@Cron)
│   │   └── booking.module.ts              # Module with ScheduleModule
│   ├── common/
│   │   ├── nats/
│   │   │   ├── nats.config.ts             # NATS client config
│   │   │   └── nats.module.ts             # NATS module
│   │   └── utils/
│   │       └── response.util.ts           # Response helpers
│   └── app.module.ts
├── prisma/
│   └── schema.prisma                      # Database schema (Saga models)
└── package.json                           # @nestjs/schedule dependency
```

### Prisma Schema (Saga 관련)

```prisma
// schema.prisma

enum BookingStatus {
  PENDING        // 생성됨, 슬롯 예약 대기 중
  SLOT_RESERVED  // 슬롯 예약 성공 (결제 대기용)
  CONFIRMED      // 예약 확정
  FAILED         // Saga 실패
  CANCELLED      // 사용자 취소
  COMPLETED      // 라운드 완료
  NO_SHOW        // 미출석
}

model Booking {
  id              Int           @id @default(autoincrement())
  bookingNumber   String        @unique
  status          BookingStatus @default(PENDING)
  idempotencyKey  String        @unique
  sagaFailReason  String?       @map("saga_fail_reason")
  // ... other fields
}

model OutboxEvent {
  id          Int       @id @default(autoincrement())
  eventType   String    @map("event_type")
  aggregateId String    @map("aggregate_id")
  payload     Json
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())
  processedAt DateTime? @map("processed_at")
  retryCount  Int       @default(0) @map("retry_count")
}

model IdempotencyKey {
  id        Int      @id @default(autoincrement())
  key       String   @unique
  bookingId Int      @map("booking_id")
  createdAt DateTime @default(now())
}
```

---

**Document Version**: 2.0.0
**Last Updated**: 2025-12-29
**Maintained By**: Platform Team
