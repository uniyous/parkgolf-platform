import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';

/**
 * 시드 데이터 — 랜덤 클럽의 게임에 일주일치 타임슬롯 ~20개 생성
 *
 * 흐름
 *   1. /api/admin/courses/clubs 에서 ACTIVE 클럽 목록 → 랜덤 1개
 *   2. /api/admin/games/club/:clubId 에서 게임 목록 → 랜덤 1개
 *   3. 오늘 ~ +6일, 1일 3슬롯 × 7일 = 21슬롯 bulk 생성
 *   4. 생성 결과 검증 (지정 기간 조회)
 *
 * @write — dev DB에 실 데이터 잔존 (의도적, e2e booking 셋업용)
 */
test.describe('Admin > Time Slot seed @write', () => {
  test('랜덤 클럽 + 1주일치 타임슬롯 20개 생성', async ({ request, adminToken }) => {
    const auth = authHeaders(adminToken);

    // 1) 클럽 목록
    const clubsRes = await request.get(
      '/api/admin/courses/clubs?page=1&limit=50',
      { headers: auth },
    );
    expect(clubsRes.ok(), `clubs list [${clubsRes.status()}]`).toBeTruthy();
    const clubsBody = await clubsRes.json();
    const clubsRaw =
      clubsBody?.data?.items ??
      clubsBody?.data?.list ??
      clubsBody?.data ??
      clubsBody;
    const clubs = Array.isArray(clubsRaw) ? clubsRaw : clubsRaw?.items ?? [];
    expect(clubs.length, 'no clubs found in dev').toBeGreaterThan(0);
    const club = clubs[Math.floor(Math.random() * clubs.length)];
    const clubId = club.id ?? club.clubId;
    console.log(`[seed] picked club id=${clubId} name=${club.name ?? '?'}`);

    // 2) 그 club의 게임 목록
    const gamesRes = await request.get(`/api/admin/games/club/${clubId}`, {
      headers: auth,
    });
    expect(gamesRes.ok(), `games list [${gamesRes.status()}]`).toBeTruthy();
    const gamesBody = await gamesRes.json();
    const gamesRaw = gamesBody?.data ?? gamesBody;
    const games = Array.isArray(gamesRaw) ? gamesRaw : gamesRaw?.items ?? [];
    expect(games.length, `club ${clubId} has no games`).toBeGreaterThan(0);
    const game = games[Math.floor(Math.random() * games.length)];
    const gameId = game.id ?? game.gameId;
    console.log(`[seed] picked game id=${gameId} name=${game.name ?? '?'}`);

    // 3) 일주일치 타임슬롯 21개 (3슬롯/일 × 7일)
    const SLOTS_PER_DAY = [
      { startTime: '08:00', endTime: '10:00', price: 30000 },
      { startTime: '11:00', endTime: '13:00', price: 35000 },
      { startTime: '15:00', endTime: '17:00', price: 30000 },
    ];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const timeSlots: Array<{
      date: string;
      startTime: string;
      endTime: string;
      price: number;
      maxPlayers: number;
    }> = [];

    for (let d = 0; d < 7; d++) {
      const day = new Date(today.getTime() + d * 86400 * 1000);
      const yyyy = day.getUTCFullYear();
      const mm = String(day.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(day.getUTCDate()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd}`;
      for (const s of SLOTS_PER_DAY) {
        timeSlots.push({ date, maxPlayers: 4, ...s });
      }
    }

    console.log(`[seed] bulk creating ${timeSlots.length} slots for game ${gameId}`);

    // 4) bulk 생성
    const bulkRes = await request.post(
      `/api/admin/games/${gameId}/time-slots/bulk`,
      { headers: auth, data: { timeSlots } },
    );
    const bulkBody = await bulkRes.json().catch(() => ({}));
    console.log(`[seed] bulk status=${bulkRes.status()}`, JSON.stringify(bulkBody).slice(0, 300));
    expect(
      bulkRes.ok() || bulkRes.status() === 201 || bulkRes.status() === 409,
      `bulk create [${bulkRes.status()}]: ${JSON.stringify(bulkBody).slice(0, 200)}`,
    ).toBeTruthy();

    // 5) 검증 — 지정 기간 조회
    const lastDay = new Date(today.getTime() + 6 * 86400 * 1000)
      .toISOString()
      .slice(0, 10);
    const startDay = today.toISOString().slice(0, 10);
    const listRes = await request.get(
      `/api/admin/games/${gameId}/time-slots?dateFrom=${startDay}&dateTo=${lastDay}&page=1&limit=50`,
      { headers: auth },
    );
    expect(listRes.ok(), `slot list [${listRes.status()}]`).toBeTruthy();
    const listBody = await listRes.json();
    const listData = listBody?.data ?? listBody;
    const items = Array.isArray(listData)
      ? listData
      : listData?.items ?? listData?.list ?? [];
    console.log(`[seed] verified ${items.length} slots in date range`);
    expect(items.length).toBeGreaterThanOrEqual(SLOTS_PER_DAY.length); // 최소 하루치 확인
  });
});
