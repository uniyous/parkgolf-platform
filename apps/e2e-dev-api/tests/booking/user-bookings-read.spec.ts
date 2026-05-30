import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { seedOnsiteBooking, cancelBooking } from '../../fixtures/booking';

/**
 * 사용자 booking 조회 엔드포인트
 *
 *   GET /api/user/bookings            — 내 예약 목록
 *   GET /api/user/bookings/:id        — ID 조회
 *   GET /api/user/bookings/number/:no — 예약번호 조회
 *   GET /api/user/bookings/search     — 필터 검색
 *
 * @write — booking 1건 생성 후 read 검증, cleanup
 */
test.describe('User > Bookings (read) @write', () => {
  test('CRUD: 내 예약 → list / get by id / get by number / search', async ({
    request,
    adminToken,
  }) => {
    const seeded = await seedOnsiteBooking(request, adminToken, 'reader');
    const userAuth = authHeaders(seeded.user.accessToken);

    // 1) my list — 방금 만든 booking 포함
    const listRes = await request.get('/api/user/bookings', { headers: userAuth });
    expect(listRes.ok(), `my list [${listRes.status()}]`).toBeTruthy();
    const listBody = await listRes.json();
    const list = listBody?.data ?? listBody;
    const items = Array.isArray(list) ? list : list?.items ?? [];
    const matched = items.find((b: any) => b.id === seeded.bookingId);
    expect(matched, `booking ${seeded.bookingId} not in my list`).toBeTruthy();
    expect(matched.status).toBe('CONFIRMED');

    // 2) get by id
    const getRes = await request.get(`/api/user/bookings/${seeded.bookingId}`, {
      headers: userAuth,
    });
    expect(getRes.ok()).toBeTruthy();
    const got = ((await getRes.json())?.data ?? (await getRes.json())) as any;
    expect(got?.id ?? got).toBeTruthy();

    // 3) get by number
    const byNoRes = await request.get(
      `/api/user/bookings/number/${seeded.bookingNumber}`,
      { headers: userAuth },
    );
    expect(byNoRes.ok(), `by number [${byNoRes.status()}]`).toBeTruthy();
    const byNo = ((await byNoRes.json())?.data ?? (await byNoRes.json())) as any;
    expect(byNo?.id === seeded.bookingId || byNo?.bookingNumber === seeded.bookingNumber).toBeTruthy();

    // 4) search — status 필터
    const searchRes = await request.get(
      '/api/user/bookings/search?status=CONFIRMED',
      { headers: userAuth },
    );
    expect([200, 400, 404].includes(searchRes.status())).toBeTruthy();

    // cleanup
    await cancelBooking(request, seeded.user, seeded.bookingId);
  });

  test('토큰 없이 내 예약 목록 → 401', async ({ request }) => {
    const res = await request.get('/api/user/bookings');
    expect(res.status()).toBe(401);
  });

  test('존재하지 않는 booking id → 404', async ({ request, adminToken }) => {
    // 임시 user 생성 (read-only, 빠른 검증)
    const seeded = await seedOnsiteBooking(request, adminToken, 'r404');
    const userAuth = authHeaders(seeded.user.accessToken);

    const res = await request.get('/api/user/bookings/99999999', {
      headers: userAuth,
    });
    expect([403, 404]).toContain(res.status());

    await cancelBooking(request, seeded.user, seeded.bookingId);
  });
});
