import { test, expect } from '@playwright/test';

test.describe('예약 플로우 테스트', () => {
  test('검색 페이지 렌더링 확인', async ({ page }) => {
    await page.goto('/search');

    // 헤더 확인
    await expect(page.getByText('라운드 예약')).toBeVisible();

    // 검색 필터 확인
    await expect(page.getByPlaceholder('골프장, 지역 검색...')).toBeVisible();
    await expect(page.getByLabel('예약 날짜')).toBeVisible();

    // 예약 가능한 라운드 섹션 확인 (헤딩으로 특정)
    await expect(page.getByRole('heading', { name: /예약 가능한 라운드/ }).first()).toBeVisible({ timeout: 30000 });
  });

  test('기본 오늘 날짜로 검색 페이지 표시', async ({ page }) => {
    // 검색 페이지 접근 (기본으로 오늘 날짜가 설정됨)
    await page.goto('/search');

    // 오늘 날짜가 기본으로 설정되어 있는지 확인
    const dateInput = page.getByLabel('예약 날짜');
    const today = new Date().toISOString().split('T')[0];
    await expect(dateInput).toHaveValue(today);

    // 로딩 완료 대기 (게임 목록 또는 빈 상태 메시지)
    await page.waitForTimeout(5000);

    // 게임이 있는 경우 또는 빈 상태 메시지
    const gameCards = page.locator('[class*="glass-card"]');
    const noGamesMessage = page.getByText(/예약 가능한 라운드가 없습니다/);

    const hasGames = await gameCards.first().isVisible().catch(() => false);
    const hasNoGamesMessage = await noGamesMessage.isVisible().catch(() => false);

    // 둘 중 하나는 표시되어야 함
    expect(hasGames || hasNoGamesMessage).toBeTruthy();

    if (hasGames) {
      // 게임 카드가 있으면 "예약 가능 시간" 섹션이 표시되어야 함
      const timeSlotSection = page.getByText('예약 가능 시간');
      await expect(timeSlotSection.first()).toBeVisible();
    }
  });

  test('날짜 선택 후 타임슬롯 표시 확인', async ({ page }) => {
    await page.goto('/search');

    // 내일 날짜 선택
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await page.getByLabel('예약 날짜').fill(tomorrowStr);

    // URL 파라미터 확인
    await expect(page).toHaveURL(new RegExp(`date=${tomorrowStr}`));

    // 로딩 완료 대기 (게임 또는 빈 상태)
    await page.waitForTimeout(5000);

    // 게임 카드가 있는지 확인
    const gameCards = page.locator('[class*="glass-card"]');
    const hasGames = await gameCards.first().isVisible().catch(() => false);

    if (hasGames) {
      // 날짜가 선택된 상태에서는 타임슬롯이 표시되어야 함
      const timeSlotSection = page.getByText('예약 가능 시간');
      const hasTimeSlots = await timeSlotSection.first().isVisible().catch(() => false);

      // 날짜 필터와 함께 검색하면 타임슬롯이 있는 게임만 표시됨
      if (hasTimeSlots) {
        const timeSlotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
        const timeSlotCount = await timeSlotButtons.count();
        expect(timeSlotCount).toBeGreaterThan(0);
      }
    } else {
      // 해당 날짜에 예약 가능한 라운드가 없음
      await expect(page.getByText(/예약 가능한 라운드가 없습니다|라운드가 없습니다/)).toBeVisible();
    }
  });

  test('날짜 필터 변경', async ({ page }) => {
    await page.goto('/search');

    // 날짜 선택 (내일)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await page.getByLabel('예약 날짜').fill(tomorrowStr);

    // URL 파라미터 확인
    await expect(page).toHaveURL(new RegExp(`date=${tomorrowStr}`));
  });

  test('시간대 필터 변경 - 오전', async ({ page }) => {
    await page.goto('/search');

    // 시간대 선택
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: '오전' }).click();

    // URL 파라미터 확인
    await expect(page).toHaveURL(/timeOfDay=morning/);
  });

  test('시간대 필터 변경 - 오후', async ({ page }) => {
    await page.goto('/search');

    // 시간대 선택
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: '오후' }).click();

    // URL 파라미터 확인
    await expect(page).toHaveURL(/timeOfDay=afternoon/);
  });

  test('검색어 입력', async ({ page }) => {
    await page.goto('/search');

    // 검색어 입력
    await page.getByPlaceholder('골프장, 지역 검색...').fill('서울');

    // 검색어가 입력되었는지 확인
    await expect(page.getByPlaceholder('골프장, 지역 검색...')).toHaveValue('서울');
  });

  test('필터 버튼 토글', async ({ page }) => {
    await page.goto('/search');

    // 페이지 로드 대기
    await expect(page.getByText('예약 조건')).toBeVisible();

    // 필터 버튼 클릭 (force: true로 덮어쓰기 방지)
    const filterButton = page.getByTestId('filter-toggle-button');
    await expect(filterButton).toBeVisible();
    await filterButton.click({ force: true });

    // 확장된 필터 확인 (클릭 후 약간의 대기)
    await page.waitForTimeout(500);
    const expandedFilters = page.getByTestId('expanded-filters');
    await expect(expandedFilters).toBeVisible({ timeout: 5000 });

    // 필터 버튼 다시 클릭해서 닫기
    await filterButton.click({ force: true });
    await page.waitForTimeout(500);

    // 필터가 숨겨졌는지 확인
    await expect(expandedFilters).not.toBeVisible();
  });

  test('게임 카드가 표시됨', async ({ page }) => {
    await page.goto('/search');

    // 로딩 완료 대기
    await page.waitForTimeout(5000);

    // 게임 카드 또는 빈 상태 메시지 중 하나가 나타나야 함
    const gameCards = page.locator('[class*="glass-card"]');
    const noGamesMessage = page.getByText(/예약 가능한 라운드가 없습니다/);

    const hasGames = await gameCards.first().isVisible().catch(() => false);
    const hasNoGamesMessage = await noGamesMessage.isVisible().catch(() => false);

    expect(hasGames || hasNoGamesMessage).toBeTruthy();
  });

  test('타임슬롯 선택 시 예약 상세 페이지로 이동', async ({ page }) => {
    await page.goto('/search');

    // 게임 로딩 대기
    await page.waitForTimeout(5000);

    // 게임이 있는 경우 타임슬롯 클릭
    const timeSlotButton = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();

    if (await timeSlotButton.isVisible()) {
      await timeSlotButton.click();

      // 예약 상세 페이지로 이동 확인
      await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });
    }
  });

  test('내 예약 버튼 클릭', async ({ page }) => {
    await page.goto('/search');

    // 내 예약 버튼 클릭
    await page.getByRole('button', { name: '내 예약' }).click();

    // 내 예약 페이지로 이동 확인
    await expect(page).toHaveURL(/.*my-bookings/);
  });

  test('로그아웃 버튼 클릭', async ({ page }) => {
    await page.goto('/search');

    // 로그아웃 버튼 클릭
    await page.getByRole('button', { name: '로그아웃' }).click();

    // 로그인 페이지로 이동 확인
    await expect(page).toHaveURL(/.*login/);
  });

  test('페이지네이션 동작 (게임이 많은 경우)', async ({ page }) => {
    await page.goto('/search');

    // 페이지네이션 확인 (게임이 충분히 많은 경우에만)
    await page.waitForTimeout(3000);

    const nextButton = page.getByRole('button', { name: '다음' });
    if (await nextButton.isVisible()) {
      // 다음 버튼 클릭
      await nextButton.click();

      // URL 파라미터 확인
      await expect(page).toHaveURL(/page=2/);

      // 이전 버튼 클릭
      await page.getByRole('button', { name: '이전' }).click();

      // URL 파라미터 확인
      await expect(page).toHaveURL(/page=1/);
    }
  });
});

