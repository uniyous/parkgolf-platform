import { test, expect } from '@playwright/test';

test.setTimeout(60000);

/**
 * 플랫폼 관리자 가맹점 선택 + 페이지 이동 헬퍼
 * - React Router 클라이언트 리다이렉트를 감지하여 가맹점 선택 처리
 * - 이후 targetPath로 이동
 */
async function navigateWithCompanySelect(
  page: import('@playwright/test').Page,
  targetPath: string,
) {
  await page.goto(targetPath);

  // React Router의 클라이언트 사이드 리다이렉트를 기다리기 위해
  // 가맹점 선택 페이지 OR 취소/환불 관리 페이지 중 하나가 나타날 때까지 대기
  const companySelectHeading = page.getByRole('heading', { name: '지원할 가맹점을 선택하세요' });
  const cancellationHeading = page.locator('h2').filter({ hasText: '취소/환불 관리' });

  const appeared = await Promise.race([
    companySelectHeading.waitFor({ timeout: 30000 }).then(() => 'company-select' as const),
    cancellationHeading.waitFor({ timeout: 30000 }).then(() => 'cancellation' as const),
  ]);

  if (appeared === 'company-select') {
    // 가맹점 목록에서 첫 번째 가맹점 클릭
    const companyButton = page.locator('button').filter({ hasText: /파크골프장/ }).first();
    await companyButton.waitFor({ timeout: 15000 });
    await companyButton.click();

    // 대시보드로 이동 후 target 페이지로 재이동
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await page.goto(targetPath);

    // 취소/환불 관리 헤더 대기
    await cancellationHeading.waitFor({ timeout: 30000 });
  }

  await page.waitForTimeout(1000);
}

