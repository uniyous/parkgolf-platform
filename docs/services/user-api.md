# User API (BFF) - Architecture & API Reference

## Overview

user-api는 사용자 웹앱(user-webapp)을 위한 **Backend for Frontend (BFF)** 서비스입니다. 마이크로서비스들과 NATS를 통해 통신하며, 사용자에게 통합된 REST API를 제공합니다.

### Key Features (2025-12-29 Updated)
- **BFF Pattern**: 사용자 웹앱 전용 API Gateway
- **NATS Integration**: 모든 마이크로서비스와 NATS 통신
- **Saga Support**: booking-service Saga 패턴 지원 (idempotencyKey)
- **JWT Authentication**: auth-service 연동 인증

---

## 1. Service Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           user-webapp                                   │
│                          (React + Vite)                                 │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP (REST API)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            user-api (BFF)                               │
│                           NestJS :3092                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐              │
│  │ AuthModule    │  │ BookingModule │  │ GamesModule   │              │
│  │ ClubsModule   │  │ NotifyModule  │  │ ...           │              │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘              │
└──────────┼──────────────────┼──────────────────┼───────────────────────┘
           │                  │                  │
           │           NATS   │                  │
           ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  auth-service   │  │ booking-service │  │ course-service  │
│  (인증/인가)     │  │ (예약/Saga)      │  │ (코스/게임)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 2. API Endpoints

### 2.1 Authentication (`/api/user/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | 사용자 로그인 | No |
| POST | `/register` | 회원가입 | No |
| POST | `/refresh` | 토큰 갱신 | Yes (Refresh Token) |
| GET | `/me` | 현재 사용자 정보 | Yes |
| POST | `/logout` | 로그아웃 | Yes |

**Login Request/Response:**
```typescript
// POST /api/user/auth/login
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "phone": "010-1234-5678"
  }
}
```

### 2.2 Clubs (`/api/user/clubs`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | 클럽 목록 조회 | No |
| GET | `/:id` | 클럽 상세 조회 | No |

**List Clubs Response:**
```typescript
// GET /api/user/clubs
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "서울파크골프장",
      "location": "서울시 강남구",
      "description": "18홀 파크골프장",
      "facilities": ["주차장", "락커룸", "식당"],
      "operatingHours": "06:00-22:00",
      "contactPhone": "02-1234-5678",
      "imageUrl": "https://..."
    }
  ]
}
```

### 2.3 Games (`/api/user/games`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | 게임 목록 조회 | No |
| GET | `/:id` | 게임 상세 조회 | No |
| GET | `/:id/time-slots` | 게임 타임슬롯 조회 | No |
| GET | `/availability` | 가용 타임슬롯 검색 | No |

**Get Game Time Slots:**
```typescript
// GET /api/user/games/1/time-slots?date=2025-01-15
{
  "success": true,
  "data": [
    {
      "id": 1,
      "gameId": 1,
      "gameName": "A+B 코스",
      "date": "2025-01-15",
      "startTime": "09:00",
      "endTime": "12:00",
      "maxPlayers": 4,
      "bookedPlayers": 2,
      "availablePlayers": 2,
      "price": 30000,
      "isPremium": true,
      "status": "AVAILABLE"
    }
  ]
}
```

### 2.4 Bookings (`/api/user/bookings`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | 예약 생성 (Saga) | Yes |
| GET | `/` | 내 예약 목록 | Yes |
| GET | `/:id` | 예약 상세 조회 | Yes |
| PATCH | `/:id` | 예약 수정 | Yes |
| DELETE | `/:id` | 예약 취소 | Yes |

