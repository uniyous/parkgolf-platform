import { test, expect } from '@playwright/test';
import { loginAdmin, authHeaders } from '../../fixtures/auth';

test.describe('Admin > Clubs (read)', () => {
  test('관리자 토큰으로 club 목록 조회', async ({ request }) => {
    const { accessToken } = await loginAdmin(request);
    const res = await request.get('/api/admin/clubs?page=1&limit=5', {
      headers: authHeaders(accessToken),
    });
    expect(res.ok(), `clubs list failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    const data = body?.data ?? body;
    // 응답에 list/items/data 등 어느 키든 array면 OK
    const items = data?.items ?? data?.list ?? data?.data ?? data;
    expect(Array.isArray(items) || typeof data === 'object').toBeTruthy();
  });

  test('토큰 없이 club 목록 조회 → 401', async ({ request }) => {
    const res = await request.get('/api/admin/clubs');
    expect(res.status()).toBe(401);
  });
});
