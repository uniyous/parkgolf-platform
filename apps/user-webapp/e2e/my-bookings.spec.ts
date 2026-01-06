import { test, expect } from '@playwright/test';

test.describe('내 예약 페이지 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-bookings');
  });

  test('내 예약 페이지 렌더링 확인', async ({ page }) => {
    // 헤더 확인
    await expect(page.getByText('내 예약')).toBeVisible();

    // 예정된 예약 헤딩 확인
    await expect(page.getByRole('heading', { name: '예정된 예약' })).toBeVisible();
  });

  test('예정된 예약 표시', async ({ page }) => {
    // 예정된 예약 탭이 기본 선택
    await expect(page.getByText('예정된 예약')).toBeVisible();

    // 로딩 완료 대기
    await page.waitForTimeout(3000);

    // 예약이 있거나 없거나 메시지 표시
    const hasBookings = await page.locator('[class*="glass-card"]').first().isVisible();
    const noBookings = await page.getByText('예정된 예약이 없습니다').isVisible().catch(() => false);

    expect(hasBookings || noBookings).toBeTruthy();
  });

  test('지난 예약 보기 탭 전환', async ({ page }) => {
    // 지난 예약 보기 버튼 클릭
    await page.getByRole('button', { name: /지난 예약 보기/ }).click();

    // URL 파라미터 확인
    await expect(page).toHaveURL(/tab=past/);

    // 지난 예약 텍스트 확인
    await expect(page.getByText('지난 예약')).toBeVisible();
  });

  test('예정된 예약 보기 탭 전환', async ({ page }) => {
    // 먼저 지난 예약으로 이동
    await page.goto('/my-bookings?tab=past');

    // 예정된 예약 보기 버튼 클릭
    await page.getByRole('button', { name: /예정된 예약 보기/ }).click();

    // URL 파라미터 확인 (tab이 없거나 upcoming)
    await expect(page).not.toHaveURL(/tab=past/);

    // 예정된 예약 텍스트 확인
    await expect(page.getByText('예정된 예약')).toBeVisible();
  });

  test('뒤로가기 버튼 동작', async ({ page }) => {
    // 먼저 검색 페이지에서 내 예약으로 이동
    await page.goto('/search');
    await page.getByRole('button', { name: '내 예약' }).click();
    await expect(page).toHaveURL(/my-bookings/);

    // 뒤로가기 버튼 클릭
    await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).click();

    // 이전 페이지로 돌아가는지 확인
    await expect(page).toHaveURL(/search/);
  });

  test('새로고침 버튼 동작', async ({ page }) => {
    // 새로고침 버튼 클릭
    const refreshButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') });
    await refreshButton.click();

    // 로딩 상태 확인 (버튼이 회전 애니메이션)
    // 새로고침이 완료되면 다시 클릭 가능해짐
    await expect(refreshButton).toBeEnabled({ timeout: 10000 });
  });

  test('빈 상태에서 라운드 찾기 버튼', async ({ page }) => {
    // 예약이 없는 경우 "라운드 찾기" 버튼 표시
    await page.waitForTimeout(3000);

    const findRoundButton = page.getByRole('button', { name: '라운드 찾기' });
    if (await findRoundButton.isVisible()) {
      await findRoundButton.click();
      await expect(page).toHaveURL(/search/);
    }
  });
});

test.describe('예약 카드 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);
  });

  test('예약 카드 상세보기 클릭', async ({ page }) => {
    // 예약 카드가 있는지 확인
    const bookingCard = page.locator('[class*="glass-card"]').first();

    if (await bookingCard.isVisible()) {
      // 상세보기 또는 카드 클릭
      const detailButton = page.getByRole('button', { name: /상세/ }).first();
      if (await detailButton.isVisible()) {
        await detailButton.click();
        // 예약 상세 페이지로 이동 확인
        await expect(page).toHaveURL(/booking\//);
      } else {
        // 카드 자체를 클릭하는 경우
        await bookingCard.click();
      }
    }
  });

  test('예약 취소 버튼 표시 (취소 가능한 예약)', async ({ page }) => {
    // 취소 버튼이 있는지 확인
    const cancelButton = page.getByRole('button', { name: /취소/ }).first();

    if (await cancelButton.isVisible()) {
      // 취소 버튼 클릭
      await cancelButton.click();

      // 취소 모달이 표시되는지 확인
      await expect(page.getByText(/예약을 취소하시겠습니까|취소 확인/)).toBeVisible();
    }
  });
});

