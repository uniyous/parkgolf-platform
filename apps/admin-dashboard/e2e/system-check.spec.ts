import { test, expect } from '@playwright/test';

/**
 * 시스템 점검 E2E 테스트
 * - 서버 헬스 체크 (/health)
 */
test.describe('시스템 점검', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('서버 체크 버튼 표시', async ({ page }) => {
    await page.goto('/login');

    const checkButton = page.getByRole('button', { name: '서버 체크' });
    await expect(checkButton).toBeVisible();
  });

  test('서버 체크 패널 열기/닫기', async ({ page }) => {
    await page.goto('/login');

    // 패널 열기
    await page.getByRole('button', { name: '서버 체크' }).click();
    await expect(page.getByText('서버 상태 점검')).toBeVisible();
    await expect(page.getByText('Health Check')).toBeVisible();

    // 패널 닫기
    await page.locator('button').filter({ has: page.locator('svg path[d="M6 18L18 6M6 6l12 12"]') }).click();
    await expect(page.getByText('서버 상태 점검')).not.toBeVisible();
  });

  test('서버 헬스 체크 실행', async ({ page }) => {
    await page.goto('/login');

    // 패널 열기
    await page.getByRole('button', { name: '서버 체크' }).click();

    // 헬스 체크 시작
    const checkStartButton = page.locator('button').filter({ hasText: '체크' }).first();
    await checkStartButton.click();

    // 진행 상태 표시 확인
    await expect(page.getByText('서버 상태 확인중...')).toBeVisible({ timeout: 5000 });

    // 서비스 목록 표시 확인
    await expect(page.getByText('admin-api')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('user-api')).toBeVisible();

    // 완료 상태 확인
    await expect(page.getByText(/모든 서버 정상|일부 서버 오류/)).toBeVisible({ timeout: 15000 });
  });

  test('서버 체크 후 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    // 서버 체크 실행
    await page.getByRole('button', { name: '서버 체크' }).click();
    const checkStartButton = page.locator('button').filter({ hasText: '체크' }).first();
    await checkStartButton.click();
    await expect(page.getByText(/모든 서버 정상|일부 서버 오류/)).toBeVisible({ timeout: 15000 });

    // 패널 닫기
    await page.locator('button').filter({ has: page.locator('svg path[d="M6 18L18 6M6 6l12 12"]') }).click();

    // 로그인 테스트
    await page.getByRole('button', { name: /플랫폼관리자/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });
});
