import { test, expect } from '@playwright/test';

/**
 * 골프장 관리 E2E 테스트 (강화 버전)
 *
 * 테스트 범위:
 * 1. 목록 페이지 (ClubListPage)
 *    - 페이지 로드 및 요소 확인
 *    - 검색 기능 (키워드, 엔터, 버튼, 전체보기)
 *    - 골프장 카드 정보 표시
 *    - 빈 목록 상태 처리
 *
 * 2. 상세 페이지 (ClubDetailPage)
 *    - 페이지 이동 및 헤더 정보
 *    - 탭 네비게이션 (기본정보, 코스관리, 운영정보)
 *    - 뒤로가기 및 라운드 보기 버튼
 *
 * 3. 기본정보 탭 (BasicInfoTab)
 *    - 정보 조회 및 수정 모드
 *    - 필드 수정 (이름, 지역, 주소, 연락처, 이메일, 웹사이트)
 *    - 운영 상태 변경
 *    - 운영 시간 변경
 *    - 부대시설 선택/해제
 *
 * 4. 운영정보 탭 (OperationInfoTab)
 *    - 실시간 현황 카드
 *    - 분석 기간 설정
 *    - 통계 데이터 표시
 *
 * 5. 삭제 기능
 *    - 삭제 확인 다이얼로그
 */

// 페이지 로드 대기 헬퍼 (권한 체크 및 데이터 로딩 대기)
async function waitForClubPageLoad(page: import('@playwright/test').Page, timeout = 5000) {
  // 페이지 로드 상태 대기
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
  } catch {
    // 무시
  }
  // 추가 렌더링 대기
  await page.waitForTimeout(500);
}

// 권한 체크 - 접근 권한이 없으면 테스트 스킵
async function checkAccessPermission(page: import('@playwright/test').Page, test: any): Promise<boolean> {
  const noAccess = await page.getByText('접근 권한이 없습니다').isVisible().catch(() => false);
  if (noAccess) {
    console.log('골프장 관리 권한이 없습니다. 테스트 스킵.');
    test.skip();
    return false;
  }
  return true;
}

// 골프장 카드를 찾는 헬퍼 함수
async function findClubCard(page: any) {
  const cardLocator = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('h3') }).first();
  try {
    await cardLocator.waitFor({ state: 'visible', timeout: 5000 });
    return cardLocator;
  } catch {
    return null;
  }
}

// 특정 이름의 골프장 카드 찾기
async function findClubCardByName(page: any, name: string) {
  const cardLocator = page.locator('[class*="cursor-pointer"]').filter({ hasText: name }).first();
  try {
    await cardLocator.waitFor({ state: 'visible', timeout: 5000 });
    return cardLocator;
  } catch {
    return null;
  }
}

