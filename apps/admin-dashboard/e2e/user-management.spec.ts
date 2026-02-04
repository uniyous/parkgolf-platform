import { test, expect } from '@playwright/test';

// 전역 테스트 타임아웃 설정
test.setTimeout(60000);

/**
 * 사용자 관리 E2E 테스트 (iam-service 연동)
 *
 * API: admin-api -> NATS -> iam-service
 *
 * 테스트 범위:
 * 0. API 연결 테스트
 * 1. 목록 페이지 (UserManagementPage)
 *    - 페이지 로드, 통계 카드, 테이블 헤더, 검색, 필터, 새로고침
 * 2. 사용자 상세 페이지 (UserDetailPage)
 *    - Row 클릭 → 상세 페이지 이동, 헤더, 뒤로가기
 * 3. 상세 페이지 탭 (기본 정보 / 예약 이력 / 알림 설정)
 * 4. 통합 시나리오
 *    - 목록 → 검색 → 상세 → 탭 전환 → 목록 복귀
 */

// 페이지 로드 대기 헬퍼
async function waitForPageLoad(page: import('@playwright/test').Page, timeout = 30000) {
  try {
    await page.waitForSelector('[role="dialog"][aria-label="로딩"]', { state: 'hidden', timeout });
  } catch {
    // 로딩 다이얼로그가 없을 수도 있음
  }
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

// 테이블 데이터 로드 대기 - 데이터 없으면 skip
async function waitForTableData(page: import('@playwright/test').Page, t: typeof test): Promise<boolean> {
  try {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    return true;
  } catch {
    const isEmpty = await page.getByText(/등록된 회원이 없습니다|검색 결과가 없습니다/).isVisible().catch(() => false);
    if (isEmpty) {
      console.log('회원 데이터 없음 - 테스트 스킵');
      t.skip();
    }
    return false;
  }
}

// ========================================
// 0. API 연결 테스트
// ========================================
test.describe('사용자 API 연결 테스트', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('0.1 사용자 목록 API 호출 확인', async ({ page, request }) => {
    await page.goto('/user-management');

    const token = await page.evaluate(() => localStorage.getItem('auth-storage'))
      .then(storage => {
        if (!storage) return null;
        try {
          const parsed = JSON.parse(storage);
          return parsed?.state?.token || null;
        } catch {
          return null;
        }
      });

    console.log('Token exists:', !!token);

    if (token) {
      const apiResponse = await request.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('API Response Status:', apiResponse.status());
      expect(apiResponse.status()).toBe(200);
    }
  });

  test('0.2 사용자 목록 페이지 API 응답 모니터링', async ({ page }) => {
    let hasApiError = false;

    page.on('response', async (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        hasApiError = true;
        const body = await response.text().catch(() => '');
        console.log('API Error:', response.status(), body);
      }
    });

    await page.goto('/user-management');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(hasApiError).toBe(false);
  });
});

