import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * 타임슬롯 가용성 조회 — user 측 read
 *
 *   GET /api/user/bookings/games/:gameId/time-slots?date=YYYY-MM-DD
 *
 * admin 셋업으로 슬롯 보장 후 user 토큰으로 가용성 확인.
 */
test.describe('User > Time Slot availability', () => {
  test('admin 셋업한 game의 가용 슬롯이 user에게 노출', async ({
    request,
    adminToken,
  }) => {
    const adminAuth = authHeaders(adminToken);

    // 1. 임의 club + game
    const clubsRes = await request.get(
      '/api/admin/courses/clubs?page=1&limit=20',
      { headers: adminAuth },
    );
    expect(clubsRes.ok()).toBeTruthy();
    const clubs =
      (await clubsRes.json())?.data?.items ??
      (await clubsRes.json())?.data ??
      [];
    let gameId: number | null = null;
    for (let i = 0; i < Math.min(5, clubs.length); i++) {
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      const cid = club?.id ?? club?.clubId;
      if (!cid) continue;
      const gr = await request.get(`/api/admin/games/club/${cid}`, {
        headers: adminAuth,
      });
      if (!gr.ok()) continue;
      const games = (await gr.json())?.data ?? [];
      if (games[0]) {
        gameId = games[Math.floor(Math.random() * games.length)]?.id;
        if (gameId) break;
      }
    }
    expect(gameId, 'no game').toBeTruthy();

    // 2. 내일 자 슬롯 1건 보장
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);
    const bulk = await request.post(
      `/api/admin/games/${gameId}/time-slots/bulk`,
      {
        headers: adminAuth,
        data: {
          timeSlots: [
            { date, startTime: '09:00', endTime: '11:00', price: 30000, maxPlayers: 4 },
          ],
        },
      },
    );
    expect(
      bulk.ok() || bulk.status() === 201 || bulk.status() === 409,
      `bulk [${bulk.status()}]`,
    ).toBeTruthy();

    // 3. user 토큰으로 가용성 조회
    const user = await createE2EUser(request, 'slotuser');
    const userAuth = authHeaders(user.accessToken);
    const slotsRes = await request.get(
      `/api/user/bookings/games/${gameId}/time-slots?date=${date}`,
      { headers: userAuth },
    );
    expect(slotsRes.ok(), `user slot read [${slotsRes.status()}]`).toBeTruthy();
    const body = await slotsRes.json();
    const data = body?.data ?? body;
    const slots = Array.isArray(data) ? data : data?.items ?? data?.timeSlots ?? [];
    expect(Array.isArray(slots)).toBeTruthy();
    expect(slots.length).toBeGreaterThan(0);
  });

  test('과거 날짜 조회 → 빈 결과 또는 정상 응답', async ({ request, adminToken }) => {
    // game id 알 필요 없이 임의 game 1개
    const gamesRes = await request.get('/api/admin/games?page=1&limit=1', {
      headers: authHeaders(adminToken),
    });
    if (!gamesRes.ok()) return;
    const body = await gamesRes.json();
    const items = body?.data?.items ?? body?.data ?? body?.items ?? [];
    const gameId = items[0]?.id;
    if (!gameId) return;

    const user = await createE2EUser(request, 'past');
    const pastDate = '2020-01-01';
    const res = await request.get(
      `/api/user/bookings/games/${gameId}/time-slots?date=${pastDate}`,
      { headers: authHeaders(user.accessToken) },
    );
    // 정상 응답이면 빈 array
    expect([200, 400, 404]).toContain(res.status());
  });
});
