# Admin Dashboard 개선 내용

> 분석일: 2026-03-06
> 대상: `apps/admin-dashboard` vs `services/admin-api` + 백엔드 마이크로서비스

---

## 현재 구현 현황

### 구현 완료 페이지 (17개)

| 카테고리 | 페이지 | 경로 |
|---------|--------|------|
| 인증 | 로그인 | `/login` |
| 인증 | 회원가입 | `/signup` |
| 인증 | 회사 선택 | `/select-company` |
| 대시보드 | 메인 대시보드 | `/dashboard` |
| 시스템 | 관리자 관리 | `/admin-management` |
| 시스템 | 사용자 관리 | `/user-management` |
| 시스템 | 사용자 상세 | `/user-management/:userId` |
| 시스템 | 역할/권한 관리 | `/roles` |
| 시스템 | 시스템 설정 (정책) | `/system-settings` |
| 회사 | 회사(가맹점) 관리 | `/companies` |
| 골프장 | 클럽 목록 | `/clubs` |
| 골프장 | 클럽 생성 | `/clubs/new` |
| 골프장 | 클럽 상세 | `/clubs/:clubId` |
| 게임 | 게임 목록 | `/games` |
| 게임 | 게임 상세 | `/games/:gameId` |
| 예약 | 예약 현황 | `/bookings` |
| 예약 | 취소/환불 관리 | `/bookings/cancellations` |

---

## 1. 미구현 페이지 (admin-api 엔드포인트는 있으나 UI 없음)

### 1-1. 결제 관리 페이지 [우선순위: 높음]

#### 현재 상태

결제 정보가 **예약 중심**으로만 표시되며, 결제 트랜잭션 독립 관리 불가.

| 기존 구현 | 위치 | 설명 |
|----------|------|------|
| 결제 금액/수단 표시 | BookingDetailModal | 예약 상세에서 금액, 결제수단(onsite/card/dutchpay) 표시 |
| 환불 처리 | RefundProcessModal | 정책 기반 환불 계산, 금액 조정, 전체/부분 환불 |
| 취소/환불 이력 | CancellationManagementPage | 취소 건 목록, 환불 상태 추적 |
| 더치페이 참가자 | BookingDetailModal | 참가자별 결제 상태 테이블 |

**부족한 점:**
- 결제 트랜잭션 자체를 독립적으로 조회/검색 불가
- Toss Payments 결제 상세(카드사, 카드번호, 승인번호 등) 미표시
- 결제수단별/기간별 매출 분석 없음
- 더치페이 결제 건별 트랜잭션 추적 불가
- 환불 이력(Refund 레코드) 독립 조회 불가

#### 사용 가능한 API (이미 구현됨)

**admin-api 엔드포인트:**

| HTTP | 경로 | NATS 패턴 | 설명 |
|------|------|-----------|------|
| GET | `/admin/bookings/payments/list` | `payment.list` | 결제 목록 (필터: status, startDate, endDate, page, limit) |
| GET | `/admin/bookings/payments/:paymentId` | `payment.get` | 결제 상세 (paymentKey 기반, refunds[] 포함) |
| POST | `/admin/bookings/:bookingId/refund` | `bookings.adminRefund` | 환불 처리 (Saga 기반, 전체/부분) |
| GET | `/admin/bookings/stats/revenue` | `payments.revenueStats` | 매출 통계 |

**admin-api에 추가 필요한 엔드포인트:**

| HTTP | 경로 | NATS 패턴 | 설명 |
|------|------|-----------|------|
| GET | `/admin/bookings/payments/split/:groupId` | `payment.splitGet` | 더치페이 그룹 결제 상세 |

#### Payment 데이터 모델 (payment-service)

```
Payment
  id, paymentKey(unique), orderId(unique), orderName
  amount, currency(KRW), method(CARD|TRANSFER|VIRTUAL_ACCOUNT|EASY_PAY|MOBILE)
  cardCompany, cardNumber, cardType, installmentMonths
  virtualAccountNumber, virtualBankCode, virtualDueDate
  status(READY|IN_PROGRESS|WAITING_FOR_DEPOSIT|DONE|CANCELED|PARTIAL_CANCELED|ABORTED|EXPIRED)
  userId, bookingId(unique)
  approvedAt, cancelledAt, cancelAmount, cancelReason
  → refunds: Refund[]

Refund
  id, paymentId(FK), transactionKey(unique)
  cancelAmount, cancelReason
  refundStatus(PENDING|PROCESSING|COMPLETED|FAILED)
  requestedBy, requestedByType(USER|ADMIN|SYSTEM)
  refundedAt

PaymentSplit (더치페이)
  id, paymentId(FK), bookingGroupId, bookingId
  userId, userName, userEmail, amount, orderId(unique)
  status(PENDING|PAID|EXPIRED|CANCELLED|REFUNDED)
  paidAt, expiredAt
```

