import { test, expect, request, type Page, type BrowserContext } from '@playwright/test';

/**
 * 2인 실시간 채팅 E2E 테스트 (standalone 프로젝트)
 *
 * 2개 브라우저 컨텍스트로 실시간 메시지 수신 검증
 * API 직접 로그인 → localStorage 주입
 *
 * 실행: npx playwright test chat-realtime.spec.ts --project=standalone
 */

const API_BASE_URL = process.env.E2E_BASE_URL || 'https://dev-api.parkgolfmate.com';

// ── 테스트 사용자 ────────────────────────────────

const USER_A = { email: 'test@parkgolf.com', password: 'test1234', id: 3, name: '테스트사용자' };
const USER_B = { email: 'cheolsu@parkgolf.com', password: 'test1234', id: 4, name: '김철수' };

// ── 인증 헬퍼 ────────────────────────────────────

interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: { id: number; email: string; name: string };
}

async function loginViaApi(
  email: string,
  password: string,
  userInfo: { id: number; name: string },
): Promise<AuthData> {
  const apiContext = await request.newContext({ baseURL: API_BASE_URL });
  const loginRes = await apiContext.post('/api/user/iam/login', {
    data: { email, password },
  });

  if (!loginRes.ok()) {
    await apiContext.dispose();
    throw new Error(`Login failed for ${email}: ${loginRes.status()}`);
  }

  const loginData = await loginRes.json();
  const accessToken = loginData.data?.accessToken || loginData.accessToken;
  const refreshToken = loginData.data?.refreshToken || loginData.refreshToken;
  await apiContext.dispose();

  return {
    accessToken,
    refreshToken,
    user: { id: userInfo.id, email, name: userInfo.name },
  };
}

async function injectAuth(page: Page, auth: AuthData): Promise<void> {
  await page.goto('/login');
  await page.evaluate((data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: { token: data.accessToken, refreshToken: data.refreshToken },
        version: 0,
      }),
    );
  }, auth);
}

