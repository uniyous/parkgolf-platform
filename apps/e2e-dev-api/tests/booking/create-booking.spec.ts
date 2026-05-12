import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * 현장결제(onsite) booking 생성 e2e — self-contained
 *
 * 흐름
 *   1. admin이 랜덤 club + game 선택 → 21 slot bulk 생성 (셋업)
 *   2. user 동적 가입 + 토큰
 *   3. 위 game의 첫 가용 slot으로 booking 생성 (paymentMethod=onsite)
 *   4. saga.CREATE_BOOKING 완료까지 polling → CONFIRMED
 *   5. cleanup — booking 취소
 *
 * @write — 실 DB 영향 (slot + booking 잔존)
 */
test.describe('Booking — onsite create @write', () => {
  test('현장결제 booking 생성 → saga 완료 → CONFIRMED', async ({
    request,
    adminToken,
  }) => {
    const adminAuth = authHeaders(adminToken);

    // === 1. 셋업: 랜덤 club/game + 21 slot 생성 ===
    const clubsRes = await request.get(
      '/api/admin/courses/clubs?page=1&limit=50',
      { headers: adminAuth },
    );
    expect(clubsRes.ok()).toBeTruthy();
    const clubsBody = await clubsRes.json();
    const clubs =
      clubsBody?.data?.items ?? clubsBody?.data ?? clubsBody?.items ?? [];

    // game 있는 club 찾을 때까지 순회 (max 5)
    let pickedGameId: number | null = null;
    for (let i = 0; i < Math.min(5, clubs.length); i++) {
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      const clubId = club.id ?? club.clubId;
      if (!clubId) continue;
      const gamesRes = await request.get(`/api/admin/games/club/${clubId}`, {
        headers: adminAuth,
      });
      if (!gamesRes.ok()) continue;
      const games = (await gamesRes.json())?.data ?? [];
      if (!Array.isArray(games) || games.length === 0) continue;
      const game = games[Math.floor(Math.random() * games.length)];
      pickedGameId = game.id ?? game.gameId;
      if (pickedGameId) {
        console.log(`[setup] club=${clubId} game=${pickedGameId} name=${game.name}`);
        break;
      }
    }
    expect(pickedGameId, 'no game found').toBeTruthy();

    // slot 21개 bulk 생성 — 오늘+1 ~ +7
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const timeSlots = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(tomorrow.getTime() + d * 86400 * 1000);
      const date = day.toISOString().slice(0, 10);
      for (const s of [
        { startTime: '08:00', endTime: '10:00', price: 30000 },
        { startTime: '11:00', endTime: '13:00', price: 35000 },
        { startTime: '15:00', endTime: '17:00', price: 30000 },
      ]) {
        timeSlots.push({ date, maxPlayers: 4, ...s });
      }
    }
    const bulkRes = await request.post(
      `/api/admin/games/${pickedGameId}/time-slots/bulk`,
      { headers: adminAuth, data: { timeSlots } },
    );
    expect(
      bulkRes.ok() || bulkRes.status() === 201 || bulkRes.status() === 409,
      `slot bulk [${bulkRes.status()}]`,
    ).toBeTruthy();

    // 방금 만든 slot 중 가용 1개 찾기
    const startDay = tomorrow.toISOString().slice(0, 10);
    const endDay = new Date(tomorrow.getTime() + 6 * 86400 * 1000)
      .toISOString()
      .slice(0, 10);
    const slotsRes = await request.get(
      `/api/admin/games/${pickedGameId}/time-slots?dateFrom=${startDay}&dateTo=${endDay}&page=1&limit=30`,
      { headers: adminAuth },
    );
    expect(slotsRes.ok()).toBeTruthy();
    const slotsBody = await slotsRes.json();
    const slotsData = slotsBody?.data ?? slotsBody;
    const slots = Array.isArray(slotsData)
      ? slotsData
      : slotsData?.items ?? slotsData?.list ?? [];
    const slot = slots.find(
      (s: any) =>
        (s.status === 'AVAILABLE' || !s.status) &&
        (s.bookedPlayers ?? 0) < (s.maxPlayers ?? 4),
    );
    expect(slot, 'no available slot after bulk create').toBeTruthy();
    console.log(`[setup] slot id=${slot.id} date=${slot.date} ${slot.startTime}`);

    // === 2. user 가입 ===
    const user = await createE2EUser(request, 'book');
    const userAuth = authHeaders(user.accessToken);

    // === 3. booking 생성 ===
    const createRes = await request.post('/api/user/bookings', {
      headers: userAuth,
      data: {
        gameId: pickedGameId!,
        gameTimeSlotId: slot.id,
        bookingDate: slot.date,
        playerCount: 1,
        paymentMethod: 'onsite',
        userEmail: user.email,
        userName: user.name,
      },
    });
    const createBody = await createRes.json().catch(() => ({}));
    console.log(
      `[booking] create status=${createRes.status()} body=${JSON.stringify(createBody).slice(0, 300)}`,
    );
    expect(
      createRes.ok() || createRes.status() === 201,
      `booking create [${createRes.status()}]: ${JSON.stringify(createBody).slice(0, 200)}`,
    ).toBeTruthy();

    const booking = createBody?.data ?? createBody;
    const bookingId = booking?.id ?? booking?.bookingId;
    expect(bookingId, 'bookingId missing').toBeTruthy();

    // === 4. saga 완료 polling ===
    let finalStatus: string | null = null;
    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/user/bookings/${bookingId}`, {
            headers: userAuth,
          });
          if (!r.ok()) return r.status();
          finalStatus = ((await r.json())?.data ?? (await r.json()))?.status ?? null;
          return finalStatus;
        },
        {
          timeout: 30_000,
          intervals: [1000, 2000, 3000, 5000],
          message: 'booking did not reach CONFIRMED',
        },
      )
      .toBe('CONFIRMED');

    console.log(`[booking] final status=${finalStatus}`);

    // === 5. cleanup ===
    const cancel = await request.delete(`/api/user/bookings/${bookingId}`, {
      headers: userAuth,
      data: { reason: 'e2e cleanup' },
    });
    console.log(`[cleanup] cancel status=${cancel.status()}`);
  });
});
