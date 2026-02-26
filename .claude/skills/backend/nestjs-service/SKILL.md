---
name: nestjs-service
description: NestJS 백엔드 서비스 개발 가이드. BFF 패턴, NATS 메시징, 예외 처리, DTO 검증, Health Check, Dockerfile 등 백엔드 전체 규칙. 트리거 키워드 - NestJS, 백엔드, backend, NATS, 마이크로서비스, BFF, API, 서비스
---

# NestJS Backend Service Guide

Park Golf Platform 백엔드 서비스 개발 가이드

---

## 1. 아키텍처

```
Frontend → BFF (REST) → NATS → Microservice (Prisma)
```

### 서비스 목록

| 서비스 | 타입 | 역할 | DB |
|--------|------|------|-----|
| admin-api | BFF | 관리자 REST API → NATS 브릿지 | - |
| user-api | BFF | 사용자 REST API → NATS 브릿지 | - |
| chat-gateway | Gateway | WebSocket 서버 (Socket.IO) | - |
| iam-service | Microservice | 인증/사용자/친구/회사멤버 | iam_db |
| course-service | Microservice | 골프장/코스/게임/타임슬롯 | course_db |
| booking-service | Microservice | 예약/Saga/정책 | booking_db |
| payment-service | Microservice | 결제 (Toss Payments) | payment_db |
| chat-service | Microservice | 채팅 | chat_db |
| notify-service | Microservice | 알림 | notify_db |
| agent-service | Microservice | AI 에이전트 (DeepSeek) | - |
| job-service | Microservice | 스케줄링 작업 | - |
| location-service | Microservice | 위치 (카카오 로컬 API) | - |
| weather-service | Microservice | 날씨 (기상청 API) | - |

---

## 2. 서비스 폴더 구조

### Microservice 표준 레이아웃

```
{service-name}/
├── src/
│   ├── main.ts                              # 앱 부트스트랩
│   ├── app.module.ts                        # 루트 모듈
│   ├── common/
│   │   ├── exceptions/
│   │   │   ├── app.exception.ts             # 커스텀 예외 클래스
│   │   │   ├── unified-exception.filter.ts  # 통합 예외 필터
│   │   │   ├── catalog/error-catalog.ts     # 에러 코드 정의
│   │   │   └── index.ts
│   │   ├── types/response.types.ts          # NatsResponse 헬퍼
│   │   ├── controllers/health.controller.ts # Health Check
│   │   └── nats/                            # NATS 클라이언트 설정
│   └── {domain}/
│       ├── {domain}.module.ts
│       ├── controller/{domain}-nats.controller.ts
│       ├── service/{domain}.service.ts
│       └── dto/{domain}.dto.ts
├── test/
│   ├── jest-e2e.json
│   └── integration/
├── Dockerfile
├── .dockerignore
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── .env.example
└── .env                                     # 로컬 개발용 (git 미포함)
```

### BFF 레이아웃 (admin-api, user-api)

```
{bff-name}/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── nats/nats-client.module.ts       # NATS 클라이언트
│   │   ├── nats/nats-client.service.ts      # send/emit 래퍼
│   │   ├── guards/                          # JWT, Role 가드
│   │   └── decorators/                      # @CurrentUser 등
│   └── {domain}/
│       ├── {domain}.module.ts
│       ├── controller/{domain}.controller.ts  # REST Controller
│       └── service/{domain}.service.ts        # NATS 요청 전송
├── Dockerfile
└── ...
```

---

## 3. 부트스트랩 (main.ts)

```typescript
// 1. Global exception filter (HTTP + RPC 모두 처리)
app.useGlobalFilters(new UnifiedExceptionFilter());

// 2. Global validation pipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
}));

// 3. NATS 연결 시 inheritAppConfig 필수 (필터/파이프 상속)
app.connectMicroservice<MicroserviceOptions>(
  { transport: Transport.NATS, options: { ... } },
  { inheritAppConfig: true },
);
```

