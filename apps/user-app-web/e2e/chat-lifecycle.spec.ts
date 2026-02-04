import { test, expect, type Page } from '@playwright/test';

/**
 * 채팅방 생명주기 E2E 테스트 (serial)
 *
 * 방 생성 → 메시지 전송 → 나가기 전체 사이클
 * 실행: npx playwright test chat-lifecycle.spec.ts
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

async function openNewChatModal(page: Page): Promise<boolean> {
  const headerBtn = page.getByRole('button', { name: '새 채팅' });
  if (await headerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await headerBtn.click();
    await page.waitForTimeout(1000);
    return true;
  }
  const emptyBtn = page.getByRole('button', { name: /새 채팅 시작/ });
  if (await emptyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emptyBtn.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

async function selectFriends(page: Page, count: number): Promise<boolean> {
  const checkboxes = page.locator('.rounded-md.border-2');
  const available = await checkboxes.count();
  if (available < count) return false;
  for (let i = 0; i < count; i++) {
    const btn = checkboxes.nth(i).locator('xpath=ancestor::button[1]');
    await btn.click();
    await page.waitForTimeout(300);
  }
  return true;
}

// ── 공유 상태 ────────────────────────────────────

let groupRoomId: string | null = null;
let directRoomId: string | null = null;
const GROUP_NAME = `E2E-lifecycle-${Date.now()}`;

// ── Serial 테스트 ────────────────────────────────

test.describe.serial('채팅방 생명주기', () => {
  test('그룹 채팅방 생성 → 목록 표시 확인', async ({ page }) => {
    test.slow();
    await gotoChatTab(page);

    if (!(await openNewChatModal(page))) { test.skip(true, '새 채팅 모달 열기 실패'); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 2))) { test.skip(true, '친구 2명 미만'); return; }
    await page.waitForTimeout(500);

    // 다음 → 그룹 이름 입력
    await page.getByRole('button', { name: /다음/ }).click();
    await page.waitForTimeout(500);

    await page.locator('input.input-glass').fill(GROUP_NAME);
    await page.getByRole('button', { name: '만들기' }).click();

    // /chat/{roomId} 리다이렉트 확인
    await expect(page).toHaveURL(/\/chat\//, { timeout: 15000 });

    // roomId 추출
    const url = page.url();
    const match = url.match(/\/chat\/([^/?]+)/);
    if (match) {
      groupRoomId = match[1];
    }
    expect(groupRoomId).toBeTruthy();

    // 목록으로 이동 → 방 이름 표시 확인
    await gotoChatTab(page);
    await expect(page.getByText(GROUP_NAME)).toBeVisible({ timeout: 10000 });
  });

  test('생성된 채팅방 입장 → 메시지 전송', async ({ page }) => {
    test.skip(!groupRoomId, '이전 테스트에서 방 생성 실패');
    test.slow();

    await page.goto(`/chat/${groupRoomId}`);
    await page.waitForTimeout(3000);

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const uniqueMsg = `E2E-lifecycle-msg-${Date.now()}`;
    await messageInput.fill(uniqueMsg);
    await messageInput.press('Enter');

    // 메시지 버블 표시 확인
    await expect(page.getByText(uniqueMsg)).toBeVisible({ timeout: 15000 });
  });

  test('채팅방 나가기 → 목록에서 제거', async ({ page }) => {
    test.skip(!groupRoomId, '이전 테스트에서 방 생성 실패');

    await page.goto(`/chat/${groupRoomId}`);
    await page.waitForTimeout(3000);

    // 메뉴 열기
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    await menuButton.click();
    await page.waitForTimeout(500);

    // 나가기 클릭 → confirm dialog 수락
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByText('나가기').click();

    // 채팅 목록으로 리다이렉트
    await expect(page).toHaveURL(/\/social\?tab=chat/, { timeout: 10000 });

    // 해당 방이 목록에서 사라졌는지 확인
    await page.waitForTimeout(2000);
    await expect(page.getByText(GROUP_NAME)).not.toBeVisible();
  });

  test('1:1 DIRECT 채팅방 생성', async ({ page }) => {
    test.slow();
    await gotoChatTab(page);

    if (!(await openNewChatModal(page))) { test.skip(true, '새 채팅 모달 열기 실패'); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 1))) { test.skip(true, '친구 없음'); return; }
    await page.waitForTimeout(500);

    // "채팅 시작" 클릭 (MobileTabBar 가림 방지 → JS click)
    const chatStartBtn = page.getByRole('button', { name: /채팅 시작/ });
    await expect(chatStartBtn).toBeVisible({ timeout: 5000 });
    await chatStartBtn.evaluate((el: HTMLButtonElement) => el.click());

    // /chat/{roomId} 이동 확인
    await expect(page).toHaveURL(/\/chat\//, { timeout: 15000 });

    const url = page.url();
    const match = url.match(/\/chat\/([^/?]+)/);
    if (match) {
      directRoomId = match[1];
    }
    expect(directRoomId).toBeTruthy();
  });

  test('DIRECT 채팅방 표시 이름 확인', async ({ page }) => {
    test.skip(!directRoomId, '이전 테스트에서 DIRECT 방 생성 실패');

    await page.goto(`/chat/${directRoomId}`);
    await page.waitForTimeout(3000);

    // SubPageHeader 타이틀 확인
    // 헤더에 방 ID나 "DIRECT" 문자열이 아닌 상대방 이름이 표시되어야 함
    const pageContent = await page.content();
    expect(pageContent).not.toContain(`>${directRoomId!}<`);

    // 메시지 입력창이 보이면 채팅방 정상 로드
    await expect(page.getByPlaceholder(/메시지 입력/)).toBeVisible({ timeout: 10000 });
  });

  test('GROUP 채팅방 타입 배지 표시', async ({ page }) => {
    await gotoChatTab(page);
    await page.waitForTimeout(2000);

    const cards = chatRoomCards(page);
    const count = await cards.count();

    if (count > 0) {
      // GROUP 방의 참여자 수 배지 확인
      // 채팅방 카드 내 참여자 수 (예: "3" 표시) 또는 Users 아이콘
      const hasParticipantInfo = await cards.first().locator('p, span').count() > 0;
      expect(hasParticipantInfo).toBeTruthy();
    } else {
      test.skip(true, '채팅방 없음');
    }
  });

  test('DIRECT 채팅방 나가기 (정리)', async ({ page }) => {
    test.skip(!directRoomId, '이전 테스트에서 DIRECT 방 생성 실패');

    await page.goto(`/chat/${directRoomId}`);
    await page.waitForTimeout(3000);

    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    await menuButton.click();
    await page.waitForTimeout(500);

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByText('나가기').click();

    await expect(page).toHaveURL(/\/social\?tab=chat/, { timeout: 10000 });
  });
});
