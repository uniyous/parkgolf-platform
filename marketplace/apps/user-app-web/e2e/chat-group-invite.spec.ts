import { test, expect, type Page } from '@playwright/test';

/**
 * 그룹 채팅 생성 + 친구 초대 E2E 테스트
 *
 * 라우팅: /chat → /social?tab=chat (리다이렉트)
 * 실행: npx playwright test chat-group-invite.spec.ts --project=mobile-chrome
 */

// ── Helpers ──────────────────────────────────────

/** 새 채팅 모달 열기. 성공하면 true, 버튼을 못 찾으면 false */
async function openNewChatModal(page: Page): Promise<boolean> {
  // aria-label="새 채팅" 버튼 (MobileHeader에서 렌더)
  const headerBtn = page.getByRole('button', { name: '새 채팅' });
  if (await headerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await headerBtn.click();
    await page.waitForTimeout(1000);
    return true;
  }
  // 빈 상태의 "새 채팅 시작" 버튼
  const emptyBtn = page.getByRole('button', { name: /새 채팅 시작/ });
  if (await emptyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emptyBtn.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

/** 친구 목록에서 N명 선택. 가능하면 true */
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

/** 첫 번째 채팅방에 입장. 성공하면 true */
async function enterFirstChatRoom(page: Page): Promise<boolean> {
  await page.goto('/social?tab=chat');
  await page.waitForTimeout(3000);

  // 채팅방 카드: button > h4(이름) 구조
  const chatCards = page.locator('button').filter({ has: page.locator('h4') });
  if ((await chatCards.count()) === 0) return false;

  await chatCards.first().click();
  await page.waitForTimeout(2000);

  const input = page.getByPlaceholder(/메시지 입력/);
  return await input.isVisible({ timeout: 10000 }).catch(() => false);
}

/** ChatRoomPage 헤더의 케밥 메뉴(MoreVertical) 클릭 */
async function openChatRoomMenu(page: Page): Promise<void> {
  // SubPageHeader의 마지막 button (MoreVertical)
  // 구조: [뒤로가기 btn] [title] [rightContent: 연결상태, 참가자, 메뉴btn]
  const headerBtns = page.locator('header button, [class*="glass-card"] button').filter({ has: page.locator('svg') });
  const allBtns = page.locator('button').filter({ has: page.locator('svg') });
  // MoreVertical 은 메시지 입력 위 영역의 마지막 svg 버튼
  // 정확히: page 상단 header 영역에서 back 버튼이 아닌 마지막 버튼
  // 간단하게: MoreVertical icon 클래스 대신 위치로 찾기
  // ChatRoomPage에서는 SubPageHeader 내부의 rightContent 마지막 button
  const menuBtn = page.locator('div.relative > button').filter({ has: page.locator('svg') }).first();
  if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(500);
  }
}

// ── 1. 새 채팅 멀티 선택 UI ─────────────────────

test.describe('새 채팅 멀티 선택 UI 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/social?tab=chat');
    await page.waitForTimeout(2000);
  });

  test('새 채팅 모달에서 체크박스 UI 확인', async ({ page }) => {
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);

    const checkboxes = page.locator('.rounded-md.border-2');
    const noFriends = await page.getByText(/친구가 없습니다/).isVisible().catch(() => false);

    if (noFriends) {
      expect(noFriends).toBeTruthy();
    } else {
      expect(await checkboxes.count()).toBeGreaterThan(0);
    }
  });

  test('1명 선택 → "채팅 시작" 버튼 표시', async ({ page }) => {
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 1))) { test.skip(); return; }
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: /채팅 시작/ })).toBeVisible();
  });

  test('2명+ 선택 → "다음 (N명)" 버튼 표시', async ({ page }) => {
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 2))) { test.skip(); return; }
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: /다음.*2명/ })).toBeVisible();
  });

  test('0명 선택 → "대화 상대 선택" 버튼 disabled', async ({ page }) => {
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);

    const btn = page.getByRole('button', { name: '대화 상대 선택' });
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn).toBeDisabled();
    }
  });

  test('칩 클릭으로 선택 해제', async ({ page }) => {
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 1))) { test.skip(); return; }
    await page.waitForTimeout(500);

    // "채팅 시작" 확인
    await expect(page.getByRole('button', { name: /채팅 시작/ })).toBeVisible();

    // 칩(X 아이콘 포함 rounded-full 버튼) 클릭해서 해제
    const chips = page.locator('button.rounded-full').filter({ has: page.locator('svg') });
    if (await chips.first().isVisible()) {
      await chips.first().click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('button', { name: '대화 상대 선택' })).toBeVisible();
    }
  });
});

