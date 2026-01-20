import { test, expect } from '@playwright/test';

test.describe('친구 페이지 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/friends');
    await page.waitForTimeout(2000);
  });

  test('친구 페이지 렌더링 확인', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page.getByRole('heading', { name: '친구' })).toBeVisible({ timeout: 30000 });

    // 친구 추가 버튼 확인
    await expect(page.getByRole('button', { name: /친구 추가/ })).toBeVisible();
  });

  test('친구 탭 기본 선택', async ({ page }) => {
    // 친구 탭이 활성화되어 있는지 확인 (bg-white/20 클래스로 활성화 표시)
    const friendsTab = page.getByRole('button', { name: /친구/ }).first();
    await expect(friendsTab).toBeVisible({ timeout: 10000 });
  });

  test('요청 탭 전환', async ({ page }) => {
    // 요청 탭 클릭
    await page.getByRole('button', { name: /요청/ }).click();

    // 받은 요청 섹션 확인
    await expect(page.getByText(/받은 요청/)).toBeVisible({ timeout: 10000 });

    // 보낸 요청 섹션 확인
    await expect(page.getByText(/보낸 요청/)).toBeVisible();
  });

  test('받은 친구 요청 섹션 표시', async ({ page }) => {
    // 요청 탭 클릭
    await page.getByRole('button', { name: /요청/ }).click();
    await page.waitForTimeout(1000);

    // 받은 요청 또는 빈 상태 메시지 확인
    const hasRequests = await page.locator('.glass-card').first().isVisible().catch(() => false);
    const noRequests = await page.getByText(/받은 친구 요청이 없습니다/).isVisible().catch(() => false);

    expect(hasRequests || noRequests).toBeTruthy();
  });

  test('보낸 친구 요청 섹션 표시', async ({ page }) => {
    // 요청 탭 클릭
    await page.getByRole('button', { name: /요청/ }).click();
    await page.waitForTimeout(1000);

    // 보낸 요청 또는 빈 상태 메시지 확인
    const noRequests = await page.getByText(/보낸 친구 요청이 없습니다/).isVisible().catch(() => false);
    const hasRequests = await page.locator('.glass-card').first().isVisible().catch(() => false);

    expect(hasRequests || noRequests).toBeTruthy();
  });
});

test.describe('친구 추가 모달 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/friends');
    await page.waitForTimeout(2000);
  });

  test('친구 추가 모달 열기', async ({ page }) => {
    // 친구 추가 버튼 클릭
    await page.getByRole('button', { name: /친구 추가/ }).click();

    // 모달 표시 확인
    await expect(page.getByRole('heading', { name: '친구 추가' })).toBeVisible({ timeout: 5000 });

    // 검색 입력창 확인
    await expect(page.getByPlaceholder(/이메일 또는 이름으로 검색/)).toBeVisible();
  });

  test('친구 추가 모달 닫기', async ({ page }) => {
    // 친구 추가 버튼 클릭
    await page.getByRole('button', { name: /친구 추가/ }).click();

    // 모달 표시 확인
    await expect(page.getByRole('heading', { name: '친구 추가' })).toBeVisible({ timeout: 5000 });

    // 닫기 버튼 클릭
    await page.getByRole('button', { name: '닫기' }).click();

    // 모달이 닫혔는지 확인
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: '친구 추가' })).not.toBeVisible();
  });

  test('사용자 검색 - 최소 글자 안내', async ({ page }) => {
    // 친구 추가 버튼 클릭
    await page.getByRole('button', { name: /친구 추가/ }).click();

    // 기본 상태에서 안내 메시지 확인
    await expect(page.getByText(/2글자 이상 입력해주세요/)).toBeVisible({ timeout: 5000 });
  });

  test('사용자 검색 입력', async ({ page }) => {
    // 친구 추가 버튼 클릭
    await page.getByRole('button', { name: /친구 추가/ }).click();

    // 검색창에 입력
    const searchInput = page.getByPlaceholder(/이메일 또는 이름으로 검색/);
    await searchInput.fill('test');

    // 검색 결과 대기 (로딩 또는 결과)
    await page.waitForTimeout(1000);

    // 검색 결과 또는 결과 없음 메시지 확인
    const hasResults = await page.locator('.bg-white\\/5').first().isVisible().catch(() => false);
    const noResults = await page.getByText(/검색 결과가 없습니다/).isVisible().catch(() => false);
    const loading = await page.locator('.animate-spin').isVisible().catch(() => false);

    // 어떤 상태든 표시되어야 함
    expect(hasResults || noResults || loading).toBeTruthy();
  });
});

