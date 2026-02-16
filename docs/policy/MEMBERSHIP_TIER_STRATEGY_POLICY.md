# 파크골프 멤버십 설계

---

## 1. 파크골프장의 현실

파크골프장은 일반 골프장과 근본적으로 다르다.

| | 일반 골프장 | 파크골프장 |
|--|----------|----------|
| 이용료 | 10~30만원 | 0~2만원 |
| 운영 형태 | 민간 영리 | **공공(무료) + 민간(유료) 혼재** |
| 이용 빈도 | 월 1~2회 | **주 3~5회** (생활 체육) |
| 핵심 정책 | 회원권, 그린피 | **지역 주민 무료/할인** |
| 이용자 특성 | 예약 중심 | **현장 방문 + 예약 혼합** |

이 현실에서 월 29,900원 VIP 구독은 의미가 없다.
대신 **"지역 주민이면 무료", "자주 오면 할인"** 이 파크골프의 멤버십이다.

---

## 2. 사용자 여정으로 보는 멤버십

```
김철수 (충남 천안시 거주, 주 4회 파크골프)

① 앱 설치 → 회원가입 → 본인인증
   → 주소 확인: 충청남도 천안시
   → 플랫폼 멤버십: FREE (기본)

② "천안 시민 파크골프장" 검색
   → [지역주민 무료] 뱃지 표시
   → 예약 시도 → 지역 매칭 → 0원 자동 적용
   → CompanyMember 자동 등록 (source: REGIONAL)
   → 체크인 → 바로 이용

③ 한 달 후, 통계를 더 보고 싶어짐
   → 파크플러스 구독 (월 4,900원)
   → 라운드 통계 무제한, 날씨 알림, D-7 우선 예약

④ 인근 유료 골프장도 자주 감
   → "강남 파크골프장" 10회 이용권 구매 (120,000원)
   → 예약마다 잔여 횟수 자동 차감

⑤ 다음 시즌
   → 천안 시민 골프장 지역 이용권 자동 갱신
   → 파크플러스 연간 결제로 전환 (49,000원/년)
```

---

## 3. 세 가지 축

```
┌─────────────────────────────────────────────────────────────┐
│                        User                                  │
│                                                              │
│  ① Role (권한)          ── 무엇을 할 수 있는가               │
│     USER / GUEST              예약, 조회, 결제 등             │
│                                                              │
│  ② Membership (플랫폼)  ── 앱에서 어떤 혜택을 받는가          │
│     FREE / PLUS               우선예약, 통계, 할인 등         │
│                                                              │
│  ③ Pass (골프장별)       ── 이 골프장을 어떻게 이용하는가      │
│     REGIONAL / 횟수권 /        지역무료, 10회권, 시즌권 등     │
│     월정기 / 시즌 / 연회원                                    │
└─────────────────────────────────────────────────────────────┘
```

| 축 | 범위 | 관리 | 비용 |
|----|------|------|------|
| Role | 플랫폼 전체 | 시스템 자동 | - |
| Membership | 플랫폼 전체 | 사용자 구독 | 월 4,900원 |
| Pass | **골프장 단위** | 자동(지역) + 구매 | 골프장별 상이 |

---

## 4. 플랫폼 멤버십 (Membership)

### 4.1 등급

| 등급 | 코드 | 가격 | 핵심 가치 |
|------|------|------|----------|
| 일반 | `FREE` | 무료 | 검색, 예약, 기본 기능 |
| 파크플러스 | `PLUS` | 월 4,900원 / 연 49,000원 | 자주 치는 사람을 위한 편의 |

### 4.2 혜택 상세

| 혜택 | FREE | PLUS | 비고 |
|------|:----:|:----:|------|
| 골프장 검색/조회 | O | O | |
| 예약 (D-3) | O | O | 3일 전부터 |
| **우선 예약 (D-7)** | - | O | 7일 전부터 |
| **예약 5% 할인** | - | O | 기본가 기준 |
| **취소 수수료 면제** | - | O | |
| 라운드 통계 | 최근 5회 | **무제한** | 스코어, 코스별 기록 |
| **날씨 알림** | - | O | 예약 당일 기상 변화 시 |
| **광고 제거** | - | O | |
| 동반자 할인 | - | 1인 3% | |
| 이벤트 우선 참여 | - | O | |

### 4.3 기존 Role과의 관계

| 기존 | 변경 | 이유 |
|------|------|------|
| `USER` | 유지 | 인가 용도 그대로 |
| `PREMIUM` | **제거** | 권한과 혜택이 섞여 있었음. 권한은 USER에 통합, 혜택은 `membershipCode=PLUS`로 이관 |
| `GUEST` | 유지 | 미인증 사용자 |

