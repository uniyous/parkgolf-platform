import { test, expect } from '@playwright/test';
import { loginAdmin, authHeaders } from '../../fixtures/auth';

/**
 * 예약 생성 흐름 (saga.CREATE_BOOKING)
 *
 * 시나리오
 *   1. admin 로그인 → token
 *   2. 가용 club / game-time-slot 조회
 *   3. 예약 생성 (현장결제: paymentMethod=onsite)
 *   4. 결과 검증 (status / saga 완료)
 *   5. cleanup: 생성된 예약 취소
 *
 * 실 데이터에 영향 — @write 태그로 분리
 */
test.describe('Booking @write', () => {
  test.skip('현장결제로 예약 생성 → CONFIRMED', async ({ request }) => {
    const { accessToken } = await loginAdmin(request);
    const auth = authHeaders(accessToken);

    // TODO: 1) gameTimeSlot 조회
    // const slotRes = await request.get('/api/admin/courses/.../slots', { headers: auth });

    // TODO: 2) 예약 생성
    // const createRes = await request.post('/api/admin/bookings', {
    //   headers: auth,
    //   data: { gameTimeSlotId, playerCount: 1, paymentMethod: 'onsite' },
    // });
    // expect(createRes.ok()).toBeTruthy();

    // TODO: 3) saga 완료 검증
    // const body = await createRes.json();
    // expect(body.data.status).toBe('CONFIRMED');
    // expect(body.saga?.status).toBe('COMPLETED');

    // TODO: 4) cleanup
  });
});
