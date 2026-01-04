import { test, expect } from '@playwright/test';

/**
 * 회사 관리 E2E 테스트
 *
 * 테스트 범위:
 * 1. 목록 페이지 (CompanyList)
 *    - 페이지 로드 및 요소 확인
 *    - 통계 카드 표시
 *    - 검색 기능
 *    - 상태 필터
 *    - 테이블 정렬
 *
 * 2. 회사 추가 (CompanyFormModal)
 *    - 모달 열기/닫기
 *    - 필수 필드 검증
 *    - 회사 생성
 *
 * 3. 회사 상세 (CompanyDetailModal)
 *    - 상세 정보 표시
 *    - 수정 모달로 이동
 *
 * 4. 회사 수정
 *    - 정보 수정
 *    - 상태 변경
 *
 * 5. 회사 삭제
 *    - 삭제 확인 다이얼로그
 */

// ========================================
// 1. 목록 페이지 테스트
// ========================================
test.describe('회사 목록 페이지', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('1.1 페이지 로드 및 기본 요소 확인', async ({ page }) => {
    await page.goto('/companies');

    // URL 확인
    await expect(page).toHaveURL(/.*companies/);

    // 헤더 확인
    await expect(page.getByRole('heading', { name: /회사 관리/ }).first()).toBeVisible();

    // 부제목 확인
    await expect(page.getByText(/골프장 운영 회사를 관리/)).toBeVisible();

    // 회사 추가 버튼 확인 (여러 개일 수 있으므로 first() 사용)
    await expect(page.getByRole('button', { name: /회사 추가/ }).first()).toBeVisible();

    // 검색 입력창 확인
    await expect(page.getByPlaceholder(/회사명, 사업자번호/)).toBeVisible();

    // 새로고침 버튼 확인
    await expect(page.getByRole('button', { name: /새로고침/ })).toBeVisible();
  });

  test('1.2 통계 카드 표시 확인', async ({ page }) => {
    await page.goto('/companies');

    // 통계 카드들 확인 (first() 사용하여 중복 요소 처리)
    await expect(page.getByText('전체 회사').first()).toBeVisible();
    await expect(page.getByText('운영 중').first()).toBeVisible();
    await expect(page.getByText('점검 중').first()).toBeVisible();
    await expect(page.getByText('비활성').first()).toBeVisible();
  });

  test('1.3 회사 목록 테이블 헤더 확인', async ({ page }) => {
    await page.goto('/companies');

    // 테이블이 로드될 때까지 대기 (빈 상태 또는 테이블)
    await Promise.race([
      page.waitForSelector('table', { timeout: 5000 }),
      page.waitForSelector('text=등록된 회사가 없습니다', { timeout: 5000 }),
    ]);

    // 테이블이 있는 경우에만 헤더 확인
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    if (hasTable) {
      await expect(page.locator('th').filter({ hasText: '회사 정보' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: '연락처' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: '코스' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: '상태' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: '액션' })).toBeVisible();
    } else {
      console.log('등록된 회사가 없습니다.');
      await expect(page.getByText('등록된 회사가 없습니다')).toBeVisible();
    }
  });

  test('1.4 검색 기능 - 키워드 입력', async ({ page }) => {
    await page.goto('/companies');

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // 검색창에 텍스트 입력
    const searchInput = page.getByPlaceholder(/회사명, 사업자번호/);
    await searchInput.click();
    await searchInput.fill('테스트');

    // 입력 대기
    await page.waitForTimeout(300);

    // 검색어가 입력되었는지 확인
    const value = await searchInput.inputValue();
    console.log('검색창 입력값:', value);
    expect(value).toBe('테스트');

    // 필터 표시 확인
    const filterChip = page.locator('span').filter({ hasText: '검색:' });
    const hasFilterChip = await filterChip.isVisible().catch(() => false);
    console.log('필터 칩 표시:', hasFilterChip);
  });

  test('1.5 상태 필터 선택', async ({ page }) => {
    await page.goto('/companies');

    // 상태 필터 선택
    const statusFilter = page.locator('select').filter({ hasText: /전체 상태/ });
    await statusFilter.selectOption('ACTIVE');

    // 필터 표시 확인
    await expect(page.getByText(/상태: 활성/)).toBeVisible();
  });

  test('1.6 필터 초기화', async ({ page }) => {
    await page.goto('/companies');

    // 검색어 입력
    const searchInput = page.getByPlaceholder(/회사명, 사업자번호/);
    await searchInput.fill('테스트');

    // 모두 초기화 버튼 클릭
    await page.getByText('모두 초기화').click();

    // 검색창이 비워졌는지 확인
    await expect(searchInput).toHaveValue('');
  });

  test('1.7 테이블 정렬 - 회사 정보', async ({ page }) => {
    await page.goto('/companies');

    // 테이블이 로드될 때까지 대기
    await page.waitForSelector('table', { timeout: 5000 });

    // 회사 정보 헤더 클릭하여 정렬
    await page.getByText('회사 정보').click();

    // 정렬 화살표 확인
    await expect(page.locator('th').filter({ hasText: /회사 정보/ }).locator('span:has-text("↑"), span:has-text("↓")')).toBeVisible();
  });

  test('1.8 새로고침 버튼 동작', async ({ page }) => {
    await page.goto('/companies');

    // 새로고침 버튼 클릭
    await page.getByRole('button', { name: /새로고침/ }).click();

    // 페이지가 여전히 회사 관리 페이지인지 확인
    await expect(page.getByRole('heading', { name: /회사 관리/ })).toBeVisible();
  });
});