/** API로 DIRECT 채팅방 생성 (또는 기존 방 반환) */
async function getOrCreateDirectRoom(
  auth: AuthData,
  targetUserId: string,
  targetUserName: string,
): Promise<string> {
  const apiContext = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${auth.accessToken}` },
  });

  const res = await apiContext.post('/api/user/chat/rooms', {
    data: {
      name: targetUserName,
      type: 'DIRECT',
      participant_ids: [targetUserId],
    },
  });

  const data = await res.json();
  await apiContext.dispose();
  return data.data?.id || data.id;
}

// ── 2인 실시간 채팅 테스트 ───────────────────────

test.describe.serial('2인 실시간 채팅 테스트', () => {
  test.setTimeout(120000);

  let authA: AuthData;
  let authB: AuthData;
  let roomId: string;
  let contextA: BrowserContext;
  let contextB: BrowserContext;
  let pageA: Page;
  let pageB: Page;

  test('두 사용자 인증 및 채팅방 입장', async ({ browser }) => {
    test.slow();

    // API 로그인
    authA = await loginViaApi(USER_A.email, USER_A.password, USER_A);
    authB = await loginViaApi(USER_B.email, USER_B.password, USER_B);

    // DIRECT 채팅방 생성/조회
    roomId = await getOrCreateDirectRoom(authA, String(USER_B.id), USER_B.name);
    expect(roomId).toBeTruthy();

    // 브라우저 컨텍스트 생성
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    // 인증 주입
    await injectAuth(pageA, authA);
    await injectAuth(pageB, authB);

    // 채팅방 입장
    await pageA.goto(`/chat/${roomId}`);
    await expect(pageA.getByPlaceholder(/메시지 입력/)).toBeVisible({ timeout: 15000 });

    await pageB.goto(`/chat/${roomId}`);
    await expect(pageB.getByPlaceholder(/메시지 입력/)).toBeVisible({ timeout: 15000 });

    // 소켓 연결 안정화 대기
    await pageA.waitForTimeout(3000);
    await pageB.waitForTimeout(3000);
  });

  test('User A 전송 → User B 실시간 수신', async () => {
    test.slow();
    test.skip(!roomId, '셋업 실패');

    const uniqueMsg = `A→B-${Date.now()}`;

    // User A 메시지 전송
    const inputA = pageA.getByPlaceholder(/메시지 입력/);
    await inputA.fill(uniqueMsg);
    await inputA.press('Enter');

    // User A에서 메시지 표시 확인
    await expect(pageA.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15000 });

    // User B에서 실시간 수신 확인
    await expect(pageB.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15000 });
  });

  test('User B 응답 → User A 실시간 수신', async () => {
    test.slow();
    test.skip(!roomId, '셋업 실패');

    const uniqueMsg = `B→A-${Date.now()}`;

    // User B 메시지 전송
    const inputB = pageB.getByPlaceholder(/메시지 입력/);
    await inputB.fill(uniqueMsg);
    await inputB.press('Enter');

    // User B에서 메시지 표시 확인
    await expect(pageB.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15000 });

    // User A에서 실시간 수신 확인
    await expect(pageA.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15000 });
  });

  test('양방향 메시지 순서 보장', async () => {
    test.slow();
    test.skip(!roomId, '셋업 실패');

    const ts = Date.now();
    const msgA1 = `A1-${ts}`;
    const msgB1 = `B1-${ts}`;
    const msgA2 = `A2-${ts}`;

    // A → 첫 번째 메시지
    const inputA = pageA.getByPlaceholder(/메시지 입력/);
    await inputA.fill(msgA1);
    await inputA.press('Enter');
    await expect(pageA.getByText(msgA1).first()).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByText(msgA1).first()).toBeVisible({ timeout: 15000 });

    // B → 응답
    const inputB = pageB.getByPlaceholder(/메시지 입력/);
    await inputB.fill(msgB1);
    await inputB.press('Enter');
    await expect(pageB.getByText(msgB1).first()).toBeVisible({ timeout: 15000 });
    await expect(pageA.getByText(msgB1).first()).toBeVisible({ timeout: 15000 });

    // A → 두 번째 메시지
    await inputA.fill(msgA2);
    await inputA.press('Enter');
    await expect(pageA.getByText(msgA2).first()).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByText(msgA2).first()).toBeVisible({ timeout: 15000 });

    // 양쪽 모두 동일 순서 확인: A1 < B1 < A2
    for (const p of [pageA, pageB]) {
      const allText = await p.locator('.space-y-3').innerText();
      const idxA1 = allText.indexOf(msgA1);
      const idxB1 = allText.indexOf(msgB1);
      const idxA2 = allText.indexOf(msgA2);
      expect(idxA1).toBeGreaterThanOrEqual(0);
      expect(idxB1).toBeGreaterThanOrEqual(0);
      expect(idxA2).toBeGreaterThanOrEqual(0);
      expect(idxA1).toBeLessThan(idxB1);
      expect(idxB1).toBeLessThan(idxA2);
    }
  });

  test('채팅방 목록 최신 메시지 업데이트', async () => {
    test.slow();
    test.skip(!roomId, '셋업 실패');

    const lastMsg = `최종-${Date.now()}`;

    // User A 메시지 전송
    const inputA = pageA.getByPlaceholder(/메시지 입력/);
    await inputA.fill(lastMsg);
    await inputA.press('Enter');
    await expect(pageA.getByText(lastMsg).first()).toBeVisible({ timeout: 15000 });

    // User A 목록으로 이동 → 최신 메시지 확인
    await pageA.goto('/social?tab=chat');
    await pageA.waitForTimeout(3000);
    await expect(pageA.getByText(lastMsg).first()).toBeVisible({ timeout: 10000 });

    // User B 목록으로 이동 → 최신 메시지 확인
    await pageB.goto('/social?tab=chat');
    await pageB.waitForTimeout(3000);
    await expect(pageB.getByText(lastMsg).first()).toBeVisible({ timeout: 10000 });

    // 컨텍스트 정리
    await contextA.close();
    await contextB.close();
  });
});