#### 환불 처리 흐름 (Saga 기반)

관리자 환불은 **booking-service를 통한 Saga 트랜잭션**으로 처리합니다. 환불 정책 검증, 결제 취소, 타임슬롯 복구, 알림 발송 등 여러 서비스에 걸친 작업을 Outbox 기반 Choreography Saga로 보장합니다.

##### 전체 흐름

```
관리자 (RefundProcessModal)
  → POST /api/admin/bookings/:bookingId/refund
    { cancelAmount?, cancelReason, adminNote? }
  → admin-api BFF
    → NATS: bookings.adminRefund { bookingId, cancelAmount?, cancelReason, adminNote? }
      → booking-service: processAdminRefund()

[Step 1] 환불 정책 검증
  booking-service → NATS Request: policy.refund.resolve
    - 예약 시간 기준 환불 가능 여부 판정
    - 환불 비율(RefundRateTier) 계산
    - 환불 불가 조건 시 즉시 거부 (에러 반환)
    * 관리자가 cancelAmount를 직접 지정한 경우 정책 계산값 대신 지정값 사용

[Step 2] Booking 상태 변경
  booking-service: Booking.status → CANCEL_REQUESTED
  BookingHistory 기록: ADMIN_CANCEL_REQUESTED (adminNote 포함)

[Step 3] Outbox 이벤트 발행 (트랜잭션 내)
  3-1. payment.cancelByBookingId (Request-Reply)
       → payment-service: cancelPaymentByBookingId()
         1. DB에서 Payment 조회 (bookingId → paymentKey)
         2. 상태 검증 (DONE 또는 PARTIAL_CANCELED만 환불 가능)
         3. 부분 환불 시 기존 Refund 합산하여 잔여 금액 초과 검증
         4. ★ Toss Payments API 호출 ★
            POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel
            { cancelReason, cancelAmount? }
         5. Toss 응답의 cancels[] 마지막 항목으로 Refund 레코드 생성
         6. Payment 상태 업데이트 (CANCELED / PARTIAL_CANCELED)
         7. 성공 응답 반환

  3-2. slot.release (Request-Reply)
       → course-service: gameTimeSlot.release()
         - 해당 타임슬롯의 reservedCount 감소 (인원수 복구)
         - 슬롯 상태 AVAILABLE로 복원 (필요시)

[Step 4] Saga 완료 처리 (Outbox 응답 수신 후)
  booking-service: saga-handler
    - payment.cancelByBookingId 성공 → BookingHistory: REFUND_COMPLETED
    - slot.release 성공 → 슬롯 복구 확인
    - 모두 성공 시:
      Booking.status → CANCELLED
      BookingHistory: ADMIN_CANCELLED

[Step 5] Fire-and-Forget 이벤트 발행
  5-1. booking.cancelled → notify-service: 환불 완료 알림 (푸시/카카오톡)
  5-2. booking.refundCompleted → 후속 처리 (통계 갱신 등)
```

##### 기존 경로와의 비교

| 구분 | 기존 (직접 환불) | 개선 (Saga 환불) |
|------|-----------------|-----------------|
| NATS 패턴 | `payments.refund` | `bookings.adminRefund` |
| 진입점 | payment-service | booking-service |
| 정책 검증 | X (미수행) | O (policy.refund.resolve) |
| 슬롯 복구 | X (미수행) | O (slot.release) |
| 예약 상태 변경 | X (미수행) | O (CANCELLED) |
| 취소 알림 | X (미수행) | O (booking.cancelled 이벤트) |
| 보상 트랜잭션 | X | O (Outbox 재시도 + 실패 시 롤백) |

> **마이그레이션 노트:** 기존 `payments.refund` NATS 패턴은 deprecated 처리하고, admin-api의 `POST /admin/bookings/:bookingId/refund` 엔드포인트가 `bookings.adminRefund`를 호출하도록 변경합니다.

##### Saga 실패 시 보상 처리

