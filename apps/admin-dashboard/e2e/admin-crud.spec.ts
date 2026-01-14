import { test, expect } from '@playwright/test';

// 전역 테스트 타임아웃 설정
test.setTimeout(60000);

test.describe('관리자 CRUD 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('관리자 목록 조회', async ({ page }) => {
    // 사이드바 네비게이션으로 이동
    await page.goto('/admin-management');
    await page.waitForLoadState('domcontentloaded');

    // 페이지 제목이 나타날 때까지 대기
    await expect(page.locator('h1, h2').filter({ hasText: /관리자/ }).first()).toBeVisible({ timeout: 30000 });

    // 로딩이 완료될 때까지 대기
    await page.waitForTimeout(1000);

    // 페이지 컨텐츠 확인 - 페이지 제목 또는 테이블 확인
    const hasTitle = await page.locator('h1, h2').filter({ hasText: /관리자/ }).first().isVisible().catch(() => false);
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasContent = hasTitle || hasTable;

    expect(hasContent).toBeTruthy();
  });
});

test.describe('역할별 접근 테스트', () => {
  test('ADMIN으로 대시보드 접근', async ({ page }) => {
    // 이미 ADMIN으로 로그인된 상태
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*dashboard/);

    // 대시보드 컨텐츠 확인 (헤딩 사용)
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 30000 });
  });
});