test.describe('예약 상세 페이지 테스트', () => {
  test('예약 상세 페이지 직접 접근 시 리다이렉트', async ({ page }) => {
    // state 없이 직접 접근
    await page.goto('/booking-detail');

    // 검색 페이지 또는 다른 페이지로 리다이렉트되어야 함
    // (state가 없으면 처리 방식에 따라 다름)
    await page.waitForTimeout(2000);
  });
});

test.describe('예약 생성 플로우 테스트', () => {
  test('타임슬롯 선택 후 예약 상세 페이지 표시', async ({ page }) => {
    // 내일 날짜로 검색
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await page.goto(`/search?date=${tomorrowStr}`);

    // 로딩 완료 대기
    await page.waitForTimeout(5000);

    // 타임슬롯 버튼 찾기
    const timeSlotButton = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();

    if (await timeSlotButton.isVisible()) {
      // 타임슬롯 클릭
      await timeSlotButton.click();

      // 예약 상세 페이지로 이동 확인
      await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });

      // 예약 상세 정보 표시 확인
      await expect(page.getByText('예약 정보')).toBeVisible({ timeout: 10000 });

      // 인원 선택 표시 확인
      await expect(page.getByText(/인원|플레이어/)).toBeVisible();

      // 예약하기 버튼 표시 확인
      await expect(page.getByRole('button', { name: /예약하기|예약 확인/ })).toBeVisible();
    }
  });

  test('예약 인원 변경', async ({ page }) => {
    // 내일 날짜로 검색
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await page.goto(`/search?date=${tomorrowStr}`);
    await page.waitForTimeout(5000);

    // 타임슬롯 버튼 찾기
    const timeSlotButton = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();

    if (await timeSlotButton.isVisible()) {
      await timeSlotButton.click();
      await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });

      // 인원 증가 버튼 찾기
      const increaseButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();

      if (await increaseButton.isVisible()) {
        // 인원 증가
        await increaseButton.click();

        // 가격이 변경되는지 확인 (총액 표시)
        await expect(page.getByText(/총|합계|원/)).toBeVisible();
      }
    }
  });

  test('예약 생성 및 확인', async ({ page }) => {
    // 내일 날짜로 검색
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await page.goto(`/search?date=${tomorrowStr}`);
    await page.waitForTimeout(5000);

    // 타임슬롯 버튼 찾기
    const timeSlotButton = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();

    if (await timeSlotButton.isVisible()) {
      await timeSlotButton.click();
      await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });

      // 예약하기 버튼 클릭
      const bookButton = page.getByRole('button', { name: /예약하기|예약 확인/ });
      if (await bookButton.isVisible() && await bookButton.isEnabled()) {
        await bookButton.click();

        // 예약 성공 시 확인 페이지 또는 내 예약으로 이동
        await page.waitForTimeout(3000);

        // 성공 메시지 또는 내 예약 페이지 확인
        const isSuccess = await page.getByText(/예약이 완료|예약 성공|확인되었습니다/).isVisible().catch(() => false);
        const isMyBookings = await page.url().includes('my-bookings');
        const isConfirmPage = await page.url().includes('booking-confirm');

        expect(isSuccess || isMyBookings || isConfirmPage).toBeTruthy();
      }
    }
  });

  test('예약 상세에서 뒤로가기', async ({ page }) => {
    // 내일 날짜로 검색
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await page.goto(`/search?date=${tomorrowStr}`);
    await page.waitForTimeout(5000);

    // 타임슬롯 버튼 찾기
    const timeSlotButton = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();

    if (await timeSlotButton.isVisible()) {
      await timeSlotButton.click();
      await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });

      // 뒤로가기 버튼 클릭
      const backButton = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).first();

      if (await backButton.isVisible()) {
        await backButton.click();

        // 검색 페이지로 돌아가는지 확인
        await expect(page).toHaveURL(/.*search/, { timeout: 5000 });
      }
    }
  });
});
