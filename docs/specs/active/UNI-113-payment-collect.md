---
issue: UNI-113
pr:
---

# UNI-113 (수납) — payment-service 신설: 현장결제 기록·일마감

> Linear: https://linear.app/uniyous/issue/UNI-113
> 설계: docs/architecture/erp-booking-split.md "결제·정산 — 수납/청구 분리"

UNI-113 체크리스트 중 **수납(매니저) = `payment-service` 신설**만 담는다(브랜치 `feat/UNI-113-payment-collect`).
나머지(billing PgProvider·PgConfigResolver·정산·웹훅)는 **마켓 영역** → 별도 청크/이슈.

## 역할 분리 (확정 2026-06-23)

| | 수납 = `payment-service`(매니저·신규) | 청구 = `billing-service`(마켓) |
|---|---|---|
| 결제 | 현장(현금·카드단말 VAN) | 온라인 PG(Toss) |
| 트리거 | manager-saga `CREATE_DESK_BOOKING`·`KIOSK_CHECKIN`의 `payment.collect` | marketplace-saga + PG 위젯 |
| DB | `payment_db`(신규) | `billing_db` |

## 계약 (manager-saga가 이미 호출 중 — payment가 구현)

manager-saga 정의의 step action을 payment-service가 NATS로 응답한다(NatsResponse).

- **NATS `payment.collect`** (request-reply) — saga `COLLECT_PAYMENT` step
  - 요청: `{ bookingId: number, amount: number, method: 'CASH'|'CARD', staffId?: number, kioskId?: string, clubId?: number, companyId?: number }`
  - 응답: `NatsResponse.success({ paymentId, receiptId, status: 'COLLECTED', amount })`
  - 멱등: `bookingId` 기준 — 이미 COLLECTED면 기존 레코드 반환(saga 재시도 안전)
- **NATS `payment.refund`** (compensation) — saga `COLLECT_PAYMENT.compensate`
  - 요청: 동일 `buildRequest`(`{ bookingId, amount, method, staffId/kioskId }`)
  - 응답: `NatsResponse.success({ refunded: true })`. 미존재/이미 환불이면 멱등 성공
- **NATS `payment.list` / `payment.get`** (manager-bff 조회) — `manager.*` 네임스페이스 검토
- **NATS `payment.dailyClose`** (일마감) — `{ closeDate, clubId, closedBy }` → 당일 수납 집계·마감 레코드

> ⚠️ 진입 subject `payment.*`는 manager-saga 계약과 **정확히 일치**해야 함(targetService=PAYMENT_SERVICE). 변경 시 manager-saga 정의 동시 수정.

## 수용 기준

- [ ] `manager/services/payment-service` 신설 (NestJS + Drizzle, `payment_db`). manager-saga-service 인프라 템플릿 재사용(pgboss·saga-engine 의존 제거)
- [ ] `payment.collect` — 현장결제 기록 생성, `bookingId` 멱등, `receiptId` 발급. 응답 shape가 saga `mergeResponse`(receiptId) 충족
- [ ] `payment.refund` — 보상(환불 기록), 멱등
- [ ] `payment.dailyClose` — 일별·클럽별 수납 집계 + `payment_closes` 레코드
- [ ] 테넌시: `payments`에 `companyId` 컬럼+인덱스 (ERP 단독 격리 — UNI-94 정합)
- [ ] `payment_db` k8s 등록(platform postgres `databases`) + manager 차트 서비스 등록 + cd-services/ci
- [ ] 빌드/기동: tsc · Docker · 컨테이너 런타임 green. NatsResponse·UnifiedExceptionFilter 준수

## DB (`payment_db`, Drizzle)

```
payments        id · bookingId · clubId · companyId · amount · method(CASH|CARD)
                · channel(DESK|PHONE|WALK_IN|KIOSK) · status(COLLECTED|REFUNDED)
                · receiptId · staffId · kioskId · collectedAt · refundedAt
                @@unique(bookingId)  -- 멱등
payment_closes  id · closeDate · clubId · companyId · totalAmount · count · closedBy · closedAt
```

## 범위 / 변경 파일

신규:
- `manager/services/payment-service/` (NestJS: main·app.module·common/{nats,db,exceptions,health}·payment/{controller,service,repository}·db/schema)
- `docs/specs/active/UNI-113-payment-collect.md`

인프라:
- `platform/infra/k8s/values.yaml`(postgres.databases += `payment_db`)
- `manager/infra/k8s/values*.yaml`(payment-service 등록)
- `.github/workflows/cd-services.yml`(목록·제품매핑=manager·Docker 컨텍스트는 shared 의존 없으면 서비스 디렉터리)

## 배포 의존성

- payment-service는 **leaf**(NATS 수신만, 외부 서비스 호출 없음 — 인벤토리는 club, 부킹은 frontdesk가 담당) → 호출자 재배포 의존 없음
- `payment_db` 생성(platform postgres-init `CREATE DATABASE WHERE NOT EXISTS`) 선행
- manager-saga의 `CREATE_DESK_BOOKING`/`KIOSK_CHECKIN` `COLLECT_PAYMENT` step이 이 서비스로 해소됨 → **frontdesk-service(UNI-114)와 함께 desk-booking E2E 완성**(frontdesk 미존재 시 saga 1·4 step은 여전히 계약/타임아웃)
- shared `file:` 의존 없음 → Docker 컨텍스트 = 서비스 디렉터리(일반 서비스 패턴, marketplace-saga 같은 루트 컨텍스트 불필요)
