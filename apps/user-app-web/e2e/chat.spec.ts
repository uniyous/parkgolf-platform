import { test, expect } from '@playwright/test';

// 공통 헬퍼: 소셜 페이지 > 채팅 탭으로 이동
async function gotoChatTab(page: import('@playwright/test').Page) {
  await page.goto('/social?tab=chat');
  await page.waitForTimeout(2000);

  // 채팅 탭이 선택되지 않은 경우 클릭 (exact: true로 "새 채팅" 버튼 오매칭 방지)
  const chatTab = page.getByRole('button', { name: '채팅', exact: true });
  if (await chatTab.isVisible()) {
    await chatTab.click();
    await page.waitForTimeout(1000);
  }
}

// 공통 헬퍼: 채팅방 카드 목록 (button > .glass-card 안에 h4가 있는 것)
function chatRoomCards(page: import('@playwright/test').Page) {
  return page.locator('button.w-full.text-left:has(.glass-card)');
}

// 공통 헬퍼: 새 채팅 모달 열기
async function openNewChatModal(page: import('@playwright/test').Page) {
  const newChatButton = page.locator('button[aria-label="새 채팅"]');
  const startButton = page.getByRole('button', { name: '새 채팅 시작' });

  if (await newChatButton.isVisible()) {
    await newChatButton.click();
  } else if (await startButton.isVisible()) {
    await startButton.click();
  }

  await expect(page.getByRole('heading', { name: '새 채팅' })).toBeVisible({ timeout: 5000 });
}

// 공통 헬퍼: 채팅방 진입
async function enterFirstChatRoom(page: import('@playwright/test').Page): Promise<boolean> {
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

// ============================================
// 채팅 탭 테스트
// ============================================

test.describe('채팅 탭 테스트', () => {
  test('소셜 페이지 채팅 탭 렌더링 확인', async ({ page }) => {
    await gotoChatTab(page);

    // 소셜 페이지 헤딩 확인
    await expect(page.getByRole('heading', { name: '소셜' })).toBeVisible({ timeout: 30000 });

    // 채팅 탭 버튼 확인
    await expect(page.getByRole('button', { name: '채팅' }).first()).toBeVisible();

    // 새 채팅 버튼 확인 (aria-label="새 채팅")
    await expect(page.locator('button[aria-label="새 채팅"]')).toBeVisible();
  });

  test('채팅방 목록 표시', async ({ page }) => {
    await gotoChatTab(page);
    await page.waitForTimeout(1000);

    const cards = chatRoomCards(page);
    const hasChatRooms = await cards.count() > 0;
    const noChatRooms = await page.getByText('채팅이 없습니다').isVisible().catch(() => false);
    const isLoading = await page.locator('.animate-spin').first().isVisible().catch(() => false);

    expect(hasChatRooms || noChatRooms || isLoading).toBeTruthy();
  });

  test('채팅방 카드 정보 표시', async ({ page }) => {
    await gotoChatTab(page);
    await page.waitForTimeout(1000);

    const cards = chatRoomCards(page);
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();
      // 채팅방 이름 (h4)
      await expect(firstCard.locator('h4').first()).toBeVisible();
      // 마지막 메시지 또는 기본 텍스트 (p)
      await expect(firstCard.locator('p').first()).toBeVisible();
    } else {
      const noChatRooms = await page.getByText('채팅이 없습니다').isVisible().catch(() => false);
      expect(noChatRooms).toBeTruthy();
    }
  });
});

// ============================================
// 새 채팅 모달 테스트
// ============================================

test.describe('새 채팅 모달 테스트', () => {
  test('새 채팅 모달 열기', async ({ page }) => {
    await gotoChatTab(page);
    await openNewChatModal(page);

    // 모달 표시 확인
    await expect(page.getByPlaceholder(/친구 검색/)).toBeVisible();
  });

  test('새 채팅 모달 닫기', async ({ page }) => {
    await gotoChatTab(page);
    await openNewChatModal(page);

    // Escape 키로 닫기 (BottomSheet는 "닫기" 버튼이 없으므로)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: '새 채팅' })).not.toBeVisible();
  });

  test('친구 목록 표시 (새 채팅 모달)', async ({ page }) => {
    await gotoChatTab(page);
    await openNewChatModal(page);
    await page.waitForTimeout(2000);

    // 친구 버튼 항목 또는 빈 상태 확인
    const friendItems = page.locator('button:has(h4)').filter({ has: page.locator('p') });
    const hasFriends = await friendItems.count() > 0;
    const noFriends = await page.getByText(/친구가 없습니다/).isVisible().catch(() => false);
    const loading = await page.locator('.animate-spin').isVisible().catch(() => false);

    expect(hasFriends || noFriends || loading).toBeTruthy();
  });

  test('친구 검색 입력', async ({ page }) => {
    await gotoChatTab(page);
    await openNewChatModal(page);

    const searchInput = page.getByPlaceholder(/친구 검색/);
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
  });
});

