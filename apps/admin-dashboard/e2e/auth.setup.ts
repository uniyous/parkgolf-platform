import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/admin.json';

/**
 * 인증 설정 - 테스트 전 로그인 상태 저장
 */
setup('authenticate as admin', async ({ page }) => {
  // 로그인 페이지로 이동
  await page.goto('/login');

  // 테스트 계정 버튼 클릭 (시스템관리자)
  await page.getByRole('button', { name: /시스템관리자/ }).click();

  // 로그인 버튼 클릭
  await page.getByRole('button', { name: '로그인' }).click();

  // 대시보드로 리다이렉트 확인 (Cloud Run 콜드 스타트 대비)
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });

  // 인증 상태 저장
  await page.context().storageState({ path: authFile });
});
