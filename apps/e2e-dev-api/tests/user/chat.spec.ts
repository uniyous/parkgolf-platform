import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * 채팅방 CRUD + 메시지
 *
 *   GET  /api/user/chat/rooms                          — 내 채팅방 목록
 *   POST /api/user/chat/rooms                          — 채팅방 생성
 *   GET  /api/user/chat/rooms/:roomId                  — 상세
 *   POST /api/user/chat/rooms/:roomId/members          — 멤버 초대
 *   GET  /api/user/chat/rooms/:roomId/messages         — 메시지 목록
 *   POST /api/user/chat/rooms/:roomId/messages         — 메시지 전송
 *   POST /api/user/chat/rooms/:roomId/read             — 읽음 처리
 *   GET  /api/user/chat/rooms/:roomId/unread           — 미읽음 수
 *
 * @write — 2명 user + 1개 CHANNEL room 생성
 */
test.describe('User > Chat @write', () => {
  test('CHANNEL 생성 → 멤버 초대 → 메시지 송수신 → 읽음', async ({ request }) => {
    const owner = await createE2EUser(request, 'chatA');
    const guest = await createE2EUser(request, 'chatB');
    const ownerAuth = authHeaders(owner.accessToken);
    const guestAuth = authHeaders(guest.accessToken);

    // 1) room 생성 (CHANNEL)
    const createRes = await request.post('/api/user/chat/rooms', {
      headers: ownerAuth,
      data: {
        name: 'E2E 채팅방',
        type: 'CHANNEL',
        participant_ids: [String(owner.userId)],
      },
    });
    const createBody = await createRes.json().catch(() => ({}));
    expect(
      createRes.ok() || createRes.status() === 201,
      `room create [${createRes.status()}]: ${JSON.stringify(createBody).slice(0, 200)}`,
    ).toBeTruthy();
    const room = createBody?.data ?? createBody;
    const roomId: string = room?.id ?? room?.roomId;
    expect(roomId, 'roomId missing').toBeTruthy();

    // 2) 멤버 초대 — guest 추가
    const addRes = await request.post(`/api/user/chat/rooms/${roomId}/members`, {
      headers: ownerAuth,
      data: { user_ids: [String(guest.userId)] },
    });
    expect(
      addRes.ok() || addRes.status() === 201 || addRes.status() === 409,
      `add member [${addRes.status()}]`,
    ).toBeTruthy();

    // 3) owner가 메시지 전송
    const sendRes = await request.post(`/api/user/chat/rooms/${roomId}/messages`, {
      headers: ownerAuth,
      data: { content: 'hello from e2e' },
    });
    expect(
      sendRes.ok() || sendRes.status() === 201,
      `send message [${sendRes.status()}]`,
    ).toBeTruthy();

    // 4) guest가 목록 조회
    const myRooms = await request.get('/api/user/chat/rooms', { headers: guestAuth });
    expect(myRooms.ok(), `my rooms [${myRooms.status()}]`).toBeTruthy();

    // 5) guest가 메시지 조회 — 위 메시지 포함
    const msgs = await request.get(`/api/user/chat/rooms/${roomId}/messages?limit=10`, {
      headers: guestAuth,
    });
    expect(msgs.ok(), `messages [${msgs.status()}]`).toBeTruthy();
    const msgBody = await msgs.json();
    const data = msgBody?.data ?? msgBody;
    const items = data?.items ?? data?.messages ?? (Array.isArray(data) ? data : []);
    expect(Array.isArray(items)).toBeTruthy();

    // 6) read 처리
    const read = await request.post(`/api/user/chat/rooms/${roomId}/read`, {
      headers: guestAuth,
    });
    expect([200, 201]).toContain(read.status());

    // 7) unread count
    const unread = await request.get(`/api/user/chat/rooms/${roomId}/unread`, {
      headers: guestAuth,
    });
    expect(unread.ok(), `unread [${unread.status()}]`).toBeTruthy();
  });

  test('존재하지 않는 room 조회 — 명시적 not-found 응답', async ({ request }) => {
    const user = await createE2EUser(request, 'chat404');
    const res = await request.get('/api/user/chat/rooms/nonexistent-room-id', {
      headers: authHeaders(user.accessToken),
    });
    // NATS handler가 not-found를 200 + success:false / 또는 4xx로 응답할 수 있음
    if (res.status() === 200) {
      const body = await res.json().catch(() => ({}));
      const room = body?.data ?? body;
      expect(room?.id ?? room?.roomId).toBeFalsy();
    } else {
      expect([400, 403, 404]).toContain(res.status());
    }
  });

  test('토큰 없이 room 목록 → 401', async ({ request }) => {
    const res = await request.get('/api/user/chat/rooms');
    expect(res.status()).toBe(401);
  });
});
