import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

// 테스트 타임아웃 2분 설정 (Cloud Run 콜드 스타트 대비)
setup.setTimeout(120000);

/**
 * 인증 설정 - 테스트 전 로그인 상태 저장
 * Cloud Run 콜드 스타트와 NATS 연결 지연을 고려하여 재시도 로직 포함
 */
setup('authenticate as test user', async ({ page }) => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`로그인 시도 ${attempt}/${maxRetries}...`);

      // 로그인 페이지로 이동
      await page.goto('/login');

      // 페이지 로드 확인
      await expect(page.getByText('Golf Course')).toBeVisible({ timeout: 30000 });

      // 테스트 계정 버튼 클릭 (테스트사용자)
      await page.getByRole('button', { name: /테스트사용자/ }).click();

      // 로그인 버튼 클릭
      await page.getByRole('button', { name: '로그인' }).click();

      // 검색 페이지로 리다이렉트 확인 (Cloud Run 콜드 스타트 대비 - 60초)
      await expect(page).toHaveURL(/.*search/, { timeout: 60000 });

      // 인증 상태 저장
      await page.context().storageState({ path: authFile });

      console.log(`로그인 성공! (${attempt}번째 시도)`);
      return; // 성공하면 종료

    } catch (error) {
      lastError = error as Error;
      console.log(`로그인 시도 ${attempt} 실패: ${lastError.message}`);

      if (attempt < maxRetries) {
        // NATS 연결 안정화를 위해 대기
        const waitTime = attempt * 5000;
        console.log(`${waitTime / 1000}초 후 재시도...`);
        await page.waitForTimeout(waitTime);
      }
    }
  }

  // 모든 재시도 실패
  throw lastError || new Error('로그인 실패: 알 수 없는 오류');
});
