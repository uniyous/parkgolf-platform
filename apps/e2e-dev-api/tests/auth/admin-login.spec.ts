import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';

test.describe('Admin Login', () => {
  test('정상 로그인 → accessToken 발급 (worker fixture)', async ({ adminToken }) => {
    expect(adminToken.length).toBeGreaterThan(20);
  });

  test('잘못된 비밀번호 → 4xx', async ({ request }) => {
    const res = await request.post('/api/admin/iam/login', {
      data: { email: 'admin@parkgolf.com', password: 'wrong-password' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('존재하지 않는 이메일 → 4xx', async ({ request }) => {
    const res = await request.post('/api/admin/iam/login', {
      data: { email: 'nonexistent@parkgolf.com', password: 'whatever' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('토큰으로 me 조회 (자가 검증)', async ({ request, adminToken }) => {
    const res = await request.get('/api/admin/iam/me', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), `me failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    const user = body?.data ?? body;
    expect(user?.email || user?.user?.email).toContain('@');
  });
});