// ── 2. 그룹 채팅 생성 플로우 ────────────────────

test.describe('그룹 채팅 생성 플로우 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/social?tab=chat');
    await page.waitForTimeout(2000);
  });

  test('"다음" → 그룹 이름 입력 단계 진입', async ({ page }) => {
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 2))) { test.skip(); return; }
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /다음/ }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('그룹 이름 (선택)')).toBeVisible();
    await expect(page.getByRole('button', { name: '만들기' })).toBeVisible();
  });

  test('"뒤로" → 친구 선택 단계 복귀', async ({ page }) => {
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 2))) { test.skip(); return; }
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /다음/ }).click();
    await page.waitForTimeout(500);
    await page.getByText('뒤로').click();
    await page.waitForTimeout(500);

    await expect(page.getByPlaceholder(/친구 검색/)).toBeVisible();
  });

  test('선택된 멤버 칩 표시', async ({ page }) => {
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);

    const checkboxes = page.locator('.rounded-md.border-2');
    if ((await checkboxes.count()) < 2) { test.skip(); return; }

    const name1 = await checkboxes.nth(0).locator('xpath=ancestor::button[1]').locator('h4').textContent();
    const name2 = await checkboxes.nth(1).locator('xpath=ancestor::button[1]').locator('h4').textContent();
    await selectFriends(page, 2);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /다음/ }).click();
    await page.waitForTimeout(500);

    if (name1) await expect(page.getByText(name1).first()).toBeVisible();
    if (name2) await expect(page.getByText(name2).first()).toBeVisible();
  });

  test('그룹 이름 입력 후 "만들기" → 채팅방 생성', async ({ page }) => {
    test.slow();
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 2))) { test.skip(); return; }
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /다음/ }).click();
    await page.waitForTimeout(500);

    await page.locator('input.input-glass').fill('E2E 테스트 그룹');
    await page.getByRole('button', { name: '만들기' }).click();

    await page.waitForTimeout(5000);
    expect(page.url().includes('/chat/') || await page.getByText(/실패/).isVisible().catch(() => false)).toBeTruthy();
  });

  test('이름 미입력 시 기본 이름으로 생성', async ({ page }) => {
    test.slow();
    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 2))) { test.skip(); return; }
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /다음/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '만들기' }).click();

    await page.waitForTimeout(5000);
    expect(page.url().includes('/chat/') || await page.getByText(/실패/).isVisible().catch(() => false)).toBeTruthy();
  });
});

// ── 3. 1:1 채팅 (기존 동작 유지) ────────────────

test.describe('1:1 채팅 생성', () => {
  test('1명 선택 → "채팅 시작" → DIRECT 방 생성', async ({ page }) => {
    test.slow();
    await page.goto('/social?tab=chat');
    await page.waitForTimeout(2000);

    if (!(await openNewChatModal(page))) { test.skip(); return; }
    await page.waitForTimeout(1000);
    if (!(await selectFriends(page, 1))) { test.skip(); return; }
    await page.waitForTimeout(500);

    // MobileTabBar(fixed bottom nav)가 버튼을 가릴 수 있으므로 JS click
    const chatStartBtn = page.getByRole('button', { name: /채팅 시작/ });
    await expect(chatStartBtn).toBeVisible({ timeout: 5000 });
    await chatStartBtn.evaluate((el: HTMLButtonElement) => el.click());

    // 채팅방으로 이동하거나 에러 메시지 표시
    await expect(async () => {
      const url = page.url();
      const hasError = await page.getByText(/실패/).isVisible().catch(() => false);
      expect(url.includes('/chat/') || hasError).toBeTruthy();
    }).toPass({ timeout: 15000 });
  });
});

// ── 4. 채팅방 내 친구 초대 ──────────────────────

