---
issue: UNI-127
pr: https://github.com/uniyous/parkgolf-platform/pull/49
---

# UNI-127 — saga-service → marketplace-saga-service 리네임

> Linear: https://linear.app/uniyous/issue/UNI-127/7-manager-saga-service-신규-sagamarketplace-saga-리네임

UNI-127 체크리스트 중 **리네임 청크**만 담는다(브랜치 `feat/UNI-127-marketplace-saga-rename`).
`shared/packages/saga-engine` 추출 · `manager-saga-service` 신설은 별도 청크/PR.

## 핵심 결정: 정체성 + DB 리네임, NATS subject만 유지

마켓 saga 서비스의 **배포 단위 정체성**(폴더·패키지·k8s·CI·라벨·로그/메타 태그)을 `saga-service → marketplace-saga-service`로, **DB명**을 `saga_db → marketplace_saga_db`로 바꾼다(매니저 saga는 `manager_saga_db` — 별도 청크에서 신설).

| 항목 | 결정 | 이유 |
|---|---|---|
| NATS 진입 subject `saga.booking.*` | **유지** | 호출자(consumer-bff·manager-bff·booking-service) 무변경 — DI 토큰 없음, 단일 `natsClient` subject 호출 |
| DB명 `saga_db` → `marketplace_saga_db` | **리네임** | 제품별 DB 대칭(`marketplace_saga_db`/`manager_saga_db`). DSN은 Helm `db:` 필드 파생이라 선언적 변경, 단 **데이터 이행 1회 필요**(아래 배포 의존성) |

> **결정 변경(2026-06-25)**: 최초 "DB `saga_db` 유지(blast 최소)"에서 **DB도 리네임**으로 변경(제품별 대칭 명명 우선). subject는 여전히 유지하므로 호출자 무변경.

## 수용 기준 (검증 가능하게)

- [ ] 폴더 `services/saga-service/` → `services/marketplace-saga-service/` (git mv, 히스토리 유지)
- [ ] `package.json` name·description `parkgolf-saga-service` → `parkgolf-marketplace-saga-service`
- [ ] 서비스 자기식별 문자열 변경: `main.ts` NATS connect 이름, `health.controller.ts` `service` 필드
- [ ] k8s Helm 서비스 name 키 → `marketplace-saga-service`, 서비스 `db:` 및 `postgres.databases` 목록 → `marketplace_saga_db` (`values.yaml`·`values-prod.yaml`)
- [ ] CI `cd-services.yml` SERVICES 목록 항목 리네임
- [ ] booking-service 메타 태그 `orchestrator: 'saga-service'` → `'marketplace-saga-service'` (이벤트 기록 정체성)
- [ ] 코드 주석/로그의 `saga-service`·`saga_db` 표기 → `marketplace-saga-service`·`marketplace_saga_db`(마켓 흐름 한정)
- [ ] 문서(`docs/architecture/*`·`docs/workflow/*`·`CLAUDE.md`·DB 접속 가이드·`argocd/install.md`·`UNI-92` spec)의 서비스명·DB명 갱신
- [ ] `grep -r "saga-service\|saga_db"`로 잔존 참조 0 (subject `saga.booking.*`만 매치 아님)
- [ ] **데이터 이행**: 배포 전 `ALTER DATABASE saga_db RENAME TO marketplace_saga_db` (또는 dev는 신규 빈 DB + `db:migrate`) — 아래 배포 의존성
- [ ] `npm run build`(marketplace-saga-service) 통과

## 계약 (변경되는 인터페이스)

- **NATS**: 변경 없음 — `saga.booking.create`·`saga.booking.cancel`·`saga.booking.adminRefund` 등 그대로
- **BFF**: 변경 없음 — consumer-bff·manager-bff 호출 경로 동일
- **DB**: `saga_db` → `marketplace_saga_db` (DSN은 Helm `db:` 필드 파생 — 선언적, 단 데이터 이행 1회 필요)
- **배포 단위명**: `saga-service` → `marketplace-saga-service` (k8s Deployment/Service·Helm 키·CI 타깃·이미지 태그 키)

## 범위 / 변경 파일

리네임(폴더·패키지·자기식별):
- `services/saga-service/` → `services/marketplace-saga-service/` (전체)
- `services/marketplace-saga-service/package.json`
- `services/marketplace-saga-service/src/main.ts`
- `services/marketplace-saga-service/src/common/controllers/health.controller.ts`
- `services/marketplace-saga-service/src/contracts/enums.ts`, `src/db/schema.ts`, `src/saga/controller/saga-nats.controller.ts` (주석)

인프라/CI:
- `k8s/charts/parkgolf/values.yaml` · `values-dev.yaml` · `values-prod.yaml`
- `.github/workflows/cd-services.yml`

외부 서비스 참조(주석·로그·메타 태그):
- `services/booking-service/src/booking/**` (`orchestrator` 메타 + 주석/로그)
- `services/concierge-service/src/booking-agent/**` (주석)
- `services/consumer-bff/src/booking/booking.service.ts` (주석)

문서:
- `docs/architecture/erp-booking-split.md`(보류 노트 갱신)·`system.md`·`infrastructure.md`·`observability.md`·`security.md`·`database.md`
- `docs/workflow/saga.md`·`booking.md`·`agent.md`·`agent-pay.md`·`agent-memory.md`
- `CLAUDE.md` · `docs/specs/active/UNI-92-inventory-provider.md`

## 배포 의존성

- saga 응답 shape·subject 변경 **없음** → consumer-bff·manager-bff·booking-service 재배포 불필요(무중단).
- **데이터 이행이 선결**: `marketplace-saga-service`는 부팅 시 마이그레이션을 실행하지 않고 연결만 한다(`drizzle.service.ts`, migrate-job 부재). 따라서 새 DB가 **빈 채로 생성되면 테이블 없음 → 런타임 실패**. 배포 전 둘 중 하나:
  - **데이터 보존(권장)**: 구 서비스 scale 0 → `ALTER DATABASE saga_db RENAME TO marketplace_saga_db` (활성 커넥션 없어야 함) → 신 서비스 기동
  - **dev 초기화**: 신규 빈 `marketplace_saga_db` 생성 후 `db:migrate`로 스키마 적용(saga 실행이력은 휘발성이라 dev 한정 허용)
- GitOps 순서:
  1. 위 데이터 이행 수행(수동·1회)
  2. `cd-services`로 `marketplace-saga-service` 이미지 빌드/푸시 → Helm 값 머지(구 `saga-service` Deployment prune + 신규 생성, `db: marketplace_saga_db`)
- `postgres.databases` 목록에 `marketplace_saga_db` 추가 → postgres-init은 `CREATE DATABASE ... WHERE NOT EXISTS`라 ALTER RENAME 후엔 no-op(안전).
