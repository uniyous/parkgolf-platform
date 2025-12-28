# 회원 등급 (Membership Tier) 구축 전략

## 1. 개요

파크골프 서비스의 결제 기반 멤버십 시스템을 구축합니다.
회원은 등급에 따라 차별화된 혜택을 받으며, 유료 구독을 통해 상위 등급으로 업그레이드할 수 있습니다.

---

## 2. 멤버십 등급 체계

### 2.1 등급 정의

| 등급 | 코드 | 월 요금 | 설명 |
|------|------|---------|------|
| 일반 회원 | `MEMBER` | 무료 | 기본 서비스 이용 가능 |
| 프리미엄 | `PREMIUM` | 9,900원 | 우선 예약 + 할인 혜택 |
| VIP | `VIP` | 29,900원 | 모든 프리미엄 혜택 + 전용 서비스 |

### 2.2 등급별 혜택 상세

| 혜택 | MEMBER | PREMIUM | VIP |
|------|:------:|:-------:|:---:|
| 예약 가능 | O | O | O |
| 예약 할인율 | - | 10% | 20% |
| 우선 예약 (D-7) | - | O | O |
| 프리미엄 시간대 예약 | - | - | O |
| 예약 취소 수수료 면제 | - | O | O |
| 동반자 할인 (1인) | - | - | O |
| 전용 고객센터 | - | - | O |
| 이벤트 우선 참여 | - | O | O |

---

## 3. 데이터베이스 모델 설계

### 3.1 ERD (Entity Relationship Diagram)

```
┌─────────────────┐       ┌──────────────────────┐
│      User       │       │   MembershipTier     │
├─────────────────┤       ├──────────────────────┤
│ id              │       │ code (PK)            │
│ email           │       │ name                 │
│ password        │       │ monthlyPrice         │
│ name            │       │ description          │
│ membershipCode ─┼──────>│ level                │
│ roleCode        │       │ isActive             │
│ isActive        │       └──────────────────────┘
│ createdAt       │                │
│ updatedAt       │                │ 1:N
└────────┬────────┘                ▼
         │              ┌──────────────────────┐
         │              │  MembershipBenefit   │
         │              ├──────────────────────┤
         │              │ id                   │
         │              │ tierCode (FK)        │
         │              │ benefitType          │
         │              │ benefitValue         │
         │              │ description          │
         │              └──────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────┐       ┌──────────────────────┐
│ MembershipSubscription  │       │   PaymentHistory     │
├─────────────────────────┤       ├──────────────────────┤
│ id                      │       │ id                   │
│ userId (FK)             │       │ subscriptionId (FK)  │
│ tierCode (FK)           │       │ amount               │
│ status                  │──────>│ paymentMethod        │
│ startDate               │       │ status               │
│ endDate                 │       │ paidAt               │
│ autoRenew               │       │ pgTransactionId      │
│ createdAt               │       └──────────────────────┘
│ updatedAt               │
└─────────────────────────┘
```

### 3.2 Prisma Schema 추가 모델