`roleCode`는 **권한**(할 수 있는 것), `membershipCode`는 **혜택**(받을 수 있는 것). 이 둘은 섞이지 않는다.

---

## 5. 가맹점 이용권 (Pass)

### 5.1 이용권 유형

| 유형 | 코드 | 발급 | 설명 |
|------|------|------|------|
| **지역주민** | `REGIONAL` | **자동** (본인인증 주소) | 공공 골프장 무료, 유료 골프장 할인 |
| 건별 | `PER_ROUND` | 현장/예약 시 | 1회 이용 결제 |
| 횟수권 | `MULTI_ROUND` | 구매 | N회 사용, 유효기간 내 |
| 월정기 | `MONTHLY` | 구매 | 한 달 무제한 |
| 시즌권 | `SEASON` | 구매 | 시즌 무제한 (봄/여름/가을) |
| 연회원 | `ANNUAL` | 구매 | 1년 무제한 |

### 5.2 REGIONAL — 지역주민 이용권

파크골프의 핵심 정책. 별도 시스템이 아니라 이용권의 한 유형이다.

**흐름:**

```
사용자 본인인증
  │
  ├─ 주소 확인 → User.regionProvince / regionCity 저장
  │   (v1: 본인인증 응답에서 추출, 불가 시 자기 신고)
  │
  ▼
골프장 예약 시도
  │
  ├─ 해당 골프장에 REGIONAL 이용권 유형 존재?
  │   (관리자가 미리 설정: "천안시민 무료", "충남도민 50%" 등)
  │
  ├─ 사용자 주소와 매칭?
  │   ├─ targetCity 지정 → province + city 일치 필요
  │   └─ targetCity 미지정 → province만 일치 (도 전체)
  │
  ├─ 매칭 성공 (priority 높은 것 1개):
  │   ├─ CompanyMember 자동 등록 (source: REGIONAL)
  │   ├─ CompanyMemberPass 자동 발급 (당해 연말 유효)
  │   └─ 할인 적용 → 예약 진행
  │
  └─ 미매칭 → 기본가 (다음 할인 단계로)
```

**가격 결정 방식:**

| pricingType | 산출 | 예시 |
|-------------|------|------|
| `FREE` | 0원 | 천안시민 → 무료 |
| `FIXED` | 고정 가격 | 시민 → 3,000원 |
| `DISCOUNT_RATE` | 기본가 × (100 - rate)% | 50% 할인 |
| `DISCOUNT_AMOUNT` | 기본가 - 금액 | 2,000원 할인 |

**복수 정책 예시:**

```
천안 시민 파크골프장 (기본가 5,000원):

┌──────────────────────────────────────────────────┐
│ "천안시민 무료"    REGIONAL  충청남도/천안시  FREE   │
│                   priority: 10                    │
├──────────────────────────────────────────────────┤
│ "충남도민 50%"    REGIONAL  충청남도/null   50%     │
│                   priority: 5                     │
└──────────────────────────────────────────────────┘

천안시민 김철수 → priority 10 매칭 → 0원
아산시민 박영희 → priority 5 매칭 → 2,500원
서울시민 이민수 → 미매칭 → 5,000원
```

### 5.3 일반 이용권 — 가맹점 자율 설정

가맹점 관리자가 자기 골프장에 맞게 생성한다.

```
┌─ 강남 파크골프장 ────────────────────────────────┐
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │ 10회 이용권           [MULTI_ROUND]        │   │
│  │ 120,000원 / 유효 90일 / 10회               │   │
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │ 월정기 무제한          [MONTHLY]            │   │
│  │ 200,000원 / 월                             │   │
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │ 2026 시즌권           [SEASON]             │   │
│  │ 500,000원 / 3월~11월 무제한                │   │
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │ 연회원                 [ANNUAL]             │   │
│  │ 1,800,000원 / 1년 무제한                   │   │
│  │ 동반자 1인 50% 할인                        │   │
│  └───────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

---

## 6. 가격 산출 — 단 2단계

모든 할인은 **중첩하지 않는다**. 먼저 매칭되는 것 하나만 적용한다.

```
예약 요청 (userId, companyId, slotPrice)
  │
  │  ┌─────────────────────────────────────────┐
  ├─ │ 1단계: 이용권 (Pass)                     │
  │  │                                         │
  │  │  A. 구매 이용권 확인                     │
  │  │     MULTI_ROUND (잔여 > 0)  → 차감, 0원  │
  │  │     MONTHLY/SEASON/ANNUAL   → 0원        │
  │  │                                         │
  │  │  B. 지역 이용권 확인 (REGIONAL)           │
  │  │     주소 매칭 → 자동 발급 → 할인 가격     │
  │  │                                         │
  │  │  → 매칭 시 STOP                          │
  │  └─────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────┐
  ├─ │ 2단계: 플랫폼 멤버십 (Membership)         │
  │  │                                         │
  │  │  PLUS → BOOKING_DISCOUNT 5% 적용        │
  │  │                                         │
  │  │  → 매칭 시 STOP                          │
  │  └─────────────────────────────────────────┘
  │
  └─ 해당 없음 → 기본가 그대로
