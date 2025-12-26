import { test, expect } from '@playwright/test';

test.describe('관리자 CRUD 테스트', () => {
  const testAdmin = {
    email: `test-${Date.now()}@e2e-test.com`,
    name: 'E2E 테스트 관리자',
    password: 'test123!@#',
    phone: '010-9999-9999',
    department: 'E2E 테스트팀',
  };

  test.beforeEach(async ({ page }) => {
    // 관리자 관리 페이지로 이동
    await page.goto('/admin-management');
    await expect(page).toHaveURL(/.*admin-management/);
  });

  test('관리자 목록 조회', async ({ page }) => {
    // 테이블 또는 목록이 표시되는지 확인
    await expect(page.getByRole('table').or(page.locator('[data-testid="admin-list"]'))).toBeVisible();

    // 기존 관리자가 표시되는지 확인
    await expect(page.getByText('admin@parkgolf.com')).toBeVisible();
  });

  test('관리자 상세 조회', async ({ page }) => {
    // 첫 번째 관리자 클릭
    await page.getByText('admin@parkgolf.com').click();

    // 상세 정보가 표시되는지 확인
    await expect(page.getByText('시스템관리자').or(page.getByText('ADMIN'))).toBeVisible();
  });

  test('새 관리자 생성', async ({ page }) => {
    // 추가 버튼 클릭
    await page.getByRole('button', { name: /추가|생성|새.*관리자/ }).click();

    // 폼 입력
    await page.getByLabel(/이메일/).fill(testAdmin.email);
    await page.getByLabel(/이름/).fill(testAdmin.name);
    await page.getByLabel(/비밀번호/).first().fill(testAdmin.password);

    // 비밀번호 확인 필드가 있는 경우
    const confirmPassword = page.getByLabel(/비밀번호.*확인/);
    if (await confirmPassword.isVisible()) {
      await confirmPassword.fill(testAdmin.password);
    }

    // 역할 선택 (STAFF)
    await page.getByLabel(/역할/).selectOption({ label: /현장.*직원|STAFF/ });

    // 저장 버튼 클릭
    await page.getByRole('button', { name: /저장|생성|확인/ }).click();

    // 성공 메시지 또는 목록에 추가된 것 확인
    await expect(
      page.getByText(/성공|완료/).or(page.getByText(testAdmin.email))
    ).toBeVisible({ timeout: 10000 });
  });

  test('관리자 정보 수정', async ({ page }) => {
    // 수정할 관리자 찾기 (테스트용 또는 기존 관리자)
    const targetEmail = 'staff@gangnam-golf.com';

    // 해당 행의 수정 버튼 클릭
    const row = page.locator('tr', { has: page.getByText(targetEmail) });
    await row.getByRole('button', { name: /수정|편집/ }).click();

    // 부서 정보 수정
    const deptInput = page.getByLabel(/부서/);
    if (await deptInput.isVisible()) {
      await deptInput.fill('수정된 부서');
    }

    // 저장
    await page.getByRole('button', { name: /저장|수정|확인/ }).click();

    // 성공 확인
    await expect(page.getByText(/성공|완료|수정/)).toBeVisible({ timeout: 10000 });
  });

  test('관리자 역할 변경', async ({ page }) => {
    const targetEmail = 'staff@gangnam-golf.com';

    const row = page.locator('tr', { has: page.getByText(targetEmail) });
    await row.getByRole('button', { name: /수정|편집/ }).click();

    // 역할 변경
    await page.getByLabel(/역할/).selectOption({ label: /운영.*관리자|MANAGER/ });

    await page.getByRole('button', { name: /저장|수정|확인/ }).click();

    await expect(page.getByText(/성공|완료/)).toBeVisible({ timeout: 10000 });
  });

  test('관리자 삭제', async ({ page }) => {
    // 삭제할 관리자 (테스트로 생성된 관리자)
    // 먼저 테스트 관리자가 있는지 확인
    const testRow = page.locator('tr', { has: page.getByText(/e2e-test\.com/) });

    if (await testRow.count() > 0) {
      // 삭제 버튼 클릭
      await testRow.getByRole('button', { name: /삭제/ }).click();

      // 확인 다이얼로그
      await page.getByRole('button', { name: /확인|삭제|예/ }).click();

      // 삭제 확인
      await expect(page.getByText(/삭제.*완료|성공/)).toBeVisible({ timeout: 10000 });
    } else {
      // 테스트 관리자가 없으면 스킵
      test.skip();
    }
  });
});

test.describe('역할별 권한 테스트', () => {
  test('ADMIN은 관리자 관리 접근 가능', async ({ page }) => {
    // ADMIN으로 로그인된 상태 (setup에서 처리)
    await page.goto('/admin-management');
    await expect(page).toHaveURL(/.*admin-management/);
    await expect(page.getByRole('table').or(page.locator('[data-testid="admin-list"]'))).toBeVisible();
  });

  test('VIEWER는 수정/삭제 버튼 비활성화', async ({ browser }) => {
    // 새 컨텍스트로 VIEWER 로그인
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/login');
    await page.getByLabel('이메일').fill('viewer@parkgolf.com');
    await page.getByLabel('비밀번호').fill('admin123!@#');
    await page.getByRole('button', { name: '로그인' }).click();

    await page.goto('/admin-management');

    // 수정/삭제 버튼이 없거나 비활성화되어 있는지 확인
    const editButtons = page.getByRole('button', { name: /수정|편집/ });
    const deleteButtons = page.getByRole('button', { name: /삭제/ });

    // 버튼이 없거나 비활성화
    if (await editButtons.count() > 0) {
      await expect(editButtons.first()).toBeDisabled();
    }
    if (await deleteButtons.count() > 0) {
      await expect(deleteButtons.first()).toBeDisabled();
    }

    await context.close();
  });
});
