---
issue: UNI-127
pr: https://github.com/uniyous/parkgolf-platform/pull/49
---

# UNI-127 — saga-service → marketplace-saga-service 리네임

> Linear: https://linear.app/uniyous/issue/UNI-127/7-manager-saga-service-신규-sagamarketplace-saga-리네임

UNI-127 체크리스트 중 **리네임 청크**만 담는다(브랜치 `feat/UNI-127-marketplace-saga-rename`).
`shared/packages/saga-engine` 추출 · `manager-saga-service` 신설은 별도 청크/PR.

## 핵심 결정: 정체성만 리네임, 전송/저장 경계는 유지

마켓 saga 서비스의 **배포 단위 정체성**(폴더·패키지·k8s·CI·라벨·로그/메타 태그)만 `saga-service → marketplace-saga-service`로 바꾼다.
**blast 최소화**를 위해 다음 둘은 **유지**한다(변경 0):

| 항목 | 결정 | 이유 |
|---|---|---|
| NATS 진입 subject `saga.booking.*` | **유지** | 호출자(consumer-bff·manager-bff·booking-service) 무변경 |
| DB 이름 `saga_db` | **유지** | 마이그레이션·시크릿·DSN 무변경 |

→ 호출자 BFF는 단일 `natsClient`로 subject만 호출하므로 전용 DI 토큰 변경 없음.

## 수용 기준 (검증 가능하게)

- [ ] 폴더 `services/saga-service/` → `services/marketplace-saga-service/` (git mv, 히스토리 유지)
- [ ] `package.json` name·description `parkgolf-saga-service` → `parkgolf-marketplace-saga-service`
- [ ] 서비스 자기식별 문자열 변경: `main.ts` NATS connect 이름, `health.controller.ts` `service` 필드
- [ ] k8s Helm(`values.yaml`·`values-dev.yaml`·`values-prod.yaml`) 서비스 name 키 → `marketplace-saga-service` (db는 `saga_db` 유지)
- [ ] CI `cd-services.yml` SERVICES 목록 항목 리네임
- [ ] booking-service 메타 태그 `orchestrator: 'saga-service'` → `'marketplace-saga-service'` (이벤트 기록 정체성)
- [ ] 코드 주석/로그의 `saga-service` 표기를 `marketplace-saga-service`로 갱신(마켓 흐름 한정)
- [ ] 문서(`docs/architecture/*`, `docs/workflow/*`, `CLAUDE.md`, `UNI-92` spec)의 마켓 saga 서비스명 갱신 + erp-booking-split.md "리네임 나중/보류" 노트 제거(→ UNI-127에서 수행으로 갱신)
- [ ] `grep -r "saga-service"`로 잔존 참조 0 (subject `saga.booking.*`·DB `saga_db`는 매치 아님)
- [ ] `npm run build`(marketplace-saga-service) 통과

## 계약 (변경되는 인터페이스)

- **NATS**: 변경 없음 — `saga.booking.create`·`saga.booking.cancel`·`saga.booking.adminRefund` 등 그대로
- **BFF**: 변경 없음 — consumer-bff·manager-bff 호출 경로 동일
- **DB**: 변경 없음 — `saga_db`
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

- saga 응답 shape 변경 **없음**. 단 배포 단위명이 바뀌므로 GitOps 순서:
  1. `cd-services` SERVICES 목록 + Helm 값 머지(구 `saga-service` 디플로이 제거, 신 `marketplace-saga-service` 생성)
  2. subject·DB 무변경이라 consumer-bff·manager-bff·booking-service 재배포 불필요(코드 주석/메타만 바뀐 경우 무중단)
- ArgoCD가 구 Deployment를 정리하도록 Helm 렌더 결과 확인 필요(이름 변경 = 신규 리소스 생성 + 구 리소스 prune).
