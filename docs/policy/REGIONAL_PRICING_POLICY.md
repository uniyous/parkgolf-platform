# 지역 주민 가격 정책 (Regional Pricing Policy)

> 슬롯 모드(TEE_TIME/SESSION), 시간대 구분(새벽/오전/오후/저녁)과 **독립적인 정책**이다.
> 유료/무료 골프장, 어떤 슬롯 방식이든 적용 가능하다.

---

## 1. 배경

| 사례 | 지역 주민 | 타 지역 주민 |
|------|-----------|-------------|
| 천안시 공공 파크골프장 | 무료 | 유료 (예: 5,000원) |
| A구 시민체육시설 | 무료 | 입장 불가 또는 유료 |
| B시 공영 골프장 | 50% 할인 | 정상가 |

동일한 골프장, 동일한 타임슬롯에서 **사용자 거주 지역에 따라 가격이 달라지는** 정책이 필요하다.

---

## 2. 사용자 거주 지역 (User Profile)

| 항목 | 설명 |
|------|------|
| `region` | 거주 지역 (시/도 + 시/군/구 2단계) |
| 입력 방식 | 회원가입 또는 프로필에서 선택 |
| 검증 | v1: 자기 신고, v2: 주민등록 주소 인증 연동 |

### 스키마 변경 (iam-service)

```prisma
model User {
  // 기존 필드 ...
  regionProvince  String?  @map("region_province")  // 시/도 (예: "충청남도")
  regionCity      String?  @map("region_city")      // 시/군/구 (예: "천안시")
}
```

---

## 3. 골프장 가격 정책 테이블

Club에 직접 가격 필드를 넣지 않고, **별도 정책 테이블**로 분리한다.

### 스키마 (course-service)

```prisma
enum PricingType {
  FREE              // 해당 지역 주민 무료
  FIXED             // 고정 가격 적용
  DISCOUNT_RATE     // 기본가 대비 % 할인
  DISCOUNT_AMOUNT   // 기본가 대비 정액 할인
}

model ClubPricingPolicy {
  id              Int         @id @default(autoincrement())
  clubId          Int         @map("club_id")
  club            Club        @relation(fields: [clubId], references: [id])

  name            String      // 정책명 (예: "천안시민 무료")
  pricingType     PricingType
  targetProvince  String      @map("target_province")  // 시/도 (예: "충청남도")
  targetCity      String?     @map("target_city")       // 시/군/구 (null이면 도 전체)

  price           Decimal?    @db.Decimal(10, 2)  // FIXED일 때
  discountRate    Int?        @map("discount_rate")     // DISCOUNT_RATE일 때 (%)
  discountAmount  Decimal?    @db.Decimal(10, 2) @map("discount_amount")  // DISCOUNT_AMOUNT일 때

  priority        Int         @default(0)   // 높을수록 우선 적용
  isActive        Boolean     @default(true) @map("is_active")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  @@index([clubId, isActive])
  @@map("club_pricing_policies")
}
```

### pricingType 별 동작

| pricingType | 최종 가격 산출 | 예시 |
|-------------|---------------|------|
| `FREE` | 0 | 천안시민 → 0원 |
| `FIXED` | `policy.price` | 시민 → 3,000원 |
| `DISCOUNT_RATE` | `basePrice * (100 - rate) / 100` | 50% 할인 → 반값 |
| `DISCOUNT_AMOUNT` | `basePrice - amount` | 2,000원 할인 |

---

## 4. 가격 결정 흐름

```
1. Game.basePrice (또는 weekendPrice) 확인
   → 기본가: 5,000원

2. ClubPricingPolicy에서 해당 Club의 활성 정책 조회
   → 정책: "천안시민 무료" (targetProvince="충청남도", targetCity="천안시", pricingType=FREE)

3. User.regionProvince / regionCity 와 정책의 target 비교
   → 매칭 규칙:
     a. targetCity가 있으면: province + city 모두 일치해야 매칭
     b. targetCity가 null이면: province만 일치하면 매칭 (도 전체 대상)

4. 매칭된 정책이 복수이면 priority가 가장 높은 정책 1개만 적용
   → 중첩 적용하지 않음

5. 최종 가격 산출
   → FREE: 0원
   → FIXED: policy.price
   → DISCOUNT_RATE: basePrice * (100 - discountRate) / 100
   → DISCOUNT_AMOUNT: max(0, basePrice - discountAmount)

6. 매칭 정책 없으면 기본가 그대로
```

### 가격 산출 원칙

- 가격은 **항상 서버에서 산출**한다. 클라이언트가 보낸 가격을 신뢰하지 않는다.
- TimeSlot.price는 **기본가**를 저장한다. 지역 할인은 **예약 시점에 동적 계산**한다.
- 정책 간 중첩(중복 할인)은 허용하지 않는다.

---

## 5. 예약 시 적용

### Booking 스키마 변경 (booking-service)