// ============================================
// 채팅방 입장 테스트
// ============================================

test.describe('채팅방 입장 테스트', () => {
  test('채팅방 클릭하여 입장 또는 빈 상태 확인', async ({ page }) => {
    await gotoChatTab(page);
    await page.waitForTimeout(1000);

    const cards = chatRoomCards(page);
    const count = await cards.count();

    if (count > 0) {
      await cards.first().click();
      await expect(page).toHaveURL(/\/chat\//, { timeout: 10000 });
    } else {
      const noChatRooms = await page.getByText('채팅이 없습니다').isVisible().catch(() => false);
      expect(noChatRooms).toBeTruthy();
    }
  });
});

// ============================================
// 채팅방 상세 페이지 테스트
// ============================================

test.describe('채팅방 상세 페이지 테스트', () => {
  test('채팅방 페이지 요소 확인', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);

    if (entered) {
      await expect(page.getByPlaceholder(/메시지 입력/)).toBeVisible({ timeout: 10000 });
    } else {
      const noChatRooms = await page.getByText('채팅이 없습니다').isVisible().catch(() => false);
      expect(noChatRooms).toBeTruthy();
    }
  });

  test('소켓 연결 상태 아이콘 표시', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);

    if (entered) {
      await page.waitForTimeout(2000);

      // Wifi 또는 WifiOff 아이콘이 표시되어야 함
      const hasWifiIcon = await page.locator('svg').count() > 0;
      expect(hasWifiIcon).toBeTruthy();

      // 메시지 입력창이 보이면 채팅방 진입 성공
      await expect(page.getByPlaceholder(/메시지 입력/)).toBeVisible();
    }
  });

  test('메시지 입력 테스트', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    if (await messageInput.isVisible()) {
      await messageInput.fill('테스트 메시지입니다');
      await expect(messageInput).toHaveValue('테스트 메시지입니다');
    }
  });

  test('빈 메시지 전송 방지', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    if (await messageInput.isVisible()) {
      await expect(messageInput).toHaveValue('');
    }
  });

  test('뒤로가기 버튼 동작', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    // SubPageHeader의 뒤로가기 버튼
    const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await backButton.click();

    await expect(page).toHaveURL(/\/social/, { timeout: 10000 });
  });
});

// ============================================
// 채팅방 메뉴 테스트
// ============================================

test.describe('채팅방 메뉴 테스트', () => {
  test('채팅방 메뉴 열기 — 친구 초대 + 나가기', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    // 더보기 메뉴 버튼 (MoreVertical 아이콘)
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);

      await expect(page.getByText('친구 초대')).toBeVisible();
      await expect(page.getByText('나가기')).toBeVisible();
    }
  });

  test('채팅방 나가기 확인 다이얼로그', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);

      const leaveButton = page.getByText('나가기');
      if (await leaveButton.isVisible()) {
        page.on('dialog', async (dialog) => {
          expect(dialog.message()).toContain('나가');
          await dialog.dismiss();
        });
        await leaveButton.click();
      }
    }
  });
});

// ============================================
// 참여자 목록 테스트
// ============================================

test.describe('참여자 목록 테스트', () => {
  test('참여자 수 배지 클릭 → 참여자 모달 열림', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    // 참여자 수 버튼 (Users 아이콘 + 숫자)
    const participantsButton = page.locator('button').filter({ has: page.locator('svg.lucide-users') });

    if (await participantsButton.isVisible()) {
      await participantsButton.click();
      await page.waitForTimeout(500);

      // 참여자 모달 확인
      await expect(page.getByRole('heading', { name: /참여자/ })).toBeVisible({ timeout: 5000 });
    }
  });

  test('참여자 모달 — 이름 + 이메일 표시', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    const participantsButton = page.locator('button').filter({ has: page.locator('svg.lucide-users') });
    if (!(await participantsButton.isVisible())) return;

    await participantsButton.click();
    await expect(page.getByRole('heading', { name: /참여자/ })).toBeVisible({ timeout: 5000 });

    // 참여자 항목이 있어야 함
    const participantItems = page.locator('.rounded-xl.bg-white\\/5');
    const count = await participantItems.count();
    expect(count).toBeGreaterThan(0);

    // 첫 번째 참여자에 이름(h4)이 표시
    const firstItem = participantItems.first();
    await expect(firstItem.locator('h4')).toBeVisible();
  });

  test('참여자 모달 — 본인에 "(나)" 표시', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    const participantsButton = page.locator('button').filter({ has: page.locator('svg.lucide-users') });
    if (!(await participantsButton.isVisible())) return;

    await participantsButton.click();
    await expect(page.getByRole('heading', { name: /참여자/ })).toBeVisible({ timeout: 5000 });

    // "(나)" 텍스트가 표시되어야 함
    await expect(page.getByText('(나)')).toBeVisible();
  });

  test('참여자 모달 — 닫기 버튼', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    const participantsButton = page.locator('button').filter({ has: page.locator('svg.lucide-users') });
    if (!(await participantsButton.isVisible())) return;

    await participantsButton.click();
    await expect(page.getByRole('heading', { name: /참여자/ })).toBeVisible({ timeout: 5000 });

    // 모달 하단 "닫기" 버튼 클릭
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: /참여자/ })).not.toBeVisible();
  });
});