---

## 4. BFF 패턴 (admin-api, user-api)

BFF는 REST → NATS 브릿지 역할만 수행. **응답을 절대 변환/언래핑하지 않는다.**

```typescript
// Controller: REST 엔드포인트
@Controller('api/admin/games')
export class GamesController {
  @Get()
  async getGames(@Query() filters: GameFilterDto) {
    return this.gamesService.getGames(filters);
  }
}

// Service: NATS 요청 전송 (응답 그대로 반환)
@Injectable()
export class GamesService {
  async getGames(filters: GameFilterDto) {
    return this.natsClient.send('games.list', filters);
  }
}
```

### NATS 클라이언트 설정

- **user-api**: 단일 `NATS_CLIENT` 사용
- **admin-api**: 단일 `NATS_CLIENT` 사용
- **course-service 등**: 다른 서비스 호출 시 named client 사용 (`BOOKING_SERVICE`, `LOCATION_SERVICE` 등)

---

## 5. Microservice 패턴 (*-service)

```typescript
// NATS Controller: 메시지 핸들러 (try-catch 불필요 - UnifiedExceptionFilter가 처리)
@Controller()
export class GameNatsController {
  @MessagePattern('games.list')
  async getGames(@Payload() data: GameFilterDto) {
    const result = await this.gameService.findAll(data);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
  }

  @MessagePattern('games.get')
  async getGame(@Payload() data: GetGameDto) {
    const game = await this.gameService.findOne(data.id);
    return NatsResponse.success(game);
  }

  @MessagePattern('games.delete')
  async deleteGame(@Payload() data: DeleteGameDto) {
    await this.gameService.remove(data.id);
    return NatsResponse.deleted('게임이 삭제되었습니다');
  }
}
```

---

## 6. API 응답 형식

**모든 API 응답은 반드시 아래 형식을 따른다.**

```typescript
// 단일 데이터 응답
{ success: true, data: T }

// 목록 응답 (페이지네이션)
{
  success: true,
  data: T[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}

// 삭제 응답
{ success: true, message: string }

// 에러 응답
{ success: false, error: { code: string, message: string }, timestamp: string }
```

### NatsResponse 헬퍼

```typescript
NatsResponse.success(data)                         // → { success: true, data }
NatsResponse.paginated(data, total, page, limit)   // → { success: true, data, total, page, limit, totalPages }
NatsResponse.deleted('메시지')                      // → { success: true, message }
```

### 타입 가드 (UnifiedExceptionFilter 내부용)

```typescript
NatsResponse.isWrapped(obj)     // success 필드 존재 여부
NatsResponse.isPaginated(obj)   // total, page, limit 필드 존재 여부
NatsResponse.hasData(obj)       // data 필드 존재 여부
```

---

## 7. 예외 처리

### UnifiedExceptionFilter 동작 흐름

```
Service에서 AppException throw
    ↓
UnifiedExceptionFilter.catch() (자동)
    ↓
컨텍스트 판별: HTTP → JSON 응답 / RPC → RpcException 변환
    ↓
BFF가 { success: false, error: { code, message }, timestamp } 수신
```

### AppException 사용법

```typescript
// ErrorDef 기반
throw new AppException(Errors.Booking.NOT_FOUND);

// 커스텀 메시지
throw new AppException(Errors.Booking.SLOT_TAKEN, '14:00 슬롯은 이미 예약됨');

// 주요 메서드
exception.getCode();         // → 'BOOK_001'
exception.getErrorMessage(); // → 커스텀 메시지 || ErrorDef.message
exception.toRpcError();      // → { success, error: { code, message }, timestamp }
```

### 처리되는 예외 유형

| 예외 | 처리 방식 |
|------|----------|
| AppException | `toRpcError()` |
| RpcException | 표준 형식 확인 후 패스스루 |
| HttpException | 표준 형식으로 변환 |
| ValidationPipe 에러 | 메시지 배열 join |
| Prisma 에러 | P2002/P2025/P2003 매핑 |
| 기타 Error | SYS_001 (Internal) |

