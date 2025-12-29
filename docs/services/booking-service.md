# Booking Service - Architecture & Data Synchronization

## Overview

booking-service는 파크골프 예약 관리를 담당하는 핵심 마이크로서비스입니다. course-service와 NATS를 통해 데이터를 동기화하며, 예약 생성/수정/취소 시 양방향 통신을 수행합니다.

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
| `bookings` | 예약 데이터 | booking-service (Primary) |
| `payments` | 결제 데이터 | booking-service (Primary) |
| `booking_history` | 예약 변경 이력 | booking-service (Primary) |
| `game_cache` | Game 정보 캐시 | course-service (Sync) |
| `game_time_slot_cache` | 타임슬롯 캐시 | course-service (Sync) |

---

## 2. NATS Message Patterns

### 2.1 Request-Reply (동기 통신)

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

### 2.2 Event Publishing (비동기 통신)

booking-service가 이벤트를 발행하는 패턴입니다.

| Pattern | Direction | Purpose | Payload |
|---------|-----------|---------|---------|
| `gameTimeSlots.book` | booking → course | 예약 완료 알림 | `{ timeSlotId, playerCount }` |
| `gameTimeSlots.release` | booking → course | 예약 취소 알림 | `{ timeSlotId, playerCount }` |
| `booking.confirmed` | booking → notification | 예약 확정 알림 | `BookingConfirmedEvent` |
| `booking.cancelled` | booking → notification | 예약 취소 알림 | `BookingCancelledEvent` |

### 2.3 Event Subscription (수신)

booking-service가 구독하는 이벤트입니다.

| Pattern | Direction | Purpose |
|---------|-----------|---------|
| `booking.game.sync` | course → booking | Game 정보 동기화 |
| `booking.gameTimeSlot.sync` | course → booking | 타임슬롯 동기화 |

---

## 3. Data Synchronization Flow

### 3.1 예약 생성 Flow

```
┌──────────┐    ┌─────────────┐    ┌──────────────────┐    ┌────────────────┐
│  Client  │    │  user-api   │    │ booking-service  │    │ course-service │
└────┬─────┘    └──────┬──────┘    └────────┬─────────┘    └───────┬────────┘
     │                 │                     │                      │
     │ POST /bookings  │                     │                      │
     │────────────────>│                     │                      │
     │                 │                     │                      │
     │                 │ booking.create      │                      │
     │                 │ (NATS send)         │                      │
     │                 │────────────────────>│                      │
     │                 │                     │                      │
     │                 │                     │ [1] Check local cache│
     │                 │                     │────────┐             │
     │                 │                     │        │             │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │                     │ [2] Cache MISS?      │
     │                 │                     │ gameTimeSlots.get    │
     │                 │                     │─────────────────────>│
     │                 │                     │                      │
     │                 │                     │ [3] Slot data        │
     │                 │                     │<─────────────────────│
     │                 │                     │                      │
     │                 │                     │ [4] games.get        │
     │                 │                     │─────────────────────>│
     │                 │                     │                      │
     │                 │                     │ [5] Game data        │
     │                 │                     │<─────────────────────│
     │                 │                     │                      │
     │                 │                     │ [6] Sync to cache    │
     │                 │                     │────────┐             │
     │                 │                     │        │ upsert      │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │                     │ [7] Create booking   │
     │                 │                     │ (Transaction)        │
     │                 │                     │────────┐             │
     │                 │                     │        │             │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │                     │ [8] Update cache     │
     │                 │                     │ (bookedPlayers++)    │
     │                 │                     │────────┐             │
     │                 │                     │        │             │
     │                 │                     │<───────┘             │
     │                 │                     │                      │
     │                 │                     │ [9] gameTimeSlots.book│
     │                 │                     │ (emit event)         │
     │                 │                     │─────────────────────>│
     │                 │                     │                      │
     │                 │                     │ [10] booking.confirmed│
     │                 │                     │ (emit to notification)│
     │                 │                     │─────────────────────>│ notification-service
     │                 │                     │                      │
     │                 │ Booking response    │                      │
     │                 │<────────────────────│                      │
     │                 │                     │                      │
     │ Success         │                     │                      │
     │<────────────────│                     │                      │
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

### 5.1 Optimistic Locking with SELECT FOR UPDATE

동시 예약 시 race condition을 방지합니다.

```typescript
const booking = await this.prisma.$transaction(async (prisma) => {
  // SELECT FOR UPDATE로 Row Lock
  const slotLock = await prisma.$queryRaw<Array<{id: number, available_players: number}>>`
    SELECT id, "availablePlayers" as available_players
    FROM "game_time_slot_cache"
    WHERE "gameTimeSlotId" = ${dto.gameTimeSlotId}
    FOR UPDATE
  `;

  // 다시 확인
  if (slotLock.length === 0 || slotLock[0].available_players < dto.playerCount) {
    throw new HttpException(
      'Selected time slot is no longer available',
      HttpStatus.CONFLICT
    );
  }

  // 예약 생성
  const newBooking = await prisma.booking.create({ ... });

  // 캐시 업데이트
  await prisma.gameTimeSlotCache.update({ ... });

  return newBooking;
});
```

### 5.2 Dual Write Problem

예약 생성 시 booking-service와 course-service 모두 데이터를 업데이트합니다.

**현재 구현:**
1. booking-service: `GameTimeSlotCache` 업데이트 (Transaction 내)
2. booking-service → course-service: `gameTimeSlots.book` 이벤트 발행
3. course-service: `GameTimeSlot.bookedPlayers` 업데이트

**잠재적 문제:**
- 이벤트 발행 실패 시 course-service와 불일치 발생
- 네트워크 장애로 이벤트 유실 가능

**해결 방안 (Transactional Outbox Pattern):**
```
┌──────────────────────────────────────────────────┐
│                  Transaction                      │
│  ┌──────────────┐  ┌─────────────────────────┐   │
│  │ Create       │  │ Insert into             │   │
│  │ Booking      │  │ outbox_events           │   │
│  └──────────────┘  └─────────────────────────┘   │
└──────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│ Outbox Processor │  ◄── 별도 프로세스
│ (Polling)        │
└────────┬─────────┘
         │
         ▼
   ┌───────────┐
   │   NATS    │
   └───────────┘
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
│   │   │   └── booking.controller.ts    # NATS message handlers
│   │   ├── dto/
│   │   │   └── booking.dto.ts           # DTOs & Event types
│   │   └── service/
│   │       └── booking.service.ts       # Business logic & sync
│   ├── common/
│   │   ├── nats/
│   │   │   ├── nats.config.ts           # NATS client config
│   │   │   └── nats.module.ts           # NATS module
│   │   └── utils/
│   │       └── response.util.ts         # Response helpers
│   └── app.module.ts
├── prisma/
│   └── schema.prisma                    # Database schema
└── package.json
```