| 실패 단계 | 보상 액션 |
|----------|----------|
| 정책 검증 실패 | 즉시 거부, 상태 변경 없음 |
| Toss API 환불 실패 | Booking.status → 원복, BookingHistory: REFUND_FAILED 기록 |
| 슬롯 복구 실패 | Outbox 재시도 (최대 5회), 실패 시 관리자 수동 알림 |
| 알림 발송 실패 | Fire-and-Forget이므로 무시 (로그만 기록) |

**Toss Payments 취소 API 응답 (cancels[]):**

```typescript
{
  transactionKey: string;      // Toss 발급 환불 거래키
  cancelAmount: number;        // 실제 환불 금액
  cancelReason: string;        // 환불 사유
  refundableAmount: number;    // 남은 환불 가능 금액
  canceledAt: string;          // 환불 처리 일시
  taxFreeAmount: number;       // 비과세 금액
  receiptKey?: string;         // 영수증 키
}
```

**환불 실패 시 에러 처리:**

| Toss 에러 코드 | 매핑 | 관리자 화면 표시 |
|---------------|------|----------------|
| `ALREADY_CANCELED_PAYMENT` | Payment.ALREADY_CANCELLED | "이미 취소된 결제입니다" |
| `NOT_CANCELABLE_AMOUNT` | Refund.EXCEED_AMOUNT | "환불 가능 금액을 초과했습니다" |
| `EXCEED_CANCEL_AMOUNT` | Refund.EXCEED_AMOUNT | "환불 가능 금액: N원" |
| `NOT_FOUND_PAYMENT` | Payment.NOT_FOUND | "결제 정보를 찾을 수 없습니다" |
| 네트워크 에러 | External.UNAVAILABLE | "결제 서버에 연결할 수 없습니다" |
| 타임아웃 | External.TIMEOUT | "결제 서버 응답 시간 초과" |

**가상계좌 환불 시 추가 파라미터:**

가상계좌 결제는 환불 수신 계좌 정보가 필요합니다 (현재 미구현, 향후 대응 필요):
```typescript
refundReceiveAccount: {
  bank: string;          // 은행 코드
  accountNumber: string; // 계좌번호
  holderName: string;    // 예금주
}
```

**결제 상세 모달에서 Toss 결제 정보 표시:**

payment-service의 `getPayment`은 DB 레코드를 반환하며, Toss API 원본 응답의 일부 필드(card.approveNo, receipt.url 등)는 현재 DB에 미저장. 필요시 Toss 조회 API(`GET /payments/{paymentKey}`)를 실시간 호출하여 보완 가능.

| Toss 원본 필드 | DB 저장 여부 | 관리자 화면 표시 |
|---------------|-------------|----------------|
| card.company | O (cardCompany) | 카드사명 |
| card.number | O (cardNumber, 마스킹) | 카드번호 |
| card.cardType | O (cardType) | 신용/체크 |
| card.installmentPlanMonths | O (installmentMonths) | 할부 개월 |
| card.approveNo | X (미저장) | 승인번호 - Toss 실시간 조회 필요 |
| receipt.url | X (미저장) | 영수증 URL - Toss 실시간 조회 필요 |
| balanceAmount | X (미저장) | 환불 후 잔액 - Refund 합산으로 계산 |

#### 구현 상세 설계

##### 페이지 1: 결제 현황 (`/payments`)

**라우트:** `/payments` (신규 페이지)

**상단: 매출 통계 카드 (4개)**

API: `GET /admin/bookings/stats/revenue?startDate=...&endDate=...`

| 카드 | 데이터 필드 | 설명 |
|------|-----------|------|
| 총 매출 | `totalRevenue` | 기간 내 순매출 (환불 차감) |
| 매출 성장률 | `revenueGrowthRate` | 전 기간 대비 % |
| 건당 평균 매출 | `averageRevenuePerBooking` | 평균 결제 금액 |
| 환불 총액 | `refundTotal` | 기간 내 환불 합계 |

**중단: 결제 목록 테이블**

API: `GET /admin/bookings/payments/list?status=...&startDate=...&endDate=...&page=...&limit=...`

| 컬럼 | 필드 | 설명 |
|------|------|------|
| 주문번호 | `orderId` | 클릭 시 결제 상세 모달 |
| 결제명 | `orderName` | 게임/코스명 |
| 금액 | `amount` | 원화 표시 |
| 결제수단 | `method` | CARD/TRANSFER/EASY_PAY 등 배지 |
| 카드사 | `cardCompany` | 카드 결제 시만 표시 |
| 상태 | `status` | 색상 배지 (DONE=초록, CANCELED=빨강, PARTIAL_CANCELED=주황 등) |
| 승인일시 | `approvedAt` | 결제 승인 시각 |
| 예약번호 | booking 관계 | 클릭 시 예약 상세로 이동 |
| 액션 | - | 환불 버튼 (status=DONE일 때만) |

