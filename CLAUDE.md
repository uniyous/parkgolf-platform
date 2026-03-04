# Park Golf Platform - 개발 규칙

## 프로젝트 구조

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

상세 문서: `docs/architecture/`, `docs/workflow/`, `docs/policy/`

---

## 핵심 아키텍처 원칙

```
Frontend → BFF (REST) → NATS → Microservice (Prisma)
```

- **NatsResponse 헬퍼**: Microservice는 `NatsResponse.success()`, `.paginated()`, `.deleted()`로 응답
- **예외 처리**: `UnifiedExceptionFilter`에 위임, Controller/Service에 자체 에러 핸들링 금지
- **NATS 호출 에러**: `catchError`에서 반드시 `throw` — 에러를 삼키거나 자체 fallback 금지
- **BFF 역할**: Microservice 응답을 그대로 전달 (변환/언래핑 절대 금지)
- **TypeScript**: `any` 사용 금지 → `unknown` 또는 제네릭, `interface` 우선
- **커밋**: `<type>(<scope>): <description>` (feat/fix/refactor/docs/test/chore)

---

## 절대 금지 패턴

```typescript
// ❌ BFF에서 응답 언래핑
return response.data;  // 그대로 반환해야 함

// ❌ Controller에서 try-catch
try { ... } catch (e) { return NatsResponse.error(...); }

// ❌ NATS catchError에서 에러 삼키기 (자체 fallback 금지)
catchError(() => [{ success: false }])           // 금지
catchError(() => [null])                          // 금지 (resolveRegionName 같은 보조 조회 제외)

// ✅ NATS catchError 표준: 반드시 throw
catchError((err) => { throw new Error(`Failed to ...: ${err.message}`); })

// ❌ ResponseTransformInterceptor (이중 래핑 유발)

// ❌ any 타입 DTO
async create(@Payload() data: any) { }

// ❌ useEffect에서 API 호출 (React Query 사용)
useEffect(() => { fetchData().then(setData); }, []);
```

---

## Skill 참조

상세 개발 가이드는 도메인별 Skill로 분리되어 있다.

| Skill | 내용 |
|-------|------|
| `nestjs-service` | NestJS 백엔드 (BFF, NATS, 예외, DTO, Dockerfile) |
| `react-app` | React 웹 앱 (React Query, Tailwind, bffParser) |
| `ios-app` | iOS 앱 (SwiftUI, MVVM, Actor APIClient) |
| `android-app` | Android 앱 (Compose, Hilt, Repository) |
| `cicd` | 인프라/배포 (GKE, Firebase, GitHub Actions) |
| `testing` | 테스트 전략 (Contract, Integration, E2E) |
| `docs-writing` | 문서 작성/현행화 가이드 |
