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
├── booking-service/        # 예약 (Prisma)
├── saga-service/           # Saga 오케스트레이터 (Prisma)
├── payment-service/        # 결제 (Prisma)
├── chat-service/           # 채팅 (Prisma)
├── notify-service/         # 알림 (Prisma)
├── agent-service/          # AI 에이전트 (DeepSeek)
├── partner-service/        # 외부 파트너 연동
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

- **NatsResponse 헬퍼**: Microservice는 `NatsResponse.success()`, `.paginated()`, `.deleted()`, `.withSaga()`로 응답
- **예외 처리**: `UnifiedExceptionFilter`에 위임, Controller/Service에 자체 에러 핸들링 금지
- **NATS 호출 에러**: `catchError`에서 반드시 `throw` — 에러를 삼키거나 자체 fallback 금지
- **BFF 역할**: Microservice 응답을 그대로 전달. 단 **saga 트랜잭션 응답은 `{success, data, saga}` 표준 shape로 정규화** (saga 성공 후 `findById` 재조회, 실패 시 `BadRequestException` → 4xx)
- **TypeScript**: `any` 사용 금지 → `unknown` 또는 제네릭, `interface` 우선
- **커밋**: `<type>(<scope>): <description>` (feat/fix/refactor/docs/test/chore)

---

## 인프라 / 배포

- **런타임**: GKE Autopilot + Firebase Hosting / 리전 `asia-northeast3`
- **환경**: `dev` (ns `parkgolf-dev`) · `prod` (ns `parkgolf-prod`)
- **Terraform**: `infra/` (environments / modules / providers)
- **CI/CD**: GitHub Actions 수동 트리거 — `ci.yml` / `cd-infra.yml` / `cd-services.yml` / `cd-apps.yml`
- **최초 배포**: `cd-infra(network-apply → gke-setup)` → `cd-services` → `cd-apps`
- **배포 의존성**: saga 응답 변경 시 `saga-service` 선배포 → `user-api`·`admin-api`·`agent-service`

상세: `.github/workflows/README.md`, `cicd` skill

---

## 절대 금지 패턴

```typescript
// ❌ BFF에서 응답 언래핑
return response.data;  // 그대로 반환해야 함

// ❌ Controller에서 try-catch
try { ... } catch (e) { return NatsResponse.error(...); }

// ❌ NATS catchError에서 에러 삼키기 (자체 fallback 금지)
catchError(() => [{ success: false }])
catchError(() => [null])

// ✅ NATS catchError 표준: 반드시 throw
catchError((err) => { throw new Error(`Failed to ...: ${err.message}`); })

// ❌ ResponseTransformInterceptor (이중 래핑 유발)

// ❌ any 타입 DTO
async create(@Payload() data: any) { }

// ❌ useEffect에서 API 호출 (React Query 사용)
useEffect(() => { fetchData().then(setData); }, []);
```

---

## 응답 / 결과 문서 출력

- **핵심만**: 결론 우선, 부연·도입부 생략
- **포맷 최소화**: 헤더·표·이모지·불릿 남용 금지 (꼭 필요할 때만)
- **변경 보고**: `X → Y` 형식, 산문 풀이 생략
- **모호 시**: 추측 부연 대신 1줄 질문
- **다이어그램**: 화면 출력 시에만 ASCII 다이어그램 (mermaid 미렌더링) — `.md` 파일에는 mermaid 사용

---

## Skill 참조

도메인별 상세 가이드는 Skill로 분리.

- `nestjs-service` — NestJS (BFF, NATS, 예외, DTO, Dockerfile)
- `react-app` — React (React Query, Tailwind, bffParser)
- `ios-app` — iOS (SwiftUI, MVVM, APIClient)
- `android-app` — Android (Compose, Hilt)
- `cicd` — 인프라/배포 (GKE, Firebase, Actions)
- `testing` — Contract / Integration / E2E
- `docs-writing` — 문서 작성/현행화