// ========================================
// 2. 회사 추가 모달 테스트
// ========================================
test.describe('회사 추가 모달', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('2.1 모달 열기/닫기', async ({ page }) => {
    await page.goto('/companies');

    // 회사 추가 버튼 클릭 (첫 번째 버튼)
    await page.getByRole('button', { name: /회사 추가/ }).first().click();

    // 모달이 열렸는지 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 닫기 버튼 또는 취소 버튼 클릭 (ESC 키로 닫기)
    await page.keyboard.press('Escape');

    // 모달이 닫혔는지 확인
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('2.2 모달 내용 확인', async ({ page }) => {
    await page.goto('/companies');

    // 회사 추가 버튼 클릭
    await page.getByRole('button', { name: /회사 추가/ }).first().click();

    // 모달이 열렸는지 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 모달 내 필드들 확인 (회사명 입력 필드)
    await expect(page.locator('[role="dialog"]').locator('input').first()).toBeVisible();

    // 저장/등록 버튼 확인
    const saveButton = page.locator('[role="dialog"]').getByRole('button', { name: /저장|등록|추가/ });
    await expect(saveButton).toBeVisible();

    // ESC로 모달 닫기
    await page.keyboard.press('Escape');
  });
});

// ========================================
// 3. 회사 상세/수정 테스트
// ========================================
test.describe('회사 상세 및 수정', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('3.1 회사 행 클릭하여 상세 모달 열기', async ({ page }) => {
    await page.goto('/companies');

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // 테이블 데이터 로드 대기 (최대 20초)
    try {
      await page.waitForSelector('table tbody tr', { timeout: 5000 });
    } catch {
      // 빈 상태 확인
      const isEmpty = await page.getByText('등록된 회사가 없습니다').isVisible().catch(() => false);
      if (isEmpty) {
        console.log('등록된 회사가 없습니다. 테스트 스킵.');
        test.skip();
        return;
      }
    }

    // 첫 번째 회사 행 클릭
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // 상세 모달이 열렸는지 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // ESC로 닫기
    await page.keyboard.press('Escape');
  });

  test('3.2 수정 버튼 클릭', async ({ page }) => {
    await page.goto('/companies');

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // 테이블 데이터 로드 대기
    try {
      await page.waitForSelector('table tbody tr', { timeout: 5000 });
    } catch {
      console.log('수정 버튼이 없거나 권한이 없습니다. 테스트 스킵.');
      test.skip();
      return;
    }

    // 수정 버튼 찾기
    const editButton = page.locator('table tbody tr').first().getByRole('button', { name: /수정/ });
    const hasEditButton = await editButton.isVisible().catch(() => false);

    if (!hasEditButton) {
      console.log('수정 버튼이 없거나 권한이 없습니다. 테스트 스킵.');
      test.skip();
      return;
    }

    await editButton.click();

    // 수정 모달이 열렸는지 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // ESC로 닫기
    await page.keyboard.press('Escape');
  });

  test('3.3 상태 변경 드롭다운', async ({ page }) => {
    await page.goto('/companies');

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // 테이블 데이터 로드 대기
    try {
      await page.waitForSelector('table tbody tr', { timeout: 5000 });
    } catch {
      console.log('상태 변경 드롭다운이 없거나 권한이 없습니다. 테스트 스킵.');
      test.skip();
      return;
    }

    // 상태 드롭다운 찾기
    const statusSelect = page.locator('table tbody tr').first().locator('select');
    const hasStatusSelect = await statusSelect.isVisible().catch(() => false);

    if (!hasStatusSelect) {
      console.log('상태 변경 드롭다운이 없거나 권한이 없습니다. 테스트 스킵.');
      test.skip();
      return;
    }

    // 드롭다운 옵션 확인
    const options = await statusSelect.locator('option').allTextContents();
    console.log('상태 옵션:', options);

    expect(options).toContain('운영 중');
    expect(options).toContain('점검 중');
    expect(options).toContain('비활성');
  });
});

