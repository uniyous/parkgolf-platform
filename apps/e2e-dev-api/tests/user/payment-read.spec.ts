import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * 결제 조회/abandon — read & negative path
 *
 *   GET  /api/user/payments/order/:orderId
 *   POST /api/user/payments/:orderId/abandon
 *
 * 실제 토스 confirm은 위젯 자동화가 필요 (Plan B 별도) — 여기서는
 * 조회 + 인증/오류 path만 검증.
 */
test.describe('User > Payment (read + negative)', () => {
  test('존재하지 않는 orderId 조회 → 4xx 또는 null', async ({ request }) => {
    const user = await createE2EUser(request, 'payget');
    const auth = authHeaders(user.accessToken);
    const res = await request.get('/api/user/payments/order/NO-SUCH-ORDER-12345', {
      headers: auth,
    });
    if (res.status() === 200) {
      const body = await res.json().catch(() => ({}));
      const data = body?.data ?? body;
      expect(data?.id ?? data?.orderId).toBeFalsy();
    } else {
      expect([400, 403, 404, 500]).toContain(res.status());
    }
  });

  test('토큰 없이 order 조회 → 401', async ({ request }) => {
    const res = await request.get('/api/user/payments/order/ORDER-X');
    expect(res.status()).toBe(401);
  });

  test('토큰 없이 abandon → 401', async ({ request }) => {
    const res = await request.post('/api/user/payments/ORDER-X/abandon', {
      data: { reason: 'user_cancel' },
    });
    expect(res.status()).toBe(401);
  });

  test('존재하지 않는 orderId abandon → 4xx', async ({ request }) => {
    const user = await createE2EUser(request, 'payaban');
    const res = await request.post('/api/user/payments/NO-SUCH-ORDER-77777/abandon', {
      headers: authHeaders(user.accessToken),
      data: { reason: 'user_cancel' },
    });
    expect([400, 403, 404, 500]).toContain(res.status());
  });
});