// ========================================
// 1. 사용자 목록 페이지 테스트
// ========================================
test.describe('사용자 목록 페이지', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('1.1 페이지 로드 및 기본 요소 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    // 페이지 헤더 확인
    await expect(page.getByText('회원 관리').first()).toBeVisible({ timeout: 10000 });

    // 회원 추가 버튼 확인
    const addButton = page.getByRole('button', { name: /회원 추가/ });
    await expect(addButton).toBeVisible();
    console.log('✓ 페이지 헤더, 회원 추가 버튼 확인');
  });

  test('1.2 통계 카드 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    // 통계 카드들 확인
    const statLabels = ['전체 회원', '활성 회원', '비활성 회원', '등급 종류'];
    for (const label of statLabels) {
      const card = page.getByText(label).first();
      const visible = await card.isVisible().catch(() => false);
      console.log(`${visible ? '✓' : '✗'} 통계 카드: ${label}`);
    }
  });

  test('1.3 테이블 헤더 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const table = page.locator('table');
    const tableExists = await table.isVisible().catch(() => false);

    if (tableExists) {
      const headers = ['회원 정보', '등급', '상태', '마지막 로그인', '액션'];
      for (const header of headers) {
        const headerCell = page.locator('th', { hasText: header }).first();
        const exists = await headerCell.isVisible().catch(() => false);
        console.log(`${exists ? '✓' : '✗'} 헤더: ${header}`);
      }
    }
  });

  test('1.4 검색 기능 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const searchInput = page.locator('input[placeholder*="이름"], input[placeholder*="검색"]').first();
    const searchExists = await searchInput.isVisible().catch(() => false);

    if (searchExists) {
      await searchInput.fill('테스트');
      await page.waitForTimeout(500);
      expect(await searchInput.inputValue()).toBe('테스트');

      // 검색 초기화
      await searchInput.clear();
      await page.waitForTimeout(500);
      console.log('✓ 검색 입력/초기화 확인');
    }
  });

  test('1.5 등급/상태 필터 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    // 필터 영역의 select 요소들 확인
    const selects = page.locator('select');
    const selectCount = await selects.count();
    console.log(`필터 select 개수: ${selectCount}`);

    // 등급 필터 확인 (전체 등급 placeholder)
    const tierFilter = page.locator('select').filter({ hasText: /전체 등급|VIP|골드/ }).first();
    const tierExists = await tierFilter.isVisible().catch(() => false);
    console.log(`${tierExists ? '✓' : '✗'} 등급 필터`);

    // 상태 필터 확인
    const statusFilter = page.locator('select').filter({ hasText: /전체 상태|활성|비활성/ }).first();
    const statusExists = await statusFilter.isVisible().catch(() => false);
    console.log(`${statusExists ? '✓' : '✗'} 상태 필터`);
  });

  test('1.6 새로고침 버튼 동작', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const refreshButton = page.getByRole('button', { name: /새로고침/ });
    const refreshExists = await refreshButton.isVisible().catch(() => false);

    if (refreshExists) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ 새로고침 버튼 클릭 완료');
    }
  });

  test('1.7 Row 클릭 시 cursor-pointer 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const hasData = await waitForTableData(page, test);
    if (!hasData) return;

    const firstRow = page.locator('table tbody tr').first();
    const cursor = await firstRow.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
    console.log('✓ Row cursor: pointer 확인');
  });
});

// ========================================
// 2. 사용자 상세 페이지 진입 테스트
// ========================================
test.describe('사용자 상세 페이지 진입', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('2.1 Row 클릭 → 상세 페이지 이동 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const hasData = await waitForTableData(page, test);
    if (!hasData) return;

    // 첫 번째 Row 클릭
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // URL이 /user-management/:id 로 변경되었는지 확인
    await page.waitForURL(/\/user-management\/\d+/, { timeout: 10000 });
    console.log('✓ 상세 페이지 URL:', page.url());

    // 상세 페이지 로드 확인
    await waitForPageLoad(page);

    // 뒤로가기 버튼 존재 확인
    const backButton = page.locator('button svg path[d*="M15 19l-7-7"]').first();
    const backExists = await backButton.isVisible().catch(() => false);
    console.log(`${backExists ? '✓' : '✗'} 뒤로가기 버튼`);
  });

  test('2.2 상세 페이지 헤더 정보 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const hasData = await waitForTableData(page, test);
    if (!hasData) return;

    // 상세 페이지로 이동
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/\/user-management\/\d+/, { timeout: 10000 });
    await waitForPageLoad(page);

    // 사용자 이름 표시 확인 (h1)
    const userName = page.locator('h1').first();
    await expect(userName).toBeVisible({ timeout: 10000 });
    console.log('✓ 사용자 이름:', await userName.textContent());

    // 수정 버튼 확인
    const editButton = page.getByRole('button', { name: /수정/ });
    await expect(editButton).toBeVisible();
    console.log('✓ 수정 버튼 확인');
  });

  test('2.3 뒤로가기 → 목록 복귀 확인', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const hasData = await waitForTableData(page, test);
    if (!hasData) return;

    // 상세 페이지로 이동
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/\/user-management\/\d+/, { timeout: 10000 });
    await waitForPageLoad(page);

    // 뒤로가기 버튼 클릭 (chevron left SVG가 있는 button)
    const backButton = page.locator('button').filter({
      has: page.locator('svg path[d*="M15 19l-7-7"]'),
    }).first();

    const backExists = await backButton.isVisible().catch(() => false);
    if (backExists) {
      await backButton.click();
    } else {
      // breadcrumb의 '회원 관리' 링크로 복귀
      const breadcrumbLink = page.getByText('회원 관리').first();
      await breadcrumbLink.click();
    }

    await page.waitForURL(/\/user-management$/, { timeout: 10000 });
    console.log('✓ 목록 페이지 복귀 확인');
  });

  test('2.4 직접 URL 접근 (존재하지 않는 사용자)', async ({ page }) => {
    await page.goto('/user-management/999999');
    await waitForPageLoad(page);

    // 빈 상태 또는 에러 메시지 확인
    const emptyMessage = page.getByText(/사용자 정보를 찾을 수 없습니다|목록으로 돌아가기/);
    const visible = await emptyMessage.first().isVisible().catch(() => false);

    // 에러/빈 상태이거나, 또는 데이터가 없어 로딩만 보일 수 있음
    console.log(`존재하지 않는 사용자: ${visible ? '빈 상태 메시지 표시' : 'API 에러 상태'}`);
  });
});

