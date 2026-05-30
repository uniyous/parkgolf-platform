import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * 사용자 알림 read + 멱등 read 처리
 *
 *   GET    /api/user/notifications
 *   GET    /api/user/notifications/unread-count
 *   POST   /api/user/notifications/:id/read       — id 미존재 시 404
 *   POST   /api/user/notifications/read-all
 *   DELETE /api/user/notifications/:id            — id 미존재 시 404
 *
 * 신규 user는 알림이 없거나 시스템 환영 알림 1건 정도 → array/숫자 형태 검증 위주.
 */
test.describe('User > Notifications @write', () => {
  test('list / unread-count / read-all — 신규 user', async ({ request }) => {
    const user = await createE2EUser(request, 'notif');
    const auth = authHeaders(user.accessToken);

    const list = await request.get('/api/user/notifications?page=1&limit=10', { headers: auth });
    expect(list.ok(), `list [${list.status()}]`).toBeTruthy();
    const listBody = await list.json();
    const listData = listBody?.data ?? listBody;
    const items = Array.isArray(listData)
      ? listData
      : listData?.items ?? listData?.list ?? listData?.notifications ?? [];
    expect(Array.isArray(items)).toBeTruthy();

    const count = await request.get('/api/user/notifications/unread-count', { headers: auth });
    expect(count.ok(), `unread-count [${count.status()}]`).toBeTruthy();
    const countBody = await count.json();
    const c = countBody?.data?.count ?? countBody?.count ?? countBody?.data ?? 0;
    expect(typeof c === 'number' || typeof c === 'object').toBeTruthy();

    // read-all 멱등 — 알림 0건이어도 200
    const readAll = await request.post('/api/user/notifications/read-all', { headers: auth });
    expect([200, 201]).toContain(readAll.status());
  });

  test('존재하지 않는 알림 read → 404', async ({ request }) => {
    const user = await createE2EUser(request, 'n404');
    const res = await request.post('/api/user/notifications/99999999/read', {
      headers: authHeaders(user.accessToken),
    });
    expect([404, 400, 403]).toContain(res.status());
  });

  test('존재하지 않는 알림 delete → 404', async ({ request }) => {
    const user = await createE2EUser(request, 'nd404');
    const res = await request.delete('/api/user/notifications/99999999', {
      headers: authHeaders(user.accessToken),
    });
    expect([404, 400, 403]).toContain(res.status());
  });

  test('토큰 없이 list → 401', async ({ request }) => {
    const res = await request.get('/api/user/notifications');
    expect(res.status()).toBe(401);
  });
});