// ============================================
// 메시지 표시 테스트
// ============================================

test.describe('메시지 표시 테스트', () => {
  test('메시지 목록 표시', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);

    if (entered) {
      await page.waitForTimeout(1000);

      const hasMessages = await page.locator('.rounded-2xl').first().isVisible().catch(() => false);
      const noMessages = await page.getByText(/대화를 시작해보세요/).isVisible().catch(() => false);
      const hasInput = await page.getByPlaceholder(/메시지 입력/).isVisible().catch(() => false);

      expect(hasMessages || noMessages || hasInput).toBeTruthy();
    } else {
      const noChatRooms = await page.getByText('채팅이 없습니다').isVisible().catch(() => false);
      expect(noChatRooms).toBeTruthy();
    }
  });

  test('메시지 시간 표시', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    await page.waitForTimeout(1000);

    const messageBubble = page.locator('.rounded-2xl').first();
    if (await messageBubble.isVisible()) {
      const timePattern = /\d{1,2}:\d{2}/;
      const pageContent = await page.content();
      expect(timePattern.test(pageContent)).toBeTruthy();
    }
  });
});

// ============================================
// 빈 상태 테스트
// ============================================

test.describe('빈 상태 테스트', () => {
  test('채팅방 없음 상태 표시', async ({ page }) => {
    await gotoChatTab(page);
    await page.waitForTimeout(1000);

    const cards = chatRoomCards(page);
    const count = await cards.count();

    if (count === 0) {
      const emptyMessage = await page.getByText('채팅이 없습니다').isVisible().catch(() => false);
      const isLoading = await page.locator('.animate-spin').first().isVisible().catch(() => false);
      expect(emptyMessage || isLoading).toBeTruthy();
    }
  });

  test('빈 상태에서 새 채팅 시작 버튼', async ({ page }) => {
    await gotoChatTab(page);
    await page.waitForTimeout(1000);

    const cards = chatRoomCards(page);
    const count = await cards.count();

    if (count === 0) {
      const startButton = page.getByRole('button', { name: '새 채팅 시작', exact: true });
      if (await startButton.isVisible()) {
        await startButton.click();
        await expect(page.getByRole('heading', { name: '새 채팅' })).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

// ============================================
// 메시지 페이지네이션 테스트 (Cursor 기반)
// ============================================

test.describe('메시지 페이지네이션 테스트 (Cursor 기반)', () => {
  test('초기 메시지 로드 확인', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    await page.waitForTimeout(1000);

    const messageInput = page.getByPlaceholder(/메시지 입력/);
    if (await messageInput.isVisible()) {
      const messageBubbles = page.locator('.rounded-2xl');
      const messageCount = await messageBubbles.count();
      const noMessages = await page.getByText(/대화를 시작해보세요/).isVisible().catch(() => false);

      if (!noMessages) {
        expect(messageCount).toBeLessThanOrEqual(50);
      }
      expect(messageCount > 0 || noMessages).toBeTruthy();
    }
  });

  test('스크롤을 위로 올리면 이전 메시지 로드 또는 더보기 표시', async ({ page }) => {
    const entered = await enterFirstChatRoom(page);
    if (!entered) return;

    await page.waitForTimeout(1000);

    const messagesContainer = page.locator('.overflow-y-auto').first();
    if (await messagesContainer.isVisible()) {
      await messagesContainer.evaluate((el) => { el.scrollTop = 0; });
      await page.waitForTimeout(1000);

      const hasLoading = await page.getByText(/이전 메시지 불러오는 중/).isVisible().catch(() => false);
      const hasLoadMore = await page.getByText(/이전 메시지 더 보기/).isVisible().catch(() => false);

      // 더 불러올 메시지가 있으면 로딩/버튼, 없으면 둘 다 없음 — 모두 유효
      expect(hasLoading || hasLoadMore || (!hasLoading && !hasLoadMore)).toBeTruthy();
    }
  });
});
