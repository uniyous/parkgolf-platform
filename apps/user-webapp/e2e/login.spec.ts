import { test, expect } from '@playwright/test';

test.describe('로그인 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그인 페이지로 이동
    await page.goto('/login');
  });

  test('로그인 페이지가 정상적으로 렌더링됨', async ({ page }) => {
    // 로고 확인
    await expect(page.getByText('Golf Course')).toBeVisible();

    // 이메일 입력 필드 확인
    await expect(page.getByLabel('이메일')).toBeVisible();

    // 비밀번호 입력 필드 확인
    await expect(page.getByLabel('비밀번호')).toBeVisible();

    // 로그인 버튼 확인
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();

    // 테스트 계정 버튼 확인
    await expect(page.getByRole('button', { name: /테스트사용자/ })).toBeVisible();
  });

  test('테스트사용자로 로그인 성공', async ({ page }) => {
    // 테스트 계정 버튼 클릭
    await page.getByRole('button', { name: /테스트사용자/ }).click();

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: '로그인' }).click();

    // 검색 페이지로 리다이렉트 확인
    await expect(page).toHaveURL(/.*search/, { timeout: 30000 });
  });

  test('김철수 계정으로 로그인 성공', async ({ page }) => {
    // 테스트 계정 버튼 클릭
    await page.getByRole('button', { name: /김철수/ }).click();

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: '로그인' }).click();

    // 검색 페이지로 리다이렉트 확인
    await expect(page).toHaveURL(/.*search/, { timeout: 30000 });
  });

  test('박영희 계정으로 로그인 성공', async ({ page }) => {
    // 테스트 계정 버튼 클릭
    await page.getByRole('button', { name: /박영희/ }).click();

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: '로그인' }).click();

    // 검색 페이지로 리다이렉트 확인
    await expect(page).toHaveURL(/.*search/, { timeout: 30000 });
  });

  test('이민수 계정으로 로그인 성공', async ({ page }) => {
    // 테스트 계정 버튼 클릭
    await page.getByRole('button', { name: /이민수/ }).click();

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: '로그인' }).click();

    // 검색 페이지로 리다이렉트 확인
    await expect(page).toHaveURL(/.*search/, { timeout: 30000 });
  });

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    // 이메일 입력
    await page.getByLabel('이메일').fill('test@parkgolf.com');

    // 잘못된 비밀번호 입력
    await page.getByLabel('비밀번호').fill('wrongpassword');

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: '로그인' }).click();

    // 에러 메시지 확인 (data-testid 사용)
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 15000 });

    // 로그인 페이지에 머물러 있는지 확인
    await expect(page).toHaveURL(/.*login/);
  });

  test('존재하지 않는 계정으로 로그인 실패', async ({ page }) => {
    // 존재하지 않는 이메일 입력
    await page.getByLabel('이메일').fill('nonexistent@example.com');

    // 비밀번호 입력
    await page.getByLabel('비밀번호').fill('somepassword');

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: '로그인' }).click();

    // 에러 메시지 확인 (data-testid 사용)
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 15000 });

    // 로그인 페이지에 머물러 있는지 확인
    await expect(page).toHaveURL(/.*login/);
  });

  test('빈 필드로 로그인 시도 시 유효성 검사', async ({ page }) => {
    // 로그인 버튼 클릭 (빈 필드)
    await page.getByRole('button', { name: '로그인' }).click();

    // 이메일 에러 메시지 확인
    await expect(page.getByText('이메일을 입력해주세요')).toBeVisible();

    // 비밀번호 에러 메시지 확인
    await expect(page.getByText('비밀번호를 입력해주세요')).toBeVisible();
  });

  test('회원가입 페이지로 이동', async ({ page }) => {
    // 회원가입 링크 클릭
    await page.getByRole('link', { name: '회원가입' }).click();

    // 회원가입 페이지로 이동 확인
    await expect(page).toHaveURL(/.*signup/);
  });

});

test.describe('서버 웜업 테스트', () => {
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

    // 진행 상태 표시 확인 (user-api 연결중...)
    await expect(page.getByText('user-api 연결중...')).toBeVisible({ timeout: 5000 });

    // 서비스 목록 표시 확인 (auth-service, course-service, booking-service)
    await expect(page.getByText('auth-service')).toBeVisible({ timeout: 30000 });
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
    await page.getByRole('button', { name: /테스트사용자/ }).click();
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/.*search/, { timeout: 30000 });
  });
});
