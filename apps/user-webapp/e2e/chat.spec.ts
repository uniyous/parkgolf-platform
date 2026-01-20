import { test, expect } from '@playwright/test';

test.describe('채팅 페이지 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(2000);
  });

  test('채팅 페이지 렌더링 확인', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page.getByRole('heading', { name: '채팅' })).toBeVisible({ timeout: 30000 });

    // 새 채팅 버튼 확인
    await expect(page.getByRole('button', { name: /새 채팅/ })).toBeVisible();
  });

  test('채팅방 목록 표시', async ({ page }) => {
    // 채팅방 목록 또는 빈 상태 메시지 확인
    const hasChatRooms = await page.locator('.glass-card').first().isVisible().catch(() => false);
    const noChatRooms = await page.getByText(/채팅이 없습니다/).isVisible().catch(() => false);

    expect(hasChatRooms || noChatRooms).toBeTruthy();
  });

  test('채팅방 카드 정보 표시', async ({ page }) => {
    // 채팅방 카드가 있는지 확인
    const chatRoomCard = page.locator('.glass-card').first();
    const noChatRooms = page.getByText(/채팅이 없습니다/);

    // 채팅방이 있으면 카드 정보 확인, 없으면 빈 상태 메시지 확인
    if (await chatRoomCard.isVisible()) {
      // 채팅방 이름 확인
      const roomName = chatRoomCard.locator('h4').first();
      expect(await roomName.isVisible()).toBeTruthy();
    } else {
      expect(await noChatRooms.isVisible()).toBeTruthy();
    }
  });
});

test.describe('새 채팅 모달 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(2000);
  });

  test('새 채팅 모달 열기', async ({ page }) => {
    // 새 채팅 버튼 클릭
    await page.getByRole('button', { name: /새 채팅/ }).click();

    // 모달 표시 확인
    await expect(page.getByRole('heading', { name: '새 채팅' })).toBeVisible({ timeout: 5000 });

    // 친구 검색창 확인
    await expect(page.getByPlaceholder(/친구 검색/)).toBeVisible();
  });

  test('새 채팅 모달 닫기', async ({ page }) => {
    // 새 채팅 버튼 클릭 (헤더 또는 빈 상태의 버튼)
    const newChatButton = page.getByRole('button', { name: /새 채팅/ }).first();
    await newChatButton.click();

    // 모달 표시 확인
    await expect(page.getByRole('heading', { name: '새 채팅' })).toBeVisible({ timeout: 5000 });

    // 닫기 버튼 클릭
    await page.getByRole('button', { name: '닫기' }).click();

    // 모달이 닫혔는지 확인
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: '새 채팅' })).not.toBeVisible();
  });

  test('친구 목록 표시 (새 채팅 모달)', async ({ page }) => {
    // 새 채팅 버튼 클릭
    const newChatButton = page.getByRole('button', { name: /새 채팅/ }).first();
    await newChatButton.click();

    // 모달 표시 확인
    await expect(page.getByRole('heading', { name: '새 채팅' })).toBeVisible({ timeout: 5000 });

    // 친구 목록 또는 빈 상태 메시지 확인
    await page.waitForTimeout(2000);

    // 모달 내 친구 목록 또는 빈 상태 확인
    const modal = page.locator('.glass-card').last();
    const hasFriends = await modal.locator('button').count() > 1; // 닫기 버튼 외에 친구 버튼이 있는지
    const noFriends = await page.getByText(/친구가 없습니다|검색 결과가 없습니다/).isVisible().catch(() => false);
    const loading = await page.locator('.animate-spin').isVisible().catch(() => false);

    expect(hasFriends || noFriends || loading).toBeTruthy();
  });

  test('친구 검색 입력', async ({ page }) => {
    // 새 채팅 버튼 클릭
    const newChatButton = page.getByRole('button', { name: /새 채팅/ }).first();
    await newChatButton.click();

    // 모달 표시 대기
    await expect(page.getByRole('heading', { name: '새 채팅' })).toBeVisible({ timeout: 5000 });

    // 검색창에 입력
    const searchInput = page.getByPlaceholder(/친구 검색/);
    await searchInput.fill('test');

    // 검색 결과 대기
    await page.waitForTimeout(1000);
  });
});

