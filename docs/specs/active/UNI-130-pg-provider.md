---
issue: UNI-130
pr:
---

# UNI-130 [3] — PgProvider 포트 + TossAdapter 공유 추출 + frontdesk PG

> Linear: https://linear.app/uniyous/issue/UNI-130
> 부모: UNI-113 "결제·정산·마감 모델" — 4능력 중 ③ PG 결제

## 배경 (왜)

제품별 PG 결정 주체가 다름(UNI-113 결정 2026-06-28):

| | marketplace `billing-service` | manager `payment-service` |
|---|---|---|
| PG 결정 | PGM 본사 → **Toss 단일** | 골프장별 → **멀티 PG** |
| 추상화 | 불필요(어댑터 직접) | **PgProviderPort + PgConfigResolver** |

billing의 `TossApiService`는 `ConfigService`+HTTP만 의존(저결합)이라 공유 가능. 단 ⚠️ 두 결합을 끊어야 함:
1. **시크릿 키 단일 env(`TOSS_SECRET_KEY`)** → 골프장별 시크릿과 충돌 → **자격증명을 호출 인자로** 주입(per-call)
2. **에러 매핑이 billing 로컬 `AppException/Errors`** → 공유 불가 → 어댑터는 **정규화 `PgProviderError`** 만 throw, consumer가 자기 예외로 매핑

## 분해 (청크별 PR)

| | 내용 | 의존 | 본 spec |
|---|---|---|---|
| **[3a]** | `shared/packages/pg-provider` 신설 — `PgProviderPort` + `TossAdapter` | 없음 | ✅ PR #61 |
| **[3c-i]** | payment-service PG 설정 해석 — `PgConfigResolver`·`PgProviderRegistry`·`PgSecretProvider`·게이트웨이·`pg_configs` | [3a] | ✅ PR #61 |
| **[3c-ii]** | PG 결제 경로 — `payment.pg.confirm`/`cancel` → payments 기록(provider·paymentKey·pgRaw) | [3c-i] | ✅ PR #61 |
| [3b] | billing → pg-provider 전환 (Docker 루트컨텍스트·file: 의존·에러매핑) | marketplace 인프라 | 후속 |

## [3a] 계약 — `@uniyous/pg-provider`

framework 무관 순수 TS(글로벌 `fetch`). NestJS/axios 비의존 → 어느 서비스든 provider로 감싸 사용.

```
PgCredentials   { provider: 'TOSS', secretKey, baseUrl?, testBypass? }   // per-call 주입
PgProviderPort  confirm · get · cancel · issueBillingKey · billingPayment
                각 메서드: (creds: PgCredentials, input) => Promise<PgPaymentResult>
PgPaymentResult { provider, paymentKey, orderId, status, approvedAt?, totalAmount, balanceAmount, method?, raw }
                // raw = provider 원본(카드·가상계좌 등 상세는 consumer가 raw에서 매핑)
PgProviderError (code: PgErrorCode, provider, providerCode?, message)
                // ALREADY_PROCESSED·INVALID_CARD·EXCEED_LIMIT·INSUFFICIENT_BALANCE
                // ·NOT_FOUND·ALREADY_CANCELLED·EXCEED_CANCEL_AMOUNT·UNAVAILABLE·TIMEOUT·UNKNOWN
TossAdapter implements PgProviderPort  (provider='TOSS')
```

- **자격증명 per-call**: billing은 env(`TOSS_SECRET_KEY`)로 `PgCredentials` 구성, payment는 `PgConfigResolver`(Club→Company→Platform)+Secret Manager로 클럽별 구성. 어댑터는 stateless → 멀티테넌트 안전.
- **에러 정규화**: Toss 에러코드 → `PgErrorCode` (billing 기존 매핑 보존). consumer가 `PgProviderError.code` → 자기 예외(billing `AppException/Errors`, payment 자체 catalog) 매핑.
- **E2E 우회**: `creds.testBypass && paymentKey.startsWith('e2e_test_')` → API 미호출(비-prod에서 consumer가 결정).
- **타임아웃**: `AbortController` 기본 60s(Toss 권장).

