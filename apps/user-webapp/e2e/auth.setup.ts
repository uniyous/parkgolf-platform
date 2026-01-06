import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

/**
 * 인증 설정 - 테스트 전 로그인 상태 저장
 */
setup('authenticate as test user', async ({ page }) => {
  // 로그인 페이지로 이동
  await page.goto('/login');

  // 페이지 로드 확인
  await expect(page.getByText('Golf Course')).toBeVisible({ timeout: 30000 });

  // 테스트 계정 버튼 클릭 (테스트사용자)
  await page.getByRole('button', { name: /테스트사용자/ }).click();

  // 로그인 버튼 클릭
  await page.getByRole('button', { name: '로그인' }).click();

  // 검색 페이지로 리다이렉트 확인 (Cloud Run 콜드 스타트 대비)
  await expect(page).toHaveURL(/.*search/, { timeout: 30000 });

  // 인증 상태 저장
  await page.context().storageState({ path: authFile });
});
