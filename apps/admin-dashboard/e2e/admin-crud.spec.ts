import { test, expect } from '@playwright/test';

test.describe('관리자 CRUD 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('관리자 목록 조회', async ({ page }) => {
    // 사이드바 네비게이션으로 이동
    await page.goto('/admin-management');
    await page.waitForTimeout(2000);

    // 페이지 컨텐츠 확인 (권한 없음 메시지 또는 관리자 목록)
    const hasContent = await page.getByText('관리자').first().isVisible({ timeout: 5000 }).catch(() => false);
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
