# Park Golf Platform - 개발 규칙

## 프로젝트 구조

```
apps/
├── manager-console/        # 관리자 웹 (React + Vite + Tailwind)
├── marketplace-console/     # 플랫폼 관리 웹 (React + Vite + Tailwind)
├── user-app-web/           # 사용자 웹 (React + Vite + Tailwind)
├── user-app-ios/           # iOS 앱 (SwiftUI + Tuist)
├── user-app-android/       # Android 앱 (Kotlin + Jetpack Compose)
services/
├── manager-bff/              # BFF (NestJS) - REST → NATS
├── consumer-bff/               # BFF (NestJS) - REST → NATS
├── chat-gateway/           # WebSocket 서버 (Socket.IO)
├── iam-service/            # 인증/사용자/친구 (Prisma)
├── course-service/         # 골프장/코스/게임 (Prisma)
├── booking-service/        # 예약 (Prisma)
├── saga-service/           # Saga 오케스트레이터 (Prisma)
├── billing-service/        # 결제 (Prisma)
├── chat-service/           # 채팅 (Prisma)
├── notify-service/         # 알림 (Prisma)
├── concierge-service/          # AI 에이전트 (DeepSeek)
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
- **배포 의존성**: saga 응답 변경 시 `saga-service` 선배포 → `consumer-bff`·`manager-bff`·`concierge-service`

### 브랜치 / PR

- **PR base는 항상 `develop`** (dev 배포가 develop 추적 — `cd-services` → `values-dev.yaml` → ArgoCD)
- **feature 브랜치(Linear 이슈 카드) → `develop` PR은 무조건 요청** — 작업 완료 시 항상 PR 생성. develop 직접 push 금지
- **`develop → main` PR 금지** — main 반영은 별도 릴리스 절차로만. 임의로 develop→main PR 생성/머지하지 않는다 (head 자동삭제로 develop 브랜치가 사라지면 dev GitOps 끊김)

상세: `.github/workflows/README.md`, `cicd` skill

### Worktree 구조 (Linear 이슈 단위)

- **worktree 레이아웃** (형제 폴더, `.git` 공유):
  - `parkgolf` = `develop` 브랜치 — 통합 baseline, `git fetch`로 최신 유지, 직접 작업 X
  - `parkgolf-uni-<N>` = Linear 부모 이슈별 작업 worktree
  - `main`(릴리스 baseline)은 별도 worktree 없이 릴리스 절차로만 반영
- **브랜치**: `feat/UNI-<N>-<chunk>` (origin/develop 기준), PR base=develop, **청크마다 PR** (거대 단일 PR 금지)
- **서브이슈는 부모 worktree 내 커밋** — 서브별 worktree/브랜치 X. **Linear 계층은 에픽 기준 3단 이내**(에픽→주제→컴포넌트, "Linear 이슈 / 라벨 규칙" 참조)
- **부모 설계/에픽 이슈는 살아있는 레퍼런스** — 변경은 `## 결정 YYYY-MM-DD` 스탬프, 추가 요건은 신규 하위 이슈
- 신규 worktree: `git worktree add ../parkgolf-uni-<N> -b feat/UNI-<N>-<chunk> origin/develop`

---

## 개발 워크플로우 / Spec 문서

플로우: `plan(Linear 이슈) → spec → implement → draft PR → review`

- **spec = 계약 문서** (`docs/specs/`): Linear 이슈가 "왜/무엇", spec은 "어떤 인터페이스로"를 고정
- **폴더**: `active/`(진행 중) · `archive/`(merge·폐기). 파일명 `{이슈ID}-{kebab-요약}.md`
- **작성 기준**: 다계층·다서비스·새 NATS 계약·saga/결제는 spec 필수. 단일 파일 버그픽스·UI 조정은 이슈로 충분(생략)
- **규칙**: spec과 코드는 **같은 PR** · 구현 중 계약 변경 시 **spec 먼저 수정** · merge 후 `git mv active/ → archive/`(삭제 금지)

상세·템플릿: `docs/specs/README.md`

---

## Linear 이슈 / 라벨 규칙

### 계층

```
Team        제품군 경계 (제품마다 Team 분리 — 라벨이 Team 스코프라 섞이면 안 됨)
└ Project   제품
  └ Issue        에픽 = 도메인 경계 (부모 Issue)
    └ Sub-issue    주제 = 능력 "무엇을 달성" (수직)
      └ Sub-issue    컴포넌트 = 변경 "무엇을 변경" (수평·레이어/앱)
```

