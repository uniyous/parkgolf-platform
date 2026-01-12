import { test, expect } from '@playwright/test';

test.describe('로그인 테스트', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.slow(); // 로그인 테스트는 API 호출 대기가 필요

  test('로그인 페이지 렌더링', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('관리자 ID')).toBeVisible();
    await expect(page.getByLabel('PASSWORD')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('PLATFORM_ADMIN 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    // 플랫폼관리자 테스트 계정 선택
    await page.getByRole('button', { name: /플랫폼관리자/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test('COMPANY_ADMIN 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    // 강남대표 테스트 계정 선택
    await page.getByRole('button', { name: /강남대표/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('관리자 ID').fill('admin@parkgolf.com');
    await page.getByLabel('PASSWORD').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    // 로그인 실패 메시지 또는 에러 표시 확인
    await expect(page.getByText(/로그인 실패|Invalid|오류|실패/i)).toBeVisible({ timeout: 15000 });
  });

  test('존재하지 않는 계정으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('관리자 ID').fill('nonexistent@test.com');
    await page.getByLabel('PASSWORD').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText(/실패/)).toBeVisible({ timeout: 10000 });
  });
});
