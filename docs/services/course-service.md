# Course Service - Architecture & Saga Integration

## Overview

course-service는 파크골프장의 코스, 게임, 타임슬롯 관리를 담당하는 핵심 마이크로서비스입니다. **NATS-only 통신**으로 설계되어 HTTP는 health check에만 사용됩니다. **Saga 패턴**에서 booking-service와 협력하여 슬롯 예약/해제를 처리합니다.

### Key Features (2025-12-29 Updated)
- **NATS-only Communication**: HTTP는 health check에만 사용
- **Game-based Scheduling**: 18홀 코스 조합(Game) 기반 타임슬롯 관리
- **Saga Integration**: slot.reserve/slot.release 요청 처리
- **Optimistic Locking**: GameTimeSlot.version으로 동시성 제어

---

## 1. Domain Structure

### 1.1 Entity Hierarchy

```
Company (골프장 운영 회사)
    └── Club (골프장)
        ├── Course (9홀 코스)
        │   ├── Hole (홀 정보)
        │   └── TeeBox (티박스/난이도별)
        └── Game (18홀 코스 조합 = 전반 9홀 + 후반 9홀)
            └── GameTimeSlot (타임슬롯 - Saga 대상)
```

### 1.2 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `companies` | 골프장 운영 회사 | name, businessNumber |
| `clubs` | 골프장 (실제 장소) | name, location, facilities |
| `courses` | 9홀 코스 | name, holes, totalPar |
| `holes` | 홀 정보 | par, distance, handicap |
| `tee_boxes` | 티박스 (난이도별) | name, color, yardage |
| `games` | 18홀 조합 | frontNineCourse + backNineCourse |
| `game_time_slots` | 예약 가능 타임슬롯 | date, startTime, maxPlayers, bookedPlayers, **version** |

---

## 2. NATS Message Patterns

### 2.1 Saga Patterns (Choreography)

booking-service의 Saga 요청을 처리:

| Pattern | Direction | Handler | Purpose |
|---------|-----------|---------|---------|
| `slot.reserve` | booking → course | `GameSagaController` | 슬롯 예약 요청 처리 |
| `slot.release` | booking → course | `GameSagaController` | 슬롯 해제 요청 처리 |

**Emitted Events:**

| Pattern | Direction | Purpose |
|---------|-----------|---------|
| `slot.reserved` | course → booking | 슬롯 예약 성공 알림 |
| `slot.reserve.failed` | course → booking | 슬롯 예약 실패 알림 |

### 2.2 Request-Reply Patterns (Admin API / User API)

| Pattern | Direction | Purpose |
|---------|-----------|---------|
| `companies.*` | BFF → course | 회사 CRUD |
| `clubs.*` | BFF → course | 클럽 CRUD |
| `courses.*` | BFF → course | 코스 CRUD |
| `games.*` | BFF → course | 게임 CRUD |
| `gameTimeSlots.*` | BFF → course | 타임슬롯 관리 |

### 2.3 Sync Events (to booking-service)

| Pattern | Direction | Purpose |
|---------|-----------|---------|
| `booking.game.sync` | course → booking | Game 정보 캐시 동기화 |
| `booking.gameTimeSlot.sync` | course → booking | 타임슬롯 캐시 동기화 |

---

## 3. Saga Integration

### 3.1 GameSagaController

```typescript
// src/game/controller/game-saga.controller.ts

@Controller()
export class GameSagaController {
  constructor(
    private readonly gameTimeSlotService: GameTimeSlotService,
    @Inject('BOOKING_SERVICE') private readonly bookingServiceClient: ClientProxy,
  ) {}

  @MessagePattern('slot.reserve')
  async handleSlotReserve(
    @Payload() data: { bookingId: number; gameTimeSlotId: number; playerCount: number }
  ) {
    const result = await this.gameTimeSlotService.reserveSlotForSaga(
      data.gameTimeSlotId,
      data.playerCount,
      data.bookingId,
    );

    if (result.success) {
      // 성공 이벤트 발행
      this.bookingServiceClient.emit('slot.reserved', {
        bookingId: data.bookingId,
        gameTimeSlotId: data.gameTimeSlotId,
        playerCount: data.playerCount,
        reservedAt: new Date().toISOString(),
      });
    } else {
      // 실패 이벤트 발행
      this.bookingServiceClient.emit('slot.reserve.failed', {
        bookingId: data.bookingId,
        gameTimeSlotId: data.gameTimeSlotId,
        reason: result.reason,
        failedAt: new Date().toISOString(),
      });
    }
  }

  @MessagePattern('slot.release')
  async handleSlotRelease(
    @Payload() data: { bookingId: number; gameTimeSlotId: number; playerCount: number }
  ) {
    await this.gameTimeSlotService.releaseSlotForSaga(
      data.gameTimeSlotId,
      data.playerCount,
      data.bookingId,
    );
  }
}
```