```

**1단계 내부 우선순위**: 구매 이용권(A) > 지역 이용권(B).
월정기를 구매한 사용자가 지역주민이어도 월정기로 처리한다 (이미 결제했으므로).

---

## 7. 데이터 모델

### 7.1 전체 ERD

```
                          iam-service
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                                                              │
│  ┌──────────────┐    ┌───────────────┐                      │
│  │    User      │    │MembershipPlan │                      │
│  ├──────────────┤    ├───────────────┤                      │
│  │ id           │    │ code (PK)     │ FREE, PLUS           │
│  │ email        │    │ name          │                      │
│  │ name         │    │ monthlyPrice  │                      │
│  │ phone        │    │ yearlyPrice   │                      │
│  │ password     │    │ level         │                      │
│  │ roleCode  ───┼─>  │ color / icon  │                      │
│  │membershipCode┼──> └───────┬───────┘                      │
│  │regionProvince│          1:N                               │
│  │ regionCity   │            ▼                               │
│  │ isVerified   │    ┌───────────────┐                      │
│  └──────┬───────┘    │Membership     │                      │
│         │            │Benefit        │                      │
│         │            ├───────────────┤                      │
│         │            │ planCode (FK) │                      │
│        1:N           │ benefitType   │                      │
│         │            │ benefitKey    │                      │
│         ▼            │ benefitValue  │                      │
│  ┌──────────────┐    └───────────────┘                      │
│  │Membership    │                                            │
│  │Subscription  │                                            │
│  ├──────────────┤     ┌──────────────┐                      │
│  │ userId (FK)  │     │CompanyMember │                      │
│  │ planCode(FK) │     ├──────────────┤                      │
│  │ status       │     │ companyId    │                      │
│  │ billingCycle │     │ userId       │                      │
│  │ start / end  │     │ source       │ BOOKING/MANUAL/      │
│  │ autoRenew    │     │ isActive     │ WALK_IN/REGIONAL     │
│  │ orderId ─────┼──┐  │ joinedAt     │                      │
│  └──────────────┘  │  └──────────────┘                      │
│                    │                                         │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
                     │
                     │  orderId 연결
                     ▼
              payment-service
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  ┌───────────┐ ┌──────────┐ │
│  │  Payment  │ │BillingKey│ │
│  │ (기존)    │ │ (기존)   │ │
│  └───────────┘ └──────────┘ │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

                        course-service
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                                                              │
│  ┌─────────────────────┐     ┌──────────────────────┐       │
│  │  CompanyPassType     │     │  CompanyMemberPass   │       │
│  ├─────────────────────┤     ├──────────────────────┤       │
│  │ id                  │     │ id                   │       │
│  │ companyId           │     │ companyMemberId      │       │
│  │ passType            │◄────│ passTypeId (FK)      │       │
│  │ name                │     │ status               │       │
│  │                     │     │ startDate / endDate  │       │
│  │ // 공통             │     │ remainingRounds      │       │
│  │ price               │     │ orderId ─────────────┼───┐   │
│  │ weekendPrice        │     │ activatedAt          │   │   │
│  │ maxRounds           │     └──────────────────────┘   │   │
│  │ validDays           │                                │   │
│  │ seasonStart/End     │                                │   │
│  │                     │     payment-service에 연결 ────┘   │
│  │ // REGIONAL 전용    │                                    │
│  │ targetProvince      │                                    │
│  │ targetCity          │                                    │
│  │ pricingType         │                                    │
│  │ discountRate        │                                    │
│  │ discountAmount      │                                    │
│  │ priority            │                                    │
│  │ autoGrant           │                                    │
│  └─────────────────────┘                                    │
│                                                              │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

                        booking-service
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  ┌──────────────────────────┐                  │
│  │  Booking (기존 + 확장)    │                  │
│  ├──────────────────────────┤                  │
│  │ ...기존 필드...           │                  │
│  │ originalPrice            │ 기본가 스냅샷      │
│  │ finalPrice               │ 최종 결제가        │
│  │ appliedDiscountType      │ PASS/REGIONAL/    │
│  │ appliedDiscountName      │ MEMBERSHIP/null   │
│  └──────────────────────────┘                  │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

