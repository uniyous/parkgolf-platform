---
issue: UNI-131
pr:
---

# UNI-131 [4] — PG 정산 모델 (settlement 클럽×provider 일/주/월)

> Linear: https://linear.app/uniyous/issue/UNI-131
> 부모: UNI-113 "결제·정산·마감 모델" — 4능력 중 ④ 정산

## 배경

PG사 계약이 **일/주/월**로 다름 → 클럽 × provider × 주기 단위로 PG 결제를 집계·대사·지급한다.
선행: [3c-ii]에서 `payments`에 `provider`·`pgConfigId` 기록됨. 수수료율은 `pg_configs.feeRate`(PG 계약).

## 데이터 (`payment_db`)

```
pg_configs   += feeRate(bps, 330=3.3%)   -- 정산 fee 산정
settlements   clubId · companyId? · provider · cycle(DAILY|WEEKLY|MONTHLY) · periodKey
              · periodStart · periodEnd
              · grossAmount(COLLECTED 합) · refundAmount(REFUNDED 합) · netAmount(gross−refund)
              · feeRate(스냅샷) · feeAmount(net×feeRate) · payoutAmount(net−fee) · count
              · status(PENDING|RECONCILED|PAID) · reconciledAt? · paidAt?
              @@unique(clubId, provider, cycle, periodKey)
```

## 계약 (NATS — manager-bff·job → payment-service)

- **`payment.settlement.run`** — `{ clubId, companyId?, provider, cycle, periodKey, periodStart?, periodEnd? }`
  → 기간 내 집계·upsert(클럽·provider·cycle·periodKey 멱등). 기존 `status` 보존(재실행이 PAID 되돌리지 않음).
  → 기간 산출: DAILY(`YYYY-MM-DD`)·MONTHLY(`YYYY-MM`)는 KST로 자동, WEEKLY 등은 `periodStart/End` 명시.
- **`payment.settlement.list`** — `{ clubId?, provider?, cycle?, status?, page?, limit? }` (paginated)
- **`payment.settlement.get`** — `{ id }`
- **`payment.settlement.updateStatus`** — `{ id, status }` → RECONCILED/PAID 타임스탬프

## 산식

```
gross   = Σ payments.amount  where provider·clubId, status=COLLECTED, collectedAt ∈ [start,end)
refund  = Σ payments.amount  where provider·clubId, status=REFUNDED,  refundedAt  ∈ [start,end)
net     = gross − refund
feeRate = pg_configs.resolve(clubId, companyId).feeRate  (provider 일치 시)
fee     = round(net × feeRate / 10000)
payout  = net − fee
```

## 수용 기준 ([4])

- [x] `settlements` 스키마 + `pg_configs.feeRate` + 마이그레이션 0005
- [x] `SettlementService` run(집계·upsert)·list·get·updateStatus
- [x] NATS `payment.settlement.*`
- [x] 빌드 green

## 후속 / 미해결

- **정산 주기 스케줄(job)**: cycle별 periodKey 자동 산출·실행은 job-service 또는 manager-bff 스케줄러로 (현재는 외부 트리거)
- WEEKLY 자동 기간 산출(ISO week) — 현재 명시 기간 필요
- 회사/플랫폼 롤업, 다중 provider 동시 정산
- refund 귀속 기준: 본 구현은 `refundedAt` 기간 귀속(발생 시점 차감)