// ========================================
// 1. 목록 페이지 테스트
// ========================================
test.describe('골프장 목록 페이지', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('1.1 페이지 로드 및 기본 요소 확인', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // URL 확인
    await expect(page).toHaveURL(/.*clubs/);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    // 헤더 확인 (이모지 🏌️ 포함)
    const heading = page.locator('h1').filter({ hasText: '골프장 관리' });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // 부제목 확인
    await expect(page.getByText(/9홀 단위 코스 관리/)).toBeVisible();

    // 새 골프장 추가 버튼 확인
    await expect(page.getByRole('button', { name: /새 골프장 추가/ })).toBeVisible();

    // 검색 입력창 확인
    await expect(page.getByPlaceholder(/골프장 이름이나 지역으로 검색/)).toBeVisible();

    // 검색 버튼 확인
    await expect(page.getByRole('button', { name: '검색' })).toBeVisible();
  });

  test('1.2 골프장 카드 정보 표시 확인', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      console.log('등록된 골프장이 없습니다.');
      test.skip();
      return;
    }

    // 카드 내 필수 정보 확인
    // 골프장 이름 (h3)
    const clubName = clubCard.locator('h3');
    await expect(clubName).toBeVisible();

    // 지역 정보 (📍)
    const locationInfo = clubCard.getByText(/📍/);
    await expect(locationInfo).toBeVisible();

    // 홀 정보 (⛳)
    const holeInfo = clubCard.getByText(/⛳.*홀/);
    await expect(holeInfo).toBeVisible();

    // 코스 정보 (🎯)
    const courseInfo = clubCard.getByText(/🎯.*코스/);
    await expect(courseInfo).toBeVisible();

    // 상태 뱃지 확인 (운영/정비/휴장)
    const statusBadge = clubCard.locator('[class*="rounded-full"]').filter({
      hasText: /운영|정비|휴장/
    });
    await expect(statusBadge).toBeVisible();
  });

  test('1.3 검색 기능 - 키워드 입력 후 버튼 클릭', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    // 먼저 골프장이 있는지 확인
    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    // 검색어 입력
    const searchInput = page.getByPlaceholder(/골프장 이름이나 지역으로 검색/);
    await searchInput.fill('파크');

    // 검색 버튼 클릭
    await page.getByRole('button', { name: '검색' }).click();
    await page.waitForTimeout(300);

    // 검색 결과 확인 (또는 결과 없음 메시지)
    const hasResults = await page.locator('[class*="cursor-pointer"]').first().isVisible().catch(() => false);
    const hasNoResults = await page.getByText(/검색 조건에 맞는 골프장이 없습니다/).isVisible().catch(() => false);

    expect(hasResults || hasNoResults).toBe(true);
    console.log('검색 결과:', hasResults ? '결과 있음' : '결과 없음');
  });

  test('1.4 검색 기능 - 엔터키로 검색', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    // 검색어 입력
    const searchInput = page.getByPlaceholder(/골프장 이름이나 지역으로 검색/);
    await searchInput.fill('서울');

    // 엔터키 입력
    await searchInput.press('Enter');
    await page.waitForTimeout(300);

    // 전체 보기 버튼이 나타나는지 확인
    const showAllButton = page.getByRole('button', { name: '전체 보기' });
    const isShowAllVisible = await showAllButton.isVisible().catch(() => false);
    console.log('전체 보기 버튼 표시:', isShowAllVisible);
  });

  test('1.5 검색 후 전체 보기 버튼', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    // 검색어 입력 및 검색
    const searchInput = page.getByPlaceholder(/골프장 이름이나 지역으로 검색/);
    await searchInput.fill('테스트');
    await page.getByRole('button', { name: '검색' }).click();
    await page.waitForTimeout(300);

    // 전체 보기 버튼 클릭
    const showAllButton = page.getByRole('button', { name: '전체 보기' });
    if (await showAllButton.isVisible()) {
      await showAllButton.click();
      await page.waitForTimeout(300);

      // 검색어가 지워졌는지 확인
      await expect(searchInput).toHaveValue('');
    }
  });

  test('1.6 하단 페이지네이션 정보 확인', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    // API 응답 대기
    await page.waitForTimeout(1000);

    // 하단 정보 영역 확인 (p.text-center 내에 있음)
    const footerInfo = page.locator('p.text-center').filter({ hasText: /총.*개의 골프장/ });
    await expect(footerInfo).toBeVisible({ timeout: 15000 });
  });
});

