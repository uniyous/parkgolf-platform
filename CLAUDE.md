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

### 브랜치 / PR

- **PR base는 항상 `develop`** (dev 배포가 develop 추적 — `cd-services` → `values-dev.yaml` → ArgoCD)
- **feature 브랜치(Linear 이슈 카드) → `develop` PR은 무조건 요청** — 작업 완료 시 항상 PR 생성. develop 직접 push 금지
- **`develop → main` PR 금지** — main 반영은 별도 릴리스 절차로만. 임의로 develop→main PR 생성/머지하지 않는다 (head 자동삭제로 develop 브랜치가 사라지면 dev GitOps 끊김)

상세: `.github/workflows/README.md`, `cicd` skill

---

## 개발 워크플로우 / Spec 문서

플로우: `plan(Linear 이슈) → spec → implement → draft PR → review`

- **spec = 계약 문서** (`docs/specs/`): Linear 이슈가 "왜/무엇", spec은 "어떤 인터페이스로"를 고정
- **폴더**: `active/`(진행 중) · `archive/`(merge·폐기). 파일명 `{이슈ID}-{kebab-요약}.md`
- **작성 기준**: 다계층·다서비스·새 NATS 계약·saga/결제는 spec 필수. 단일 파일 버그픽스·UI 조정은 이슈로 충분(생략)
- **규칙**: spec과 코드는 **같은 PR** · 구현 중 계약 변경 시 **spec 먼저 수정** · merge 후 `git mv active/ → archive/`(삭제 금지)

상세·템플릿: `docs/specs/README.md`

---

## Linear 이슈 / 서브이슈 작명

제목은 커밋 규칙과 **동일 문법**으로 통일: `[N] <type>(<scope>): <요약>` (순서 prefix는 선택)

- 한 줄 · ≤60자 · 마침표 없음 · 결과/행위 중심 명사형
- 한국어 기본, 코드 식별자(camelCase·파일명·NATS 패턴)는 원형 유지
- 보조 설명은 ` — ` 한 번만. 구분자(`→ + — :`) 혼용 금지
- **type**: feat · fix · refactor · perf · test · docs · chore · infra
- **scope**: 도메인 1개(agent/booking/payment/saga/iam/course/chat/notify/web/ios/android/admin/bff/infra/deps). 멀티는 `,`로 최대 2개, 3개+면 상위 묶음(`native`=ios+android, `app`=web+native, `bff`=user/admin-api)
- **순서 prefix `[N]`**: 형제 간 실행 순서가 의미 있을 때만 맨 앞에 부착. 삽입분은 `[N.M]`(예: P3.1→`[3.1]`). 독립 이슈엔 미부착. Linear 계층뷰가 부모를 보여주므로 부모번호 불필요(로컬 순서 N만)
- **부모(Issue)** = 산출물 단위 "무엇을 달성" / **서브(Sub-issue)** = 실행 단위 "무엇을 변경·추가"
- **금지**: `Phase 1`·`[P1]`·`UNI-21a:` 등 제각각 순서표기 → 전부 `[N]`로 통일. 우선순위는 Priority 필드로. 모호 동사 단독("개선"·"정리") → 대상 명시

예: `[3.1] refactor(agent): 팀별순차 제거 → 1예약 + 결제수단별 완료 + L3 단일화` · `fix(web,bff): AI 개인 대화 타 사용자 노출 차단`

---

## 응답 / 결과 문서 출력

- **핵심만**: 결론 우선, 부연·도입부 생략
- **포맷 최소화**: 헤더·표·이모지·불릿 남용 금지 (꼭 필요할 때만)
- **변경 보고**: `X → Y` 형식, 산문 풀이 생략
- **모호 시**: 추측 부연 대신 1줄 질문
- **화면 출력**: 결과 내용은 테이블 또는 ASCII 다이어그램 형식으로 출력 (mermaid 미렌더링)
- **`.md` 파일**: 다이어그램은 mermaid 사용

---

## Skill 참조

워크플로우 단계별 실행은 Skill로 분리 (`.claude/skills/`).

- `spec` — `/spec UNI-123`: Linear 이슈 → `docs/specs/active/` 계약 문서 생성 + 역링크
- `pr` — `/pr`: feature 브랜치 → develop draft PR (base·커밋 문법·spec 포함 점검)
- `testing` — Contract / Integration / E2E

도메인 코딩 규칙(NestJS/React/iOS/Android/CICD)은 본 CLAUDE.md와 `docs/`가 담당.
