import { test, expect, type Page } from '@playwright/test';

/**
 * 채팅 소켓 연결 복원력 E2E 테스트
 *
 * 소켓 연결 상태 표시, 재연결, REST 폴백 검증
 * 실행: npx playwright test chat-connection.spec.ts
 */

// ── Helpers ──────────────────────────────────────

async function gotoChatTab(page: Page) {
  await page.goto('/social?tab=chat');
  await page.waitForTimeout(2000);

  const chatTab = page.getByRole('button', { name: '채팅', exact: true });
  if (await chatTab.isVisible()) {
    await chatTab.click();
    await page.waitForTimeout(1000);
  }
}

function chatRoomCards(page: Page) {
  return page.locator('button.w-full.text-left:has(.glass-card)');
}

async function enterFirstChatRoom(page: Page): Promise<boolean> {
  await gotoChatTab(page);
  await page.waitForTimeout(1000);

  const cards = chatRoomCards(page);
  const count = await cards.count();

  if (count > 0) {
    await cards.first().click();
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

/**
 * 소켓 완전 차단 (WebSocket + polling 모두)
 * page.route: polling(HTTP) 차단
 * page.routeWebSocket: WebSocket 연결 차단
 */
async function blockSocket(page: Page) {
  await page.routeWebSocket('**/socket.io/**', (ws) => ws.close());
  await page.route('**/socket.io/**', (route) => route.abort());
}

/** 소켓 차단 해제 */
async function unblockSocket(page: Page) {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
}

/** 소켓 차단 후 첫 번째 채팅방 입장 (소켓 미연결 상태로 시작) */
async function enterFirstChatRoomWithSocketBlocked(page: Page): Promise<boolean> {
  await blockSocket(page);

  await gotoChatTab(page);
  await page.waitForTimeout(1000);

  const cards = chatRoomCards(page);
  const count = await cards.count();

  if (count > 0) {
    await cards.first().click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}

// ── 소켓 연결 복원력 테스트 ──────────────────────

test.describe('소켓 연결 복원력 테스트', () => {
  test('소켓 연결됨 → Wifi 아이콘 녹색', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    // 소켓 연결 대기
    await page.waitForTimeout(3000);

    // Wifi 아이콘 (녹색) 확인
    const wifiIcon = page.locator('svg.lucide-wifi');
    await expect(wifiIcon).toBeVisible({ timeout: 20000 });
    await expect(wifiIcon).toHaveClass(/text-emerald-400/);
  });

  test('소켓 차단 → WifiOff 아이콘 표시', async ({ page }) => {
    // 소켓 차단 후 채팅방 입장 → 처음부터 미연결 상태
    const entered = await enterFirstChatRoomWithSocketBlocked(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    // WifiOff 아이콘 (노란색) 확인
    const wifiOffIcon = page.locator('svg.lucide-wifi-off');
    await expect(wifiOffIcon).toBeVisible({ timeout: 15000 });
    await expect(wifiOffIcon).toHaveClass(/text-yellow-400/);
  });

  test('재연결 버튼 동작', async ({ page }) => {
    test.slow();

    // 동적 플래그 기반 소켓 차단 (unrouteAll 대신 플래그 전환)
    let shouldBlock = true;
    await page.routeWebSocket('**/socket.io/**', (ws) => {
      if (shouldBlock) { ws.close(); } else { ws.connectToServer(); }
    });
    await page.route('**/socket.io/**', (route) => {
      if (shouldBlock) { route.abort(); } else { route.continue(); }
    });

    // 채팅방 입장 (소켓 차단 상태)
    await gotoChatTab(page);
    await page.waitForTimeout(1000);
    const cards = chatRoomCards(page);
    if ((await cards.count()) === 0) { test.skip(true, '채팅방 없음'); return; }
    await cards.first().click();
    await page.waitForTimeout(3000);

    // WifiOff 확인
    await expect(page.locator('svg.lucide-wifi-off')).toBeVisible({ timeout: 15000 });

    // 플래그 전환 → 소켓 허용
    shouldBlock = false;

    // 재연결 버튼 (RefreshCw 아이콘) 클릭
    const reconnectBtn = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') });
    await reconnectBtn.click();

    // Wifi 아이콘 복구 확인
    const wifiIcon = page.locator('svg.lucide-wifi');
    await expect(wifiIcon).toBeVisible({ timeout: 30000 });
  });

  test('REST 폴백 메시지 전송', async ({ page }) => {
    test.slow();

    // 소켓 차단 상태로 시작
    const entered = await enterFirstChatRoomWithSocketBlocked(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const uniqueMsg = `E2E-REST폴백-${Date.now()}`;
    await messageInput.fill(uniqueMsg);

    // REST API POST 응답 감시
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/messages') && res.request().method() === 'POST',
    );

    // TanStack Query DevTools 오버레이 회피 → JS click
    const sendButton = page.locator('button:has(svg.lucide-send)');
    await sendButton.evaluate((el) => (el as HTMLButtonElement).click());

    // REST API 응답 확인
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(300);

    // 메시지 표시 확인
    await expect(page.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15000 });
  });

  test('메시지 입력 항상 활성화', async ({ page }) => {
    // 소켓 차단 상태에서도 입력 가능
    const entered = await enterFirstChatRoomWithSocketBlocked(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    await expect(messageInput).toBeEnabled();

    // 입력 가능 확인
    await messageInput.fill('테스트 메시지');
    await expect(messageInput).toHaveValue('테스트 메시지');
  });
});
