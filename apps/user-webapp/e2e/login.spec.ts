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

    // 에러 메시지 확인
    await expect(page.getByText(/이메일 또는 비밀번호가 일치하지 않습니다|네트워크 오류/)).toBeVisible({ timeout: 10000 });

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

    // 에러 메시지 확인
    await expect(page.getByText(/이메일 또는 비밀번호가 일치하지 않습니다|네트워크 오류/)).toBeVisible({ timeout: 10000 });

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

  test('로그인 없이 둘러보기 링크 동작', async ({ page }) => {
    // 둘러보기 링크 클릭
    await page.getByRole('link', { name: /로그인 없이 둘러보기/ }).click();

    // 예약 페이지로 이동 확인
    await expect(page).toHaveURL(/.*booking/);
  });
});
