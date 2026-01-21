# Park Golf Platform - 개발 규칙

## 프로젝트 구조

```
apps/
├── admin-dashboard/    # 관리자 웹 (React + Vite + Tailwind)
├── user-webapp/        # 사용자 웹 (React + Vite + Tailwind)
├── user-app-ios/       # iOS 앱 (SwiftUI + Tuist)
services/
├── admin-api/          # BFF (NestJS) - REST → NATS
├── user-api/           # BFF (NestJS) - REST → NATS
├── chat-gateway/       # WebSocket 서버 (Socket.IO)
├── iam-service/        # 인증/사용자/친구 (Prisma)
├── course-service/     # 골프장/코스/게임 (Prisma)
├── booking-service/    # 예약/Saga (Prisma)
├── chat-service/       # 채팅 (Prisma)
└── notify-service/     # 알림 (Prisma)
```

## 상세 문서

| 문서 | 내용 |
|------|------|
| `docs/ARCHITECTURE.md` | 전체 시스템 아키텍처, 다이어그램 |
| `docs/BOOKING-WORKFLOW.md` | 예약 Saga 패턴, 분산 트랜잭션 |

---

## 코드 컨벤션

### 네이밍

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

### 포맷팅

- ESLint + Prettier (자동 적용)
- 들여쓰기: 2 spaces
- 세미콜론: 필수 (TypeScript)
- 따옴표: single quote (JS/TS), double quote (Swift)

### 커밋 메시지

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

### TypeScript 규칙

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

---

## Frontend 규칙

### 상태 관리

| 상태 유형 | 도구 | 용도 |
|----------|------|------|
| 서버 데이터 | React Query | API 호출, 캐싱 |
| 전역 상태 | Zustand | 인증 정보만 (`auth.store.ts`) |
| 로컬 상태 | useState | 모달, 폼, UI 상태 |

### 금지 패턴

```typescript
// ❌ useEffect에서 API 호출
useEffect(() => { fetchData().then(setData); }, []);

// ✅ React Query 사용
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
```

### 폴더 구조

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

### API 호출

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

### 스타일 규칙

- Tailwind CSS + `class-variance-authority` (cva)
- `rounded-lg` 통일, `cn()` 유틸리티로 클래스 병합
- admin: blue-600 (primary), user-webapp: green-600 (primary)

---

## Backend 규칙

### 아키텍처

```
Frontend → BFF (REST) → NATS → Microservice (Prisma)
```

### BFF 패턴 (admin-api, user-api)

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

### Microservice 패턴 (*-service)

```typescript
// NATS Controller: 메시지 핸들러
@Controller()
export class GameNatsController {
  @MessagePattern('games.list')
  async getGames(@Payload() data: any) {
    const result = await this.gameService.findAll(data);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
  }
}
```

### NATS 메시지 패턴

```
{domain}.list    # 목록 조회
{domain}.get     # 단일 조회
{domain}.create  # 생성
{domain}.update  # 수정
{domain}.delete  # 삭제
```

### API 응답 형식 (필수 준수)

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
{ success: false, error: { code: string, message: string } }
```

### BFF 응답 처리 규칙

```typescript
// ✅ 올바른 패턴: Microservice 응답을 그대로 반환
@Injectable()
export class ExampleService {
  async getData(params: any) {
    return this.natsClient.send('domain.get', params);  // 그대로 반환
  }
}

// ❌ 금지 패턴: 응답을 언래핑하거나 변환
async getData(params: any) {
  const response = await this.natsClient.send('domain.get', params);
  return response.data;  // ❌ 절대 금지
}
```

**규칙:**
- BFF(admin-api, user-api)는 Microservice 응답을 그대로 전달 (변환/언래핑 금지)
- Microservice에서 `NatsResponse.success()`, `NatsResponse.paginated()` 사용
- ResponseTransformInterceptor 사용 금지

---

## CI/CD 규칙

### 워크플로우

| 파일 | 용도 |
|------|------|
| `ci.yml` | Lint, Test, Build, Security Scan |
| `cd-apps.yml` | Frontend 배포 (Firebase) |
| `cd-services.yml` | Backend 배포 (Cloud Run) |

### 배포 전략

- `develop` → dev 환경
- `main` → prod 환경
- 선택적 서비스 배포 가능 (쉼표 구분)

### 로컬 개발

```bash
# Backend
cd services/{service-name} && npm run start:dev

# Frontend (Web)
cd apps/{app-name} && npm run dev

# iOS
cd apps/user-app-ios && tuist generate && open ParkGolf.xcworkspace
```

---

## iOS 규칙 (user-app-ios)

### 아키텍처

```
SwiftUI + MVVM + Combine
REST API (Alamofire) + WebSocket (Socket.IO)
```

### 폴더 구조

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

### API 엔드포인트

```swift
// REST API: user-api
let baseURL = "https://user-api-xxx.run.app"

// WebSocket: chat-gateway
let socketURL = "https://chat-gateway-xxx.run.app"
```

### 금지 패턴

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