### RPC 에러 전파 (Microservice → BFF)

```
Microservice 예외 → UnifiedExceptionFilter: throw new RpcException(JSON.stringify(errorResponse))
    → NATS → BFF의 NatsClientService.handleError: JSON.parse → HttpException throw
    → 클라이언트에 { success: false, error: { code, message }, timestamp }
```

---

## 8. 에러 카탈로그

```typescript
interface ErrorDef {
  readonly code: string;       // 'BOOK_001'
  readonly message: string;    // 한국어 메시지
  readonly httpStatus: number; // HTTP 상태 코드
}

// 정의
export const BookingErrors = defineErrors({
  NOT_FOUND:  { code: 'BOOK_001', message: '예약을 찾을 수 없습니다', httpStatus: 404 },
  SLOT_TAKEN: { code: 'BOOK_002', message: '이미 예약된 슬롯입니다', httpStatus: 409 },
});

// 통합 export
export const Errors = {
  Booking: BookingErrors,
  System: SystemErrors,
} as const;
```

### 에러 코드 접두사

| 접두사 | 도메인 | 서비스 |
|--------|--------|--------|
| `AUTH_` | 인증/토큰 | iam-service |
| `USER_` | 사용자 관리 | iam-service |
| `ADMIN_` | 관리자 관리 | iam-service |
| `FRIEND_` | 친구 관리 | iam-service |
| `COURSE_` | 골프장/코스 | course-service |
| `BOOK_` | 예약 | booking-service |
| `PAY_` | 결제 | payment-service |
| `CHAT_` | 채팅 | chat-service |
| `NOTI_` | 알림 | notify-service |
| `VAL_` | 입력 검증 (공통) | 전 서비스 |
| `DB_` | 데이터베이스 (공통) | DB 사용 서비스 |
| `EXT_` | 외부 API (공통) | 전 서비스 |
| `SYS_` | 시스템 (공통) | 전 서비스 |

---

## 9. DTO / Validation

```typescript
// ✅ 요청 DTO: class-validator 데코레이터 필수
export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  clubId: string;

  @IsOptional()
  @IsNumber()
  @Min(1) @Max(100)
  playerCount?: number;
}

// ❌ 인터페이스로 요청 DTO 정의 (validation 불가)
interface CreateBookingDto { clubId: string; }
```

---

## 10. NATS 메시지 패턴

### 표준 CRUD 패턴

```
{domain}.list    # 목록 조회
{domain}.get     # 단일 조회
{domain}.create  # 생성
{domain}.update  # 수정
{domain}.delete  # 삭제
```

### 주요 서비스 패턴 예시

| 서비스 | 패턴 | 설명 |
|--------|------|------|
| iam-service | `user.list`, `user.get`, `auth.login`, `auth.refresh` | 사용자/인증 |
| iam-service | `iam.companyMembers.list/create/update/delete/addByBooking` | 회사 멤버 |
| course-service | `club.list`, `club.get`, `club.findNearby` | 골프장 |
| booking-service | `booking.create`, `booking.cancel`, `slot.reserve` | 예약 |
| booking-service | `policy.cancellation.*`, `policy.refund.*`, `policy.noshow.*`, `policy.operating.*` | 정책 |
| location-service | `location.getCoordinates`, `location.coord2region`, `location.search.address` | 위치 |
| weather-service | `weather.current`, `weather.hourly`, `weather.forecast` | 날씨 |

---

## 11. Health Check

모든 서비스에 필수. K8s 프로브 대응을 위해 3개 엔드포인트 제공.

```typescript
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return { status: 'ok', service: '{service-name}', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  async readiness() {
    const nats = isNatsReady();                  // common/readiness.ts
    const db = await this.checkDatabase();       // DB 사용 서비스만
    return { status: nats && db ? 'ready' : 'not_ready', checks: { nats, database: db } };
  }

  @Get('health/live')
  liveness() {
    return { status: 'alive', uptime: process.uptime() };
  }
}
```

