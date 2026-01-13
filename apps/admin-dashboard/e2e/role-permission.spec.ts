import { test, expect } from '@playwright/test';

// 전역 테스트 타임아웃 설정
test.setTimeout(60000);

test.describe('역할 및 권한 관리 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roles');
    await expect(page).toHaveURL(/.*roles/);
    // 페이지 로딩 대기 (로딩 상태 또는 실제 컨텐츠)
    await page.waitForLoadState('networkidle');
  });

  test('페이지 기본 요소 표시', async ({ page }) => {
    // 페이지 제목 확인 (h2 태그) - 로딩 완료 후
    await expect(page.locator('h2').filter({ hasText: '역할 및 권한' })).toBeVisible({ timeout: 30000 });

    // 설명 텍스트 확인
    await expect(page.getByText('시스템에 정의된 역할과 각 역할별 권한을 확인합니다')).toBeVisible();
  });

  test('통계 카드 표시', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h2').filter({ hasText: '역할 및 권한' })).toBeVisible({ timeout: 30000 });

    // 통계 카드들 확인 - 플랫폼 역할과 회사 역할 텍스트
    await expect(page.getByText('플랫폼 역할').first()).toBeVisible();
    await expect(page.getByText('회사 역할').first()).toBeVisible();
  });

  test('플랫폼/회사 역할 섹션 표시', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h2').filter({ hasText: '역할 및 권한' })).toBeVisible({ timeout: 30000 });

    // 플랫폼 역할 섹션 확인 (h3 태그)
    await expect(page.locator('h3').filter({ hasText: '플랫폼 역할' })).toBeVisible();

    // 회사 역할 섹션 확인 (h3 태그)
    await expect(page.locator('h3').filter({ hasText: '회사 역할' })).toBeVisible();
  });

  test('역할별 권한 매트릭스 테이블 표시', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h2').filter({ hasText: '역할 및 권한' })).toBeVisible({ timeout: 30000 });

    // 매트릭스 테이블 헤더 확인 (h3 태그)
    await expect(page.locator('h3').filter({ hasText: '역할별 권한 매트릭스' })).toBeVisible();

    // 테이블이 존재하는지 확인
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('관리자 역할 할당 버튼 표시', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h2').filter({ hasText: '역할 및 권한' })).toBeVisible({ timeout: 30000 });

    // 관리자 역할 할당 버튼 확인
    await expect(page.getByRole('button', { name: /관리자 역할 할당/ })).toBeVisible();
  });

  test('안내 메시지 표시', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h2').filter({ hasText: '역할 및 권한' })).toBeVisible({ timeout: 30000 });

    // 역할 기반 권한 관리 안내 메시지 확인 (h3 태그)
    await expect(page.locator('h3').filter({ hasText: '역할 기반 권한 관리' })).toBeVisible();
  });
});