```prisma
// ============================================
// 멤버십 등급 마스터
// ============================================
model MembershipTier {
  code          String   @id                    // 등급 코드 (MEMBER, PREMIUM, VIP)
  name          String                          // 등급 이름
  monthlyPrice  Int      @default(0) @map("monthly_price")  // 월 요금 (원)
  yearlyPrice   Int?     @map("yearly_price")   // 연간 요금 (할인 적용)
  description   String?                         // 등급 설명
  level         Int      @default(1)            // 등급 레벨 (높을수록 상위)
  color         String?                         // UI 표시 색상
  icon          String?                         // UI 표시 아이콘
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // 관계
  users         User[]
  benefits      MembershipBenefit[]
  subscriptions MembershipSubscription[]

  @@map("membership_tiers")
}

// ============================================
// 멤버십 혜택
// ============================================
model MembershipBenefit {
  id            Int      @id @default(autoincrement())
  tierCode      String   @map("tier_code")
  benefitType   String   @map("benefit_type")   // DISCOUNT, PRIORITY, ACCESS, SERVICE
  benefitKey    String   @map("benefit_key")    // 혜택 식별자 (예: BOOKING_DISCOUNT)
  benefitValue  String   @map("benefit_value")  // 혜택 값 (예: "10" for 10%)
  description   String?                         // 혜택 설명
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // 관계
  tier          MembershipTier @relation(fields: [tierCode], references: [code])

  @@unique([tierCode, benefitKey])
  @@map("membership_benefits")
}

// ============================================
// 멤버십 구독 (결제 이력)
// ============================================
model MembershipSubscription {
  id            Int       @id @default(autoincrement())
  userId        Int       @map("user_id")
  tierCode      String    @map("tier_code")
  status        String    @default("ACTIVE")    // ACTIVE, CANCELLED, EXPIRED, PENDING
  billingCycle  String    @default("MONTHLY") @map("billing_cycle")  // MONTHLY, YEARLY
  startDate     DateTime  @map("start_date")
  endDate       DateTime  @map("end_date")
  autoRenew     Boolean   @default(true) @map("auto_renew")
  cancelledAt   DateTime? @map("cancelled_at")
  cancelReason  String?   @map("cancel_reason")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // 관계
  user          User           @relation(fields: [userId], references: [id])
  tier          MembershipTier @relation(fields: [tierCode], references: [code])
  payments      PaymentHistory[]

  @@map("membership_subscriptions")
}

// ============================================
// 결제 이력
// ============================================
model PaymentHistory {
  id              Int       @id @default(autoincrement())
  subscriptionId  Int       @map("subscription_id")
  amount          Int                               // 결제 금액
  currency        String    @default("KRW")         // 통화
  paymentMethod   String    @map("payment_method")  // CARD, KAKAO, NAVER, TOSS
  status          String    @default("PENDING")     // PENDING, COMPLETED, FAILED, REFUNDED
  pgProvider      String?   @map("pg_provider")     // PG사 (toss, nice, etc)
  pgTransactionId String?   @map("pg_transaction_id")  // PG 거래 ID
  paidAt          DateTime? @map("paid_at")
  failedAt        DateTime? @map("failed_at")
  failReason      String?   @map("fail_reason")
  refundedAt      DateTime? @map("refunded_at")
  refundAmount    Int?      @map("refund_amount")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // 관계
  subscription    MembershipSubscription @relation(fields: [subscriptionId], references: [id])

  @@map("payment_histories")
}

// ============================================
// User 모델 수정 (기존 모델에 추가)
// ============================================
model User {
  id             Int       @id @default(autoincrement())
  email          String    @unique
  password       String
  name           String?
  membershipCode String    @default("MEMBER") @map("membership_code")  // 현재 멤버십 등급
  roleCode       String    @default("USER") @map("role_code")
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  // 관계
  membership     MembershipTier           @relation(fields: [membershipCode], references: [code])
  role           RoleMaster               @relation(fields: [roleCode], references: [code])
  subscriptions  MembershipSubscription[]
  refreshTokens  RefreshToken[]

  @@map("users")
}
```

### 3.3 초기 데이터 (Seed)

```sql
-- 멤버십 등급 마스터 데이터
INSERT INTO membership_tiers (code, name, monthly_price, yearly_price, description, level, color, icon, is_active)
VALUES
  ('MEMBER', '일반 회원', 0, 0, '기본 서비스 이용 가능', 1, '#6B7280', 'user', true),
  ('PREMIUM', '프리미엄', 9900, 99000, '우선 예약 + 할인 혜택', 2, '#8B5CF6', 'star', true),
  ('VIP', 'VIP', 29900, 299000, '모든 프리미엄 혜택 + 전용 서비스', 3, '#F59E0B', 'crown', true);

-- 멤버십 혜택 데이터
INSERT INTO membership_benefits (tier_code, benefit_type, benefit_key, benefit_value, description)
VALUES
  -- MEMBER 혜택
  ('MEMBER', 'ACCESS', 'BASIC_BOOKING', 'true', '기본 예약 가능'),

  -- PREMIUM 혜택
  ('PREMIUM', 'ACCESS', 'BASIC_BOOKING', 'true', '기본 예약 가능'),
  ('PREMIUM', 'DISCOUNT', 'BOOKING_DISCOUNT', '10', '예약 10% 할인'),
  ('PREMIUM', 'PRIORITY', 'ADVANCE_BOOKING', '7', '7일 전 우선 예약'),
  ('PREMIUM', 'SERVICE', 'CANCEL_FEE_FREE', 'true', '취소 수수료 면제'),
  ('PREMIUM', 'ACCESS', 'EVENT_PRIORITY', 'true', '이벤트 우선 참여'),

  -- VIP 혜택
  ('VIP', 'ACCESS', 'BASIC_BOOKING', 'true', '기본 예약 가능'),
  ('VIP', 'DISCOUNT', 'BOOKING_DISCOUNT', '20', '예약 20% 할인'),
  ('VIP', 'PRIORITY', 'ADVANCE_BOOKING', '14', '14일 전 우선 예약'),
  ('VIP', 'SERVICE', 'CANCEL_FEE_FREE', 'true', '취소 수수료 면제'),
  ('VIP', 'ACCESS', 'PREMIUM_TIMESLOT', 'true', '프리미엄 시간대 예약'),
  ('VIP', 'DISCOUNT', 'COMPANION_DISCOUNT', '10', '동반자 10% 할인'),
  ('VIP', 'SERVICE', 'DEDICATED_SUPPORT', 'true', '전용 고객센터'),
  ('VIP', 'ACCESS', 'EVENT_PRIORITY', 'true', '이벤트 우선 참여');
```

