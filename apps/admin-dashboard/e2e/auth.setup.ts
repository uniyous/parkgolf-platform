import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/admin.json';

/**
 * 인증 설정 - 테스트 전 로그인 상태 저장
 */
setup('authenticate as admin', async ({ page }) => {
  // 로그인 페이지로 이동
  await page.goto('/login');

  // 로그인 폼 입력
  await page.getByLabel('이메일').fill('admin@parkgolf.com');
  await page.getByLabel('비밀번호').fill('admin123!@#');

  // 로그인 버튼 클릭
  await page.getByRole('button', { name: '로그인' }).click();

  // 대시보드로 리다이렉트 확인
  await expect(page).toHaveURL(/.*dashboard/);

  // 인증 상태 저장
  await page.context().storageState({ path: authFile });
});