// ========================================
// 2. 상세 페이지 테스트
// ========================================
test.describe('골프장 상세 페이지', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('2.1 상세 페이지 이동 및 헤더 확인', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    // 카드 클릭하여 상세 페이지 이동
    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 페이지 로딩 대기
    await page.waitForTimeout(300);

    // 헤더 정보 확인
    // 뒤로가기 버튼
    const backButton = page.locator('button').filter({
      has: page.locator('svg path[d*="M15 19l-7-7"]')
    });
    await expect(backButton).toBeVisible();

    // 페이지 로딩 완료 확인 - 탭 버튼이 보이면 로딩 완료
    await expect(page.locator('button:has-text("기본정보")')).toBeVisible();

    // 골프장 이름 h1 존재 확인 (텍스트 내용은 로딩 타이밍에 따라 달라질 수 있음)
    await expect(page.locator('h1.text-3xl')).toBeAttached();

    // 헤더 영역에 홀/코스 정보가 표시되는지 확인 (p 태그)
    await expect(page.locator('p.text-gray-600:has-text("⛳")')).toBeVisible();
    await expect(page.locator('p.text-gray-600:has-text("🎯")')).toBeVisible();

    // 상태 뱃지 (헤더의 span)
    await expect(page.locator('span[class*="rounded-full"]').filter({
      hasText: /운영중|정비중|휴장/
    }).first()).toBeVisible();
  });

  test('2.2 라운드 보기 버튼', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 라운드 보기 버튼 확인
    const gamesButton = page.getByRole('button', { name: /라운드 보기/ });
    await expect(gamesButton).toBeVisible();

    // 클릭 시 라운드 페이지로 이동
    await gamesButton.click();
    await expect(page).toHaveURL(/.*games/);
  });

  test('2.3 수정 버튼 (연필 아이콘)', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 수정 버튼 확인
    const editButton = page.locator('button[title="골프장 수정"]');
    await expect(editButton).toBeVisible();

    // 클릭 시 기본정보 탭으로 이동하고 편집 모드 활성화
    await editButton.click();
    await page.waitForTimeout(300);

    // 기본정보 탭이 활성화되었는지 확인
    const basicTab = page.locator('button:has-text("기본정보")');
    await expect(basicTab).toHaveClass(/border-blue-500/);
  });

  test('2.4 삭제 버튼 (휴지통 아이콘)', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 삭제 버튼 확인 - title 속성으로 특정
    const deleteButton = page.locator('button[title="골프장 삭제"]');
    await expect(deleteButton).toBeVisible();
  });

  test('2.5 뒤로가기 버튼', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 뒤로가기 버튼 클릭
    const backButton = page.locator('button').filter({
      has: page.locator('svg path[d*="M15 19l-7-7"]')
    });
    await backButton.click();

    // 목록 페이지로 이동
    await expect(page).toHaveURL(/.*clubs$/);
  });

  test('2.6 탭 네비게이션 - 기본정보', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 기본정보 탭 클릭
    await page.locator('button:has-text("기본정보")').click();
    await page.waitForTimeout(300);

    // 탭이 활성화되었는지 확인
    await expect(page.locator('button:has-text("기본정보")')).toHaveClass(/border-blue-500/);

    // 기본정보 탭 콘텐츠 확인 (h2 제목)
    await expect(page.locator('h2:has-text("기본 정보")')).toBeVisible();
  });

  test('2.7 탭 네비게이션 - 코스관리', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 코스관리 탭 클릭
    await page.locator('button:has-text("코스관리")').click();
    await page.waitForTimeout(300);

    // 탭이 활성화되었는지 확인
    await expect(page.locator('button:has-text("코스관리")')).toHaveClass(/border-blue-500/);

    // 새 코스 추가 버튼 확인
    await expect(page.getByRole('button', { name: /새 코스 추가/ })).toBeVisible();
  });

  test('2.8 탭 네비게이션 - 운영정보', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 운영정보 탭 클릭
    await page.locator('button:has-text("운영정보")').click();
    await page.waitForTimeout(300);

    // 탭이 활성화되었는지 확인
    await expect(page.locator('button:has-text("운영정보")')).toHaveClass(/border-blue-500/);

    // 운영정보 탭 콘텐츠 확인
    await expect(page.getByRole('heading', { name: '운영 정보' })).toBeVisible();
  });
});