---

## 4. API 설계

### 4.1 멤버십 조회 API

```
GET /api/membership/tiers
- 모든 멤버십 등급 목록 조회

GET /api/membership/tiers/:code
- 특정 등급 상세 조회 (혜택 포함)

GET /api/membership/my
- 내 멤버십 정보 조회
```

### 4.2 구독 관리 API

```
POST /api/membership/subscribe
- 멤버십 구독 시작
- Body: { tierCode, billingCycle, paymentMethod }

POST /api/membership/cancel
- 구독 취소 (기간 만료까지 유지)
- Body: { reason? }

POST /api/membership/upgrade
- 등급 업그레이드
- Body: { tierCode, paymentMethod }

GET /api/membership/subscriptions
- 구독 이력 조회
```

### 4.3 결제 API

```
POST /api/payments/process
- 결제 처리
- Body: { subscriptionId, paymentMethod, pgToken }

POST /api/payments/refund
- 환불 처리
- Body: { paymentId, amount, reason }

GET /api/payments/history
- 결제 이력 조회
```

---

## 5. 비즈니스 로직

### 5.1 등급 변경 규칙

```typescript
// 업그레이드: 즉시 적용, 차액 결제
if (newTier.level > currentTier.level) {
  const proratedAmount = calculateProration(currentSubscription, newTier);
  await processPayment(proratedAmount);
  await upgradeMembership(userId, newTier);
}

// 다운그레이드: 현재 구독 기간 종료 후 적용
if (newTier.level < currentTier.level) {
  await scheduleDowngrade(userId, newTier, currentSubscription.endDate);
}
```

### 5.2 자동 갱신 처리

```typescript
// 매일 자정 실행 (Cron Job)
async function processAutoRenewals() {
  const expiringSubscriptions = await findExpiringSubscriptions(tomorrow);

  for (const subscription of expiringSubscriptions) {
    if (subscription.autoRenew) {
      try {
        await processRenewalPayment(subscription);
        await extendSubscription(subscription);
      } catch (error) {
        await notifyPaymentFailed(subscription.user);
        await scheduleRetry(subscription);
      }
    } else {
      await downgradeToMember(subscription.user);
    }
  }
}
```

### 5.3 혜택 적용 로직

```typescript
// 예약 시 할인 적용
async function calculateBookingPrice(userId: number, basePrice: number) {
  const membership = await getUserMembership(userId);
  const discountBenefit = await getBenefit(membership.tierCode, 'BOOKING_DISCOUNT');

  if (discountBenefit) {
    const discountRate = parseInt(discountBenefit.benefitValue) / 100;
    return basePrice * (1 - discountRate);
  }

  return basePrice;
}

// 우선 예약 가능 여부 확인
async function canBookInAdvance(userId: number, bookingDate: Date) {
  const membership = await getUserMembership(userId);
  const advanceBenefit = await getBenefit(membership.tierCode, 'ADVANCE_BOOKING');

  const daysInAdvance = differenceInDays(bookingDate, new Date());
  const allowedDays = advanceBenefit ? parseInt(advanceBenefit.benefitValue) : 3;

  return daysInAdvance <= allowedDays;
}
```

---

## 6. 구현 단계

### Phase 1: 기반 구축
- [ ] 데이터베이스 스키마 마이그레이션
- [ ] 초기 데이터 시딩
- [ ] 멤버십 서비스 모듈 생성

### Phase 2: 핵심 기능
- [ ] 멤버십 조회 API
- [ ] 구독 관리 API
- [ ] 혜택 적용 로직

### Phase 3: 결제 연동
- [ ] PG사 연동 (Toss Payments 권장)
- [ ] 결제/환불 처리
- [ ] 자동 갱신 스케줄러

### Phase 4: 관리자 기능
- [ ] 멤버십 등급 관리 UI
- [ ] 구독 현황 대시보드
- [ ] 결제 이력 조회

---

## 7. 고려 사항

### 7.1 결제 안정성
- 결제 실패 시 3회까지 재시도 (1일, 3일, 7일 간격)
- 최종 실패 시 일반 회원으로 자동 다운그레이드
- 모든 결제 상태 변경 로깅

### 7.2 혜택 남용 방지
- 다운그레이드 후 재구독 시 기존 혜택 즉시 복원되지 않음 (당월 적용)
- 환불 정책: 구독 후 7일 이내 100% 환불, 이후 일할 계산

### 7.3 확장성
- 프로모션 코드 시스템 추가 가능
- 골프장별 제휴 할인 확장 가능
- 포인트 적립 시스템 연계 가능

---

## 8. 관련 문서

- [시스템 아키텍처](./ARCHITECTURE.md)
- [API 문서](./services/API_DOCS.md)
- [결제 연동 가이드](./PAYMENT_INTEGRATION.md) (추후 작성)