**Create Booking (Saga Pattern):**
```typescript
// POST /api/user/bookings
// Request
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",  // Optional (auto-generated if not provided)
  "gameId": 1,
  "gameTimeSlotId": 1,
  "bookingDate": "2025-01-15",
  "playerCount": 2,
  "paymentMethod": "card",
  "specialRequests": "카트 필요",
  "userEmail": "user@example.com",
  "userName": "홍길동",
  "userPhone": "010-1234-5678"
}

// Response (202 Accepted - Saga initiated)
{
  "success": true,
  "data": {
    "id": 1,
    "bookingNumber": "BK-20250115-A1B2",
    "status": "PENDING",          // Saga 진행 중
    "gameId": 1,
    "gameName": "A+B 코스",
    "bookingDate": "2025-01-15",
    "startTime": "09:00",
    "playerCount": 2,
    "pricePerPerson": 30000,
    "totalPrice": 60000,
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Booking Status Flow:**
```
PENDING → CONFIRMED (Saga 성공)
PENDING → FAILED (Saga 실패 - 슬롯 부족 등)
CONFIRMED → CANCELLED (사용자 취소)
CONFIRMED → COMPLETED (라운드 완료)
```

---

## 3. NATS Integration

### 3.1 Connected Services

| Service | NATS Client Name | Patterns |
|---------|------------------|----------|
| auth-service | `AUTH_SERVICE` | `auth.*`, `users.*` |
| booking-service | `BOOKING_SERVICE` | `booking.*` |
| course-service | `COURSE_SERVICE` | `clubs.*`, `games.*`, `gameTimeSlots.*` |
| notify-service | `NOTIFICATION_SERVICE` | `notification.*` |

### 3.2 NATS Client Configuration

```typescript
// src/common/nats/nats.config.ts
export const NATS_CLIENT_OPTIONS: ClientsProviderAsyncOptions[] = [
  {
    name: 'AUTH_SERVICE',
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
    name: 'BOOKING_SERVICE',
    // ... same config
  },
  {
    name: 'COURSE_SERVICE',
    // ... same config
  },
  {
    name: 'NOTIFICATION_SERVICE',
    // ... same config
  },
];
```

### 3.3 Service Communication Examples

```typescript
// booking.service.ts
@Injectable()
export class BookingService {
  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  async createBooking(dto: CreateBookingDto, user: UserPayload) {
    // Generate idempotency key if not provided
    const idempotencyKey = dto.idempotencyKey || randomUUID();

    const payload = {
      ...dto,
      idempotencyKey,
      userId: user.sub,
      userEmail: user.email,
      userName: user.name,
    };

    return firstValueFrom(
      this.bookingClient.send('booking.create', payload).pipe(
        timeout(30000),
        catchError((error) => {
          throw new HttpException(
            error.message || 'Booking service unavailable',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }),
      ),
    );
  }
}
```

---

## 4. Authentication

### 4.1 JWT Guard

```typescript
// src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await firstValueFrom(
        this.authClient.send('auth.validate', { token }).pipe(timeout(5000)),
      );
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### 4.2 Protected Routes

```typescript
// booking.controller.ts
@Controller('api/user/bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  @Post()
  async createBooking(
    @Body() dto: CreateBookingDto,
    @Request() req,
  ) {
    return this.bookingService.createBooking(dto, req.user);
  }

  @Get()
  async getMyBookings(@Request() req) {
    return this.bookingService.getBookingsByUserId(req.user.sub);
  }
}
```

---

## 5. Error Handling

### 5.1 Global Error Filter

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

### 5.2 Error Response Format

```typescript
// Error Response
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ],
    "timestamp": "2025-01-15T09:00:00.000Z"
  }
}
```

---

## 6. File Structure

```
services/user-api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── dto/
│   │       └── auth.dto.ts
│   ├── booking/
│   │   ├── booking.controller.ts
│   │   ├── booking.service.ts
│   │   ├── booking.module.ts
│   │   └── dto/
│   │       └── booking.dto.ts
│   ├── clubs/
│   │   ├── clubs.controller.ts
│   │   ├── clubs.service.ts
│   │   └── clubs.module.ts
│   ├── games/
│   │   ├── games.controller.ts
│   │   ├── games.service.ts
│   │   └── games.module.ts
│   ├── common/
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts
│   │   └── nats/
│   │       ├── nats.config.ts
│   │       └── nats.module.ts
│   ├── app.module.ts
│   └── main.ts
├── package.json
└── tsconfig.json
```

---

## 7. Environment Variables

```env
# Server
PORT=3092

# NATS
NATS_URL=nats://localhost:4222

# JWT (for local validation if needed)
JWT_SECRET=your-jwt-secret

# CORS
CORS_ORIGIN=http://localhost:3001

# Service Name
SERVICE_NAME=user-api
```

---

## 8. Swagger Documentation

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('Park Golf Platform - User API (BFF)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3092);
}
```

**Swagger UI URL:** `http://localhost:3092/api/docs`

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-29
**Maintained By**: Platform Team