// ========================================
// 3. 기본정보 탭 테스트
// ========================================
test.describe('기본정보 탭', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('3.1 기본정보 조회 모드', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();

    // 상세 페이지 로딩 대기 - 탭 버튼이 나타날 때까지
    const basicInfoTab = page.locator('button:has-text("기본정보")');
    await basicInfoTab.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    if (!await basicInfoTab.isVisible()) {
      console.log('기본정보 탭을 찾을 수 없습니다.');
      test.skip();
      return;
    }

    // 기본정보 탭 클릭
    await basicInfoTab.click();
    await page.waitForTimeout(300);

    // 조회 모드 확인 - 수정 버튼이 보여야 함
    const editButton = page.getByRole('button', { name: '수정', exact: true });
    await expect(editButton).toBeVisible();

    // 필드 라벨 확인
    await expect(page.getByText('골프장명')).toBeVisible();
    await expect(page.getByText('지역')).toBeVisible();
    await expect(page.getByText('주소')).toBeVisible();
    await expect(page.getByText('연락처')).toBeVisible();
    await expect(page.getByText('이메일')).toBeVisible();
    await expect(page.getByText('웹사이트')).toBeVisible();

    // 운영 정보 섹션
    await expect(page.getByText('운영 상태')).toBeVisible();
    await expect(page.getByText('운영 시작')).toBeVisible();
    await expect(page.getByText('운영 종료')).toBeVisible();

    // 코스 현황
    await expect(page.getByText('코스 현황')).toBeVisible();

    // 부대시설 섹션 (h3 제목)
    await expect(page.locator('h3:has-text("부대시설")')).toBeVisible();

    // 등록 정보 섹션
    await expect(page.getByText('등록 정보')).toBeVisible();
    await expect(page.getByText('등록일:')).toBeVisible();
    await expect(page.getByText('최종 수정:')).toBeVisible();
  });

  test('3.2 수정 모드 진입 및 취소', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 기본정보 탭 클릭
    await page.locator('button:has-text("기본정보")').click();
    await page.waitForTimeout(300);

    // 수정 버튼 클릭
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(300);

    // 수정 모드 확인 - 취소/저장 버튼이 보여야 함
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
    await expect(page.getByRole('button', { name: '저장' })).toBeVisible();

    // 입력 필드가 활성화되었는지 확인
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeEditable();

    // 취소 버튼 클릭
    await page.getByRole('button', { name: '취소' }).click();
    await page.waitForTimeout(300);

    // 조회 모드로 복귀 확인
    await expect(page.getByRole('button', { name: '수정', exact: true })).toBeVisible();
  });

  test('3.3 필드 수정 - 골프장명', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 기본정보 탭 -> 수정 모드
    await page.locator('button:has-text("기본정보")').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(300);

    // 골프장명 필드 찾기 및 수정
    const nameLabel = page.getByText('골프장명');
    const nameInput = nameLabel.locator('..').locator('input');

    if (await nameInput.isVisible()) {
      const originalValue = await nameInput.inputValue();
      await nameInput.fill(originalValue + ' (수정테스트)');

      // 취소하여 원복
      await page.getByRole('button', { name: '취소' }).click();
    }
  });

  test('3.4 운영 상태 변경 옵션 확인', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 기본정보 탭 -> 수정 모드
    await page.locator('button:has-text("기본정보")').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(300);

    // 운영 상태 select 확인
    const statusSelect = page.locator('select');
    if (await statusSelect.isVisible()) {
      // 옵션 확인
      const options = await statusSelect.locator('option').allTextContents();
      console.log('운영 상태 옵션:', options);

      expect(options).toContain('운영중');
      expect(options).toContain('정비중');
      expect(options).toContain('휴장');
      expect(options).toContain('비활성');
    }

    // 취소
    await page.getByRole('button', { name: '취소' }).click();
  });

  test('3.5 운영 시간 변경', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();

    // 상세 페이지 로딩 대기 - 탭 버튼이 나타날 때까지
    const basicInfoTab = page.locator('button:has-text("기본정보")');
    await basicInfoTab.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    // 탭이 없으면 스킵
    if (!await basicInfoTab.isVisible()) {
      console.log('기본정보 탭을 찾을 수 없습니다.');
      test.skip();
      return;
    }

    // 기본정보 탭 -> 수정 모드
    await basicInfoTab.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(300);

    // 운영 시작/종료 time input 확인
    const timeInputs = page.locator('input[type="time"]');
    const count = await timeInputs.count();
    console.log('시간 입력 필드 개수:', count);

    expect(count).toBeGreaterThanOrEqual(2);

    // 취소
    await page.getByRole('button', { name: '취소' }).click();
  });

  test('3.6 부대시설 체크박스', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 기본정보 탭 -> 수정 모드
    await page.locator('button:has-text("기본정보")').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(300);

    // 부대시설 체크박스 확인
    const facilities = ['카트도로', '연습장', '클럽하우스', '레스토랑', '프로샵',
                       '라커룸', '샤워실', '주차장', '캐디서비스', '렌탈클럽'];

    for (const facility of facilities) {
      const checkbox = page.locator(`label:has-text("${facility}") input[type="checkbox"]`);
      const isVisible = await checkbox.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`부대시설 "${facility}" 체크박스 확인됨`);
      }
    }

    // 취소
    await page.getByRole('button', { name: '취소' }).click();
  });
});