### 7.2 Prisma — iam-service

```prisma
// === User 변경점 ===
model User {
  // 기존 필드 ...
  membershipCode   MembershipPlanCode @default(FREE) @map("membership_code")
  regionProvince   String?            @map("region_province")   // 본인인증 시/도
  regionCity       String?            @map("region_city")       // 본인인증 시/군/구
  isVerified       Boolean            @default(false) @map("is_verified")

  membership       MembershipPlan           @relation(fields: [membershipCode], references: [code])
  subscriptions    MembershipSubscription[]
  companyMembers   CompanyMember[]
}

// === CompanyMember 변경점 ===
enum CompanyMemberSource {
  BOOKING
  MANUAL
  WALK_IN
  REGIONAL    // 신규: 지역 매칭 자동 등록
}

// === 플랫폼 멤버십 ===
enum MembershipPlanCode {
  FREE
  PLUS
}

model MembershipPlan {
  code          MembershipPlanCode @id
  name          String
  monthlyPrice  Int       @default(0) @map("monthly_price")
  yearlyPrice   Int?      @map("yearly_price")
  description   String?
  level         Int       @default(1)
  color         String?
  icon          String?
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  users         User[]
  benefits      MembershipBenefit[]
  subscriptions MembershipSubscription[]

  @@map("membership_plans")
}

enum BenefitType {
  DISCOUNT
  PRIORITY
  ACCESS
  LIMIT
}

model MembershipBenefit {
  id            Int                @id @default(autoincrement())
  planCode      MembershipPlanCode @map("plan_code")
  benefitType   BenefitType        @map("benefit_type")
  benefitKey    String             @map("benefit_key")
  benefitValue  String             @map("benefit_value")
  description   String?
  isActive      Boolean            @default(true) @map("is_active")
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  plan          MembershipPlan @relation(fields: [planCode], references: [code])

  @@unique([planCode, benefitKey])
  @@map("membership_benefits")
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  EXPIRED
  PAST_DUE
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

model MembershipSubscription {
  id                  Int                @id @default(autoincrement())
  userId              Int                @map("user_id")
  planCode            MembershipPlanCode @map("plan_code")
  status              SubscriptionStatus @default(ACTIVE)
  billingCycle        BillingCycle       @default(MONTHLY) @map("billing_cycle")
  startDate           DateTime           @map("start_date")
  endDate             DateTime           @map("end_date")
  autoRenew           Boolean            @default(true) @map("auto_renew")
  lastPaymentOrderId  String?            @map("last_payment_order_id")
  nextPaymentDate     DateTime?          @map("next_payment_date")
  cancelledAt         DateTime?          @map("cancelled_at")
  cancelReason        String?            @map("cancel_reason")
  retryCount          Int                @default(0) @map("retry_count")
  createdAt           DateTime           @default(now()) @map("created_at")
  updatedAt           DateTime           @updatedAt @map("updated_at")

  user  User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan  MembershipPlan @relation(fields: [planCode], references: [code])

  @@index([userId])
  @@index([status, nextPaymentDate])
  @@map("membership_subscriptions")
}
```

### 7.3 Prisma — course-service

```prisma
enum PassType {
  REGIONAL
  PER_ROUND
  MULTI_ROUND
  MONTHLY
  SEASON
  ANNUAL
}

enum RegionalPricingType {
  FREE
  FIXED
  DISCOUNT_RATE
  DISCOUNT_AMOUNT
}

model CompanyPassType {
  id                Int                  @id @default(autoincrement())
  companyId         Int                  @map("company_id")
  passType          PassType             @map("pass_type")
  name              String
  description       String?

  // 공통
  price             Decimal?             @db.Decimal(10, 2)
  weekendPrice      Decimal?             @db.Decimal(10, 2) @map("weekend_price")
  maxRounds         Int?                 @map("max_rounds")
  validDays         Int?                 @map("valid_days")
  seasonStart       DateTime?            @db.Date @map("season_start")
  seasonEnd         DateTime?            @db.Date @map("season_end")
  benefits          Json?

  // REGIONAL 전용
  targetProvince    String?              @map("target_province")
  targetCity        String?              @map("target_city")
  pricingType       RegionalPricingType? @map("pricing_type")
  discountRate      Int?                 @map("discount_rate")
  discountAmount    Decimal?             @db.Decimal(10, 2) @map("discount_amount")
  priority          Int                  @default(0)
  autoGrant         Boolean              @default(false) @map("auto_grant")

  sortOrder         Int                  @default(0) @map("sort_order")
  isActive          Boolean              @default(true) @map("is_active")
  createdAt         DateTime             @default(now()) @map("created_at")
  updatedAt         DateTime             @updatedAt @map("updated_at")

  passes            CompanyMemberPass[]

  @@index([companyId, passType, isActive])
  @@map("company_pass_types")
}

enum PassStatus {
  ACTIVE
  EXPIRED
  EXHAUSTED
  CANCELLED
  SUSPENDED
}

model CompanyMemberPass {
  id                Int         @id @default(autoincrement())
  companyMemberId   Int         @map("company_member_id")
  passTypeId        Int         @map("pass_type_id")
  status            PassStatus  @default(ACTIVE)
  startDate         DateTime    @map("start_date")
  endDate           DateTime    @map("end_date")
  remainingRounds   Int?        @map("remaining_rounds")
  orderId           String?     @map("order_id")
  activatedAt       DateTime?   @map("activated_at")
  cancelledAt       DateTime?   @map("cancelled_at")
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  passType          CompanyPassType @relation(fields: [passTypeId], references: [id])

  @@index([companyMemberId, status])
  @@map("company_member_passes")
}
```