**필터 영역:**

| 필터 | 타입 | 값 |
|------|------|-----|
| 기간 | DateRangePicker | startDate, endDate |
| 결제 상태 | Select | READY, DONE, CANCELED, PARTIAL_CANCELED, WAITING_FOR_DEPOSIT, EXPIRED |
| 검색 | Input | orderId 또는 예약번호 |

**페이지네이션:** 기존 패턴 사용 (page, limit, total, totalPages)

##### 결제 상세 모달

API: `GET /admin/bookings/payments/:paymentId`

**섹션 1: 기본 정보**

| 항목 | 필드 |
|------|------|
| 주문번호 | `orderId` |
| 결제키 | `paymentKey` |
| 결제명 | `orderName` |
| 결제 금액 | `amount` |
| 결제 상태 | `status` (배지) |
| 승인일시 | `approvedAt` |

**섹션 2: 결제수단 상세**

카드 결제 시:

| 항목 | 필드 |
|------|------|
| 카드사 | `cardCompany` |
| 카드번호 | `cardNumber` (마스킹됨) |
| 카드종류 | `cardType` (신용/체크) |
| 할부 | `installmentMonths` (0이면 일시불) |

가상계좌 결제 시:

| 항목 | 필드 |
|------|------|
| 은행 | `virtualBankCode` |
| 계좌번호 | `virtualAccountNumber` |
| 입금기한 | `virtualDueDate` |

**섹션 3: 환불 이력**

`refunds[]` 배열 테이블:

| 컬럼 | 필드 |
|------|------|
| 환불 금액 | `cancelAmount` |
| 사유 | `cancelReason` |
| 상태 | `refundStatus` (PENDING/PROCESSING/COMPLETED/FAILED) |
| 요청자 | `requestedByType` (USER/ADMIN/SYSTEM) |
| 처리일시 | `refundedAt` |

**섹션 4: 연결 정보**
- 예약번호 (클릭 시 예약 상세)
- 사용자 정보 (userId → 사용자 상세 링크)

##### 더치페이 상세 모달 (추가 필요)

API: `GET /admin/bookings/payments/split/:groupId` (admin-api 추가 필요)

NATS: `payment.splitGet { bookingGroupId }`

| 항목 | 필드 |
|------|------|
| 그룹 요약 | total, paidCount, pendingCount, allPaid |
| 참가자 테이블 | userName, amount, status(PENDING/PAID/EXPIRED/CANCELLED/REFUNDED), paidAt |

#### 구현 파일 목록

**신규 생성:**

| 파일 | 설명 |
|------|------|
| `pages/payment/PaymentManagementPage.tsx` | 결제 현황 페이지 |
| `components/features/payment/PaymentStatsCards.tsx` | 매출 통계 카드 4개 |
| `components/features/payment/PaymentFilters.tsx` | 필터 (기간, 상태, 검색) |
| `components/features/payment/PaymentTable.tsx` | 결제 목록 테이블 |
| `components/features/payment/PaymentDetailModal.tsx` | 결제 상세 모달 |
| `components/features/payment/SplitPaymentModal.tsx` | 더치페이 상세 모달 |
| `hooks/queries/payment.ts` | React Query hooks (usePaymentsQuery, usePaymentDetailQuery 등) |

**수정:**

| 파일 | 변경 내용 |
|------|----------|
| `lib/api/bookingApi.ts` | `getPayments()`, `getPaymentById()` 추가 (이미 admin-api에 있음) |
| `types/index.ts` | `Payment`, `Refund`, `PaymentSplit` 타입 추가 |
| 라우터 설정 | `/payments` 경로 추가 |
| 사이드바 메뉴 | 결제 관리 메뉴 추가 |

**admin-api 수정 (더치페이 상세용):**

| 파일 | 변경 내용 |
|------|----------|
| `services/admin-api/src/bookings/bookings.controller.ts` | `GET payments/split/:groupId` 엔드포인트 추가 |
| `services/admin-api/src/bookings/bookings.service.ts` | `getSplitPaymentStatus()` 메서드 추가 |

#### 결제 상태 배지 색상 규칙

