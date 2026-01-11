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

  test('ADMIN 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /시스템관리자/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test('MANAGER 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /운영매니저/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test('STAFF 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /현장직원/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test('VIEWER 역할로 로그인 성공', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /조회담당/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('관리자 ID').fill('admin@parkgolf.com');
    await page.getByLabel('PASSWORD').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText(/실패/)).toBeVisible({ timeout: 10000 });
  });

  test('존재하지 않는 계정으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('관리자 ID').fill('nonexistent@test.com');
    await page.getByLabel('PASSWORD').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText(/실패/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('서버 웜업 테스트', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.slow(); // 서버 웜업은 시간이 걸림

  test('시스템 점검 버튼 표시', async ({ page }) => {
    await page.goto('/login');

    // 시스템 점검 버튼 확인
    const warmupButton = page.getByRole('button', { name: '시스템 점검' });
    await expect(warmupButton).toBeVisible();
  });

  test('웜업 패널 열기/닫기', async ({ page }) => {
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

    // 진행 상태 표시 확인 (admin-api 연결중...)
    await expect(page.getByText('admin-api 연결중...')).toBeVisible({ timeout: 5000 });

    // 서비스 목록 표시 확인 (auth-service, user-api, course-service, booking-service)
    await expect(page.getByText('auth-service')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('user-api')).toBeVisible();
    await expect(page.getByText('course-service')).toBeVisible();
    await expect(page.getByText('booking-service')).toBeVisible();

    // 완료 상태 확인
    await expect(page.getByText('서버 웜업 완료')).toBeVisible({ timeout: 60000 });
  });

  test('NATS 통신 테스트 실행', async ({ page }) => {
    await page.goto('/login');

    // 패널 열기
    await page.getByRole('button', { name: '시스템 점검' }).click();

    // 먼저 서버 웜업 실행 (NATS 테스트 전에 서버가 깨어나야 함)
    const warmupStartButton = page.locator('button').filter({ hasText: '시작' }).first();
    await warmupStartButton.click();
    await expect(page.getByText('서버 웜업 완료')).toBeVisible({ timeout: 60000 });

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
    await expect(page.getByText('서버 웜업 완료')).toBeVisible({ timeout: 60000 });

    // 패널 닫기
    await page.locator('button').filter({ has: page.locator('svg path[d="M6 18L18 6M6 6l12 12"]') }).click();

    // 로그인 테스트
    await page.getByRole('button', { name: /시스템관리자/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });
});
