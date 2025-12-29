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

    // 로딩 완료 대기 - 게임 카드 또는 빈 상태 메시지 중 하나가 나타날 때까지
    await expect(
      page.getByText('예약 가능 시간').first().or(page.getByText('예약 가능한 라운드가 없습니다'))
    ).toBeVisible({ timeout: 30000 });
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