## 수용 기준 ([3a])

- [ ] `shared/packages/pg-provider` 신설 — port·toss-adapter·types·index, `@uniyous/pg-provider`(file: 의존, 배포 X)
- [ ] `TossAdapter` 5메서드 — billing `TossApiService`와 동일 엔드포인트·바이패스·에러매핑(정규화)
- [ ] `tsc` green (글로벌 fetch, `@types/node`), consumer 미수정(추출만)

## [3c-i] PG 설정 해석 — payment-service (PR #61)

골프장별 PG 선택의 **설정 해석 서브시스템**. 실제 결제 경로(confirm/cancel→payments)는 [3c-ii].

```
pg_configs (payment_db)   scopeLevel(PLATFORM|COMPANY|CLUB) · companyId? · clubId? · provider(TOSS)
                          · secretRef(Secret Manager 이름) · baseUrl? · active   @@unique(scope,company,club)
PgConfigResolver          resolve(clubId?, companyId?) → Club→Company→Platform fallback (정책 resolve 동형)
PgSecretProvider          secretRef → 실제 키. EnvPgSecretProvider(now) / SecretManager(후속). 키는 메모리 외 노출 X
PgProviderRegistry        provider → 어댑터(TOSS=TossAdapter, @uniyous/pg-provider)
PgGatewayService          resolveGateway() → { creds: PgCredentials, port } · pg_configs CRUD(secretRef만 노출)
pgErrorToAppException      PgProviderError(정규화) → PAY_* 카탈로그
```

- **NATS**: `payment.pgConfig.upsert` / `.list` / `.resolve` (manager-bff 관리). resolve 응답은 **secretRef만**(실제 키 절대 미노출).
- 어댑터 dep: `@uniyous/pg-provider`(file: 의존) + Dockerfile 루트컨텍스트에 pg-provider 빌드·복사 추가.

## [3c-ii] PG 결제 경로 — payment-service (PR #61)

온라인 PG(간편결제·신용카드) 결제. `PgGatewayService`를 소비.

- **NATS `payment.pg.confirm`** — `{ bookingId, paymentKey, orderId, amount, clubId?, companyId?, staffId?, kioskId?, channel?, pricingSnapshot? }`
  → `resolveGateway(clubId, companyId)` → `adapter.confirm(creds, ...)` → payments 기록(`method='CARD'`·`provider`·`paymentKey`·`pgRaw`·`status='COLLECTED'`). `bookingId`/`paymentKey` 멱등.
  → 응답 `NatsResponse.success({ paymentId, receiptId, status, amount, provider, paymentKey })`
- **NATS `payment.pg.cancel`** (보상) — `{ bookingId, cancelReason?, cancelAmount? }` → `adapter.cancel` → `status='REFUNDED'`. 미존재/이미 환불/**현장결제(provider=null)** 면 멱등 no-op.
- payments 스키마: `provider`(null=현장·TOSS=PG) · `payment_key`(unique) · `pg_raw`(jsonb). method enum 불변(현장 CARD=VAN, PG도 CARD지만 `provider`로 구분).
- `PgProviderError`(정규화) → `pgErrorToAppException` → `PAY_*`.

> ⚠️ frontdesk(greenfield) 연동: 위젯 paymentKey 발급 후 `payment.pg.confirm` 호출. saga `COLLECT_PAYMENT`의 PG 분기(현장 vs PG 라우팅)는 frontdesk 설계 시 확정 — 현재 계약만 제공(contract-first).

## 후속 — 본 PR 범위 아님

- **[3b]** billing `TossApiService` → `TossAdapter` 위임(시그니처 유지, `PgProviderError`→`AppException` 매핑), Dockerfile 루트컨텍스트, file: 의존, cd-services CONTEXT 분기, lockfile

## 미해결

- `PgConfigResolver` 세부 항목(클럽별 PG 매핑·시크릿 참조 키 규약) — 사용자 추후 정의
- 멀티 PG 2번째 provider(KakaoPay 등) 추가 시 `PgProviderName` 확장