| status | 라벨 | 색상 |
|--------|------|------|
| READY | 준비 | gray |
| IN_PROGRESS | 진행중 | blue |
| WAITING_FOR_DEPOSIT | 입금대기 | yellow |
| DONE | 완료 | green |
| CANCELED | 취소 | red |
| PARTIAL_CANCELED | 부분취소 | orange |
| ABORTED | 중단 | gray |
| EXPIRED | 만료 | gray |

#### 결제수단 배지

| method | 라벨 | 색상 |
|--------|------|------|
| CARD | 카드 | blue |
| TRANSFER | 계좌이체 | green |
| VIRTUAL_ACCOUNT | 가상계좌 | purple |
| EASY_PAY | 간편결제 | cyan |
| MOBILE | 휴대폰 | orange |

---

### 1-2. 알림 관리 페이지 [우선순위: 높음]

**현재 상태:** API 클라이언트(`notificationApi.ts`)는 완성되어 있으나 UI 페이지가 0개. `SystemSettingsPage`에 "준비 중" 표시.

**사용 가능한 admin-api 엔드포인트 (20+개):**
- 알림 CRUD: `GET/POST /admin/notifications`, `GET /admin/notifications/:id`
- 대량 발송: `POST /admin/notifications/send-bulk`
- 사용자별 알림: `GET /admin/notifications/user/:userId`
- 읽음 처리: `POST /admin/notifications/:id/mark-read/:userId`
- 템플릿 CRUD: `GET/POST/PATCH/DELETE /admin/notifications/templates`
- 템플릿 테스트: `POST /admin/notifications/templates/:id/test`
- 캠페인 관리: `GET/POST /admin/notifications/campaigns`
- 통계: `GET /admin/notifications/stats/overview`, `/stats/delivery`
- 사용자 설정: `GET/PATCH /admin/notifications/preferences/:userId`

**필요 기능:**
- 알림 발송 이력 목록/상세
- 템플릿 관리 (생성, 편집, 테스트 발송)
- 캠페인 관리 (대상 설정, 예약 발송)
- 발송 통계 대시보드 (전송률, 읽음률)
- 사용자별 알림 설정 조회/수정

---

### 1-3. 채팅 관리 [우선순위: 중간]

**현재 상태:** admin-api에 chat 컨트롤러 자체가 없음.

**백엔드 chat-service NATS 패턴:**
- `chat.rooms.create/get/list` - 채팅방 CRUD
- `chat.rooms.addMember/removeMember` - 멤버 관리
- `chat.messages.list/delete` - 메시지 조회/삭제
- `chat.messages.unreadCount` - 미읽 수

**필요 작업:**
1. admin-api에 chat 컨트롤러 추가
2. 채팅방 목록/상세 페이지
3. 신고된 메시지 관리 (향후)

---

### 1-4. 배치 작업 관리 [우선순위: 낮음]

**현재 상태:** admin-api에 연결 없음.

**백엔드 job-service NATS 패턴:**
- `job.list` - 등록된 배치 작업 목록
- `job.run` - 수동 실행
- `job.deletion.reminder` - 탈퇴 리마인더
- `job.deletion.execute` - 탈퇴 실행

---

## 2. 기능 부족 (페이지는 있지만 미완성)

### 2-1. 클럽 운영 탭 - Mock 데이터 사용 [우선순위: 높음]

**파일:** `components/features/club/OperationInfoTab.tsx:16`

```typescript
// Mock 데이터 fetch 함수 (실제 API 연동 시 교체)
const fetchClubOperationStats = async (_clubId, _dateRange) => {
  // TODO: 실제 API 연동 시 아래 코드를 API 호출로 교체
  return {
    stats: { totalBookings: 150, totalRevenue: 45000000, ... }, // 하드코딩
  };
};
```

**개선:** 예약 통계 API(`bookings.stats`)와 매출 API(`bookings.revenue`)를 clubId 필터로 호출하여 실데이터 표시.

---

### 2-2. 대시보드 - Mock 데이터 영역

| 엔드포인트 | 현재 | 개선 |
|-----------|------|------|
| `/stats/alerts` | 로컬 Mock 반환 | 실제 시스템 알림 연동 (예: 노쇼 급증, 서비스 장애 등) |
| `/stats/performance` | 로컬 Mock 반환 | 서비스별 헬스체크 연동 또는 제거 |

---

### 2-3. 예약 가용성 확인 - 미구현

**파일:** `lib/api/bookingApi.ts:257`

```typescript
async checkAvailability(_courseId, _date, _timeSlot): Promise<boolean> {
  // TODO: Implement with gamesApi when available
  return true; // 항상 true 반환
}
```

