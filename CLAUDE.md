# Park Golf Platform - 개발 규칙

## 1. 프로젝트 개요

### 1.1 프로젝트 구조

```
apps/
├── admin-dashboard/        # 관리자 웹 (React + Vite + Tailwind)
├── platform-dashboard/     # 플랫폼 관리 웹 (React + Vite + Tailwind)
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
├── agent-service/          # AI 에이전트 (DeepSeek)
├── job-service/            # 스케줄링 작업
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
| `docs/architecture/SYSTEM.md` | 전체 시스템 아키텍처, 서비스 상세, NATS 패턴 |
| `docs/architecture/DATABASE.md` | ERD, Prisma 스키마, 서비스별 DB |
| `docs/architecture/INFRASTRUCTURE.md` | GKE, Ingress, Secrets, CI/CD |
| `docs/workflow/BOOKING.md` | 예약 Saga 패턴, 분산 트랜잭션 |
| `docs/workflow/AGENT.md` | AI 부킹 에이전트 |
| `docs/workflow/CHAT.md` | 실시간 채팅 |
| `docs/workflow/NOTIFICATION.md` | 알림 시스템 |
| `docs/workflow/AUTH.md` | 인증/인가, RBAC |
| `docs/policy/ACCOUNT_DELETION.md` | 계정 삭제 정책 |
| `docs/policy/MEMBERSHIP_TIER.md` | 멤버십 등급 정책 |
| `docs/management/ROADMAP.md` | 개발 로드맵 |

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

- 명시적 타입 선언, `interface` 우선 (`type`은 union/intersection에만)
- `any` 사용 금지 → `unknown` 또는 제네릭 사용

### 2.4 커밋 메시지

```
<type>(<scope>): <description>
```

| type | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 |
| `docs` | 문서 수정 |
| `test` | 테스트 |
| `chore` | 빌드, 설정 |

---

## 3. 핵심 아키텍처 원칙

```
Frontend → BFF (REST) → NATS → Microservice (Prisma)
```

- **NatsResponse 헬퍼**: Microservice는 `NatsResponse.success()`, `.paginated()`, `.deleted()`로 응답
- **예외 처리**: `UnifiedExceptionFilter`에 위임, Controller에 try-catch 넣지 않음
- **BFF 역할**: Microservice 응답을 그대로 전달 (변환/언래핑 절대 금지)

---

## 4. 절대 금지 패턴

```typescript
// ❌ BFF에서 응답 언래핑
return response.data;  // 그대로 반환해야 함

// ❌ Controller에서 try-catch
try { ... } catch (e) { return NatsResponse.error(...); }

// ❌ ResponseTransformInterceptor (이중 래핑 유발)

// ❌ any 타입 DTO
async create(@Payload() data: any) { }

// ❌ useEffect에서 API 호출 (React Query 사용)
useEffect(() => { fetchData().then(setData); }, []);
```

---

## 5. Skill 참조

상세 개발 가이드는 도메인별 Skill로 분리되어 있다.

| Skill | 내용 | 경로 |
|-------|------|------|
| `nestjs-service` | NestJS 백엔드 전체 (BFF, NATS, 예외, DTO, Dockerfile) | `.claude/skills/backend/nestjs-service/` |
| `react-app` | React 웹 앱 (React Query, Tailwind, bffParser) | `.claude/skills/frontend/react-app/` |
| `ios-app` | iOS 앱 (SwiftUI, MVVM, Actor APIClient) | `.claude/skills/frontend/ios-app/` |
| `android-app` | Android 앱 (Compose, Hilt, Repository) | `.claude/skills/frontend/android-app/` |
| `cicd` | 인프라/배포 (GKE, Firebase, GitHub Actions) | `.claude/skills/infrastructure/cicd/` |
| `testing` | 테스트 전략 (Contract, Integration, E2E) | `.claude/skills/testing/` |
| `docs-writing` | 문서 작성/현행화 가이드 | `.claude/skills/documentation/docs-writing/` |

---

## 6. 로컬 개발

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