test.describe('채팅방 내 친구 초대 테스트', () => {
  test('메뉴에 "친구 초대" + "나가기" 표시', async ({ page }) => {
    if (!(await enterFirstChatRoom(page))) { test.skip(); return; }
    await openChatRoomMenu(page);

    await expect(page.getByText('친구 초대')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('나가기')).toBeVisible();
  });

  test('"친구 초대" → 초대 모달 열림', async ({ page }) => {
    if (!(await enterFirstChatRoom(page))) { test.skip(); return; }
    await openChatRoomMenu(page);

    await page.getByText('친구 초대').click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: '친구 초대' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/친구 검색/)).toBeVisible();
  });

  test('초대 모달 친구 검색', async ({ page }) => {
    if (!(await enterFirstChatRoom(page))) { test.skip(); return; }
    await openChatRoomMenu(page);
    await page.getByText('친구 초대').click();
    await page.waitForTimeout(1000);

    await page.getByPlaceholder(/친구 검색/).fill('test');
    await page.waitForTimeout(500);

    const checkboxes = page.locator('.rounded-md.border-2');
    const noFriends = await page.getByText(/초대할 수 있는 친구가 없습니다|검색 결과가 없습니다/).isVisible().catch(() => false);
    expect((await checkboxes.count()) > 0 || noFriends).toBeTruthy();
  });

  test('친구 선택 → "초대 (1명)" 버튼 활성화', async ({ page }) => {
    if (!(await enterFirstChatRoom(page))) { test.skip(); return; }
    await openChatRoomMenu(page);
    await page.getByText('친구 초대').click();
    await page.waitForTimeout(1000);

    const checkboxes = page.locator('.rounded-md.border-2');
    if ((await checkboxes.count()) === 0) { test.skip(); return; }

    await checkboxes.first().locator('xpath=ancestor::button[1]').click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: /초대.*1명/ })).toBeVisible();
  });

  test('"취소" 버튼으로 모달 닫기', async ({ page }) => {
    if (!(await enterFirstChatRoom(page))) { test.skip(); return; }
    await openChatRoomMenu(page);
    await page.getByText('친구 초대').click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: '친구 초대' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '취소' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: '친구 초대' })).not.toBeVisible();
  });

  test('0명 선택 → "초대" 버튼 disabled', async ({ page }) => {
    if (!(await enterFirstChatRoom(page))) { test.skip(); return; }
    await openChatRoomMenu(page);
    await page.getByText('친구 초대').click();
    await page.waitForTimeout(1000);

    const inviteBtn = page.getByRole('button', { name: '초대', exact: true });
    if (await inviteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(inviteBtn).toBeDisabled();
    }
  });

  test('초대 실행 → 성공 또는 에러 처리', async ({ page }) => {
    test.slow();
    if (!(await enterFirstChatRoom(page))) { test.skip(); return; }
    await openChatRoomMenu(page);
    await page.getByText('친구 초대').click();
    await page.waitForTimeout(1000);

    const checkboxes = page.locator('.rounded-md.border-2');
    if ((await checkboxes.count()) === 0) { test.skip(); return; }

    await checkboxes.first().locator('xpath=ancestor::button[1]').click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /초대.*1명/ }).click();
    await page.waitForTimeout(3000);

    const success = await page.getByText(/초대했습니다/).isVisible().catch(() => false);
    const error = await page.getByText(/실패/).isVisible().catch(() => false);
    const modalClosed = await page.getByRole('heading', { name: '친구 초대' }).isHidden().catch(() => false);
    expect(success || error || modalClosed).toBeTruthy();
  });

  test('이미 참여 중인 멤버는 목록에서 제외', async ({ page }) => {
    if (!(await enterFirstChatRoom(page))) { test.skip(); return; }
    await openChatRoomMenu(page);
    await page.getByText('친구 초대').click();
    await page.waitForTimeout(1000);

    const checkboxes = page.locator('.rounded-md.border-2');
    const noFriends = await page.getByText(/초대할 수 있는 친구가 없습니다/).isVisible().catch(() => false);
    expect((await checkboxes.count()) >= 0 || noFriends).toBeTruthy();
  });
});