test.describe('취소/환불 관리 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await navigateWithCompanySelect(page, '/bookings/cancellations');
  });

  // ===== 페이지 렌더링 =====

  test('페이지 헤더 렌더링', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /취소\/환불 관리/ })).toBeVisible();
    await expect(page.getByText(/취소 내역 및 환불 현황을 관리하세요/)).toBeVisible();
  });

  test('통계 카드 표시', async ({ page }) => {
    await expect(page.getByText('전체 취소')).toBeVisible();
    await expect(page.getByText('환불 대기')).toBeVisible();
    await expect(page.getByText('환불 완료')).toBeVisible();
    await expect(page.getByText('환불 없음')).toBeVisible();
    await expect(page.getByText('총 환불 금액')).toBeVisible();
  });

  test('통계 카드에 숫자 표시', async ({ page }) => {
    const cards = page.locator('.text-2xl.font-bold');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  // ===== 필터 영역 =====

  test('날짜 필터 표시', async ({ page }) => {
    await expect(page.getByText('취소일 (시작)')).toBeVisible();
    await expect(page.getByText('취소일 (종료)')).toBeVisible();

    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
  });

  test('골프장 필터 표시', async ({ page }) => {
    await expect(page.getByText('골프장').first()).toBeVisible();
  });

  test('취소 유형 필터 표시', async ({ page }) => {
    await expect(page.getByText('취소 유형')).toBeVisible();
  });

  test('검색 필드 동작', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/예약번호, 이름, 연락처/);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('테스트');
    await expect(searchInput).toHaveValue('테스트');
  });

  // ===== 통계 카드 필터 동작 =====

  test('환불 대기 카드 클릭 시 필터 적용', async ({ page }) => {
    const pendingCard = page.getByText('환불 대기').locator('..');
    await pendingCard.click();
    await page.waitForTimeout(500);

    // active ring 표시 확인
    const activeCard = page.locator('.ring-2.ring-emerald-500');
    await expect(activeCard).toBeVisible();
  });

  test('전체 취소 카드 클릭으로 필터 리셋', async ({ page }) => {
    // 환불 대기 클릭
    await page.getByText('환불 대기').locator('..').click();
    await page.waitForTimeout(300);

    // 전체 취소 클릭으로 리셋
    await page.getByText('전체 취소').locator('..').click();
    await page.waitForTimeout(300);
  });

  // ===== 테이블 =====

  test('테이블 또는 빈 상태 표시', async ({ page }) => {
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const noRecords = await page.getByText(/취소된 예약이 없습니다/).isVisible().catch(() => false);

    expect(hasTable || noRecords).toBeTruthy();
  });

  test('테이블 헤더 표시 (데이터가 있는 경우)', async ({ page }) => {
    const table = page.locator('table');
    if (await table.isVisible()) {
      await expect(page.getByText('예약번호').first()).toBeVisible();
      await expect(page.getByText('예약자').first()).toBeVisible();
      await expect(page.getByText('예약일').first()).toBeVisible();
      await expect(page.getByText('취소 유형').first()).toBeVisible();
      await expect(page.getByText('취소 일시').first()).toBeVisible();
      await expect(page.getByText('결제 금액').first()).toBeVisible();
      await expect(page.getByText('환불 금액').first()).toBeVisible();
      await expect(page.getByText('환불 상태').first()).toBeVisible();
      await expect(page.getByText('액션').first()).toBeVisible();
    }
  });

  test('하단 총 취소 건수 표시', async ({ page }) => {
    await expect(page.getByText(/총 \d+건의 취소 내역/)).toBeVisible({ timeout: 15000 });
  });

  // ===== 상세 모달 =====

  test('상세 보기 버튼 클릭 시 모달 표시 (데이터가 있는 경우)', async ({ page }) => {
    const table = page.locator('table');
    if (await table.isVisible()) {
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        // Eye 아이콘 버튼 클릭
        const detailButton = firstRow.locator('button').first();
        await detailButton.click();

        // 모달 표시 확인
        await expect(page.getByText('취소 상세 정보').first()).toBeVisible({ timeout: 5000 });

        // 모달 닫기
        const closeButton = page.getByRole('button', { name: /닫기/ });
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  // ===== 환불 처리 모달 =====

  test('환불 처리 버튼 클릭 시 모달 표시 (환불 대기 데이터가 있는 경우)', async ({ page }) => {
    const refundButtons = page.locator('button[title="환불 처리"]');
    const count = await refundButtons.count();

    if (count > 0) {
      await refundButtons.first().click();

      // 환불 처리 모달 표시 확인
      await expect(page.getByText('환불 처리').first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('정책 기반 환불 금액')).toBeVisible();
      await expect(page.getByText('실제 환불 금액')).toBeVisible();
      await expect(page.getByText('최종 환불 금액')).toBeVisible();

      // 금액 입력 필드
      await expect(page.locator('input[type="number"]')).toBeVisible();

      // 정책 금액 / 전액 버튼
      await expect(page.getByRole('button', { name: /정책 금액/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /전액/ })).toBeVisible();

      // 메모 입력 필드
      await expect(page.getByPlaceholder(/환불 처리에 대한 메모/)).toBeVisible();

      // 모달 닫기
      await page.getByRole('button', { name: '취소' }).click();
    }
  });

  test('환불 금액 조정 시 경고 및 메모 필수 (환불 대기 데이터가 있는 경우)', async ({ page }) => {
    const refundButtons = page.locator('button[title="환불 처리"]');
    const count = await refundButtons.count();

    if (count > 0) {
      await refundButtons.first().click();
      await expect(page.getByText('환불 처리').first()).toBeVisible({ timeout: 5000 });

      // 금액을 1원으로 조정
      const amountInput = page.locator('input[type="number"]');
      await amountInput.fill('1');

      // 경고 메시지 표시
      await expect(page.getByText(/금액이 조정되었습니다/)).toBeVisible();

      // 메모 없이 환불 처리 버튼 비활성화
      const confirmButton = page.getByRole('button', { name: /환불 처리/ });
      await expect(confirmButton).toBeDisabled();

      // 메모 입력 후 활성화
      await page.getByPlaceholder(/환불 처리에 대한 메모/).fill('테스트 금액 조정 사유');
      await expect(confirmButton).toBeEnabled();

      // 모달 닫기 (실제 환불 처리하지 않음)
      await page.getByRole('button', { name: '취소' }).click();
    }
  });

  test('전액 버튼 클릭 시 전체 금액으로 변경 (환불 대기 데이터가 있는 경우)', async ({ page }) => {
    const refundButtons = page.locator('button[title="환불 처리"]');
    const count = await refundButtons.count();

    if (count > 0) {
      await refundButtons.first().click();
      await expect(page.getByText('환불 처리').first()).toBeVisible({ timeout: 5000 });

      // 전액 버튼 클릭
      await page.getByRole('button', { name: /전액/ }).click();

      // 최종 환불 금액이 표시되는지 확인
      const finalAmount = page.locator('.text-2xl.font-bold.text-green-400');
      await expect(finalAmount).toBeVisible();

      // 모달 닫기
      await page.getByRole('button', { name: '취소' }).click();
    }
  });

  // ===== 필터 초기화 =====

  test('필터 초기화 버튼 동작', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/예약번호, 이름, 연락처/);
    await searchInput.fill('테스트');

    const resetButton = page.getByRole('button', { name: /필터 초기화/ });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    await expect(searchInput).toHaveValue('');
  });

  test('날짜 필터 변경', async ({ page }) => {
    const dateInputs = page.locator('input[type="date"]');
    const startDateInput = dateInputs.first();

    const today = new Date().toISOString().split('T')[0];
    await startDateInput.fill(today);
    await expect(startDateInput).toHaveValue(today);
  });
});
