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
| **[3a]** | `shared/packages/pg-provider` 신설 — `PgProviderPort` + `TossAdapter` | 없음 | ✅ 이번 |
| [3b] | billing → pg-provider 전환 (Docker 루트컨텍스트·file: 의존·에러매핑) | marketplace 인프라 | 후속 |
| [3c] | payment-service 통합 + `PgConfigResolver`(클럽별) + frontdesk PG 경로 | resolver 세부·frontdesk(greenfield) | 후속 |

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

## 후속 ([3b]·[3c]) — 본 PR 범위 아님

- [3b] billing `TossApiService` → `TossAdapter` 위임(시그니처 유지, `PgProviderError`→`AppException` 매핑), Dockerfile 루트컨텍스트, `package.json` file: 의존, cd-services CONTEXT 분기, lockfile
- [3c] payment-service `PgProviderPort` 레지스트리 + `PgConfigResolver`(세부 추후) + frontdesk PG 결제(staffId·clubId·워크인) — frontdesk greenfield 대기

## 미해결

- `PgConfigResolver` 세부 항목(클럽별 PG 매핑·시크릿 참조 키 규약) — 사용자 추후 정의
- 멀티 PG 2번째 provider(KakaoPay 등) 추가 시 `PgProviderName` 확장
