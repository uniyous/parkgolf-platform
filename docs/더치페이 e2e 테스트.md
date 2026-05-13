# 더치페이 E2E 테스트

`apps/e2e-dev-api`에서 더치페이 흐름을 시나리오별로 검증한다.
production은 agent-service의 LLM 응답에 의존하지만,
e2e는 비결정성을 회피하기 위해 dev 전용 API + 토스 우회 분기를 사용한다.

---

## 1. 운영(production) vs E2E 흐름 차이

```
production
  채팅방(4명) → user-1이 agent에게 더치페이 요청
  → agent가 booking 생성 + payment.splitPrepare 호출 (NATS)
  → 4명 settlement card 수신 (chat-gateway WebSocket)
  → 각자 토스 위젯 → paymentKey 발급 → split/confirm
  → 4번째 confirm 시 PAYMENT_CONFIRMED saga → booking CONFIRMED

e2e (apps/e2e-dev-api)
  4 user 생성 (createE2EUser)
  → booker가 dutchpay booking 생성 (POST /api/user/bookings)
  → booker가 split/prepare 호출 (dev-only HTTP) ← 신규 추가
  → 각자 split/confirm (paymentKey="e2e_test_*") ← TOSS_TEST_BYPASS 우회
  → 4번째 confirm 시 PAYMENT_CONFIRMED saga → booking CONFIRMED
```

---

## 2. 추가된 dev-only API

production에서는 가드 또는 우회 분기로 절대 활성화되지 않도록 설계되었다.

### 2.1 POST `/api/user/payments/split/prepare`

분할결제 준비 — 참여자별 `orderId`를 발급한다.

- **service**: `user-api`
- **commit**: `3f83f6c2` (feat(user-api): dev-only split prepare endpoint)
- **route**: `POST /api/user/payments/split/prepare`
- **guard**: `JwtAuthGuard` + 컨트롤러 내부 `NODE_ENV === 'production'` 차단
- **NATS pattern**: `payment.splitPrepare` (payment-service)

#### 요청 본문

```json
{
  "bookingId": 123,
  "bookingGroupId": null,
  "participants": [
    { "userId": 41, "userName": "Booker", "userEmail": "b@example.com", "amount": 15000 },
    { "userId": 42, "userName": "Friend1", "userEmail": "f1@example.com", "amount": 15000 },
    { "userId": 43, "userName": "Friend2", "userEmail": "f2@example.com", "amount": 15000 },
    { "userId": 44, "userName": "Friend3", "userEmail": "f3@example.com", "amount": 15000 }
  ],
  "expirationMinutes": 5
}
```

#### 응답 (200)

```json
{
  "success": true,
  "data": {
    "bookingId": 123,
    "splits": [
      { "id": 1, "userId": 41, "amount": 15000, "orderId": "SPL-...", "status": "PENDING", "expiredAt": "..." },
      ...
    ]
  }
}
```

#### 403 응답

`NODE_ENV=production`일 때 `ForbiddenException('dev-only endpoint')`.

---

### 2.2 (보류 / 시나리오 ② 시 추가 예정) POST `/api/user/payments/split/timeout/:bookingId`

**목적**: 시나리오 ②(부분 결제 후 timeout) 검증을 위해 saga의 5분 timeout 발화를 즉시 트리거.

- **상태**: 미구현. 시나리오 ② 작성 시 추가.
- **대안**: 5분 실제 대기 후 검증.

---

## 3. payment-service 측 토스 API 우회

### TOSS_TEST_BYPASS env

- **service**: `payment-service`
- **commit**: `e0a82607` (feat(payment): e2e용 토스 API 우회)
- **대상 메서드**: `TossApiService.confirmPayment`, `TossApiService.cancelPayment`
- **활성 조건 (이중 안전장치)**:
  1. `TOSS_TEST_BYPASS=true`
  2. `NODE_ENV !== 'production'`
- **트리거 패턴**: `paymentKey`가 `"e2e_test_"` 접두사로 시작
- **부팅 로그**: `WARN [TossApiService] TEST BYPASS ENABLED — NODE_ENV=development`

### Helm values

| 파일 | 값 |
|------|-----|
| `k8s/charts/parkgolf/values.yaml` (dev 기본) | `TOSS_TEST_BYPASS: "true"` |
| `k8s/charts/parkgolf/values-prod.yaml` | `TOSS_TEST_BYPASS: "false"` (명시) |

---

## 4. 시나리오 목록

| # | 이름 | 상태 | 비고 |
|---|------|------|------|
| ① | Happy Path — 4명 전부 결제 → CONFIRMED | 진행 예정 | |
| ② | 1명만 결제 + 5분 timeout → PAYMENT_TIMEOUT saga → 환불 | 진행 예정 | timeout 즉시 트리거 endpoint 추가 검토 |
| ③ | amount mismatch confirm → 400 | 진행 예정 | |
| ④ | duplicate confirm (멱등성) | 진행 예정 | |
| ⑤ | 다른 user가 남의 orderId confirm 시도 → 권한 거부 | 진행 예정 | |

각 시나리오는 `apps/e2e-dev-api/tests/payment/dutch-*.spec.ts`로 작성.

---

## 5. e2e fixture 헬퍼

`apps/e2e-dev-api/fixtures/`

- `users.ts` — `createE2EUser(request, prefix)` : register + 토큰 (throttler 429 backoff 내장)
- `toss.ts` — `makeE2ePaymentKey(orderId, amount)` : `e2e_test_*` 패턴 paymentKey 생성
- `dutch.ts` (신규 작성 예정) — `prepareDutchSplit`, `confirmAllSplits`, `seedDutchBooking` 등

---

## 6. 운영 안전 점검

| 항목 | 조치 |
|------|------|
| `split/prepare` endpoint | `NODE_ENV=production` 시 403 |
| `TOSS_TEST_BYPASS` | values-prod.yaml에서 false + NODE_ENV 이중 가드 |
| `e2e_test_*` paymentKey | 일반 사용자가 임의로 보내도 production에선 분기 자동 비활성 |
| dev DB 데이터 누적 | booking/payment row가 생성됨 — 주기적 정리 또는 best-effort cleanup |

---

## 7. 참고

- e2e 베이스 URL: `https://dev-api.parkgolfmate.com`
- admin 계정: `admin@parkgolf.com / admin123!@#` (환경변수 `ADMIN_EMAIL/PASSWORD` 오버라이드 가능)
- 토큰 캐시: `~/.parkgolf-e2e/admin-token.json` (TTL 30분)
- throttler: user-api `register/login` 5/60s per IP — 429 backoff 자동 처리
