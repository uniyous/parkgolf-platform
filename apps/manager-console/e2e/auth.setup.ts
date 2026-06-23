import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'e2e/.auth/admin.json';

/**
 * 기존 인증 토큰이 유효한지 확인
 */
function isExistingAuthValid(): boolean {
  try {
    const authPath = path.resolve(authFile);
    if (!fs.existsSync(authPath)) {
      console.log('Auth file does not exist');
      return false;
    }

    const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const localStorage = authData.origins?.[0]?.localStorage || [];
    const accessTokenItem = localStorage.find((item: any) => item.name === 'accessToken');

    if (!accessTokenItem?.value) {
      console.log('No access token found');
      return false;
    }

    // JWT 토큰 만료 시간 확인
    const token = accessTokenItem.value;
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const expTime = decoded.exp * 1000; // seconds to milliseconds
    const now = Date.now();

    // 5분 여유를 두고 확인
    const isValid = expTime > now + 5 * 60 * 1000;
    console.log(`Token expires at: ${new Date(expTime).toISOString()}, valid: ${isValid}`);

    return isValid;
  } catch (error) {
    console.log('Error checking auth validity:', error);
    return false;
  }
}

/**
 * 인증 설정 - 테스트 전 로그인 상태 저장
 */
setup('authenticate as admin', async ({ page }) => {
  setup.slow(); // 인증 테스트는 더 긴 타임아웃 필요

  // 기존 인증이 유효하면 스킵
  if (isExistingAuthValid()) {
    console.log('Using existing valid auth token, skipping login');
    return;
  }

  console.log('Performing fresh login...');

  // 로그인 페이지로 이동
  await page.goto('/login');

  // 테스트 계정 버튼 클릭 (플랫폼관리자)
  await page.getByRole('button', { name: /플랫폼관리자/ }).click();

  // 로그인 버튼 클릭
  await page.getByRole('button', { name: '로그인' }).click();

  // 대시보드로 리다이렉트 확인 (로그인 API 응답 대기)
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

  // 인증 상태 저장
  await page.context().storageState({ path: authFile });
});