- **Milestone**: 릴리스 게이트(이정표) — 계층과 직교, 도메인 묶음 아님. 이슈 1개 = Milestone 1개, 처음부터 게이트에 꽂는다. 연속적인 dev 배포는 기재 X(잡음), 게이트 통과 시점만. hotfix 1건은 `hotfix` 라벨로 충분
- **변형**: 제품 둘 이상 → Team 분리 · 장기 목표로 여러 Project 묶음 → Initiative · 컴포넌트가 더 잘게 → Sub-issue 다단(에픽 기준 3단 이내 권장)

### 제목 작명

**제목엔 `type(scope):` 접두를 쓰지 않는다** — 유형/앱은 라벨(domain·app·layer)이 표현. 제목 = 결과/행위 명사형. (커밋 메시지는 `type(scope): desc` 그대로 — git 규칙)

- 한 줄 · ≤60자 · 마침표 없음 · 한국어 기본, 코드 식별자(camelCase·파일명·NATS 패턴)는 원형 유지
- 보조 설명은 ` — ` 한 번만. 구분자(`→ — :`) 혼용 금지. 변환은 `X → Y`
- 순서 prefix `[N]`: 형제 간 실행 순서가 의미 있을 때만(레이어 순 계약→영속성→서비스→UI). 삽입분 `[N.M]`. 독립 이슈엔 미부착
- **금지**: `feat(api):` 등 type/scope 접두 · `Phase 1`·`[P1]`·`UNI-21a:` 등 순서표기(→ 순서는 `[N]`, 우선순위는 Priority 필드) · 모호 동사 단독("개선"·"정리") → 대상 명시
- 예: `타임슬롯 선점 확정 API — 현장·카드(saga)` · `[3] 나의예약 선점 상태 표시 UI`

### 라벨 (3축 그룹) — Team에 label group으로 생성·부여

```
[domain]  booking · payment · saga · iam · club · chat · notify · agent · partner · location · weather   (bounded context, 정책은 club)
[app]     manager-console · marketplace-console · user-app-web · user-app-ios · user-app-android           (= apps/·services/ 폴더 = 배포 단위)
          consumer-bff · manager-bff · iam-service · club-service · booking-service · saga-service · billing-service
          chat-service · chat-gateway · notify-service · concierge-service · partner-service · job-service · location-service · weather-service
[layer]   contract · persist · service · bff · ui · async                                                 (아키텍처 역할)
```

- **부여 규칙**: 에픽(부모 Issue) = `domain:*` 만 / 주제(Sub-issue) = 보통 미부착(에픽 상속) / 컴포넌트(Sub-issue 2단) = `app:*` + `layer:*`
- ⚠️ **Linear는 한 그룹당 라벨 1개만 허용** → 컴포넌트 = `domain 1 × app 1 × layer 1` (한 배포단위×한 역할). 변경이 여러 app/layer에 걸치면 **컴포넌트를 app별로 분리**(거대 단일 이슈 금지). 분리 전이면 주(primary) 1개만 부착
- **layer 정의**: `contract`=NATS 패턴·DTO·shared types / `persist`=Prisma·Drizzle 스키마+마이그레이션 / `service`=microservice 도메인 로직 / `bff`=consumer-bff·manager-bff REST→NATS 브리지 / `ui`=프론트(web·ios·android) / `async`=job 스케줄·notify 발송·outbox
- ⚠️ `layer:service`(도메인 로직 계층) ≠ `app:*-service`(배포 단위) — app=어디 배포 / layer=무슨 역할
- **가로 뷰**(트리로 못 뽑음): `domain:booking + layer:ui` = 예약 UI 전부 / `+ layer:service` = 예약 백엔드 로직 전부 / `+ layer:bff` = 예약 BFF 전부
- **컴포넌트 추적**: `contract`는 기능에 자동 수반 → 별도 하위이슈 X(service·bff·ui에 포함). `persist`/`service`/`bff`/`ui`/`async`(발송 있을 때만)만 추적

### 브랜치 연결

한 기능 = 한 브랜치 OK(이슈 N개 가능). Linear는 브랜치명이 아니라 **커밋/PR의 이슈 ID로 연결** — 커밋 `feat(booking): … (UNI-91)` · PR 본문 `Closes UNI-96, UNI-97`

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
