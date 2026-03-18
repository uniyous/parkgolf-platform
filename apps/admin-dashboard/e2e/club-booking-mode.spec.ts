import { test, expect, type Page } from '@playwright/test';

// 전역 테스트 타임아웃 설정
test.setTimeout(60000);

/**
 * 골프장 bookingMode E2E 테스트
 *
 * 가맹점 관리 워크플로우 개선으로 추가된 bookingMode(PLATFORM/PARTNER) 필드 검증
 *
 * 테스트 범위:
 * 1. 골프장 목록 - bookingMode 배지 표시
 * 2. 골프장 생성 - bookingMode 선택 UI
 * 3. 골프장 상세 - bookingMode 표시 및 수정
 */

// 가맹점 선택 (플랫폼 관리자일 경우)
async function selectCompanyIfNeeded(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const isCompanySelect = await page.getByText('지원할 가맹점을 선택하세요').isVisible().catch(() => false);
  if (isCompanySelect) {
    const companyButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    const hasButton = await companyButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (hasButton) {
      await companyButton.click();
      await page.waitForFunction(
        () => !document.body.textContent?.includes('지원할 가맹점을 선택하세요'),
        { timeout: 15000 },
      );
    }
  }

  const loadingDialog = page.locator('[role="dialog"][aria-label="로딩"]');
  await loadingDialog.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
}

// 페이지 로드 대기 헬퍼
async function waitForPageLoad(page: Page, timeout = 5000) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
  } catch {
    // 무시
  }
  await page.waitForTimeout(500);
}

// 권한 체크
async function checkAccess(page: Page): Promise<boolean> {
  const noAccess = await page.getByText('접근 권한이 없습니다').isVisible().catch(() => false);
  return !noAccess;
}

// 골프장 페이지로 이동 (가맹점 선택 포함)
async function navigateToClubs(page: Page) {
  await page.goto('/clubs');
  await selectCompanyIfNeeded(page);
  await waitForPageLoad(page);
}

// 골프장 생성 페이지로 이동 (가맹점 선택 후 이동)
async function navigateToClubCreate(page: Page) {
  // 먼저 대시보드로 이동하여 가맹점 선택
  await page.goto('/dashboard');
  await selectCompanyIfNeeded(page);
  await waitForPageLoad(page);

  // 가맹점 선택 완료 후 골프장 생성 페이지로 이동
  await page.goto('/clubs/new');
  await waitForPageLoad(page);

  // 가맹점 선택 화면이 다시 나타나면 한번 더 처리
  const isCompanySelect = await page.getByText('지원할 가맹점을 선택하세요').isVisible().catch(() => false);
  if (isCompanySelect) {
    await selectCompanyIfNeeded(page);
    await page.goto('/clubs/new');
    await waitForPageLoad(page);
  }
}

// ========================================
// 1. 골프장 목록 - bookingMode 배지 표시
// ========================================
test.describe('골프장 목록 - bookingMode 배지', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('1.1 골프장 카드에 bookingMode 배지가 표시된다', async ({ page }) => {
    await navigateToClubs(page);

    if (!await checkAccess(page)) {
      test.skip();
      return;
    }

    // 골프장 카드가 있는지 확인
    const clubCard = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('h3') }).first();
    const hasClubs = await clubCard.isVisible().catch(() => false);

    if (!hasClubs) {
      console.log('등록된 골프장이 없습니다. 스킵.');
      test.skip();
      return;
    }

    // bookingMode 배지 확인 (플랫폼 또는 파트너)
    const platformBadge = page.getByText('플랫폼').first();
    const partnerBadge = page.getByText('파트너').first();

    const hasPlatform = await platformBadge.isVisible().catch(() => false);
    const hasPartner = await partnerBadge.isVisible().catch(() => false);

    // 최소 하나의 배지가 보여야 함
    expect(hasPlatform || hasPartner).toBeTruthy();
    console.log(`bookingMode 배지 확인 - 플랫폼: ${hasPlatform}, 파트너: ${hasPartner}`);
  });

  test('1.2 모든 골프장 카드에 유형 배지가 있다', async ({ page }) => {
    await navigateToClubs(page);

    if (!await checkAccess(page)) {
      test.skip();
      return;
    }

    // 모든 골프장 카드
    const cards = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('h3') });
    const count = await cards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // 각 카드에 유형 배지(유료/무료)와 bookingMode 배지가 있는지 확인
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = cards.nth(i);
      const cardText = await card.textContent();

      // bookingMode 배지 (플랫폼 또는 파트너)
      const hasModeLabel = cardText?.includes('플랫폼') || cardText?.includes('파트너');
      expect(hasModeLabel).toBeTruthy();
    }
  });
});