### 3.2 Optimistic Locking

```typescript
// src/game/service/game-time-slot.service.ts

async reserveSlotForSaga(
  timeSlotId: number,
  playerCount: number,
  bookingId: number,
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
          return { success: false, reason: `Not enough available slots. Available: ${availablePlayers}` };
        }

        // Optimistic locking with version check
        const updatedSlot = await tx.gameTimeSlot.updateMany({
          where: {
            id: timeSlotId,
            version: slot.version,
          },
          data: {
            bookedPlayers: slot.bookedPlayers + playerCount,
            version: slot.version + 1,
          },
        });

        if (updatedSlot.count === 0) {
          throw new ConflictException('Concurrent modification detected');
        }

        this.logger.log(`Saga: Reserved ${playerCount} players for slot ${timeSlotId}, booking ${bookingId}`);
        return { success: true };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(`Saga: Retry ${attempt}/${MAX_RETRY} for slot ${timeSlotId} due to concurrent modification`);
        if (attempt === MAX_RETRY) {
          return { success: false, reason: 'Concurrent modification - max retries exceeded' };
        }
        await new Promise(resolve => setTimeout(resolve, 50 * attempt)); // exponential backoff
      } else {
        throw error;
      }
    }
  }

  return { success: false, reason: 'Unknown error' };
}
```

### 3.3 Slot Release (Compensation Transaction)

```typescript
async releaseSlotForSaga(
  timeSlotId: number,
  playerCount: number,
  bookingId: number,
): Promise<void> {
  await this.prisma.gameTimeSlot.update({
    where: { id: timeSlotId },
    data: {
      bookedPlayers: {
        decrement: playerCount,
      },
      version: {
        increment: 1,
      },
    },
  });

  this.logger.log(`Saga: Released ${playerCount} players for slot ${timeSlotId}, booking ${bookingId}`);
}
```

---

## 4. Game Management

### 4.1 Game Entity

Game은 18홀 라운드를 위한 코스 조합입니다:

```typescript
interface Game {
  id: number;
  code: string;           // "A+B", "B+C" 등
  name: string;           // "A+B 코스"
  description?: string;

  // 18홀 구성 (전반 9홀 + 후반 9홀)
  frontNineCourseId: number;  // 전반 9홀
  backNineCourseId: number;   // 후반 9홀

  // 플레이 정보
  totalHoles: number;         // 18
  estimatedDuration: number;  // 분 (예: 180)
  breakDuration: number;      // 중간 휴식 시간 (분)
  maxPlayers: number;         // 조당 최대 인원 (예: 4)

  // 가격 정책
  basePrice: number;          // 평일 기본가
  weekendPrice: number;       // 주말가
  holidayPrice: number;       // 공휴일가

  clubId: number;
  isActive: boolean;
}
```

### 4.2 GameTimeSlot Entity

```typescript
interface GameTimeSlot {
  id: number;
  gameId: number;
  date: Date;              // 예약 날짜
  startTime: string;       // "09:00"
  endTime: string;         // "12:00"
  maxPlayers: number;      // 최대 예약 가능 인원
  bookedPlayers: number;   // 현재 예약된 인원
  price: number;           // 해당 슬롯 가격
  isPremium: boolean;      // 프리미엄 시간대 여부
  status: string;          // AVAILABLE, FULLY_BOOKED, CLOSED
  version: number;         // Optimistic locking
}
```

---

## 5. TimeSlot Generation

### 5.1 Auto-generation Logic

