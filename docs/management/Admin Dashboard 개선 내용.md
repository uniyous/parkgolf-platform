# Admin Dashboard 개선 내용

> 갱신일: 2026-03-09
> 대상: `apps/admin-dashboard`

---

## 구현 현황 요약

| 카테고리 | 상태 | 비고 |
|---------|------|------|
| 로그인/회원가입/회사선택 | 완료 | |
| 메인 대시보드 (KPI, 트렌드) | 완료 | 기간 필터 개선 필요 |
| 클럽 관리 (목록/생성/상세) | 완료 | |
| 클럽 운영 탭 | 완료 | 실 API 연동 완료 |
| 게임 관리 (목록/상세) | 완료 | |
| 예약 현황 | 완료 | 필터 포함 |
| 취소/환불 관리 | 완료 | |
| 결제 관리 | 완료 | 매출 통계, 상세 모달, 환불 처리 |
| 알림 관리 | 완료 | 발송이력, 템플릿, 통계 3탭 |
| 사용자 관리/상세 | 완료 | 노쇼 정보 추가 필요 |
| 관리자 관리 | 완료 | |
| 역할/권한 관리 | 완료 | |
| 시스템 설정 (정책) | 완료 | |
| 회사(가맹점) 관리 | 완료 | |

---

## 개선 필요 항목

### 1. 대시보드 KPI 카드 기간 필터 [우선순위: 중]

**현재:** KPI 카드(오늘 예약, 매출, 이용률, 취소율)가 항상 "오늘" 기준 고정.

**개선:** KPI 카드 영역에 기간 선택 (오늘 / 7일 / 30일 / 90일) 추가하여 기간별 비교 가능하게.

**관련 파일:**
- `components/features/dashboard/KpiCards.tsx`
- `components/features/dashboard/DashboardContainer.tsx`

---

### 2. 사용자 상세 - 노쇼 횟수/패널티 표시 [우선순위: 중]

**현재:** 사용자 상세(`UserBasicInfoTab`)에 총 예약 수, 총 결제금액은 표시되지만 노쇼 관련 정보 없음.

**개선:**
- 노쇼 횟수 표시 (`policy.noshow.getUserCount` API 활용)
- 적용 중인 패널티 표시 (`policy.noshow.getApplicablePenalty`)
- 노쇼 이력 테이블 (날짜, 예약번호, 골프장)

**관련 파일:**
- `components/features/user/UserBasicInfoTab.tsx`
- `types/index.ts` (User 타입에 noShowCount 필드 추가)

**admin-api 확인 필요:**
- `policy.noshow.getUserCount` NATS 패턴이 admin-api에서 호출 가능한지 확인

---

### 3. 예약 가용성 확인 - placeholder 제거 [우선순위: 낮]

**현재:** `bookingApi.checkAvailability()`가 항상 `true` 반환 (TODO 상태).

```typescript
async checkAvailability(_courseId, _date, _timeSlot): Promise<boolean> {
  // TODO: Implement with gamesApi when available
  return true;
}
```

**개선:** `gameTimeSlots.available` NATS 패턴 활용하여 실제 슬롯 가용 여부 확인.

**관련 파일:**
- `lib/api/bookingApi.ts`

---

### 4. 더치페이 그룹 상세 조회 [우선순위: 낮]

**현재:** 결제 상세 모달에서 더치페이 건의 참가자별 결제 상태를 개별 조회 불가.

**개선:**
- 결제 상세 모달에서 더치페이 그룹 정보 표시 (참가자, 금액, 결제상태)
- admin-api에 `GET /admin/bookings/payments/split/:groupId` 엔드포인트 추가 필요

**관련 파일:**
- `pages/payment/PaymentManagementPage.tsx` (상세 모달 확장)
- `services/admin-api/src/bookings/bookings.controller.ts` (엔드포인트 추가)

---

### 5. 매출 리포트 전용 페이지 [우선순위: 낮]

**현재:** 결제 관리 페이지에 매출 통계 카드가 있지만 상세 리포트 기능 없음.

**개선:**
- 기간별 매출 추이 차트 (일/주/월)
- 클럽별, 게임별 매출 비교
- 결제수단별 비중 (현장/카드/더치페이)
- CSV/엑셀 내보내기

---

## 우선순위 로드맵

### Phase 1: 단기 개선 (UI만 수정)

| # | 항목 | 난이도 |
|---|------|--------|
| 1 | 대시보드 KPI 기간 필터 | 낮음 |
| 2 | 사용자 상세 노쇼/패널티 표시 | 중간 |
| 3 | 예약 가용성 확인 구현 | 낮음 |

### Phase 2: 중기 개선 (admin-api 추가 필요)

| # | 항목 | 난이도 |
|---|------|--------|
| 4 | 더치페이 그룹 상세 조회 | 중간 |
| 5 | 매출 리포트 전용 페이지 | 높음 |