### NATS 연결 상태 추적 (common/readiness.ts)

```typescript
setNatsReady(true);   // main.ts에서 NATS 연결 성공 시 호출
isNatsReady();        // HealthController에서 사용
```

---

## 12. 필수 설정 파일

### tsconfig.build.json

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

### .dockerignore

```
node_modules
dist
test
coverage
.env
.env.*
*.md
.git
```

### Dockerfile (멀티스테이지 빌드)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 8080
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

> K8s 배포 시 `PORT=8080` 환경변수로 포트 오버라이드

---

## 13. Microservice → Microservice NATS 호출 패턴

Microservice가 다른 Microservice를 NATS로 호출하는 경우 (예: agent-service → weather-service, course-service → location-service).

### 표준 패턴

```typescript
// ✅ catchError에서 반드시 throw — 상위 try-catch(또는 UnifiedExceptionFilter)가 처리
const response = await firstValueFrom(
  this.weatherClient.send('weather.forecast', { lat, lon }).pipe(
    timeout(this.REQUEST_TIMEOUT),
    catchError((err) => {
      throw new Error(`Failed to get weather: ${err.message}`);
    }),
  ),
);
```

### 예외 처리 흐름

```
NATS 호출 실패
    ↓
catchError → throw new Error(...)
    ↓
상위 호출자(execute, Controller 등)의 try-catch 또는 UnifiedExceptionFilter가 처리
    ↓
클라이언트에 표준 에러 응답 전달
```

### 허용되는 예외 케이스

```typescript
// ✅ 보조 조회 (실패해도 메인 로직에 영향 없는 경우만)
// 예: 지역명 해석 실패해도 좌표 기반 진행 가능
catchError(() => [null])   // 보조 조회에 한해 허용
```

### 금지 패턴

```typescript
// ❌ 에러를 삼키고 자체 fallback 응답 반환
catchError((err) => {
  return [{ success: false, error: err.message }];
})

// ❌ 실패 시 다른 API로 자체 fallback
catchError(() => {
  return this.otherClient.send('other.api', payload);  // fallback 금지
})

// ❌ 에러를 무시하고 빈 데이터 반환 (메인 로직에서)
catchError(() => [{ data: [] }])
```

### 원칙 요약

| 구분 | 패턴 | 이유 |
|------|------|------|
| 메인 NATS 호출 | `catchError → throw` | UnifiedExceptionFilter 표준 플로우 |
| 보조 조회 (optional) | `catchError → [null]` | 실패해도 메인 로직 계속 가능 |
| 자체 fallback | **금지** | 에러 전파 차단, 디버깅 어려움 |
| 에러 삼키기 | **금지** | 장애 감지 불가, 잘못된 응답 |

---

## 14. 금지 패턴

```typescript
// ❌ BFF에서 Microservice 응답 언래핑/변환
async getData(params: any) {
  const response = await this.natsClient.send('domain.get', params);
  return response.data;  // 절대 금지 - 그대로 반환해야 함
}

// ❌ Controller에서 직접 try-catch로 에러 처리
@MessagePattern('domain.get')
async get(@Payload() data) {
  try { ... } catch (e) { return NatsResponse.error(...); }
}

// ❌ ResponseTransformInterceptor 사용 (이중 래핑 유발)

// ❌ any 타입 DTO
@MessagePattern('domain.create')
async create(@Payload() data: any) { }

// ❌ 인터페이스로 요청 DTO 정의
interface CreateDto { name: string; }
```

**규칙 요약:**
- BFF는 Microservice 응답을 그대로 전달 (변환/언래핑 금지)
- Microservice에서 `NatsResponse` 헬퍼로 명시적 응답
- 에러 처리는 `UnifiedExceptionFilter`에 위임
- 요청 DTO는 class-validator 데코레이터 필수
