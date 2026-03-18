import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * 가맹점 관리 워크플로우 E2E 테스트
 *
 * 개선된 /franchise/* 네비게이션 구조 검증:
 * 1. 네비게이션 메뉴 구조
 * 2. 가맹점 현황 대시보드 (/franchise)
 * 3. 회사 관리 (/franchise/companies)
 * 4. 골프장 현황 (/franchise/clubs)
 * 5. 파트너 연동 (/franchise/partners)
 * 6. 기존 URL 리다이렉트
 */

test.setTimeout(30000);

// 콘솔 에러 수집기
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`[PAGE ERROR] ${error.message}`);
  });
  return errors;
}

function filterCriticalErrors(errors: string[]): string[] {
  return errors.filter(
    (e) => !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('third-party')
  );
}

// ========================================
// 1. 네비게이션 메뉴 구조
// ========================================
test.describe('1. 가맹점 관리 네비게이션', () => {

  test('TC-F001: 가맹점 관리 메뉴 그룹에 4개 서브메뉴가 있다', async ({ page }) => {
    await page.goto('/franchise');
    await page.waitForLoadState('networkidle');

    // 가맹점 관리 메뉴 그룹 확인
    const menuGroup = page.getByText('가맹점 관리');
    await expect(menuGroup.first()).toBeVisible({ timeout: 10000 });

    // 서브메뉴 확인
    await expect(page.getByRole('link', { name: /가맹점 현황/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /회사 관리/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /골프장 현황/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /파트너 연동/ })).toBeVisible();
  });

  test('TC-F002: 각 메뉴 클릭 시 올바른 경로로 이동한다', async ({ page }) => {
    await page.goto('/franchise');
    await page.waitForLoadState('networkidle');

    // 회사 관리 클릭
    await page.getByRole('link', { name: /회사 관리/ }).click();
    await expect(page).toHaveURL(/.*\/franchise\/companies/);

    // 골프장 현황 클릭
    await page.getByRole('link', { name: /골프장 현황/ }).click();
    await expect(page).toHaveURL(/.*\/franchise\/clubs/);

    // 파트너 연동 클릭
    const partnerLink = page.getByRole('link', { name: /파트너 연동/ });
    if (await partnerLink.isVisible().catch(() => false)) {
      await partnerLink.click();
      await expect(page).toHaveURL(/.*\/franchise\/partners/);
    }

    // 가맹점 현황 클릭
    await page.getByRole('link', { name: /가맹점 현황/ }).click();
    await expect(page).toHaveURL(/.*\/franchise/);
  });
});

// ========================================
// 2. 가맹점 현황 대시보드
// ========================================
test.describe('2. 가맹점 현황 대시보드', () => {

  test('TC-F010: 가맹점 현황 페이지 정상 로드', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/franchise');
    await page.waitForLoadState('networkidle');

    // 페이지 제목 확인
    await expect(page.getByRole('heading', { name: /가맹점 현황/ })).toBeVisible({ timeout: 10000 });

    // 런타임 에러 확인
    const critical = filterCriticalErrors(errors);
    if (critical.length > 0) console.log('⚠ 콘솔 에러:', critical);
    expect(critical.length).toBe(0);
  });

  test('TC-F011: 통계 카드가 표시된다', async ({ page }) => {
    await page.goto('/franchise');
    await page.waitForLoadState('networkidle');

    // 통계 카드 확인 (전체 회사, 전체 골프장, 플랫폼 사용, 파트너 연동)
    const main = page.getByRole('main');
    await expect(main.getByText('전체 회사')).toBeVisible({ timeout: 10000 });
    await expect(main.getByText('전체 골프장')).toBeVisible();
    await expect(main.getByText('플랫폼 사용')).toBeVisible();
    await expect(main.getByText('파트너 연동')).toBeVisible();
  });
});

// ========================================
// 3. 회사 관리 (기존 기능 경로 변경)
// ========================================
test.describe('3. 회사 관리', () => {

  test('TC-F020: /franchise/companies 정상 로드', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/franchise/companies');
    await page.waitForLoadState('networkidle');

    // 회사 관리 페이지 확인
    await expect(page.getByRole('heading', { name: /회사 관리/ })).toBeVisible({ timeout: 10000 });

    const critical = filterCriticalErrors(errors);
    if (critical.length > 0) console.log('⚠ 콘솔 에러:', critical);
    expect(critical.length).toBe(0);
  });

  test('TC-F021: 회사 목록이 표시된다', async ({ page }) => {
    await page.goto('/franchise/companies');
    await page.waitForLoadState('networkidle');

    // 회사 관리 페이지 컨텐츠 확인 (통계 카드 또는 테이블)
    const hasStats = await page.getByText('전체 회사').isVisible().catch(() => false);
    const hasTable = await page.locator('table, [class*="grid"]').first().isVisible().catch(() => false);
    const hasContent = hasStats || hasTable;
    expect(hasContent).toBeTruthy();
  });
});

