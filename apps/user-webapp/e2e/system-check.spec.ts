import { test, expect } from '@playwright/test';

/**
 * 시스템 점검 E2E 테스트
 * - 서버 웜업 (Cloud Run Cold Start 해제)
 * - NATS 마이크로서비스 통신 테스트
 */
test.describe('시스템 점검', () => {
  test.slow(); // 서버 웜업 및 NATS 테스트는 시간이 걸림

  test('시스템 점검 버튼 표시', async ({ page }) => {
    await page.goto('/login');

    // 시스템 점검 버튼 확인
    const warmupButton = page.getByRole('button', { name: '시스템 점검' });
    await expect(warmupButton).toBeVisible();
  });

  test('시스템 점검 패널 열기/닫기', async ({ page }) => {
    await page.goto('/login');

    // 패널 열기
    await page.getByRole('button', { name: '시스템 점검' }).click();
    await expect(page.getByText('시스템 상태 점검')).toBeVisible();
    await expect(page.getByText('1. 서버 웜업')).toBeVisible();
    await expect(page.getByText('2. NATS 통신 테스트')).toBeVisible();

    // 패널 닫기
    await page.locator('button').filter({ has: page.locator('svg path[d="M6 18L18 6M6 6l12 12"]') }).click();
    await expect(page.getByText('시스템 상태 점검')).not.toBeVisible();
  });

  test('서버 웜업 실행', async ({ page }) => {
    await page.goto('/login');

    // 패널 열기
    await page.getByRole('button', { name: '시스템 점검' }).click();

    // 서버 웜업 시작
    const warmupStartButton = page.locator('button').filter({ hasText: '시작' }).first();
    await warmupStartButton.click();

    // 진행 상태 표시 확인 (user-api 연결중...)
    await expect(page.getByText('user-api 연결중...')).toBeVisible({ timeout: 5000 });

    // 서비스 목록 표시 확인
    await expect(page.getByText('iam-service')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('course-service')).toBeVisible();
    await expect(page.getByText('booking-service')).toBeVisible();

    // 완료 상태 확인 (웜업 완료 또는 서비스 완료 표시)
    const warmupComplete = page.getByText(/서버 웜업 완료|4\/4 서비스|완료/);
    await expect(warmupComplete.first()).toBeVisible({ timeout: 90000 });
  });

  test('NATS 마이크로서비스 통신 테스트', async ({ page }) => {
    await page.goto('/login');

    // 패널 열기
    await page.getByRole('button', { name: '시스템 점검' }).click();

    // 먼저 서버 웜업 실행 (NATS 테스트 전에 서버가 깨어나야 함)
    const warmupStartButton = page.locator('button').filter({ hasText: '시작' }).first();
    await warmupStartButton.click();
    const warmupComplete = page.getByText(/서버 웜업 완료|4\/4 서비스|완료/);
    await expect(warmupComplete.first()).toBeVisible({ timeout: 90000 });

    // NATS 테스트 시작
    const natsTestButton = page.getByRole('button', { name: '3회 테스트' });
    await natsTestButton.click();

    // 진행 상태 표시 확인
    await expect(page.getByText(/NATS 테스트.*진행중/)).toBeVisible({ timeout: 5000 });

    // 테이블 헤더 확인
    await expect(page.getByText('1차')).toBeVisible();
    await expect(page.getByText('2차')).toBeVisible();
    await expect(page.getByText('3차')).toBeVisible();

    // 완료 상태 확인 (3회 테스트 완료)
    await expect(page.getByText(/NATS 테스트 완료/)).toBeVisible({ timeout: 30000 });
  });

  test('서버 웜업 후 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    // 서버 웜업 실행
    await page.getByRole('button', { name: '시스템 점검' }).click();
    const warmupStartButton = page.locator('button').filter({ hasText: '시작' }).first();
    await warmupStartButton.click();
    const warmupComplete = page.getByText(/서버 웜업 완료|4\/4 서비스|완료/);
    await expect(warmupComplete.first()).toBeVisible({ timeout: 90000 });

    // 패널 닫기
    await page.locator('button').filter({ has: page.locator('svg path[d="M6 18L18 6M6 6l12 12"]') }).click();

    // 로그인 테스트
    await page.getByRole('button', { name: /테스트사용자/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*search/, { timeout: 30000 });
  });
});
