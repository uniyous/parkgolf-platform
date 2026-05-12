import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';

test.describe('Admin > Clubs (read)', () => {
  test('관리자 토큰으로 club 목록 조회', async ({ request, adminToken }) => {
    const res = await request.get('/api/admin/courses/clubs?page=1&limit=5', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), `clubs list failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    const data = body?.data ?? body;
    const items = data?.items ?? data?.list ?? data?.data ?? data;
    expect(Array.isArray(items) || typeof data === 'object').toBeTruthy();
  });

  test('토큰 없이 club 목록 조회 → 401', async ({ request }) => {
    const res = await request.get('/api/admin/courses/clubs');
    expect(res.status()).toBe(401);
  });
});
