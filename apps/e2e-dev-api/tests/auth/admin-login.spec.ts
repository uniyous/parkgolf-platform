import { test, expect } from '@playwright/test';
import { loginAdmin, authHeaders } from '../../fixtures/auth';

test.describe('Admin Login', () => {
  test('정상 로그인 → accessToken 발급', async ({ request }) => {
    const { accessToken, user } = await loginAdmin(request);
    expect(accessToken.length).toBeGreaterThan(20);
    if (user) {
      expect(user.email).toContain('@');
    }
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

  test('토큰 validate (자가 검증)', async ({ request }) => {
    const { accessToken } = await loginAdmin(request);
    const res = await request.post('/api/admin/iam/validate', {
      headers: authHeaders(accessToken),
    });
    expect(res.ok(), `validate failed: ${res.status()}`).toBeTruthy();
  });
});
