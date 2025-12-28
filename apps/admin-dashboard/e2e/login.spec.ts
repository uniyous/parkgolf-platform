import { test, expect } from '@playwright/test';

test.describe('로그인 테스트', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('로그인 페이지 렌더링', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('관리자 ID')).toBeVisible();
    await expect(page.getByLabel('PASSWORD')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('ADMIN 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /시스템관리자/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
  });

  test('MANAGER 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /운영매니저/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
  });

  test('STAFF 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /현장직원/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
  });

  test('VIEWER 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /조회담당/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
  });

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('관리자 ID').fill('admin@parkgolf.com');
    await page.getByLabel('PASSWORD').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText(/실패/)).toBeVisible({ timeout: 30000 });
  });

  test('존재하지 않는 계정으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('관리자 ID').fill('nonexistent@test.com');
    await page.getByLabel('PASSWORD').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText(/실패/)).toBeVisible({ timeout: 30000 });
  });
});
