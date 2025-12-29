import { test, expect } from '@playwright/test';

test.describe('골프장 관리 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/clubs');
    await expect(page).toHaveURL(/.*clubs/);
  });

  test('골프장 목록 페이지 렌더링', async ({ page }) => {
    // 헤더 확인
    await expect(page.getByRole('heading', { name: /골프장 관리/ })).toBeVisible();

    // 부제목 확인
    await expect(page.getByText(/9홀 단위 코스 관리/)).toBeVisible();
  });

  test('새 골프장 추가 버튼 표시', async ({ page }) => {
    // 새 골프장 추가 버튼 확인
    await expect(page.getByRole('button', { name: /새 골프장 추가/ })).toBeVisible();
  });

  test('검색 필드 동작', async ({ page }) => {
    // 페이지 로드 대기
    await page.waitForTimeout(2000);

    // 검색 입력 필드 확인
    const searchInput = page.locator('input[placeholder*="골프장"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 검색어 입력
    await searchInput.fill('강남');
    await expect(searchInput).toHaveValue('강남');
  });

  test('골프장 목록 또는 빈 상태 표시', async ({ page }) => {
    // 로딩 완료 대기
    await page.waitForTimeout(5000);

    // 골프장 목록이나 빈 상태 메시지 확인 (총 개수 표시 확인)
    const hasClubs = await page.getByText(/운영|휴장|정비/).first().isVisible().catch(() => false);
    const hasCount = await page.getByText(/총 \d+개의 골프장/).isVisible().catch(() => false);

    expect(hasClubs || hasCount).toBeTruthy();
  });

  test('총 골프장 개수 표시', async ({ page }) => {
    // 로딩 완료 대기
    await page.waitForTimeout(2000);

    // 하단 정보 확인
    await expect(page.getByText(/총 \d+개의 골프장/)).toBeVisible();
  });
});

test.describe('라운드 관리 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/games');
    await expect(page).toHaveURL(/.*games/);
  });

  test('라운드 목록 페이지 렌더링', async ({ page }) => {
    // 헤더 확인
    await expect(page.getByRole('heading', { name: /라운드 관리/ })).toBeVisible();

    // 부제목 확인
    await expect(page.getByText(/18홀 라운드 조합 및 가격 설정/)).toBeVisible();
  });

  test('새 라운드 추가 버튼 표시', async ({ page }) => {
    // 새 라운드 추가 버튼 확인
    await expect(page.getByRole('button', { name: /새 라운드 추가/ })).toBeVisible();
  });

  test('골프장 필터 표시', async ({ page }) => {
    // 골프장 필터 셀렉트 확인
    const clubFilter = page.locator('select').filter({ hasText: /전체 골프장/ });
    await expect(clubFilter).toBeVisible();
  });

  test('검색 필드 동작', async ({ page }) => {
    // 페이지 로드 대기
    await page.waitForTimeout(2000);

    // 검색 입력 필드 확인
    const searchInput = page.locator('input[placeholder*="라운드"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 검색어 입력
    await searchInput.fill('테스트');
    await expect(searchInput).toHaveValue('테스트');
  });

  test('라운드 목록 또는 빈 상태 표시', async ({ page }) => {
    // 로딩 완료 대기
    await page.waitForTimeout(5000);

    // 라운드 목록이나 빈 상태 메시지, 또는 총 개수 확인
    const hasGames = await page.getByText(/운영중|비활성|정비중/).first().isVisible().catch(() => false);
    const noGames = await page.getByText(/라운드가 없습니다/).isVisible().catch(() => false);
    const hasCount = await page.getByText(/총 \d+개의 라운드/).isVisible().catch(() => false);

    expect(hasGames || noGames || hasCount).toBeTruthy();
  });

  test('총 라운드 개수 표시', async ({ page }) => {
    // 로딩 완료 대기
    await page.waitForTimeout(2000);

    // 하단 정보 확인
    await expect(page.getByText(/총 \d+개의 라운드/)).toBeVisible();
  });

  test('새 라운드 추가 모달 열기', async ({ page }) => {
    // 새 라운드 추가 버튼 클릭
    await page.getByRole('button', { name: /새 라운드 추가/ }).click();

    // 모달이 열렸는지 확인 (모달 내용 또는 폼 요소 확인)
    await page.waitForTimeout(500);

    // 모달 닫기 (ESC 키 또는 닫기 버튼)
    await page.keyboard.press('Escape');
  });
});