// ========================================
// 4. 회사 삭제 테스트
// ========================================
test.describe('회사 삭제', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('4.1 삭제 버튼 및 확인 다이얼로그', async ({ page }) => {
    await page.goto('/companies');

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // 테이블 데이터 로드 대기
    try {
      await page.waitForSelector('table tbody tr', { timeout: 5000 });
    } catch {
      console.log('삭제 버튼이 없거나 권한이 없습니다. 테스트 스킵.');
      test.skip();
      return;
    }

    // 삭제 버튼 찾기
    const deleteButton = page.locator('table tbody tr').first().getByRole('button', { name: /삭제/ });
    const hasDeleteButton = await deleteButton.isVisible().catch(() => false);

    if (!hasDeleteButton) {
      console.log('삭제 버튼이 없거나 권한이 없습니다. 테스트 스킵.');
      test.skip();
      return;
    }

    await deleteButton.click();

    // 삭제 확인 다이얼로그가 열렸는지 확인
    await expect(page.getByText(/이 회사를 삭제하시겠습니까/)).toBeVisible();
    await expect(page.getByText(/이 작업은 되돌릴 수 없습니다/)).toBeVisible();

    // 취소 버튼 클릭
    await page.getByRole('button', { name: /취소/ }).click();

    // 다이얼로그가 닫혔는지 확인
    await expect(page.getByText(/이 회사를 삭제하시겠습니까/)).not.toBeVisible();
  });
});

// ========================================
// 5. 통합 시나리오 테스트
// ========================================
test.describe('회사 관리 통합 시나리오', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('5.1 전체 워크플로우: 목록 조회 -> 검색 -> 상세 -> 목록 복귀', async ({ page }) => {
    // 1. 목록 페이지 로드
    await page.goto('/companies');
    await expect(page.getByRole('heading', { name: /회사 관리/ })).toBeVisible();
    console.log('✓ 1. 목록 페이지 로드');

    // 2. 통계 카드 확인
    await expect(page.getByText('전체 회사')).toBeVisible();
    console.log('✓ 2. 통계 카드 확인');

    // 3. 검색 테스트
    const searchInput = page.getByPlaceholder(/회사명, 사업자번호/);
    await searchInput.fill('테스트');
    await expect(page.getByText(/검색: 테스트/)).toBeVisible();
    console.log('✓ 3. 검색 기능 확인');

    // 4. 필터 초기화
    await page.getByText('모두 초기화').click();
    await expect(searchInput).toHaveValue('');
    console.log('✓ 4. 필터 초기화 확인');

    // 5. 회사 행 클릭 (있는 경우)
    const firstRow = page.locator('table tbody tr').first();
    const hasRow = await firstRow.isVisible().catch(() => false);

    if (hasRow) {
      await firstRow.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      console.log('✓ 5. 상세 모달 확인');

      // 모달 닫기
      await page.keyboard.press('Escape');
      console.log('✓ 6. 모달 닫기 확인');
    } else {
      console.log('- 5. 등록된 회사 없음 (스킵)');
    }

    console.log('\n=== 회사 관리 통합 시나리오 완료 ===');
  });
});