### 7.4 Prisma — booking-service (확장)

```prisma
model Booking {
  // 기존 필드 ...
  originalPrice       Decimal?  @db.Decimal(10, 2) @map("original_price")
  finalPrice          Decimal?  @db.Decimal(10, 2) @map("final_price")
  appliedDiscountType String?   @map("applied_discount_type")   // PASS | REGIONAL | MEMBERSHIP
  appliedDiscountName String?   @map("applied_discount_name")   // "10회 이용권", "천안시민 무료"
}
```

---

## 8. Seed 데이터

```typescript
// iam-service seed.ts

const membershipPlans = [
  { code: 'FREE', name: '일반', monthlyPrice: 0, level: 1, color: '#6B7280', icon: 'user',
    description: '기본 서비스 이용' },
  { code: 'PLUS', name: '파크플러스', monthlyPrice: 4900, yearlyPrice: 49000, level: 2,
    color: '#8B5CF6', icon: 'star', description: '우선 예약 + 할인 + 통계' },
];

const membershipBenefits = [
  // FREE
  { planCode: 'FREE', benefitType: 'PRIORITY', benefitKey: 'ADVANCE_DAYS',   benefitValue: '3',    description: '3일 전 예약' },
  { planCode: 'FREE', benefitType: 'LIMIT',    benefitKey: 'STATS_HISTORY',  benefitValue: '5',    description: '최근 5회 통계' },
  // PLUS
  { planCode: 'PLUS', benefitType: 'PRIORITY', benefitKey: 'ADVANCE_DAYS',   benefitValue: '7',    description: '7일 전 우선 예약' },
  { planCode: 'PLUS', benefitType: 'DISCOUNT', benefitKey: 'BOOKING_DISCOUNT', benefitValue: '5',  description: '예약 5% 할인' },
  { planCode: 'PLUS', benefitType: 'ACCESS',   benefitKey: 'CANCEL_FEE_FREE',  benefitValue: 'true', description: '취소 수수료 면제' },
  { planCode: 'PLUS', benefitType: 'LIMIT',    benefitKey: 'STATS_HISTORY',  benefitValue: '-1',   description: '통계 무제한' },
  { planCode: 'PLUS', benefitType: 'ACCESS',   benefitKey: 'WEATHER_ALERT',  benefitValue: 'true', description: '날씨 알림' },
  { planCode: 'PLUS', benefitType: 'ACCESS',   benefitKey: 'AD_FREE',        benefitValue: 'true', description: '광고 제거' },
  { planCode: 'PLUS', benefitType: 'DISCOUNT', benefitKey: 'COMPANION_DISCOUNT', benefitValue: '3', description: '동반자 1인 3%' },
  { planCode: 'PLUS', benefitType: 'ACCESS',   benefitKey: 'EVENT_PRIORITY', benefitValue: 'true', description: '이벤트 우선 참여' },
];
```

---

## 9. 서비스 간 통신

### 9.1 NATS 패턴

**iam-service:**
```
iam.membership.plans.list              전체 플랜 목록
iam.membership.plans.get               플랜 상세 (혜택 포함)
iam.membership.my                      내 멤버십 + 활성 구독
iam.membership.subscribe               구독 시작
iam.membership.cancel                  구독 취소
iam.membership.changePlan              플랜 변경
iam.membership.benefits.check          혜택 보유 확인 { userId, benefitKey }
```