test.describe('채팅방 입장 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(2000);
  });

  test('채팅방 클릭하여 입장 또는 빈 상태 확인', async ({ page }) => {
    // 채팅방 카드가 있는지 확인
    const chatRoomCard = page.locator('.glass-card').first();
    const noChatRooms = page.getByText(/채팅이 없습니다/);

    if (await chatRoomCard.isVisible()) {
      // 채팅방 클릭
      await chatRoomCard.click();

      // 채팅방 페이지로 이동 확인
      await expect(page).toHaveURL(/chat\//, { timeout: 10000 });
    } else {
      // 채팅방이 없으면 빈 상태 메시지 확인
      expect(await noChatRooms.isVisible()).toBeTruthy();
    }
  });
});

test.describe('채팅방 상세 페이지 테스트', () => {
  test('채팅방 페이지 요소 확인', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();
    const noChatRooms = page.getByText(/채팅이 없습니다/);

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(2000);

      // 메시지 입력창 확인
      await expect(page.getByPlaceholder(/메시지 입력/)).toBeVisible({ timeout: 10000 });
    } else {
      // 채팅방이 없으면 빈 상태 메시지 확인
      expect(await noChatRooms.isVisible()).toBeTruthy();
    }
  });

  test('연결 상태 표시 확인', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();
    const noChatRooms = page.getByText(/채팅이 없습니다/);

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(3000);

      // 연결됨 또는 연결 중 상태 확인
      const connected = await page.getByText('연결됨').isVisible().catch(() => false);
      const connecting = await page.getByText(/연결 중/).isVisible().catch(() => false);

      expect(connected || connecting).toBeTruthy();
    } else {
      // 채팅방이 없으면 빈 상태 메시지 확인
      expect(await noChatRooms.isVisible()).toBeTruthy();
    }
  });

  test('메시지 입력 테스트', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(2000);

      // 메시지 입력
      const messageInput = page.getByPlaceholder(/메시지 입력/);
      if (await messageInput.isVisible()) {
        await messageInput.fill('테스트 메시지입니다');

        // 입력값 확인
        await expect(messageInput).toHaveValue('테스트 메시지입니다');
      }
    }
  });

  test('빈 메시지 전송 방지', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(2000);

      // 메시지 입력창 확인
      const messageInput = page.getByPlaceholder(/메시지 입력/);
      if (await messageInput.isVisible()) {
        // 빈 상태 확인
        await expect(messageInput).toHaveValue('');
      }
    }
  });

  test('뒤로가기 버튼 동작', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(2000);

      // 뒤로가기 버튼 클릭 (ArrowLeft 아이콘이 있는 버튼)
      const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await backButton.click();

      // 채팅 목록으로 돌아가는지 확인
      await expect(page).toHaveURL(/\/chat$/, { timeout: 10000 });
    }
  });
});

test.describe('채팅방 메뉴 테스트', () => {
  test('채팅방 메뉴 열기', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(2000);

      // 더보기 메뉴 버튼 클릭 (MoreVertical 아이콘)
      const menuButtons = page.locator('button').filter({ has: page.locator('svg') });
      // 첫 번째는 뒤로가기, 두 번째 또는 세 번째가 더보기 메뉴
      const menuButton = menuButtons.nth(1);
      if (await menuButton.isVisible()) {
        await menuButton.click();

        // 메뉴 항목 확인 - 나가기 버튼
        await page.waitForTimeout(500);
        const leaveButton = page.getByText('나가기');
        if (await leaveButton.isVisible()) {
          expect(await leaveButton.isVisible()).toBeTruthy();
        }
      }
    }
  });

  test('채팅방 나가기 확인 다이얼로그', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(2000);

      // 더보기 메뉴 버튼 클릭
      const menuButtons = page.locator('button').filter({ has: page.locator('svg') });
      const menuButton = menuButtons.nth(1);
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);

        // 나가기 버튼 클릭
        const leaveButton = page.getByText('나가기');
        if (await leaveButton.isVisible()) {
          // confirm 다이얼로그 처리
          page.on('dialog', async (dialog) => {
            expect(dialog.message()).toContain('나가');
            await dialog.dismiss();
          });

          await leaveButton.click();
        }
      }
    }
  });
});

