# Park Golf Platform - 개발 규칙

## 목차

- [1. 프로젝트 개요](#1-프로젝트-개요)
- [2. 공통 규칙](#2-공통-규칙)
- [3. Backend 규칙 (NestJS)](#3-backend-규칙-nestjs)
- [4. Frontend 규칙](#4-frontend-규칙)
- [5. CI/CD 규칙](#5-cicd-규칙)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 구조

```
apps/
├── admin-dashboard/        # 관리자 웹 (React + Vite + Tailwind)
├── user-app-web/           # 사용자 웹 (React + Vite + Tailwind)
├── user-app-ios/           # iOS 앱 (SwiftUI + Tuist)
├── user-app-android/       # Android 앱 (Kotlin + Jetpack Compose)
services/
├── admin-api/              # BFF (NestJS) - REST → NATS
├── user-api/               # BFF (NestJS) - REST → NATS
├── chat-gateway/           # WebSocket 서버 (Socket.IO)
├── iam-service/            # 인증/사용자/친구 (Prisma)
├── course-service/         # 골프장/코스/게임 (Prisma)
├── booking-service/        # 예약/Saga (Prisma)
├── payment-service/        # 결제 (Prisma)
├── chat-service/           # 채팅 (Prisma)
├── notify-service/         # 알림 (Prisma)
├── agent-service/          # AI 에이전트 (Gemini)
├── location-service/       # 위치 (카카오 로컬 API)
└── weather-service/        # 날씨 (기상청 API)
```

### 1.2 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | NestJS + NATS + Prisma + PostgreSQL |
| Web Frontend | React + Vite + Tailwind + React Query |
| iOS | SwiftUI + MVVM + Combine + Alamofire |
| Android | Kotlin + Jetpack Compose + MVVM + Hilt + Retrofit |
| Infra | GKE Autopilot + Firebase Hosting + GitHub Actions |

### 1.3 상세 문서

| 문서 | 내용 |
|------|------|
| `docs/ARCHITECTURE.md` | 전체 시스템 아키텍처, 다이어그램 |
| `docs/BOOKING-WORKFLOW.md` | 예약 Saga 패턴, 분산 트랜잭션 |

---

## 2. 공통 규칙

### 2.1 네이밍 컨벤션

| 대상 | 컨벤션 | 예시 |
|------|--------|------|
| 파일/폴더 | kebab-case | `user-api`, `game-time-slot.service.ts` |
| 클래스 | PascalCase | `BookingService`, `GameNatsController` |
| 함수/변수 | camelCase | `getBookings`, `userId` |
| 상수 | UPPER_SNAKE | `MAX_RETRY_COUNT`, `SAGA_TIMEOUT_MS` |
| DB 테이블 | snake_case | `game_time_slots`, `booking_history` |
| NATS 패턴 | dot.notation | `booking.create`, `slot.reserve` |
| React 컴포넌트 | PascalCase | `BookingTable`, `ClubFormModal` |
| React 훅 | use 접두사 | `useBookingsQuery`, `useAuthStore` |
| Swift 파일 | PascalCase | `BookingViewModel.swift`, `APIClient.swift` |
| Kotlin 파일 | PascalCase | `BookingViewModel.kt`, `AuthApi.kt` |

### 2.2 포맷팅

- ESLint + Prettier (자동 적용)
- 들여쓰기: 2 spaces (TS/JS), 4 spaces (Swift/Kotlin)
- 세미콜론: 필수 (TypeScript)
- 따옴표: single quote (JS/TS), double quote (Swift/Kotlin)

### 2.3 TypeScript 규칙

```typescript
// ✅ 명시적 타입 선언
function getUser(id: number): Promise<User> { }

// ✅ interface 우선 (type은 union/intersection에만)
interface User {
  id: number;
  name: string;
}

// ❌ any 사용 금지 (unknown 또는 제네릭 사용)
function process(data: any) { }      // 금지
function process<T>(data: T) { }     // 권장
```

### 2.4 커밋 메시지

```
<type>(<scope>): <description>

feat(booking): 예약 생성 API 추가
fix(iam): 토큰 갱신 버그 수정
refactor(course): 타임슬롯 조회 로직 개선
docs(readme): 설치 가이드 업데이트
test(booking): 예약 취소 테스트 추가
```

| type | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 (기능 변경 없음) |
| `docs` | 문서 수정 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정 변경 |

---

## 3. Backend 규칙 (NestJS)

### 3.1 아키텍처

```
Frontend → BFF (REST) → NATS → Microservice (Prisma)
```

### 3.2 서비스 폴더 구조

모든 Microservice는 아래 구조를 따른다.

```
src/
├── main.ts                              # 앱 부트스트랩
├── app.module.ts                        # 루트 모듈
├── common/
│   ├── exceptions/
│   │   ├── app.exception.ts             # 커스텀 예외 클래스
│   │   ├── unified-exception.filter.ts  # 통합 예외 필터
│   │   ├── catalog/error-catalog.ts     # 에러 코드 정의
│   │   └── index.ts
│   ├── types/response.types.ts          # NatsResponse 헬퍼
│   ├── controllers/health.controller.ts # Health Check
│   └── nats/                            # NATS 클라이언트 설정
└── {domain}/
    ├── {domain}.module.ts
    ├── controller/{domain}-nats.controller.ts
    ├── service/{domain}.service.ts
    └── dto/{domain}.dto.ts
```

### 3.3 부트스트랩 (main.ts 필수 설정)

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

### 3.4 BFF 패턴 (admin-api, user-api)

```typescript
// Controller: REST 엔드포인트
@Controller('api/admin/games')
export class GamesController {
  @Get()
  async getGames(@Query() filters: GameFilterDto) {
    return this.gamesService.getGames(filters);
  }
}

// Service: NATS 요청 전송
@Injectable()
export class GamesService {
  async getGames(filters: any) {
    return this.natsClient.send('games.list', filters);
  }
}
```

### 3.5 Microservice 패턴 (*-service)

```typescript
// NATS Controller: 메시지 핸들러 (try-catch 불필요 - UnifiedExceptionFilter가 처리)
@Controller()
export class GameNatsController {
  @MessagePattern('games.list')
  async getGames(@Payload() data: any) {
    const result = await this.gameService.findAll(data);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
  }
}
```

### 3.6 NATS 메시지 패턴

```
{domain}.list    # 목록 조회
{domain}.get     # 단일 조회
{domain}.create  # 생성
{domain}.update  # 수정
{domain}.delete  # 삭제
```

### 3.7 API 응답 형식 (필수 준수)

**모든 API 응답은 반드시 아래 형식을 따라야 합니다.**

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

// 에러 응답
{ success: false, error: { code: string, message: string }, timestamp: string }
```

### 3.8 예외 처리

#### UnifiedExceptionFilter 동작 흐름

```
Service에서 AppException throw
    ↓
UnifiedExceptionFilter.catch() (자동)
    ↓
컨텍스트 판별: HTTP → JSON 응답 / RPC → RpcException 변환
    ↓
BFF가 { success: false, error: { code, message }, timestamp } 수신
```

#### 예외 처리 규칙

```typescript
// ✅ Service에서 AppException throw (Controller에 try-catch 불필요)
throw new AppException(Errors.Booking.NOT_FOUND);
throw new AppException(Errors.Booking.SLOT_TAKEN, '커스텀 메시지');

// ✅ UnifiedExceptionFilter가 처리하는 예외 유형
// - AppException      → toRpcError()
// - RpcException      → 표준 형식 확인 후 패스스루
// - HttpException     → 표준 형식으로 변환
// - ValidationPipe    → 메시지 배열 join
// - Prisma 에러       → P2002/P2025/P2003 매핑 (DB 사용 서비스만)
// - 기타 Error        → SYS_001 (Internal)
```

### 3.9 에러 카탈로그

```typescript
// 도메인별 에러 코드: {DOMAIN}_{순번}
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

// 통합 export (모든 서비스 동일 패턴)
export const Errors = {
  Booking: BookingErrors,
  System: SystemErrors,
} as const;
```

### 3.10 DTO / Validation

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

### 3.11 Health Check

모든 서비스에 필수 적용.

```typescript
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return { status: 'ok', service: '{service-name}', timestamp: new Date().toISOString() };
  }
}
```

### 3.12 금지 패턴

```typescript
// ❌ BFF에서 Microservice 응답 언래핑/변환
async getData(params: any) {
  const response = await this.natsClient.send('domain.get', params);
  return response.data;  // 절대 금지 - 그대로 반환해야 함
}

// ❌ Controller에서 직접 try-catch로 에러 처리
@MessagePattern('domain.get')
async get(@Payload() data) {
  try { ... } catch (e) { return NatsResponse.error(...); }  // 금지 - UnifiedExceptionFilter 사용
}

// ❌ ResponseTransformInterceptor 사용
// BFF는 Microservice 응답을 그대로 전달

// ❌ any 타입 DTO
@MessagePattern('domain.create')
async create(@Payload() data: any) { }  // 금지 - DTO 클래스 사용
```

**규칙 요약:**
- BFF(admin-api, user-api)는 Microservice 응답을 그대로 전달 (변환/언래핑 금지)
- Microservice에서 `NatsResponse.success()`, `NatsResponse.paginated()` 사용
- 에러 처리는 `UnifiedExceptionFilter`에 위임 (Controller에 try-catch 넣지 않음)
- 요청 DTO는 반드시 class-validator 데코레이터 적용

---

## 4. Frontend 규칙

### 4.1 Web (React + Vite + Tailwind)

#### 폴더 구조

```
src/
├── pages/                    # 페이지 컴포넌트
├── components/
│   ├── features/{domain}/    # 도메인별 (Table, FormModal, Filters)
│   ├── common/               # 공통 (DataContainer, PageHeader)
│   ├── ui/                   # 기본 UI (Button, Input, Modal)
│   └── layout/               # 레이아웃
├── hooks/
│   ├── queries/              # React Query 훅
│   └── use{Feature}.ts       # 커스텀 훅
└── lib/api/                  # API 클라이언트
```

#### 상태 관리

| 상태 유형 | 도구 | 용도 |
|----------|------|------|
| 서버 데이터 | React Query | API 호출, 캐싱 |
| 전역 상태 | Zustand | 인증 정보만 (`auth.store.ts`) |
| 로컬 상태 | useState | 모달, 폼, UI 상태 |

#### API 호출

```typescript
// lib/api/{domain}Api.ts
export const clubApi = {
  getClubs: () => apiClient.get('/clubs').then(extractPaginatedList),
  getClub: (id: string) => apiClient.get(`/clubs/${id}`).then(extractSingle),
  createClub: (data) => apiClient.post('/clubs', data),
};

// hooks/queries/{domain}.ts
export const useClubsQuery = () => useQuery({
  queryKey: clubKeys.list(),
  queryFn: () => clubApi.getClubs(),
});
```

#### 스타일 규칙

- Tailwind CSS + `class-variance-authority` (cva)
- `rounded-lg` 통일, `cn()` 유틸리티로 클래스 병합
- admin-dashboard: blue-600 (primary), user-app-web: green-600 (primary)

#### 금지 패턴

```typescript
// ❌ useEffect에서 API 호출
useEffect(() => { fetchData().then(setData); }, []);

// ✅ React Query 사용
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
```

### 4.2 iOS (SwiftUI + MVVM)

#### 아키텍처

```
SwiftUI + MVVM + Combine
REST API (Alamofire) + WebSocket (Socket.IO)
```

#### 폴더 구조

```
Sources/
├── Core/
│   ├── Network/       # APIClient, ChatSocketManager
│   ├── Models/        # 데이터 모델
│   └── Utils/         # Configuration, Helpers
├── Features/          # 기능별 (Auth, Booking, Chat, Friends...)
│   └── {Feature}/
│       ├── {Feature}View.swift
│       └── {Feature}ViewModel.swift
└── App/               # 앱 진입점
```

#### 금지 패턴

```swift
// ❌ View에서 직접 API 호출
struct MyView: View {
    var body: some View {
        Button("Load") { await api.fetch() }  // 금지
    }
}

// ✅ ViewModel 사용
struct MyView: View {
    @StateObject var viewModel = MyViewModel()
    var body: some View {
        Button("Load") { await viewModel.load() }
    }
}
```

### 4.3 Android (Kotlin + Jetpack Compose)

#### 아키텍처

```
Jetpack Compose + MVVM + Clean Architecture
REST API (Retrofit + OkHttp) + WebSocket (Socket.IO)
DI: Hilt
```

#### 폴더 구조

```
com.parkgolf.app/
├── data/
│   ├── remote/
│   │   ├── api/           # Retrofit 인터페이스 (AuthApi, BookingApi...)
│   │   ├── dto/           # 서버 응답 DTO
│   │   ├── interceptor/   # AuthInterceptor, TokenAuthenticator
│   │   └── socket/        # ChatSocketManager
│   ├── local/datastore/   # DataStore (AuthPreferences)
│   ├── repository/        # Repository 구현체
│   └── mapper/            # DTO → Domain 매퍼
├── domain/
│   ├── model/             # 도메인 모델 (Booking, User, Friend...)
│   └── repository/        # Repository 인터페이스
├── presentation/
│   ├── feature/{Feature}/ # 기능별 Screen + ViewModel
│   ├── components/        # 공통 UI 컴포넌트
│   ├── navigation/        # 네비게이션
│   └── theme/             # 테마 (Color, Typography, Shape)
├── di/                    # Hilt 모듈 (NetworkModule, RepositoryModule)
└── util/                  # 확장 함수, 유틸리티
```

#### 금지 패턴

```kotlin
// ❌ Composable에서 직접 API 호출
@Composable
fun MyScreen() {
    val data = remember { api.fetch() }  // 금지
}

// ✅ ViewModel 사용
@Composable
fun MyScreen(viewModel: MyViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
}
```

---

## 5. CI/CD 규칙

### 5.1 워크플로우

| 파일 | 용도 |
|------|------|
| `ci.yml` | Lint, Test, Build, Security Scan |
| `cd-apps.yml` | Frontend 배포 (Firebase) |
| `cd-services.yml` | Backend 배포 (GKE Autopilot) |

### 5.2 배포 전략

- `develop` → dev 환경
- `main` → prod 환경
- 선택적 서비스 배포 가능 (쉼표 구분)

### 5.3 로컬 개발

```bash
# Backend
cd services/{service-name} && npm run start:dev

# Frontend (Web)
cd apps/{app-name} && npm run dev

# iOS
cd apps/user-app-ios && tuist generate && open ParkGolf.xcworkspace

# Android
cd apps/user-app-android && ./gradlew assembleDebug
```