**course-service:**
```
course.passTypes.list                  가맹점별 이용권 유형
course.passTypes.create                이용권 유형 생성
course.passTypes.update                이용권 유형 수정
course.passTypes.delete                이용권 유형 삭제

course.memberPasses.list               보유 이용권 목록
course.memberPasses.purchase           이용권 구매
course.memberPasses.useRound           1회 차감 (횟수권)
course.memberPasses.cancel             이용권 취소

course.memberPasses.resolveDiscount    할인 통합 확인 (예약 시 호출)
  Input:  { userId, companyId, companyMemberId?, regionProvince?, regionCity? }
  Output: { hasDiscount, discountType, finalPrice, discountName }
```

### 9.2 예약 시 할인 산출 흐름 (서비스 간)

```
[user-app]           [user-api]        [booking-service]     [course-service]      [iam-service]
     │ 예약 요청        │                    │                    │                    │
     │─────────────────>│                    │                    │                    │
     │                  │ booking.create     │                    │                    │
     │                  │───────────────────>│                    │                    │
     │                  │                    │                    │                    │
     │                  │                    │ resolveDiscount    │                    │
     │                  │                    │───────────────────>│                    │
     │                  │                    │                    │ 1. 구매 이용권 확인 │
     │                  │                    │                    │ 2. REGIONAL 매칭    │
     │                  │                    │                    │    (자동 발급 포함)  │
     │                  │                    │<───────────────────│                    │
     │                  │                    │                    │                    │
     │                  │                    │ (할인 없으면)       │                    │
     │                  │                    │ benefits.check     │                    │
     │                  │                    │───────────────────────────────────────>│
     │                  │                    │<───────────────────────────────────────│
     │                  │                    │                    │                    │
     │                  │                    │ 최종 가격 산출      │                    │
     │                  │                    │ Booking 생성       │                    │
     │                  │<───────────────────│                    │                    │
     │ 예약 확인 응답    │                    │                    │                    │
     │<─────────────────│                    │                    │                    │
```

---

## 10. 플랫폼 구독 라이프사이클

### 10.1 상태 흐름

```
가입 → FREE
         │
         │ subscribe(PLUS, MONTHLY)
         ▼
      ACTIVE ──────────────────────────────────────┐
         │                                          │
         ├── 자동 갱신 성공 → endDate 연장 → ACTIVE   │
         │                                          │
         ├── 자동 갱신 실패 → PAST_DUE (유예 3일)     │
         │    ├── 재시도 성공 → ACTIVE                │
         │    └── 3회 실패 → EXPIRED → FREE           │
         │                                          │
         ├── cancel() → CANCELLED                    │
         │    └── endDate 도달 → EXPIRED → FREE       │
         │                                          │
         └── changePlan(FREE) → 즉시 FREE (일할 환불) │
                                                    │
      재구독 시 → subscribe(PLUS) → ACTIVE ──────────┘
```

### 10.2 자동 갱신 (Cron)

```typescript
// iam-service @Cron('0 1 * * *') — 매일 01:00
async function processAutoRenewals() {
  const targets = await findSubscriptions({
    status: SubscriptionStatus.ACTIVE,
    autoRenew: true,
    endDate: { lte: addDays(new Date(), 1) },
  });

  for (const sub of targets) {
    const orderId = `SUB-${sub.id}-${Date.now()}`;
    const amount = sub.billingCycle === 'YEARLY'
      ? sub.plan.yearlyPrice
      : sub.plan.monthlyPrice;

    const result = await natsClient.send('payment.billing.charge', {
      userId: sub.userId, orderId, amount,
      orderName: `파크플러스 ${sub.billingCycle === 'MONTHLY' ? '월간' : '연간'} 구독`,
    });

    if (result.success) {
      await extendSubscription(sub.id, orderId, sub.billingCycle);
    } else {
      await handlePaymentFailure(sub);
    }
  }
}
```

### 10.3 결제 실패 처리

| 재시도 | 간격 | 실패 시 |
|--------|------|---------|
| 1차 | 1일 후 | PAST_DUE 유지, 알림 |
| 2차 | 3일 후 | PAST_DUE 유지, 알림 |
| 3차 | 7일 후 | EXPIRED → FREE 전환, 알림 |

PAST_DUE 기간 중에도 혜택은 유지한다 (이탈 방지).

---

## 11. REGIONAL 이용권 라이프사이클