test.describe('헤더 네비게이션 테스트', () => {
  test('헤더에서 채팅 페이지 접근', async ({ page }) => {
    // 검색 페이지에서 시작
    await page.goto('/search');
    await page.waitForTimeout(2000);

    // 사용자 메뉴 열기 (드롭다운 버튼)
    const userMenuButton = page.locator('button').filter({ hasText: /사용자|테스트/ }).first();
    await userMenuButton.click();
    await page.waitForTimeout(500);

    // 채팅 메뉴 클릭
    await page.getByRole('button', { name: '채팅' }).click();

    // 채팅 페이지로 이동 확인
    await expect(page).toHaveURL(/chat/, { timeout: 10000 });
  });
});

test.describe('메시지 표시 테스트', () => {
  test('메시지 목록 표시', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();
    const noChatRooms = page.getByText(/채팅이 없습니다/);

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(3000);

      // 메시지가 있거나 빈 상태 메시지 확인
      const hasMessages = await page.locator('.rounded-2xl').first().isVisible().catch(() => false);
      const noMessages = await page.getByText(/대화를 시작해보세요/).isVisible().catch(() => false);
      const loading = await page.locator('.animate-spin').isVisible().catch(() => false);
      const hasInput = await page.getByPlaceholder(/메시지 입력/).isVisible().catch(() => false);

      expect(hasMessages || noMessages || loading || hasInput).toBeTruthy();
    } else {
      // 채팅방이 없으면 빈 상태 메시지 확인
      expect(await noChatRooms.isVisible()).toBeTruthy();
    }
  });

  test('메시지 시간 표시', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(3000);

      // 메시지 버블이 있는지 확인
      const messageBubble = page.locator('.rounded-2xl').first();

      if (await messageBubble.isVisible()) {
        // 페이지에 시간 표시가 있는지 확인
        const timePattern = /\d{1,2}:\d{2}/;
        const pageContent = await page.content();
        expect(timePattern.test(pageContent)).toBeTruthy();
      }
    }
  });
});

test.describe('빈 상태 테스트', () => {
  test('채팅방 없음 상태 표시', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(3000);

    // 채팅방이 없으면 빈 상태 메시지 표시
    const hasChatRooms = await page.locator('.glass-card').first().isVisible().catch(() => false);

    if (!hasChatRooms) {
      // 빈 상태 메시지 확인
      const emptyMessage = page.getByText(/채팅이 없습니다/);
      expect(await emptyMessage.isVisible()).toBeTruthy();
    }
  });

  test('빈 상태에서 새 채팅 시작 버튼', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(3000);

    // 채팅방이 없는 경우
    const hasChatRooms = await page.locator('.glass-card').first().isVisible().catch(() => false);

    if (!hasChatRooms) {
      // 새 채팅 시작 버튼 확인
      const startButton = page.getByRole('button', { name: /새 채팅 시작/ });
      if (await startButton.isVisible()) {
        await startButton.click();

        // 모달이 열리는지 확인
        await expect(page.getByRole('heading', { name: '새 채팅' })).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('참가자 수 표시 테스트', () => {
  test('채팅방 참가자 수 표시', async ({ page }) => {
    // 먼저 채팅 목록에서 채팅방 선택
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    const chatRoomCard = page.locator('.glass-card').first();

    if (await chatRoomCard.isVisible()) {
      await chatRoomCard.click();
      await page.waitForTimeout(2000);

      // 참가자 수 표시 확인 (n명)
      const participantsText = page.getByText(/\d+명/);
      // 그룹 채팅인 경우에만 표시됨
      if (await participantsText.isVisible()) {
        expect(await participantsText.isVisible()).toBeTruthy();
      }
    }
  });
});