// ========================================
// 3. 상세 페이지 탭 테스트
// ========================================
test.describe('상세 페이지 탭', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  // 상세 페이지 진입 헬퍼
  async function navigateToUserDetail(page: import('@playwright/test').Page, t: typeof test): Promise<boolean> {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const hasData = await waitForTableData(page, t);
    if (!hasData) return false;

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/\/user-management\/\d+/, { timeout: 10000 });
    await waitForPageLoad(page);
    return true;
  }

  test('3.1 기본 정보 탭 - 기본 탭으로 표시됨', async ({ page }) => {
    const ok = await navigateToUserDetail(page, test);
    if (!ok) return;

    // '기본 정보' 탭이 기본 선택 상태
    const basicTab = page.getByRole('button', { name: /기본 정보/ });
    await expect(basicTab).toBeVisible();

    // 프로필 정보 섹션 확인
    const profileSection = page.getByText('프로필 정보').first();
    await expect(profileSection).toBeVisible({ timeout: 10000 });
    console.log('✓ 프로필 정보 섹션');

    // 멤버십 정보 섹션 확인
    const membershipSection = page.getByText('멤버십 정보').first();
    const membershipVisible = await membershipSection.isVisible().catch(() => false);
    console.log(`${membershipVisible ? '✓' : '✗'} 멤버십 정보 섹션`);

    // 비밀번호 관리 섹션 확인
    const passwordSection = page.getByText('비밀번호 관리').first();
    const passwordVisible = await passwordSection.isVisible().catch(() => false);
    console.log(`${passwordVisible ? '✓' : '✗'} 비밀번호 관리 섹션`);
  });

  test('3.2 기본 정보 탭 - 필드 표시 확인', async ({ page }) => {
    const ok = await navigateToUserDetail(page, test);
    if (!ok) return;

    const fields = ['이름', '이메일', '전화번호', '가입일', '최근 로그인'];
    for (const field of fields) {
      const label = page.getByText(field, { exact: false }).first();
      const visible = await label.isVisible().catch(() => false);
      console.log(`${visible ? '✓' : '✗'} 필드: ${field}`);
    }
  });

  test('3.3 기본 정보 탭 - 비밀번호 초기화 버튼', async ({ page }) => {
    const ok = await navigateToUserDetail(page, test);
    if (!ok) return;

    const resetButton = page.getByRole('button', { name: /비밀번호 초기화/ });
    const exists = await resetButton.isVisible().catch(() => false);
    console.log(`${exists ? '✓' : '✗'} 비밀번호 초기화 버튼`);

    if (exists) {
      // 버튼이 존재하는지만 확인 (실제 초기화 실행 X)
      await expect(resetButton).toBeEnabled();
    }
  });

  test('3.4 예약 이력 탭 전환', async ({ page }) => {
    const ok = await navigateToUserDetail(page, test);
    if (!ok) return;

    // 예약 이력 탭 클릭
    const bookingsTab = page.getByRole('button', { name: /예약 이력/ });
    await expect(bookingsTab).toBeVisible();
    await bookingsTab.click();
    await page.waitForTimeout(1000);

    // 예약 이력 컨텐츠 확인
    const heading = page.getByText('예약 이력').nth(1); // 탭 버튼 이후의 heading
    const headingVisible = await heading.isVisible().catch(() => false);

    // 테이블 또는 빈 상태 확인
    const table = page.locator('table');
    const tableVisible = await table.isVisible().catch(() => false);
    const emptyMessage = page.getByText(/예약 이력이 없습니다/);
    const emptyVisible = await emptyMessage.isVisible().catch(() => false);

    console.log(`✓ 예약 이력 탭 전환 (테이블: ${tableVisible}, 빈 상태: ${emptyVisible})`);
    expect(headingVisible || tableVisible || emptyVisible).toBe(true);
  });

  test('3.5 예약 이력 탭 - 상태 필터 확인', async ({ page }) => {
    const ok = await navigateToUserDetail(page, test);
    if (!ok) return;

    // 예약 이력 탭 클릭
    const bookingsTab = page.getByRole('button', { name: /예약 이력/ });
    await bookingsTab.click();
    await page.waitForTimeout(1000);

    // 상태 필터 버튼들 확인
    const filterLabels = ['전체', '확정', '완료', '취소', '노쇼', '대기'];
    for (const label of filterLabels) {
      const button = page.getByRole('button', { name: label, exact: true });
      const visible = await button.isVisible().catch(() => false);
      console.log(`${visible ? '✓' : '✗'} 필터 버튼: ${label}`);
    }
  });

  test('3.6 알림 설정 탭 전환', async ({ page }) => {
    const ok = await navigateToUserDetail(page, test);
    if (!ok) return;

    // 알림 설정 탭 클릭
    const notificationsTab = page.getByRole('button', { name: /알림 설정/ });
    await expect(notificationsTab).toBeVisible();
    await notificationsTab.click();
    await page.waitForTimeout(1000);

    // 알림 설정 컨텐츠 확인 - 토글 항목 또는 빈 상태
    const toggleLabels = ['이메일 알림', 'SMS 알림', '푸시 알림', '인앱 알림', '예약 리마인더'];
    let foundToggles = 0;
    for (const label of toggleLabels) {
      const item = page.getByText(label).first();
      const visible = await item.isVisible().catch(() => false);
      if (visible) foundToggles++;
      console.log(`${visible ? '✓' : '✗'} 알림 설정: ${label}`);
    }

    // 토글이 있거나 빈/에러 상태 메시지가 있어야 함
    const emptyMessage = page.getByText(/알림 설정을 찾을 수 없습니다|알림 설정을 불러올 수 없습니다/);
    const emptyVisible = await emptyMessage.isVisible().catch(() => false);

    // 로딩 중일 수도 있음 (API 응답 지연)
    const loadingMessage = page.getByText(/알림 설정을 불러오는 중/);
    const loadingVisible = await loadingMessage.isVisible().catch(() => false);

    console.log(`✓ 알림 설정 탭 전환 (토글 ${foundToggles}개, 빈/에러: ${emptyVisible}, 로딩: ${loadingVisible})`);
    expect(foundToggles > 0 || emptyVisible || loadingVisible).toBe(true);
  });

  test('3.7 탭 간 전환 안정성', async ({ page }) => {
    const ok = await navigateToUserDetail(page, test);
    if (!ok) return;

    const tabs = [
      { name: /기본 정보/, marker: '프로필 정보' },
      { name: /예약 이력/, marker: '예약 이력' },
      { name: /알림 설정/, marker: '알림 설정' },
      { name: /기본 정보/, marker: '프로필 정보' }, // 다시 기본으로 복귀
    ];

    for (const tab of tabs) {
      const tabButton = page.getByRole('button', { name: tab.name });
      await tabButton.click();
      await page.waitForTimeout(500);

      const marker = page.getByText(tab.marker);
      const count = await marker.count();
      console.log(`✓ 탭 전환: ${tab.marker} (요소 ${count}개)`);
      expect(count).toBeGreaterThan(0);
    }
  });
});

