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

**현재 상태:** 예약 상세 모달에서 환불 처리만 가능. 전용 결제 목록/상세 페이지 없음.

**사용 가능한 admin-api 엔드포인트:**
- `GET /admin/bookings/payments/list` - 결제 목록 (필터: status, startDate, endDate)
- `GET /admin/bookings/payments/:paymentId` - 결제 상세
- `POST /admin/bookings/:bookingId/refund` - 환불 처리

**필요 기능:**
- 결제 목록 (날짜, 상태, 결제수단별 필터)
- 결제 상세 모달 (Toss 결제 정보, 환불 이력)
- 매출 통계 (`payments.revenueStats`)
- 더치페이 건별 진행 상태 확인

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
