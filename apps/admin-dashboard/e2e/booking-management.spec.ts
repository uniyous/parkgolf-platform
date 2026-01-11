import { test, expect } from '@playwright/test';

// 페이지 콘텐츠 로드 대기 헬퍼 함수
async function waitForPageReady(page: import('@playwright/test').Page) {
  // 1. 예약 현황 헤더가 표시될 때까지 대기 (페이지 렌더링 확인)
  await page.waitForSelector('h1:has-text("예약 현황")', { timeout: 30000 });

  // 2. 로딩 메시지가 사라지거나 데이터가 로드될 때까지 대기
  await Promise.race([
    // 로딩 메시지가 사라질 때까지 대기
    page.waitForFunction(
      () => !document.body.textContent?.includes('예약 데이터를 불러오는 중'),
      { timeout: 30000 }
    ),
    // 또는 총 예약 건수가 표시될 때까지 대기
    page.waitForSelector('p:has-text("총"), p:has-text("건의 예약")', { timeout: 30000 }),
  ]).catch(() => {
    // 둘 다 실패해도 계속 진행 (데이터가 없을 수 있음)
  });

  // 약간의 안정화 시간
  await page.waitForTimeout(200);
}

test.describe('예약 현황 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bookings');
    await expect(page).toHaveURL(/.*bookings/);
    await waitForPageReady(page);
  });

  test('예약 현황 페이지 렌더링', async ({ page }) => {
    // 헤더 확인
    await expect(page.getByRole('heading', { name: /예약 현황/ })).toBeVisible();

    // 부제목 확인
    await expect(page.getByText(/실시간 예약 조회 및 관리/)).toBeVisible();
  });

  test('상태별 카운트 카드 표시', async ({ page }) => {
    // main 영역 내 각 상태 카드 확인 (p 태그로 한정)
    const main = page.getByRole('main');
    await expect(main.locator('p:has-text("전체")')).toBeVisible();
    await expect(main.locator('p:has-text("대기")')).toBeVisible();
    await expect(main.locator('p:has-text("확정")')).toBeVisible();
    await expect(main.locator('p:has-text("완료")')).toBeVisible();
    await expect(main.locator('p:has-text("취소")')).toBeVisible();
    await expect(main.locator('p:has-text("노쇼")')).toBeVisible();
  });

  test('날짜 범위 필터 표시', async ({ page }) => {
    // 기간 레이블 확인
    await expect(page.getByText('기간')).toBeVisible();

    // 날짜 입력 필드들 확인
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
  });

  test('골프장 필터 표시', async ({ page }) => {
    // main 영역 내 골프장 필터 레이블 확인
    const main = page.getByRole('main');
    await expect(main.locator('label:has-text("골프장")')).toBeVisible();

    // 전체 옵션이 있는 셀렉트 확인
    const clubSelect = main.locator('select');
    await expect(clubSelect).toBeVisible();
  });

  test('검색 필드 동작', async ({ page }) => {
    // 검색 입력 필드 확인 - 실제 placeholder 텍스트 사용
    const searchInput = page.getByPlaceholder(/예약자명, 연락처, 예약번호 검색/);
    await expect(searchInput).toBeVisible();

    // 검색어 입력
    await searchInput.fill('홍길동');
    await expect(searchInput).toHaveValue('홍길동');
  });

  test('상태 필터 클릭', async ({ page }) => {
    // 대기 상태 텍스트가 있는 클릭 가능한 요소 찾기
    const pendingCard = page.locator('p:has-text("대기")').first();
    await expect(pendingCard).toBeVisible();

    // 부모 요소 클릭 (카드)
    await pendingCard.click();

    // 클릭 후 데이터 로딩 대기
    await page.waitForTimeout(500);
  });

  test('예약 목록 또는 빈 상태 표시', async ({ page }) => {
    // 예약 목록 테이블, 빈 상태 메시지, 또는 총 예약 건수 중 하나 확인
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const noBookings = await page.getByText(/예약이 없습니다/).isVisible().catch(() => false);
    const hasCount = await page.getByText(/총 \d+건의 예약/).isVisible().catch(() => false);

    expect(hasTable || noBookings || hasCount).toBeTruthy();
  });

  test('테이블 헤더 표시 (예약이 있는 경우)', async ({ page }) => {
    // 테이블이 있는 경우 헤더 확인
    const table = page.locator('table');
    if (await table.isVisible()) {
      await expect(page.getByText('예약번호')).toBeVisible();
      await expect(page.getByText('날짜/시간')).toBeVisible();
      await expect(page.getByText('고객 정보')).toBeVisible();
      await expect(page.getByText('인원')).toBeVisible();
      await expect(page.getByText('금액')).toBeVisible();
      await expect(page.getByText('상태').first()).toBeVisible();
      await expect(page.getByText('액션')).toBeVisible();
    }
  });

  test('총 예약 건수 표시', async ({ page }) => {
    // 하단 정보 확인 - 숫자 패턴 매칭
    await expect(page.getByText(/총 \d+건의 예약/)).toBeVisible();
  });

  test('필터 초기화 버튼 동작', async ({ page }) => {
    // 검색어 입력하여 필터 활성화
    const searchInput = page.getByPlaceholder(/예약자명, 연락처, 예약번호 검색/);
    await searchInput.fill('테스트');

    // 필터 초기화 버튼 확인 및 클릭
    const resetButton = page.getByRole('button', { name: /필터 초기화/ });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // 검색어가 초기화되었는지 확인
    await expect(searchInput).toHaveValue('');
  });

  test('날짜 필터 변경', async ({ page }) => {
    // 시작 날짜 변경
    const dateInputs = page.locator('input[type="date"]');
    const startDateInput = dateInputs.first();

    // 오늘 날짜 설정
    const today = new Date().toISOString().split('T')[0];
    await startDateInput.fill(today);
    await expect(startDateInput).toHaveValue(today);
  });
});

test.describe('예약 테이블 동작 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bookings');
    await waitForPageReady(page);
  });

  test('예약 행에 필수 정보 표시 (데이터가 있는 경우)', async ({ page }) => {
    const table = page.locator('table');
    if (await table.isVisible()) {
      // 첫 번째 예약 행 확인
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        // 예약번호 형식 확인 (B0001 형태)
        await expect(firstRow.getByText(/B\d{4}/)).toBeVisible();
      }
    }
  });

  test('상태 뱃지 표시 (데이터가 있는 경우)', async ({ page }) => {
    const table = page.locator('table');
    if (await table.isVisible()) {
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        // 상태 뱃지가 표시되는지 확인
        const statusBadge = firstRow.locator('.rounded-full');
        await expect(statusBadge).toBeVisible();
      }
    }
  });

  test('액션 버튼 표시 (데이터가 있는 경우)', async ({ page }) => {
    const table = page.locator('table');
    if (await table.isVisible()) {
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        // 상세 버튼이 표시되는지 확인
        const detailButton = firstRow.getByRole('button', { name: /상세/ });
        await expect(detailButton).toBeVisible();
      }
    }
  });
});
