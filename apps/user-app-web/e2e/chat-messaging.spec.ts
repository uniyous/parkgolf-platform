import { test, expect, type Page } from '@playwright/test';

/**
 * 채팅 메시지 전송/수신 E2E 테스트
 *
 * 실행: npx playwright test chat-messaging.spec.ts
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

/** 메시지 전송 (Enter 키) 후 DOM에 표시될 때까지 대기 */
async function sendMessageAndWait(page: Page, text: string) {
  const messageInput = page.getByPlaceholder(/메시지 입력/);
  await messageInput.fill(text);
  await messageInput.press('Enter');
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 });
}

// ── 메시지 전송/수신 테스트 ──────────────────────

test.describe('채팅 메시지 전송/수신 테스트', () => {
  test('빈 입력 시 전송 버튼 비활성화', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    await expect(messageInput).toHaveValue('');

    // 전송 버튼 disabled 확인
    const sendButton = page.locator('button:has(svg.lucide-send)');
    await expect(sendButton).toBeDisabled();

    // 텍스트 입력 → 버튼 활성화
    await messageInput.fill('테스트');
    await expect(sendButton).toBeEnabled();
  });

  test('메시지 입력 후 전송 버튼 클릭 전송', async ({ page }) => {
    test.slow();
    const entered = await enterFirstChatRoom(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const uniqueMsg = `E2E-전송테스트-${Date.now()}`;
    await messageInput.fill(uniqueMsg);

    // TanStack Query DevTools 오버레이가 클릭을 가리므로 JS click 사용
    const sendButton = page.locator('button:has(svg.lucide-send)');
    await sendButton.evaluate((el) => (el as HTMLButtonElement).click());

    // input 초기화 확인
    await expect(messageInput).toHaveValue('');

    // 메시지 버블 표시 확인 (소켓 broadcast로 중복 가능 → .first())
    await expect(page.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15000 });
  });

  test('Enter 키로 메시지 전송', async ({ page }) => {
    test.slow();
    const entered = await enterFirstChatRoom(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const uniqueMsg = `E2E-엔터전송-${Date.now()}`;
    await messageInput.fill(uniqueMsg);
    await messageInput.press('Enter');

    await expect(messageInput).toHaveValue('');
    await expect(page.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15000 });
  });

  test('전송된 메시지 우측 정렬 확인', async ({ page }) => {
    test.slow();
    const entered = await enterFirstChatRoom(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const uniqueMsg = `E2E-정렬확인-${Date.now()}`;
    await sendMessageAndWait(page, uniqueMsg);

    // 본인 메시지는 justify-end (오른쪽 정렬)
    const messageFlex = page.locator('.justify-end').filter({ hasText: uniqueMsg });
    await expect(messageFlex.first()).toBeVisible();
  });

  test('전송된 메시지 시간 표시', async ({ page }) => {
    test.slow();
    const entered = await enterFirstChatRoom(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const uniqueMsg = `E2E-시간확인-${Date.now()}`;
    await sendMessageAndWait(page, uniqueMsg);

    // 메시지 행에 HH:MM 형식 시간 표시 확인
    const messageRow = page.locator('.justify-end').filter({ hasText: uniqueMsg }).first();
    const timeText = messageRow.locator('span').filter({ hasText: /\d{1,2}:\d{2}/ });
    await expect(timeText.first()).toBeVisible();
  });

  test('메시지 순서 검증', async ({ page }) => {
    test.slow();
    const entered = await enterFirstChatRoom(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const ts = Date.now();
    const msg1 = `E2E-순서1-${ts}`;
    const msg2 = `E2E-순서2-${ts}`;

    // 첫 번째 메시지 전송
    await sendMessageAndWait(page, msg1);

    // 두 번째 메시지 전송
    await sendMessageAndWait(page, msg2);

    // msg1이 msg2보다 위에 위치하는지 DOM 순서로 확인
    const allText = await page.locator('.space-y-3').innerText();
    const idx1 = allText.indexOf(msg1);
    const idx2 = allText.indexOf(msg2);
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThanOrEqual(0);
    expect(idx1).toBeLessThan(idx2);
  });

  test('전송 후 채팅방 목록 최신 메시지 반영', async ({ page }) => {
    test.slow();
    const entered = await enterFirstChatRoom(page);
    if (!entered) { test.skip(true, '채팅방 없음'); return; }

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const uniqueMsg = `E2E-목록반영-${Date.now()}`;
    await sendMessageAndWait(page, uniqueMsg);

    // 목록으로 이동
    await page.goto('/social?tab=chat');
    await page.waitForTimeout(3000);

    // 첫 번째 카드에 최신 메시지 표시 확인
    const cards = chatRoomCards(page);
    if ((await cards.count()) > 0) {
      await expect(cards.first().getByText(uniqueMsg)).toBeVisible({ timeout: 10000 });
    }
  });

  test('빈 채팅방 첫 메시지 전송', async ({ page }) => {
    test.slow();
    await gotoChatTab(page);
    await page.waitForTimeout(1000);

    const cards = chatRoomCards(page);
    const count = await cards.count();
    let emptyRoomFound = false;

    // 빈 채팅방 찾기
    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(2000);

      const emptyState = page.getByText(/대화를 시작해보세요/);
      if (await emptyState.isVisible().catch(() => false)) {
        emptyRoomFound = true;

        const messageInput = page.getByPlaceholder(/메시지 입력/);
        const uniqueMsg = `E2E-첫메시지-${Date.now()}`;
        await messageInput.fill(uniqueMsg);
        await messageInput.press('Enter');

        // 빈 상태 사라지고 메시지 표시
        await expect(emptyState).not.toBeVisible({ timeout: 15000 });
        await expect(page.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15000 });
        break;
      }

      // 다음 방 시도
      await page.goto('/social?tab=chat');
      await page.waitForTimeout(1000);
    }

    if (!emptyRoomFound) {
      test.skip(true, '빈 채팅방이 없어서 스킵');
    }
  });
});
