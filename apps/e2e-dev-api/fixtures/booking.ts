import { APIRequestContext, expect } from '@playwright/test';
import { authHeaders } from './auth';
import { createE2EUser, E2EUser } from './users';

export interface SeededBooking {
  user: E2EUser;
  bookingId: number;
  bookingNumber: string;
  gameId: number;
  slotId: number;
  slotDate: string;
}

/**
 * Admin 권한으로 슬롯 셋업하고, 새 user로 onsite booking 1건 생성.
 *
 * 동일 흐름이 여러 spec에서 필요 — 셋업/취소를 한 곳에 모음.
 */
export async function seedOnsiteBooking(
  request: APIRequestContext,
  adminToken: string,
  namePrefix = 'reader',
): Promise<SeededBooking> {
  const adminAuth = authHeaders(adminToken);

  // 1. random club + game
  const clubsRes = await request.get(
    '/api/admin/courses/clubs?page=1&limit=50',
    { headers: adminAuth },
  );
  expect(clubsRes.ok()).toBeTruthy();
  const clubsBody = await clubsRes.json();
  const clubs =
    clubsBody?.data?.items ?? clubsBody?.data ?? clubsBody?.items ?? [];

  let gameId: number | null = null;
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
    gameId = game.id ?? game.gameId;
    if (gameId) break;
  }
  expect(gameId, 'seed: no game found').toBeTruthy();

  // 2. slot bulk create (다음 1주일)
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
    `/api/admin/games/${gameId}/time-slots/bulk`,
    { headers: adminAuth, data: { timeSlots } },
  );
  expect(
    bulkRes.ok() || bulkRes.status() === 201 || bulkRes.status() === 409,
    `seed: slot bulk [${bulkRes.status()}]`,
  ).toBeTruthy();

  // 3. 가용 slot 찾기
  const startDay = tomorrow.toISOString().slice(0, 10);
  const endDay = new Date(tomorrow.getTime() + 6 * 86400 * 1000)
    .toISOString()
    .slice(0, 10);
  const slotsRes = await request.get(
    `/api/admin/games/${gameId}/time-slots?dateFrom=${startDay}&dateTo=${endDay}&page=1&limit=30`,
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
  expect(slot, 'seed: no available slot').toBeTruthy();

  // 4. user 가입
  const user = await createE2EUser(request, namePrefix);

  // 5. booking 생성
  const createRes = await request.post('/api/user/bookings', {
    headers: authHeaders(user.accessToken),
    data: {
      gameId: gameId!,
      gameTimeSlotId: slot.id,
      bookingDate: slot.date,
      playerCount: 1,
      paymentMethod: 'onsite',
      userEmail: user.email,
      userName: user.name,
    },
  });
  const createBody = await createRes.json().catch(() => ({}));
  expect(
    createRes.ok() || createRes.status() === 201,
    `seed: booking create [${createRes.status()}]: ${JSON.stringify(createBody).slice(0, 200)}`,
  ).toBeTruthy();
  const booking = createBody?.data ?? createBody;

  // 6. CONFIRMED 도달 대기
  await expect
    .poll(
      async () => {
        const r = await request.get(`/api/user/bookings/${booking.id}`, {
          headers: authHeaders(user.accessToken),
        });
        if (!r.ok()) return r.status();
        const body = await r.json();
        return (body?.data ?? body)?.status ?? null;
      },
      { timeout: 30_000, intervals: [1000, 2000, 3000, 5000] },
    )
    .toBe('CONFIRMED');

  return {
    user,
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    gameId: gameId!,
    slotId: slot.id,
    slotDate: slot.date,
  };
}

/**
 * Booking cleanup — DELETE /api/user/bookings/:id (idempotent best-effort).
 */
export async function cancelBooking(
  request: APIRequestContext,
  user: E2EUser,
  bookingId: number,
): Promise<void> {
  await request.delete(`/api/user/bookings/${bookingId}`, {
    headers: authHeaders(user.accessToken),
    data: { reason: 'e2e cleanup' },
  });
}