// ========================================
// 2. 골프장 생성 - bookingMode 선택
// ========================================
test.describe('골프장 생성 - bookingMode 선택', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('2.1 생성 페이지에 예약 방식 선택이 있다', async ({ page }) => {
    await navigateToClubCreate(page);

    if (!await checkAccess(page)) {
      test.skip();
      return;
    }

    // 페이지 제목 확인
    await expect(page.getByRole('heading', { name: '골프장 추가' })).toBeVisible({ timeout: 10000 });

    // 예약 방식 라벨 확인
    await expect(page.getByText('예약 방식')).toBeVisible();

    // 예약 방식 select 확인
    const bookingModeSelect = page.locator('select').filter({ has: page.locator('option[value="PLATFORM"]') });
    await expect(bookingModeSelect).toBeVisible();

    // 기본값이 PLATFORM인지 확인
    await expect(bookingModeSelect).toHaveValue('PLATFORM');
  });

  test('2.2 예약 방식을 PARTNER로 변경할 수 있다', async ({ page }) => {
    await navigateToClubCreate(page);

    if (!await checkAccess(page)) {
      test.skip();
      return;
    }

    // 예약 방식 select 찾기
    const bookingModeSelect = page.locator('select').filter({ has: page.locator('option[value="PLATFORM"]') });
    await expect(bookingModeSelect).toBeVisible();

    // PARTNER 선택
    await bookingModeSelect.selectOption('PARTNER');
    await expect(bookingModeSelect).toHaveValue('PARTNER');

    // 다시 PLATFORM 선택
    await bookingModeSelect.selectOption('PLATFORM');
    await expect(bookingModeSelect).toHaveValue('PLATFORM');
  });

  test('2.3 예약 방식 옵션에 플랫폼과 파트너가 모두 있다', async ({ page }) => {
    await navigateToClubCreate(page);

    if (!await checkAccess(page)) {
      test.skip();
      return;
    }

    // PLATFORM 옵션
    await expect(page.locator('option[value="PLATFORM"]')).toBeAttached();

    // PARTNER 옵션
    await expect(page.locator('option[value="PARTNER"]')).toBeAttached();
  });
});

// ========================================
// 3. 골프장 상세 - bookingMode 표시/수정
// ========================================
test.describe('골프장 상세 - bookingMode 표시', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('3.1 상세 페이지에서 예약 방식 배지가 표시된다', async ({ page }) => {
    await navigateToClubs(page);

    if (!await checkAccess(page)) {
      test.skip();
      return;
    }

    // 첫 번째 골프장 카드 클릭
    const clubCard = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('h3') }).first();
    const hasClubs = await clubCard.isVisible().catch(() => false);

    if (!hasClubs) {
      test.skip();
      return;
    }

    await clubCard.click();
    await waitForPageLoad(page);

    // 상세 페이지 확인
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 기본정보 탭에서 예약 방식 확인
    const modeLabel = page.getByText('예약 방식');
    const hasLabel = await modeLabel.isVisible().catch(() => false);

    if (hasLabel) {
      // 배지 확인 (플랫폼 또는 파트너 연동)
      const modeBadge = page.getByText(/플랫폼|파트너 연동/).first();
      await expect(modeBadge).toBeVisible();
      console.log('예약 방식 배지 확인 완료');
    }
  });

  test('3.2 수정 모드에서 예약 방식을 변경할 수 있다', async ({ page }) => {
    await navigateToClubs(page);

    if (!await checkAccess(page)) {
      test.skip();
      return;
    }

    // 첫 번째 골프장 카드 클릭
    const clubCard = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('h3') }).first();
    const hasClubs = await clubCard.isVisible().catch(() => false);

    if (!hasClubs) {
      test.skip();
      return;
    }

    await clubCard.click();
    await waitForPageLoad(page);

    // 수정 버튼 클릭
    const editButton = page.getByRole('button', { name: /수정|편집/ });
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (!hasEdit) {
      console.log('수정 버튼이 없습니다. 권한 부족 가능.');
      test.skip();
      return;
    }

    await editButton.click();
    await page.waitForTimeout(500);

    // 수정 모드에서 예약 방식 select 확인
    const bookingModeSelect = page.locator('select').filter({ has: page.locator('option[value="PLATFORM"]') });
    const hasSelect = await bookingModeSelect.isVisible().catch(() => false);

    if (hasSelect) {
      const currentValue = await bookingModeSelect.inputValue();
      console.log(`현재 예약 방식: ${currentValue}`);

      // PARTNER로 변경
      await bookingModeSelect.selectOption('PARTNER');
      await expect(bookingModeSelect).toHaveValue('PARTNER');

      // 취소하여 원래 값 복원
      const cancelButton = page.getByRole('button', { name: /취소/ });
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
        console.log('변경 취소하여 원래 값 복원');
      }
    }
  });
});
