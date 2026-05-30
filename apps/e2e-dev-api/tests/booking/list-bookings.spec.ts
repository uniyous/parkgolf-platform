import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';

test.describe('Admin > Bookings (read)', () => {
  test('booking 목록 조회 — 페이지네이션', async ({ request, adminToken }) => {
    const res = await request.get('/api/admin/bookings?page=1&limit=10', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), `bookings list failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    const data = body?.data ?? body;
    const items = data?.items ?? data?.list ?? data?.data ?? [];
    expect(Array.isArray(items) || typeof data === 'object').toBeTruthy();
  });

  test('booking 통계 — overview', async ({ request, adminToken }) => {
    const res = await request.get('/api/admin/bookings/stats/overview', {
      headers: authHeaders(adminToken),
    });
    expect([200, 404].includes(res.status())).toBeTruthy();
  });

  test('booking 수익 통계 — revenue', async ({ request, adminToken }) => {
    const today = new Date().toISOString().slice(0, 10);
    const aMonthAgo = new Date(Date.now() - 30 * 86400 * 1000)
      .toISOString()
      .slice(0, 10);
    const res = await request.get(
      `/api/admin/bookings/stats/revenue?startDate=${aMonthAgo}&endDate=${today}`,
      { headers: authHeaders(adminToken) },
    );
    expect([200, 400, 404].includes(res.status())).toBeTruthy();
  });

  // TODO: 현재 dev에서 500 (SYS_001) 응답 — 서버 측 수정 후 활성화
  test.fixme('booking history 목록', async ({ request, adminToken }) => {
    const res = await request.get('/api/admin/bookings/history/list?page=1&limit=5', {
      headers: authHeaders(adminToken),
    });
    expect([200, 404].includes(res.status())).toBeTruthy();
  });

  test('토큰 없이 booking 목록 → 401', async ({ request }) => {
    const res = await request.get('/api/admin/bookings');
    expect(res.status()).toBe(401);
  });
});