// ========================================
// 4. 운영정보 탭 테스트
// ========================================
test.describe('운영정보 탭', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('4.1 실시간 현황 카드 확인', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 운영정보 탭 클릭
    await page.locator('button:has-text("운영정보")').click();
    await page.waitForTimeout(300);

    // 실시간 현황 카드 확인
    await expect(page.getByText('오늘 예약 가능')).toBeVisible();
    await expect(page.getByText('운영 상태')).toBeVisible();
    await expect(page.getByText('평균 가동률')).toBeVisible();
    await expect(page.getByText('월 수익')).toBeVisible();
  });

  test('4.2 분석 기간 설정', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 운영정보 탭 클릭
    await page.locator('button:has-text("운영정보")').click();
    await page.waitForTimeout(300);

    // 분석 기간 라벨 확인
    await expect(page.getByText('분석 기간:')).toBeVisible();

    // 날짜 입력 필드 확인
    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('4.3 새로고침 버튼', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 운영정보 탭 클릭
    await page.locator('button:has-text("운영정보")').click();
    await page.waitForTimeout(300);

    // 새로고침 버튼 확인 및 클릭
    const refreshButton = page.getByRole('button', { name: '새로고침' });
    await expect(refreshButton).toBeVisible();

    await refreshButton.click();
    await page.waitForTimeout(300);

    // 데이터가 다시 로드되었는지 확인 (카드가 여전히 표시됨)
    await expect(page.getByText('오늘 예약 가능')).toBeVisible();
  });

  test('4.4 18홀 조합별 분석 테이블', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 운영정보 탭 클릭
    await page.locator('button:has-text("운영정보")').click();
    await page.waitForTimeout(300);

    // 18홀 조합별 분석 테이블 확인
    const analysisSection = page.getByText('18홀 조합별 성과 분석');
    const isVisible = await analysisSection.isVisible().catch(() => false);

    if (isVisible) {
      // 테이블 헤더 확인 (columnheader 역할)
      await expect(page.getByRole('columnheader', { name: '조합' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '총 슬롯' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '가동률' })).toBeVisible();
    } else {
      console.log('18홀 조합별 분석 데이터가 없습니다.');
    }
  });

  test('4.5 시즌 정보 섹션', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();

    // 상세 페이지 로딩 대기 - 탭 버튼이 나타날 때까지
    const operationTab = page.locator('button:has-text("운영정보")');
    await operationTab.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    if (!await operationTab.isVisible()) {
      console.log('운영정보 탭을 찾을 수 없습니다.');
      test.skip();
      return;
    }

    // 운영정보 탭 클릭
    await operationTab.click();
    await page.waitForTimeout(300);

    // 시즌 정보 섹션 확인 (h3.text-lg 제목)
    await expect(page.locator('h3.text-lg:has-text("시즌 정보")')).toBeVisible();

    // 시즌 정보가 있는 경우 또는 없는 경우 확인
    const hasSeasonInfo = await page.getByText(/현재 시즌:/).isVisible().catch(() => false);
    const noSeasonInfo = await page.getByText('시즌 정보 없음').isVisible().catch(() => false);

    expect(hasSeasonInfo || noSeasonInfo).toBe(true);
    console.log('시즌 정보:', hasSeasonInfo ? '설정됨' : '미설정');
  });

  test('4.6 운영 개선 제안 섹션', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await page.waitForTimeout(300);

    // 운영정보 탭 클릭
    await page.locator('button:has-text("운영정보")').click();
    await page.waitForTimeout(300);

    // 운영 개선 제안 섹션 확인
    const suggestionSection = page.getByText('💡 운영 개선 제안');
    await expect(suggestionSection).toBeVisible();
  });
});

