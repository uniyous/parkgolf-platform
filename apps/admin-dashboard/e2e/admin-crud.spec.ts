import { test, expect } from '@playwright/test';

test.describe('관리자 CRUD 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('관리자 목록 조회', async ({ page }) => {
    // 사이드바 네비게이션으로 이동
    await page.goto('/admin-management');

    // 로딩 다이얼로그가 사라질 때까지 대기
    await page.waitForSelector('dialog[aria-label="로딩"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);

    // 페이지 컨텐츠 확인 - 페이지 제목 또는 테이블 확인
    const hasTitle = await page.getByRole('heading', { name: /관리자/ }).first().isVisible().catch(() => false);
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasContent = hasTitle || hasTable;

    expect(hasContent).toBeTruthy();
  });
});

test.describe('역할별 접근 테스트', () => {
  test('ADMIN으로 대시보드 접근', async ({ page }) => {
    // 이미 ADMIN으로 로그인된 상태
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // 대시보드 컨텐츠 확인 (헤딩 사용)
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
  });
});