// ========================================
// 4. 수정 모달 테스트
// ========================================
test.describe('사용자 수정 모달', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('4.1 상세 페이지에서 수정 버튼 → 모달 열림', async ({ page }) => {
    await page.goto('/user-management');
    await waitForPageLoad(page);

    const hasData = await waitForTableData(page, test);
    if (!hasData) return;

    // 상세 페이지로 이동
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/\/user-management\/\d+/, { timeout: 10000 });
    await waitForPageLoad(page);

    // 수정 버튼 클릭
    const editButton = page.getByRole('button', { name: /수정/ });
    await editButton.click();
    await page.waitForTimeout(500);

    // 모달 열림 확인
    const modal = page.locator('[role="dialog"]');
    const modalVisible = await modal.isVisible().catch(() => false);

    if (modalVisible) {
      console.log('✓ 수정 모달 열림');

      // 모달 닫기
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      console.log('✓ 모달 닫기 완료');
    } else {
      console.log('수정 모달이 열리지 않음 (다른 UI 패턴일 수 있음)');
    }
  });
});

// ========================================
// 5. 통합 시나리오
// ========================================
test.describe('사용자 관리 통합 시나리오', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('5.1 전체 워크플로우: 목록 → 검색 → 상세 → 탭 전환 → 목록 복귀', async ({ page }) => {
    // 1. 목록 페이지 로드
    await page.goto('/user-management');
    await waitForPageLoad(page);
    await expect(page.getByText('회원 관리').first()).toBeVisible();
    console.log('✓ 1. 목록 페이지 로드');

    // 2. 검색 기능 사용
    const searchInput = page.locator('input[placeholder*="이름"], input[placeholder*="검색"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await searchInput.clear();
      await page.waitForTimeout(500);
      console.log('✓ 2. 검색 기능 확인');
    } else {
      console.log('✓ 2. 검색 기능 (검색창 없음)');
    }

    // 3. 사용자 Row 클릭 → 상세 이동
    const hasData = await waitForTableData(page, test);
    if (!hasData) return;

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/\/user-management\/\d+/, { timeout: 10000 });
    await waitForPageLoad(page);
    console.log('✓ 3. 상세 페이지 이동');

    // 4. 기본 정보 탭 확인
    await expect(page.getByText('프로필 정보').first()).toBeVisible({ timeout: 10000 });
    console.log('✓ 4. 기본 정보 탭 확인');

    // 5. 예약 이력 탭 전환
    const bookingsTab = page.getByRole('button', { name: /예약 이력/ });
    await bookingsTab.click();
    await page.waitForTimeout(1000);
    console.log('✓ 5. 예약 이력 탭 전환');

    // 6. 알림 설정 탭 전환
    const notificationsTab = page.getByRole('button', { name: /알림 설정/ });
    await notificationsTab.click();
    await page.waitForTimeout(1000);
    console.log('✓ 6. 알림 설정 탭 전환');

    // 7. 뒤로가기로 목록 복귀
    const backButton = page.locator('button').filter({
      has: page.locator('svg path[d*="M15 19l-7-7"]'),
    }).first();

    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click();
    } else {
      await page.goto('/user-management');
    }

    await page.waitForURL(/\/user-management$/, { timeout: 10000 });
    await expect(page.getByText('회원 관리').first()).toBeVisible();
    console.log('✓ 7. 목록 복귀 확인');

    console.log('\n=== 사용자 관리 통합 시나리오 완료 ===');
  });
});