```
본인인증 완료 → User.regionProvince/City 저장
  │
  ├─ 즉시: 아무 일도 안 일어남 (이용권은 예약 시점에 발급)
  │
  ▼
첫 예약 시도 (REGIONAL 매칭 골프장)
  │
  ├─ CompanyMember 생성 (source: REGIONAL)
  ├─ CompanyMemberPass 생성 (status: ACTIVE, endDate: 당해 12/31)
  └─ 할인 적용

이후 예약
  │
  └─ 기존 Pass 확인 → ACTIVE → 바로 할인 적용 (재발급 불필요)

매년 1/1 (Cron)
  │
  ├─ REGIONAL 이용권 중 endDate 지난 것 → EXPIRED 처리
  └─ User.regionProvince/City 변경 없으면 → 새 Pass 자동 재발급 (신년도 말)

사용자 주소 변경 시
  │
  ├─ 기존 REGIONAL Pass → CANCELLED
  └─ 새 주소 기반 → 다음 예약 시 재평가
```

---

## 12. 관리자 화면

### 12.1 admin-dashboard — 이용권 관리

```
┌─ 기본 정보 ─ 코스 ─ 라운드 ─ 이용권 ──────────────────┐
│                                                        │
│  [+ 이용권 추가]                                        │
│                                                        │
│  ── 지역주민 이용권 ──────────────────────────────────  │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │ 천안시민 무료           [REGIONAL]             │     │
│  │ 충청남도 천안시  |  무료  |  우선순위 10        │     │
│  │ 자동 발급 ON  |  적용 회원 342명               │     │
│  │                              [수정] [OFF]     │     │
│  └──────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────┐     │
│  │ 충남도민 50% 할인       [REGIONAL]             │     │
│  │ 충청남도 전체  |  50% 할인  |  우선순위 5       │     │
│  │ 자동 발급 ON  |  적용 회원 89명                │     │
│  │                              [수정] [OFF]     │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ── 일반 이용권 ──────────────────────────────────────  │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │ 10회 이용권             [MULTI_ROUND]         │     │
│  │ 120,000원  |  유효 90일  |  10회               │     │
│  │ 판매 23건 (활성 15건)         [수정] [OFF]     │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ── 회원 이용권 현황 ─────────────────────────────────  │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │ 이름    이용권         잔여     유효기간       │     │
│  │ 김철수  천안시민 무료   -       ~2026.12.31   │     │
│  │ 박영희  10회 이용권    7회     ~2026.05.14    │     │
│  │ 이민수  월정기         무제한  ~2026.03.01    │     │
│  └──────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────┘
```

### 12.2 platform-dashboard — 멤버십 현황

```
┌─ 멤버십 현황 ──────────────────────────────────────────┐
│                                                        │
│  ┌────────────┬────────────┬────────────┬───────────┐ │
│  │ 전체 회원   │   FREE     │   PLUS     │  전환율    │ │
│  │  12,450    │  11,832    │    618     │   4.96%   │ │
│  └────────────┴────────────┴────────────┴───────────┘ │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  MRR: 3,028,200원  |  ARR: 36,338,400원        │   │
│  │  신규 구독: 42건/월  |  해지: 18건/월  |  순증 24 │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  플랜 관리                                              │
│  ┌────────────────────────────────────────────────┐   │
│  │ PLUS 파크플러스                                  │   │
│  │ 월 4,900원 / 연 49,000원                        │   │
│  │ 활성 618건 (월간 480 / 연간 138)                 │   │
│  │                           [혜택 관리] [수정]     │   │
│  └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 13. 사용자 앱

### 13.1 검색 결과 (지역 뱃지)

```
┌───────────────────────────────────────┐
│ 천안 시민 파크골프장                    │
│ 충청남도 천안시                         │
│                                       │
│ 5,000원  [지역주민 무료]               │
│ 오전 08:00~12:00  잔여 42명            │
└───────────────────────────────────────┘
```

비로그인/미인증 사용자에게도 뱃지는 표시한다 (기본가 + 혜택 존재 안내).
로그인 후 주소 매칭 시 개인화 가격 표시.

### 13.2 예약 확인

```
┌─────────────────────────────────────────┐
│  예약 확인                               │
│                                         │
│  천안 시민 파크골프장                     │
│  2026.03.15 (토) 08:00 오전 세션         │
│                                         │
│  ───────────────────────────────         │
│  기본가              5,000원             │
│  천안시민 무료 적용  -5,000원             │
│  ───────────────────────────────         │
│  최종 결제금액           0원              │
│                                         │
│  ℹ️ 본인인증 주소 기반 지역주민 할인       │
│                                         │
│          [ 예약 확정 ]                   │
└─────────────────────────────────────────┘
```

### 13.3 멤버십 페이지

```
┌─────────────────────────────────────────┐
│                                         │
│  나의 멤버십: 파크플러스 ⭐               │
│  다음 결제: 2026.03.14 (4,900원)        │
│                                         │
│  ── 혜택 ───────────────────────        │
│  ✓ 7일 전 우선 예약                      │
│  ✓ 예약 5% 할인                         │
│  ✓ 취소 수수료 면제                      │
│  ✓ 라운드 통계 무제한                    │
│  ✓ 날씨 알림                            │
│  ✓ 광고 제거                            │
│                                         │
│  ── 이용권 ──────────────────────       │
│  ┌─────────────────────────────┐       │
│  │ 천안 시민 파크골프장          │       │
│  │ 지역주민 무료  ~2026.12.31   │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │ 강남 파크골프장              │       │
│  │ 10회 이용권 (잔여 7회)       │       │
│  │ ~2026.05.14                 │       │
│  └─────────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

