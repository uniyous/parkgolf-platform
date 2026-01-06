# Admin API (BFF) - Architecture & API Reference

## Overview

admin-api는 관리자 대시보드(admin-dashboard)를 위한 **Backend for Frontend (BFF)** 서비스입니다. 마이크로서비스들과 NATS를 통해 통신하며, 관리자에게 통합된 REST API를 제공합니다. RBAC 기반 권한 관리를 지원합니다.

### Key Features
- **BFF Pattern**: 관리자 대시보드 전용 API Gateway
- **NATS Integration**: 모든 마이크로서비스와 NATS 통신
- **RBAC Authorization**: 40+ 권한 기반 접근 제어
- **JWT Authentication**: admin 전용 인증 플로우

---

## 1. Service Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         admin-dashboard                                 │
│                        (React + Redux)                                  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP (REST API)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           admin-api (BFF)                               │
│                          NestJS :3091                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐              │
│  │ AuthModule    │  │ CompanyModule │  │ ClubModule    │              │
│  │ CourseModule  │  │ GameModule    │  │ BookingModule │              │
│  │ UserModule    │  │ StatsModule   │  │ ...           │              │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘              │
└──────────┼──────────────────┼──────────────────┼───────────────────────┘
           │                  │                  │
           │           NATS   │                  │
           ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  auth-service   │  │ course-service  │  │ booking-service │
│  (인증/인가)     │  │ (코스/게임)      │  │ (예약)           │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 2. API Endpoints

### 2.1 Authentication (`/api/admin/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | 관리자 로그인 | No |
| POST | `/refresh` | 토큰 갱신 | Yes (Refresh Token) |
| GET | `/me` | 현재 관리자 정보 | Yes |
| POST | `/logout` | 로그아웃 | Yes |

**Admin Login:**
```typescript
// POST /api/admin/auth/login
// Request
{
  "email": "admin@parkgolf.com",
  "password": "admin123"
}

// Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": 1,
    "email": "admin@parkgolf.com",
    "name": "관리자",
    "roleMaster": {
      "id": 1,
      "name": "PLATFORM_ADMIN",
      "permissions": ["users.read", "users.write", "courses.manage", ...]
    }
  }
}
```

### 2.2 Companies (`/api/admin/companies`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | 회사 목록 | `companies.read` |
| GET | `/:id` | 회사 상세 | `companies.read` |
| POST | `/` | 회사 생성 | `companies.write` |
| PATCH | `/:id` | 회사 수정 | `companies.write` |
| DELETE | `/:id` | 회사 삭제 | `companies.delete` |

### 2.3 Clubs (`/api/admin/clubs`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | 클럽 목록 | `clubs.read` |
| GET | `/:id` | 클럽 상세 | `clubs.read` |
| POST | `/` | 클럽 생성 | `clubs.write` |
| PATCH | `/:id` | 클럽 수정 | `clubs.write` |
| DELETE | `/:id` | 클럽 삭제 | `clubs.delete` |

### 2.4 Courses (`/api/admin/courses`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | 코스 목록 | `courses.read` |
| GET | `/:id` | 코스 상세 | `courses.read` |
| POST | `/` | 코스 생성 | `courses.write` |
| PATCH | `/:id` | 코스 수정 | `courses.write` |
| DELETE | `/:id` | 코스 삭제 | `courses.delete` |

### 2.5 Games (`/api/admin/games`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | 게임 목록 | `games.read` |
| GET | `/:id` | 게임 상세 | `games.read` |
| POST | `/` | 게임 생성 | `games.write` |
| PATCH | `/:id` | 게임 수정 | `games.write` |
| DELETE | `/:id` | 게임 삭제 | `games.delete` |
| POST | `/:id/time-slots/generate` | 타임슬롯 생성 | `games.manage` |

**Generate Time Slots:**
```typescript
// POST /api/admin/games/1/time-slots/generate
// Request
{
  "startDate": "2025-01-15",
  "endDate": "2025-01-31",
  "startTime": "09:00",
  "endTime": "18:00",
  "intervalMinutes": 10
}

// Response
{
  "success": true,
  "data": {
    "generatedCount": 170,
    "message": "170 time slots generated for game 1"
  }
}
```

### 2.6 Bookings (`/api/admin/bookings`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | 예약 목록 | `bookings.read` |
| GET | `/:id` | 예약 상세 | `bookings.read` |
| PATCH | `/:id` | 예약 수정 | `bookings.write` |
| DELETE | `/:id` | 예약 취소 | `bookings.cancel` |
| GET | `/stats` | 예약 통계 | `bookings.stats` |