**개선:** `gameTimeSlots.available` NATS 패턴 활용하여 실제 가용 슬롯 확인.

---

### 2-4. 예약 매출 통계 - 전용 페이지 없음

**현재:** 대시보드에 KPI 카드로만 표시.

**개선:** 매출 리포트 전용 페이지 추가
- 기간별 매출 추이 (일/주/월)
- 클럽별, 게임별 매출 비교
- 결제수단별 비중 (현장/카드/더치페이)
- CSV/엑셀 내보내기

---

### 2-5. 예약 이력 미활용

**admin-api:** `GET /admin/bookings/history/list` (userId, gameId, startDate, endDate 필터)

**현재:** 프론트에서 미호출. 사용자 상세의 예약 이력 탭이 일반 예약 목록으로 대체 사용 중인 것으로 추정.

---

## 3. admin-api에 없는 백엔드 기능 (BFF 레이어부터 추가 필요)

| 백엔드 기능 | NATS 패턴 | 용도 | 우선순위 |
|------------|-----------|------|---------|
| 계정 삭제 요청 관리 | `iam.account.requestDeletion`, `cancelDeletion`, `deletionStatus` | 사용자 탈퇴 요청 목록 조회/승인/거부 | 중간 |
| 디바이스 관리 | `users.devices.list`, `register`, `remove` | 사용자별 등록 디바이스 확인 (푸시 알림 트러블슈팅) | 중간 |
| 빌링키 관리 | `billing.list`, `delete` | 사용자 등록 결제수단 조회/삭제 (CS 대응) | 중간 |
| 더치페이 결제 상세 | `payment.splitGet` | 더치페이 건별 결제 트랜잭션 상세 | 중간 |
| AI 에이전트 모니터링 | `agent.stats`, `agent.status` | AI 예약 에이전트 사용 현황/상태 확인 | 낮음 |
| 팀 편성 관리 | `teamSelection.get`, `create`, `cancel` | 팀 편성 현황 관리자 조회 | 낮음 |

---

## 4. 품질/UX 개선 포인트

### 4-1. 예약 필터 확장

**현재 필터:** `courseId`, `userId`, `dateFrom`, `dateTo`, `status`, `search`

**추가 필요:**
- `gameId` - 게임별 필터 (admin-api 이미 지원)
- `clubId` - 클럽별 필터
- `paymentMethod` - 결제수단별 필터 (onsite/card/dutchpay)

---

### 4-2. 노쇼 이력 표시

**현재:** 예약 모달에서 노쇼 처리만 가능.

**개선:**
- 사용자 상세 페이지에 노쇼 횟수 표시 (`policy.noshow.getUserCount`)
- 적용 패널티 표시 (`policy.noshow.getApplicablePenalty`)
- 노쇼 이력 테이블

---

### 4-3. 환불 금액 자동 계산

**현재:** 환불 모달에서 금액 수동 입력.

**개선:** `POST /admin/policies/refund/calculate` API 연동하여 예약 시간 기준 자동 계산 → 관리자가 확인 후 조정.

---

### 4-4. 대시보드 기간 필터

**현재:** trend 차트만 period(7d/30d/90d/1y) 선택 가능.

**개선:** KPI 카드 영역에도 기간 필터를 적용하여 기간별 비교 가능하게.

---

## 5. 우선순위 종합 로드맵

### Phase 1: 즉시 개선 (기존 API 활용, UI만 추가)

1. **알림 관리 페이지** - `notificationApi.ts` 완성 상태, 페이지 컴포넌트만 구현
2. **결제 관리 페이지** - admin-api `payments.list/get` 이미 있음
3. **클럽 운영 탭** Mock 제거 → 실제 API 연동
4. **환불 자동 계산** 연동
5. **예약 필터 확장** (gameId, paymentMethod)

### Phase 2: 단기 개선 (admin-api 소규모 추가 + UI)

6. 사용자 상세에 **노쇼 횟수/패널티** 표시
7. **예약 이력**(bookingHistory) API 활용
8. 대시보드 **alerts/performance** Mock 제거 또는 실제 연동
9. **예약 가용성 확인** 구현

### Phase 3: 중기 개선 (admin-api 컨트롤러 신규 추가)

10. **채팅 관리** (admin-api chat 컨트롤러 추가 + 페이지)
11. **계정 삭제 요청 관리**
12. **매출/재무 리포트** 전용 페이지
13. **디바이스/빌링키 관리** (CS 대응)
14. **AI 에이전트 모니터링**
15. **배치 작업 관리**