test.describe('페이지네이션 테스트', () => {
  test('페이지네이션 표시 (예약이 많은 경우)', async ({ page }) => {
    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    // 페이지네이션 버튼 확인
    const prevButton = page.getByRole('button', { name: '이전' });
    const nextButton = page.getByRole('button', { name: '다음' });

    // 페이지네이션이 있는 경우에만 테스트
    if (await nextButton.isVisible()) {
      // 다음 페이지로 이동
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await expect(page).toHaveURL(/page=2/);
      }

      // 이전 페이지로 돌아가기
      if (await prevButton.isEnabled()) {
        await prevButton.click();
        await expect(page).not.toHaveURL(/page=2/);
      }
    }
  });
});

test.describe('예약 취소 플로우 테스트', () => {
  test('예약 취소 확인 다이얼로그', async ({ page }) => {
    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    // 취소 버튼이 있는지 확인
    const cancelButton = page.getByRole('button', { name: /취소/ }).first();

    if (await cancelButton.isVisible()) {
      // 취소 버튼 클릭
      await cancelButton.click();

      // 취소 확인 다이얼로그 표시 확인
      await expect(page.getByText(/예약을 취소|취소하시겠습니까/)).toBeVisible({ timeout: 5000 });

      // 취소 다이얼로그에 확인/취소 버튼 있는지 확인
      const confirmButton = page.getByRole('button', { name: /확인|예/ });
      const cancelDialogButton = page.getByRole('button', { name: /아니오|닫기|취소/ });

      expect(await confirmButton.isVisible() || await cancelDialogButton.isVisible()).toBeTruthy();
    }
  });

  test('예약 취소 다이얼로그 닫기', async ({ page }) => {
    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    // 취소 버튼이 있는지 확인
    const cancelButton = page.getByRole('button', { name: /취소/ }).first();

    if (await cancelButton.isVisible()) {
      // 취소 버튼 클릭
      await cancelButton.click();

      // 취소 확인 다이얼로그 표시 확인
      await expect(page.getByText(/예약을 취소|취소하시겠습니까/)).toBeVisible({ timeout: 5000 });

      // 닫기/아니오 버튼 클릭
      const closeButton = page.getByRole('button', { name: /아니오|닫기/ }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();

        // 다이얼로그가 닫혔는지 확인
        await expect(page.getByText(/예약을 취소|취소하시겠습니까/)).not.toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('예약 상태 표시 테스트', () => {
  test('예정된 예약 상태 배지 표시', async ({ page }) => {
    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    // 예약 카드가 있는지 확인
    const bookingCard = page.locator('[class*="glass-card"]').first();

    if (await bookingCard.isVisible()) {
      // 예약 상태 배지 확인 (CONFIRMED, PENDING 등)
      const statusBadge = bookingCard.locator('[class*="badge"], [class*="status"]');
      if (await statusBadge.first().isVisible()) {
        // 상태 텍스트 확인
        const statusText = await statusBadge.first().textContent();
        expect(statusText).toBeTruthy();
      }
    }
  });

  test('지난 예약 상태 배지 표시', async ({ page }) => {
    await page.goto('/my-bookings?tab=past');
    await page.waitForTimeout(3000);

    // 예약 카드가 있는지 확인
    const bookingCard = page.locator('[class*="glass-card"]').first();

    if (await bookingCard.isVisible()) {
      // 지난 예약은 COMPLETED, CANCELLED 등의 상태
      const statusBadge = bookingCard.locator('[class*="badge"], [class*="status"]');
      if (await statusBadge.first().isVisible()) {
        const statusText = await statusBadge.first().textContent();
        expect(statusText).toBeTruthy();
      }
    }
  });
});
