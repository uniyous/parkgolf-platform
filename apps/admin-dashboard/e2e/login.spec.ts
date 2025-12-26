import { test, expect } from '@playwright/test';

test.describe('로그인 테스트', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // 로그인 상태 초기화

  test('로그인 페이지 렌더링', async ({ page }) => {
    await page.goto('/login');

    // 로그인 폼 요소 확인
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('ADMIN 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('admin@parkgolf.com');
    await page.getByLabel('비밀번호').fill('admin123!@#');
    await page.getByRole('button', { name: '로그인' }).click();

    // 대시보드로 리다이렉트
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('MANAGER 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('manager@gangnam-golf.com');
    await page.getByLabel('비밀번호').fill('admin123!@#');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('STAFF 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('staff@gangnam-golf.com');
    await page.getByLabel('비밀번호').fill('admin123!@#');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('VIEWER 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('viewer@parkgolf.com');
    await page.getByLabel('비밀번호').fill('admin123!@#');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('admin@parkgolf.com');
    await page.getByLabel('비밀번호').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    // 에러 메시지 확인
    await expect(page.getByText(/로그인.*실패|잘못된|오류/)).toBeVisible();
  });

  test('존재하지 않는 계정으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('nonexistent@test.com');
    await page.getByLabel('비밀번호').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText(/로그인.*실패|존재하지|오류/)).toBeVisible();
  });
});
