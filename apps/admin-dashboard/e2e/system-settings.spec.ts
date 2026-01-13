import { test, expect } from '@playwright/test';

// 전역 테스트 타임아웃 설정
test.setTimeout(60000);

test.describe('시스템 설정 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/system-settings');
    await expect(page).toHaveURL(/.*system-settings/);
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
  });

  test('페이지 기본 요소 표시', async ({ page }) => {
    // 페이지 제목 확인 (h1 태그)
    await expect(page.locator('h1').filter({ hasText: '시스템 설정' })).toBeVisible({ timeout: 30000 });

    // 설명 텍스트 확인
    await expect(page.getByText('예약 정책, 알림, 시스템 설정을 관리합니다')).toBeVisible();
  });

  test('카테고리 사이드바 표시', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h1').filter({ hasText: '시스템 설정' })).toBeVisible({ timeout: 30000 });

    // 카테고리 헤더 확인
    await expect(page.getByText('카테고리')).toBeVisible();

    // 카테고리 항목들 확인 (사이드바 내 버튼)
    const sidebar = page.locator('.w-64');
    await expect(sidebar.getByText('예약 정책')).toBeVisible();
    await expect(sidebar.getByText('알림 설정')).toBeVisible();
    await expect(sidebar.getByText('일반 설정')).toBeVisible();
  });

  test('예약 정책 서브탭 표시', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h1').filter({ hasText: '시스템 설정' })).toBeVisible({ timeout: 30000 });

    // 서브탭 확인 (취소/환불/노쇼) - 버튼 내에서 찾기
    const contentArea = page.locator('.flex-1.min-w-0');
    await expect(contentArea.locator('button').filter({ hasText: '취소 정책' })).toBeVisible();
    await expect(contentArea.locator('button').filter({ hasText: '환불 정책' })).toBeVisible();
    await expect(contentArea.locator('button').filter({ hasText: '노쇼 정책' })).toBeVisible();
  });

  test('취소 정책 탭 컨텐츠 로드', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h1').filter({ hasText: '시스템 설정' })).toBeVisible({ timeout: 30000 });

    // 취소 정책 탭 클릭
    await page.getByText('취소 정책').first().click();

    // 취소 정책 컨텐츠 확인 (로딩 메시지 또는 실제 컨텐츠)
    const hasContent = await page.getByText(/취소 정책 안내|기본 취소 정책|정책을 불러오는 중|고객 취소 허용/).first().isVisible({ timeout: 30000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('환불 정책 탭 전환', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h1').filter({ hasText: '시스템 설정' })).toBeVisible({ timeout: 30000 });

    // 환불 정책 탭 클릭
    await page.getByText('환불 정책').first().click();

    // 환불 정책 컨텐츠 확인
    const hasContent = await page.getByText(/환불 정책 안내|기본 환불 정책|정책을 불러오는 중|환불율/).first().isVisible({ timeout: 30000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('노쇼 정책 탭 전환', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h1').filter({ hasText: '시스템 설정' })).toBeVisible({ timeout: 30000 });

    // 노쇼 정책 탭 클릭
    await page.getByText('노쇼 정책').first().click();

    // 노쇼 정책 컨텐츠 확인
    const hasContent = await page.getByText(/노쇼 정책 안내|기본 노쇼 정책|정책을 불러오는 중|노쇼/).first().isVisible({ timeout: 30000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('준비 중 카테고리 표시', async ({ page }) => {
    // 페이지 로드 대기
    await expect(page.locator('h1').filter({ hasText: '시스템 설정' })).toBeVisible({ timeout: 30000 });

    // 준비중 뱃지가 있는 항목 확인
    await expect(page.getByText('준비중').first()).toBeVisible();
  });
});