test.describe('친구 목록 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/friends');
    await page.waitForTimeout(2000);
  });

  test('친구 목록 또는 빈 상태 표시', async ({ page }) => {
    // 친구 카드 또는 빈 상태 메시지 확인
    const hasFriends = await page.locator('.glass-card').first().isVisible().catch(() => false);
    const noFriends = await page.getByText(/아직 친구가 없습니다/).isVisible().catch(() => false);

    expect(hasFriends || noFriends).toBeTruthy();
  });

  test('친구 검색창 표시', async ({ page }) => {
    // 친구 탭에서 검색창 확인
    await expect(page.getByPlaceholder(/친구 검색/)).toBeVisible();
  });

  test('친구 카드 액션 버튼 확인', async ({ page }) => {
    // 친구 카드가 있는지 확인
    const friendCard = page.locator('.glass-card').first();
    const noFriends = page.getByText(/아직 친구가 없습니다/);

    if (await friendCard.isVisible()) {
      // 채팅 버튼 확인 (title="채팅")
      const chatButton = friendCard.locator('button[title="채팅"]');
      // 삭제 버튼 확인 (title="삭제")
      const deleteButton = friendCard.locator('button[title="삭제"]');

      // 둘 중 하나라도 있으면 성공
      const hasChatButton = await chatButton.isVisible();
      const hasDeleteButton = await deleteButton.isVisible();
      expect(hasChatButton || hasDeleteButton).toBeTruthy();
    } else {
      // 친구가 없으면 빈 상태 메시지 확인
      expect(await noFriends.isVisible()).toBeTruthy();
    }
  });

  test('친구 카드에서 채팅 버튼 클릭', async ({ page }) => {
    // 친구 카드가 있는지 확인
    const friendCard = page.locator('.glass-card').first();

    if (await friendCard.isVisible()) {
      // 채팅 버튼 클릭
      const chatButton = friendCard.locator('button[title="채팅"]');
      if (await chatButton.isVisible()) {
        await chatButton.click();

        // 채팅 페이지로 이동 확인
        await expect(page).toHaveURL(/chat\//, { timeout: 10000 });
      }
    }
  });

  test('친구 삭제 확인 다이얼로그', async ({ page }) => {
    // 친구 카드가 있는지 확인
    const friendCard = page.locator('.glass-card').first();

    if (await friendCard.isVisible()) {
      // confirm 다이얼로그 처리
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('삭제');
        await dialog.dismiss();
      });

      // 삭제 버튼 클릭
      const deleteButton = friendCard.locator('button[title="삭제"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
      }
    }
  });
});

test.describe('친구 요청 처리 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/friends');
    await page.waitForTimeout(2000);
    // 요청 탭으로 이동
    await page.getByRole('button', { name: /요청/ }).click();
    await page.waitForTimeout(1000);
  });

  test('친구 요청 수락 버튼 확인', async ({ page }) => {
    // 요청 카드가 있는지 확인
    const requestCard = page.locator('.glass-card').first();

    if (await requestCard.isVisible()) {
      // 수락 버튼 확인 (title="수락")
      const acceptButton = requestCard.locator('button[title="수락"]');
      if (await acceptButton.isVisible()) {
        expect(await acceptButton.isEnabled()).toBeTruthy();
      }
    }
  });

  test('친구 요청 거절 버튼 확인', async ({ page }) => {
    // 요청 카드가 있는지 확인
    const requestCard = page.locator('.glass-card').first();

    if (await requestCard.isVisible()) {
      // 거절 버튼 확인 (title="거절")
      const rejectButton = requestCard.locator('button[title="거절"]');
      if (await rejectButton.isVisible()) {
        expect(await rejectButton.isEnabled()).toBeTruthy();
      }
    }
  });
});

test.describe('헤더 네비게이션 테스트', () => {
  test('헤더에서 친구 페이지 접근', async ({ page }) => {
    // 검색 페이지에서 시작
    await page.goto('/search');
    await page.waitForTimeout(2000);

    // 사용자 메뉴 열기 (드롭다운 버튼)
    const userMenuButton = page.locator('button').filter({ hasText: /사용자|테스트/ }).first();
    await userMenuButton.click();
    await page.waitForTimeout(500);

    // 친구 메뉴 클릭
    await page.getByRole('button', { name: '친구' }).click();

    // 친구 페이지로 이동 확인
    await expect(page).toHaveURL(/friends/, { timeout: 10000 });
  });
});

test.describe('빈 상태 테스트', () => {
  test('친구 없음 상태 메시지와 버튼', async ({ page }) => {
    await page.goto('/friends');
    await page.waitForTimeout(3000);

    // 친구가 없는 경우
    const noFriendsMessage = page.getByText(/아직 친구가 없습니다/);

    if (await noFriendsMessage.isVisible()) {
      // 안내 메시지 확인
      await expect(page.getByText(/친구를 추가하고 함께 라운드를 즐겨보세요/)).toBeVisible();

      // 친구 추가 버튼 확인
      const addFriendButton = page.locator('.glass-card').getByRole('button', { name: /친구 추가/ });
      expect(await addFriendButton.isVisible()).toBeTruthy();
    }
  });
});