```prisma
model Booking {
  // 기존 필드 ...
  originalPrice     Decimal?  @db.Decimal(10, 2) @map("original_price")  // 기본가
  finalPrice        Decimal?  @db.Decimal(10, 2) @map("final_price")     // 최종 결제가
  appliedPolicyId   Int?      @map("applied_policy_id")                  // 적용된 정책 ID
  appliedPolicyName String?   @map("applied_policy_name")                // 정책명 스냅샷
}
```

### 예약 흐름

```
1. 사용자가 타임슬롯 선택
2. booking-service → course-service: 정책 조회 요청
   (clubId, userRegionProvince, userRegionCity)
3. course-service: 매칭 정책 반환
4. booking-service: 최종 가격 산출
5. 예약 확인 화면에 기본가 + 할인 내역 + 최종가 표시
6. 예약 확정 시 originalPrice, finalPrice, appliedPolicyId 기록
```

---

## 6. 검색 결과 표시

### 표시 전략: 기본가 + 혜택 뱃지

비로그인 사용자도 검색 가능하도록, 검색 결과에는 기본가를 표시하고 정책 존재 시 뱃지를 추가한다.

```
┌──────────────────────────────────┐
│ 천안 시민 파크골프장              │
│ 충청남도 천안시                   │
│                                  │
│ 5,000원  [지역주민 무료] 뱃지     │
│ 오전 06:00~12:00  잔여 42명      │
└──────────────────────────────────┘
```

### 검색 API 응답 확장

```json
{
  "id": 1,
  "name": "천안 시민 파크골프장",
  "basePrice": 5000,
  "pricingPolicySummary": [
    { "name": "천안시민 무료", "targetRegion": "충청남도 천안시", "pricingType": "FREE" },
    { "name": "충남도민 할인", "targetRegion": "충청남도", "pricingType": "DISCOUNT_RATE", "discountRate": 50 }
  ]
}
```

로그인 사용자의 상세 페이지 또는 예약 확인 단계에서 개인화된 최종 가격을 표시한다.

---

## 7. 관리자 화면

Club 상세 페이지에 **"가격 정책"** 탭 추가:

```
┌─ 기본 정보 ─ 코스 ─ 게임 ─ 가격 정책 ─────┐
│                                            │
│  [+ 정책 추가]                              │
│                                            │
│  ┌───────────────────────────────────────┐ │
│  │ 천안시민 무료              우선순위: 10 │ │
│  │ 대상: 충청남도 천안시                   │ │
│  │ 유형: 무료 (FREE)                     │ │
│  │ 상태: 활성          [수정] [비활성화]   │ │
│  └───────────────────────────────────────┘ │
│                                            │
│  ┌───────────────────────────────────────┐ │
│  │ 충남도민 할인              우선순위: 5  │ │
│  │ 대상: 충청남도 (전체)                   │ │
│  │ 유형: 50% 할인 (DISCOUNT_RATE)        │ │
│  │ 상태: 활성          [수정] [비활성화]   │ │
│  └───────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

---

## 8. NATS 메시지 패턴

```
clubPricingPolicies.list      { clubId }
clubPricingPolicies.create    { clubId, data }
clubPricingPolicies.update    { policyId, data }
clubPricingPolicies.delete    { policyId }
clubPricingPolicies.match     { clubId, regionProvince, regionCity }  → 매칭 정책 반환
```

---

## 9. 변경 범위

| 레이어 | 변경 내용 |
|--------|-----------|
| **iam-service** | User에 `regionProvince`, `regionCity` 추가 |
| **course-service** | `ClubPricingPolicy` 모델, CRUD, match API |
| **booking-service** | Booking에 `originalPrice`, `finalPrice`, `appliedPolicyId` 추가, 가격 산출 로직 |
| **admin-api** | 정책 관리 엔드포인트 |
| **user-api** | 검색 응답에 `pricingPolicySummary` 포함 |
| **admin-dashboard** | Club 상세에 가격 정책 탭 |
| **user-app-ios/web** | 검색 카드에 혜택 뱃지, 예약 확인에 적용 가격 표시 |

---

## 10. 마이그레이션 전략

1. User.regionProvince/regionCity: nullable → 기존 사용자 영향 없음
2. ClubPricingPolicy: 신규 테이블 → 기존 데이터 영향 없음
3. Booking.originalPrice/finalPrice: nullable → 기존 예약 영향 없음
4. 정책 미설정 골프장: 기본가 그대로 적용 (현행 동작 유지)

---

## 11. 다른 정책과의 관계

| 항목 | 슬롯/시간대 전략 | 지역 가격 정책 (본 문서) |
|------|-----------------|-------------------------|
| 영향 범위 | 슬롯 생성, 검색 필터 | 가격 산출, 예약 |
| 변경 대상 | Game, WeeklySchedule, TimeSlot | Club, User, Booking |
| 교차점 | TimeSlot.price = 기본가 저장 | 최종가 = 기본가 - 정책 할인 |
| 의존 관계 | 없음 | 슬롯이 존재해야 예약 가능 |
| 구현 순서 | 먼저 | 나중 |

두 시스템은 독립적으로 개발/배포 가능하다.