```typescript
async generateTimeSlots(
  gameId: number,
  startDate: Date,
  endDate: Date,
  startTime: string = '09:00',
  endTime: string = '18:00',
  intervalMinutes: number = 10,
): Promise<GameTimeSlot[]> {
  const game = await this.prisma.game.findUnique({
    where: { id: gameId },
    include: { club: true },
  });

  const slots: Prisma.GameTimeSlotCreateManyInput[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const isWeekend = [0, 6].includes(currentDate.getDay());
    const price = isWeekend ? game.weekendPrice : game.basePrice;

    let currentTime = startTime;
    while (currentTime < endTime) {
      const slotEndTime = this.addMinutes(currentTime, game.estimatedDuration);

      slots.push({
        gameId,
        date: currentDate,
        startTime: currentTime,
        endTime: slotEndTime,
        maxPlayers: game.maxPlayers,
        bookedPlayers: 0,
        price,
        isPremium: this.isPremiumTime(currentTime),
        status: 'AVAILABLE',
        version: 1,
      });

      currentTime = this.addMinutes(currentTime, intervalMinutes);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  await this.prisma.gameTimeSlot.createMany({ data: slots });
  return slots;
}

private isPremiumTime(time: string): boolean {
  const hour = parseInt(time.split(':')[0]);
  return hour >= 7 && hour <= 10; // 07:00-10:59 프리미엄
}
```

---

## 6. File Structure

```
services/course-service/
├── src/
│   ├── company/
│   │   ├── controller/
│   │   │   └── company-nats.controller.ts
│   │   ├── dto/
│   │   │   └── company.dto.ts
│   │   └── service/
│   │       └── company.service.ts
│   ├── club/
│   │   ├── controller/
│   │   │   └── club-nats.controller.ts
│   │   ├── dto/
│   │   │   └── club.dto.ts
│   │   └── service/
│   │       └── club.service.ts
│   ├── course/
│   │   ├── controller/
│   │   │   └── course-nats.controller.ts
│   │   ├── dto/
│   │   │   └── course.dto.ts
│   │   └── service/
│   │       └── course.service.ts
│   ├── game/
│   │   ├── controller/
│   │   │   ├── game-nats.controller.ts       # Game CRUD
│   │   │   └── game-saga.controller.ts       # Saga handlers
│   │   ├── dto/
│   │   │   └── game.dto.ts
│   │   └── service/
│   │       ├── game.service.ts
│   │       └── game-time-slot.service.ts     # Saga methods
│   ├── common/
│   │   ├── nats/
│   │   │   ├── nats.config.ts
│   │   │   └── nats.module.ts
│   │   └── prisma/
│   │       └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts                               # HTTP health + NATS
├── prisma/
│   └── schema.prisma
└── package.json
```

---

## 7. Prisma Schema (Saga 관련)

```prisma
model GameTimeSlot {
  id            Int      @id @default(autoincrement())
  gameId        Int      @map("game_id")
  date          DateTime
  startTime     String   @map("start_time")
  endTime       String   @map("end_time")
  maxPlayers    Int      @map("max_players")
  bookedPlayers Int      @default(0) @map("booked_players")
  price         Decimal  @db.Decimal(10, 2)
  isPremium     Boolean  @default(false) @map("is_premium")
  status        String   @default("AVAILABLE")
  version       Int      @default(1)  // Optimistic locking
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  game Game @relation(fields: [gameId], references: [id])

  @@index([gameId, date])
  @@index([date, status])
  @@map("game_time_slots")
}
```

---

## 8. Health Check & Cloud Run

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Health check endpoint (Cloud Run 필수)
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'course-service' });
  });

  // HTTP 서버 시작 (Cloud Run은 HTTP 필요)
  await app.listen(process.env.PORT || 8080);

  // NATS 연결 (비동기)
  const microservice = app.connectMicroservice({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL],
    },
  });

  await app.startAllMicroservices();
  console.log('Course service is running with NATS microservice');
}
```

---

## 9. NATS Client Configuration

```typescript
// src/common/nats/nats.config.ts
export const NATS_CLIENT_OPTIONS: ClientsProviderAsyncOptions[] = [
  {
    name: 'BOOKING_SERVICE',
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.NATS,
      options: {
        servers: [configService.get<string>('NATS_URL')],
      },
    }),
    inject: [ConfigService],
  },
];
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-29
**Maintained By**: Platform Team
