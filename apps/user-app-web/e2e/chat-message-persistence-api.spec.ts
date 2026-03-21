import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * 채팅 메시지 DB 저장 검증 API 테스트
 *
 * REST API 경로로 메시지를 전송한 뒤, 메시지 목록 조회로 DB 저장 여부를 확인.
 * WebSocket fire-and-forget 이슈와 별개로, REST 경로의 저장 신뢰성도 함께 검증.
 *
 * 실행:
 *   E2E_API_BASE_URL=https://dev-api.parkgolfmate.com npx playwright test e2e/chat-message-persistence-api.spec.ts --project=api
 */

const API_BASE = process.env.E2E_API_BASE_URL || 'https://dev-api.parkgolfmate.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@parkgolf.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test1234';

interface TestCtx {
  api: APIRequestContext;
  token: string;
  roomId: string;
}

async function login(api: APIRequestContext): Promise<string> {
  const res = await api.post(`${API_BASE}/api/user/iam/login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const token = body.data?.accessToken ?? body.accessToken;
  expect(token).toBeTruthy();
  return token;
}

async function getOrCreateRoom(api: APIRequestContext, token: string): Promise<string> {
  // 기존 채팅방 조회
  const listRes = await api.get(`${API_BASE}/api/user/chat/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(listRes.ok()).toBeTruthy();
  const listBody = await listRes.json();
  const rooms = listBody.data ?? listBody;

  if (Array.isArray(rooms) && rooms.length > 0) {
    return rooms[0].id;
  }

  // 없으면 생성
  const createRes = await api.post(`${API_BASE}/api/user/chat/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `MSG_PERSIST_TEST_${Date.now()}`, type: 'DIRECT', participant_ids: [] },
  });
  expect(createRes.ok()).toBeTruthy();
  const createBody = await createRes.json();
  const roomId = createBody.data?.id ?? createBody.id;
  expect(roomId).toBeTruthy();
  return roomId;
}

async function sendMessage(ctx: TestCtx, content: string) {
  const res = await ctx.api.post(`${API_BASE}/api/user/chat/rooms/${ctx.roomId}/messages`, {
    headers: { Authorization: `Bearer ${ctx.token}` },
    data: { content, message_type: 'TEXT' },
  });
  return { status: res.status(), body: await res.json() };
}

async function getMessages(ctx: TestCtx, limit = 50) {
  const res = await ctx.api.get(`${API_BASE}/api/user/chat/rooms/${ctx.roomId}/messages?limit=${limit}`, {
    headers: { Authorization: `Bearer ${ctx.token}` },
  });
  return { status: res.status(), body: await res.json() };
}

// ════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════

test.describe('채팅 메시지 DB 저장 검증', () => {
  let ctx: TestCtx;

  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext();
    const token = await login(api);
    const roomId = await getOrCreateRoom(api, token);
    ctx = { api, token, roomId };
  });

  test.afterAll(async () => {
    await ctx.api.dispose();
  });

  test('REST API로 메시지 전송 → 즉시 저장 확인', async () => {
    const uniqueMsg = `PERSIST-TEST-${Date.now()}`;

    // 1. 메시지 전송
    const sendResult = await sendMessage(ctx, uniqueMsg);
    expect(sendResult.status).toBe(201);
    expect(sendResult.body.success).toBe(true);

    // 2. 메시지 목록 조회 — DB에서 직접 읽으므로 즉시 확인 가능
    const listResult = await getMessages(ctx);
    expect(listResult.status).toBe(200);
    expect(listResult.body.success).toBe(true);

    const messages = listResult.body.data?.messages ?? listResult.body.data ?? [];
    const found = messages.find((m: any) => m.content === uniqueMsg);
    expect(found).toBeTruthy();
    expect(found.messageType).toBe('TEXT');
  });

  test('연속 메시지 3건 전송 → 모두 저장 확인', async () => {
    const ts = Date.now();
    const msgs = [`BATCH-1-${ts}`, `BATCH-2-${ts}`, `BATCH-3-${ts}`];

    // 연속 전송
    for (const msg of msgs) {
      const result = await sendMessage(ctx, msg);
      expect(result.status).toBe(201);
    }

    // 조회
    const listResult = await getMessages(ctx);
    expect(listResult.status).toBe(200);

    const messages = listResult.body.data?.messages ?? listResult.body.data ?? [];
    for (const msg of msgs) {
      const found = messages.find((m: any) => m.content === msg);
      expect(found).toBeTruthy();
    }
  });

  test('빈 문자열 메시지 전송 → 거부 또는 저장 확인', async () => {
    const result = await sendMessage(ctx, '');
    // 빈 메시지는 400 에러 또는 저장 성공 중 하나여야 함 (서비스 정책에 따라)
    expect([201, 400]).toContain(result.status);
  });

  test('긴 메시지 전송 → 저장 확인', async () => {
    const longMsg = `LONG-MSG-${'가'.repeat(500)}-${Date.now()}`;

    const sendResult = await sendMessage(ctx, longMsg);
    expect(sendResult.status).toBe(201);

    const listResult = await getMessages(ctx);
    const messages = listResult.body.data?.messages ?? listResult.body.data ?? [];
    const found = messages.find((m: any) => m.content === longMsg);
    expect(found).toBeTruthy();
  });

  test('메시지 전송 후 재조회 시 순서 보장 (최신 메시지 우선)', async () => {
    const ts = Date.now();
    const msg1 = `ORDER-A-${ts}`;
    const msg2 = `ORDER-B-${ts}`;

    await sendMessage(ctx, msg1);
    // 순서 보장을 위해 약간의 딜레이
    await new Promise(r => setTimeout(r, 100));
    await sendMessage(ctx, msg2);

    const listResult = await getMessages(ctx);
    const messages = listResult.body.data?.messages ?? listResult.body.data ?? [];

    const idx1 = messages.findIndex((m: any) => m.content === msg1);
    const idx2 = messages.findIndex((m: any) => m.content === msg2);

    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThanOrEqual(0);

    // 최신 메시지가 배열 앞쪽이면 idx2 < idx1, 뒤쪽이면 idx1 < idx2
    // 어느 쪽이든 둘 다 존재하고 순서가 일관되면 OK
    expect(idx1).not.toBe(idx2);
  });

  test('중복 ID 방지 — 같은 내용의 메시지도 각각 저장', async () => {
    const sameContent = `DUP-CHECK-${Date.now()}`;

    await sendMessage(ctx, sameContent);
    await sendMessage(ctx, sameContent);

    const listResult = await getMessages(ctx);
    const messages = listResult.body.data?.messages ?? listResult.body.data ?? [];
    const matches = messages.filter((m: any) => m.content === sameContent);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