**Booking List with Filters:**
```typescript
// GET /api/admin/bookings?status=CONFIRMED&startDate=2025-01-01&endDate=2025-01-31&page=1&limit=20
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "bookingNumber": "BK-20250115-A1B2",
        "status": "CONFIRMED",
        "userName": "홍길동",
        "userEmail": "user@example.com",
        "gameName": "A+B 코스",
        "bookingDate": "2025-01-15",
        "startTime": "09:00",
        "playerCount": 2,
        "totalPrice": 60000,
        "createdAt": "2025-01-10T10:00:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### 2.7 Users (`/api/admin/users`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | 사용자 목록 | `users.read` |
| GET | `/:id` | 사용자 상세 | `users.read` |
| PATCH | `/:id` | 사용자 수정 | `users.write` |
| DELETE | `/:id` | 사용자 비활성화 | `users.delete` |

### 2.8 Admin Management (`/api/admin/admins`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | 관리자 목록 | `admins.read` |
| POST | `/` | 관리자 생성 | `admins.write` |
| PATCH | `/:id` | 관리자 수정 | `admins.write` |
| DELETE | `/:id` | 관리자 삭제 | `admins.delete` |
| GET | `/roles` | 역할 목록 | `roles.read` |

---

## 3. RBAC (Role-Based Access Control)

### 3.1 Role Hierarchy

```
PLATFORM_ADMIN (플랫폼 관리자)
    └── COMPANY_ADMIN (회사 관리자)
        └── CLUB_MANAGER (클럽 매니저)
            └── STAFF (스태프)
                └── USER (일반 사용자)
```

### 3.2 Permission Categories

| Category | Permissions |
|----------|-------------|
| `companies` | `read`, `write`, `delete` |
| `clubs` | `read`, `write`, `delete`, `manage` |
| `courses` | `read`, `write`, `delete`, `manage` |
| `games` | `read`, `write`, `delete`, `manage` |
| `bookings` | `read`, `write`, `cancel`, `stats` |
| `users` | `read`, `write`, `delete` |
| `admins` | `read`, `write`, `delete` |
| `roles` | `read`, `write`, `delete` |
| `system` | `settings`, `logs`, `backup` |

### 3.3 Permission Guard

```typescript
// src/common/guards/permission.guard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const admin = request.user;

    return requiredPermissions.every((permission) =>
      admin.roleMaster.permissions.includes(permission),
    );
  }
}
```

### 3.4 Permission Decorator Usage

```typescript
@Controller('api/admin/companies')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CompanyController {
  @Get()
  @Permissions('companies.read')
  async findAll() {
    return this.companyService.findAll();
  }

  @Post()
  @Permissions('companies.write')
  async create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Delete(':id')
  @Permissions('companies.delete')
  async delete(@Param('id') id: string) {
    return this.companyService.delete(+id);
  }
}
```

---

## 4. NATS Integration

### 4.1 Connected Services

| Service | NATS Client Name | Patterns |
|---------|------------------|----------|
| auth-service | `AUTH_SERVICE` | `auth.admin.*`, `admins.*`, `roles.*` |
| course-service | `COURSE_SERVICE` | `companies.*`, `clubs.*`, `courses.*`, `games.*` |
| booking-service | `BOOKING_SERVICE` | `booking.*` |
| notify-service | `NOTIFICATION_SERVICE` | `notification.*` |

### 4.2 Service Communication

```typescript
// games.service.ts
@Injectable()
export class GamesService {
  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  async generateTimeSlots(gameId: number, dto: GenerateTimeSlotsDto) {
    return firstValueFrom(
      this.courseClient.send('gameTimeSlots.generate', {
        gameId,
        ...dto,
      }).pipe(timeout(30000)),
    );
  }
}
```

---

## 5. File Structure

```
services/admin-api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── companies/
│   │   ├── companies.controller.ts
│   │   ├── companies.service.ts
│   │   └── companies.module.ts
│   ├── clubs/
│   │   ├── clubs.controller.ts
│   │   ├── clubs.service.ts
│   │   └── clubs.module.ts
│   ├── courses/
│   │   ├── courses.controller.ts
│   │   ├── courses.service.ts
│   │   └── courses.module.ts
│   ├── games/
│   │   ├── games.controller.ts
│   │   ├── games.service.ts
│   │   └── games.module.ts
│   ├── bookings/
│   │   ├── bookings.controller.ts
│   │   ├── bookings.service.ts
│   │   └── bookings.module.ts
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── admins/
│   │   ├── admins.controller.ts
│   │   ├── admins.service.ts
│   │   └── admins.module.ts
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── permission.guard.ts
│   │   ├── decorators/
│   │   │   └── permissions.decorator.ts
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

## 6. Environment Variables

```env
# Server
PORT=3091

# NATS
NATS_URL=nats://localhost:4222

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Service Name
SERVICE_NAME=admin-api
```

---

## 7. Swagger Documentation

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Admin API')
    .setDescription('Park Golf Platform - Admin API (BFF)')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('companies', 'Company management')
    .addTag('clubs', 'Club management')
    .addTag('courses', 'Course management')
    .addTag('games', 'Game management')
    .addTag('bookings', 'Booking management')
    .addTag('users', 'User management')
    .addTag('admins', 'Admin management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3091);
}
```

**Swagger UI URL:** `http://localhost:3091/api/docs`

---

## 8. Activity Logging

```typescript
// Admin activity logging via auth-service
@Injectable()
export class AdminActivityLogger {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async logActivity(
    adminId: number,
    action: string,
    resource: string,
    resourceId: string,
    details?: Record<string, any>,
  ) {
    this.authClient.emit('admin.activity.log', {
      adminId,
      action,
      resource,
      resourceId,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-29
**Maintained By**: Platform Team