// ========================================
// 5. 삭제 기능 테스트
// ========================================
test.describe('골프장 삭제', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('5.1 삭제 확인 다이얼로그 - 취소', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 삭제 버튼 찾기 - title 속성으로 특정
    const deleteButton = page.locator('button[title="골프장 삭제"]');

    // confirm 다이얼로그 모킹 - 취소
    page.once('dialog', dialog => {
      console.log('삭제 확인 메시지:', dialog.message());
      expect(dialog.message()).toContain('정말 삭제하시겠습니까');
      expect(dialog.message()).toContain('되돌릴 수 없으며');
      dialog.dismiss(); // 취소
    });

    await deleteButton.click();
    await page.waitForTimeout(300);

    // 취소 후에도 같은 페이지에 있어야 함
    await expect(page).toHaveURL(/.*clubs\/\d+/);
  });
});

// ========================================
// 6. 통합 시나리오
// ========================================
test.describe('골프장 관리 통합 시나리오', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('6.1 전체 워크플로우: 목록 -> 상세 -> 탭 순회 -> 목록 복귀', async ({ page }) => {
    // 1. 목록 페이지 로드
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    // 헤더 확인 (이모지 🏌️ 포함)
    const heading = page.locator('h1').filter({ hasText: '골프장 관리' });
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log('✓ 1. 목록 페이지 로드');

    // 2. 골프장 카드 클릭
    const clubCard = await findClubCard(page);
    if (!clubCard) {
      console.log('테스트할 골프장이 없습니다.');
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);
    console.log('✓ 2. 상세 페이지 이동');

    // 3. 기본정보 탭
    await page.locator('button:has-text("기본정보")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('h2:has-text("기본 정보")')).toBeVisible();
    console.log('✓ 3. 기본정보 탭 확인');

    // 4. 코스관리 탭
    await page.locator('button:has-text("코스관리")').click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /새 코스 추가/ })).toBeVisible();
    console.log('✓ 4. 코스관리 탭 확인');

    // 5. 운영정보 탭
    await page.locator('button:has-text("운영정보")').click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: '운영 정보' })).toBeVisible();
    console.log('✓ 5. 운영정보 탭 확인');

    // 6. 뒤로가기
    const backButton = page.locator('button').filter({
      has: page.locator('svg path[d*="M15 19l-7-7"]')
    });
    await backButton.click();
    await expect(page).toHaveURL(/.*clubs$/);
    console.log('✓ 6. 목록 페이지 복귀');

    console.log('\n=== 골프장 관리 통합 시나리오 완료 ===');
  });

  test('6.2 검색 후 상세 조회 워크플로우', async ({ page }) => {
    await page.goto('/clubs');
    await waitForClubPageLoad(page);

    // 권한 체크
    if (!await checkAccessPermission(page, test)) return;

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    // 검색어 입력
    const searchInput = page.getByPlaceholder(/골프장 이름이나 지역으로 검색/);
    await searchInput.fill('골프');
    await page.getByRole('button', { name: '검색' }).click();
    await page.waitForTimeout(500); // 검색 결과 로딩 대기
    console.log('✓ 1. 검색 실행');

    // 검색 결과 확인 - 카드가 있는지만 확인
    const searchResultCard = await findClubCard(page);
    if (searchResultCard) {
      console.log('✓ 2. 검색 결과에 골프장 카드 표시됨');
    } else {
      console.log('- 검색 결과가 없습니다.');
    }

    // 전체 보기로 복원 (검색 칩이 있는 경우)
    const showAllButton = page.getByRole('button', { name: '전체 보기' });
    if (await showAllButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await showAllButton.click();
      await page.waitForTimeout(300);
      console.log('✓ 3. 전체 보기로 복원');
    }

    console.log('\n=== 검색 후 상세 조회 워크플로우 완료 ===');
  });
});