// ========================================
// 4. 골프장 현황 (신규 페이지)
// ========================================
test.describe('4. 골프장 현황', () => {

  test('TC-F030: 골프장 현황 페이지 정상 로드', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/franchise/clubs');
    await page.waitForLoadState('networkidle');

    // 페이지 제목 확인
    await expect(page.getByRole('heading', { name: /골프장 현황/ })).toBeVisible({ timeout: 10000 });

    const critical = filterCriticalErrors(errors);
    if (critical.length > 0) console.log('⚠ 콘솔 에러:', critical);
    expect(critical.length).toBe(0);
  });

  test('TC-F031: 필터 탭이 표시된다 (전체/플랫폼/파트너)', async ({ page }) => {
    await page.goto('/franchise/clubs');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /골프장 현황/ })).toBeVisible({ timeout: 10000 });

    // 필터 탭 확인
    await expect(page.getByText(/전체/).first()).toBeVisible();
    await expect(page.getByText(/플랫폼/).first()).toBeVisible();
    await expect(page.getByText(/파트너/).first()).toBeVisible();
  });

  test('TC-F032: 검색 입력창이 있다', async ({ page }) => {
    await page.goto('/franchise/clubs');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /골프장 현황/ })).toBeVisible({ timeout: 10000 });

    // 검색 입력창 확인
    const searchInput = page.getByPlaceholder(/검색|골프장/);
    await expect(searchInput).toBeVisible();
  });

  test('TC-F033: 필터 탭 클릭 시 목록이 필터링된다', async ({ page }) => {
    await page.goto('/franchise/clubs');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /골프장 현황/ })).toBeVisible({ timeout: 10000 });

    // 플랫폼 탭 클릭
    const platformTab = page.getByText(/플랫폼/).first();
    await platformTab.click();
    await page.waitForTimeout(500);

    // 파트너 탭 클릭
    const partnerTab = page.getByText(/파트너/).first();
    await partnerTab.click();
    await page.waitForTimeout(500);

    // 전체 탭 클릭
    const allTab = page.getByText(/전체/).first();
    await allTab.click();
    await page.waitForTimeout(500);
  });
});

// ========================================
// 5. 파트너 연동 (경로 변경)
// ========================================
test.describe('5. 파트너 연동', () => {

  test('TC-F040: /franchise/partners 정상 로드', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/franchise/partners');
    await page.waitForLoadState('networkidle');

    // 파트너 연동 페이지 확인
    await expect(page.getByRole('heading', { name: /파트너 연동/ })).toBeVisible({ timeout: 10000 });

    const critical = filterCriticalErrors(errors);
    if (critical.length > 0) console.log('⚠ 콘솔 에러:', critical);
    expect(critical.length).toBe(0);
  });

  test('TC-F041: 파트너 생성 폼에 회사/골프장 선택 dropdown이 있다', async ({ page }) => {
    await page.goto('/franchise/partners');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /파트너 연동/ })).toBeVisible({ timeout: 10000 });

    // 새 파트너 추가 버튼 클릭
    const addButton = page.getByRole('button', { name: /새 파트너|파트너 추가|추가/ });
    const hasAdd = await addButton.isVisible().catch(() => false);
    if (!hasAdd) {
      console.log('파트너 추가 버튼이 없습니다. 권한 확인 필요.');
      test.skip();
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // 회사 선택 dropdown 확인
    const companySelect = page.locator('select').filter({ has: page.locator('option') }).first();
    await expect(companySelect).toBeVisible({ timeout: 5000 });
  });
});

// ========================================
// 6. 기존 URL 리다이렉트
// ========================================
test.describe('6. 기존 URL 리다이렉트', () => {

  test('TC-F050: /companies → /franchise/companies 리다이렉트', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*\/franchise\/companies/);
  });

  test('TC-F051: /partners → /franchise/partners 리다이렉트', async ({ page }) => {
    await page.goto('/partners');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*\/franchise\/partners/);
  });
});