---

## 14. payment-service 연동

별도 결제 테이블을 만들지 않는다. 기존 payment-service에 orderId로 연결한다.

| 결제 대상 | 방식 | 연결 |
|----------|------|------|
| 플랫폼 구독 (PLUS) | BillingKey 자동결제 | `Subscription.lastPaymentOrderId` → `Payment.orderId` |
| 이용권 구매 | 단건 결제 | `CompanyMemberPass.orderId` → `Payment.orderId` |
| 일반 예약 | 단건 결제 | `Booking.paymentOrderId` → `Payment.orderId` (기존) |
| REGIONAL 이용권 | **결제 없음** | `orderId = null` |

---

## 15. 구현 로드맵

### Phase 1 — 기반: iam-service
```
User에 membershipCode, regionProvince, regionCity, isVerified 추가
CompanyMemberSource에 REGIONAL 추가
MembershipPlan, MembershipBenefit, MembershipSubscription 모델
Seed: FREE/PLUS 플랜 + 혜택
NATS: plans.list, plans.get, my, subscribe, cancel, benefits.check
기존 PREMIUM roleCode 정리 → USER 통합
```

### Phase 2 — 이용권: course-service
```
CompanyPassType (REGIONAL 포함), CompanyMemberPass 모델
NATS: passTypes CRUD, memberPasses CRUD
resolveDiscount 통합 할인 로직
REGIONAL 자동 매칭 + CompanyMember 자동 생성
```

### Phase 3 — 예약 연동: booking-service
```
Booking 스키마 확장 (originalPrice, finalPrice, appliedDiscount*)
예약 시 resolveDiscount 호출 → 가격 결정
체크인 시 상태 전환만 (추가 로직 없음)
```

### Phase 4 — 결제: payment-service 연동
```
BillingKey 자동결제 NATS 패턴
플랫폼 구독 자동 갱신 Cron
결제 실패 재시도 + PAST_DUE + 다운그레이드
```

### Phase 5 — 프론트엔드
```
admin-dashboard: 이용권 탭 (REGIONAL + 일반 통합 관리)
platform-dashboard: 멤버십 현황 페이지 (구독 통계, MRR)
user-app-web/ios: 멤버십 페이지, 지역 뱃지, 예약 할인 표시
```

---

## 16. 고려 사항

### 본인인증 주소
- 본인인증(PASS, 카카오 등) 시 주소 제공 범위 확인 필요
- 제공 불가 시 v1은 프로필 직접 입력, v2에서 공적 인증 연동

### REGIONAL 갱신
- 유효기간: 당해 12/31
- 매년 1/1 Cron으로 재발급 (주소 변경 없으면 자동)
- 주소 변경 시 기존 Pass 취소 → 다음 예약 시 재평가

### 무료 골프장 (ClubType: FREE)
- 지역 주민 → REGIONAL 이용권 → 무료
- 비지역 주민 → 기본가 적용
- 플랫폼 멤버십(우선 예약, 통계)은 무료 골프장에서도 적용

### 할인 중첩 금지
- 동시 매칭 시 하나만 적용 (구매 이용권 > 지역 이용권 > 멤버십)
- 예: 월정기 + 지역주민 + PLUS → 월정기(이미 결제)로 처리

### 확장
- 플랫폼 등급 추가: 데이터 기반 판단 후 `PARK_PRO` 등
- 포인트 시스템: 라운드 완료 시 적립
- 프로모션 코드: 구독/이용권 할인
- 가맹점 제휴: 이용권 구매 시 플랫폼 구독 1개월 무료

---

## 17. 관련 문서

| 문서 | 관계 |
|------|------|
| [시스템 아키텍처](../ARCHITECTURE.md) | 전체 서비스 구조 |
| [데이터베이스 ERD](../DATABASE_ERD.md) | 스키마 전체 |
| [계정 삭제 정책](./ACCOUNT_DELETION_POLICY.md) | 탈퇴 시 멤버십/이용권 처리 |
| ~~[지역 가격 정책](./REGIONAL_PRICING_POLICY.md)~~ | **본 문서에 통합됨** |
