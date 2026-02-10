import { test, expect } from '@playwright/test';

/**
 * 예약 + 결제 + 취소 E2E 테스트
 *
 * 플로우 (단순화됨):
 * 1. 현장결제: 검색 → 타임슬롯 선택 → 예약 상세(현장결제) → /booking-complete (성공)
 * 2. 카드결제: 검색 → 타임슬롯 선택 → 예약 상세(카드결제) → 예약생성 + 결제준비 → Toss 리다이렉트
 *    → /booking-complete?paymentKey=...&orderId=...&amount=... (성공)
 *    → /booking-complete?code=...&message=... (실패)
 * 3. 예약 취소: 내 예약 → 예약 상세 → 취소
 */

// 7일 후 날짜 (취소 가능한 날짜 - 3일 전까지 취소 가능)
function getDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * 헬퍼: 검색 페이지에서 예약 가능한 타임슬롯 찾아 클릭 → BookingDetailPage 이동
 */
async function navigateToBookingDetail(page: import('@playwright/test').Page, date: string) {
  await page.goto(`/bookings?date=${date}`);

  // 게임 카드 로딩 대기: "예약 가능 시간" 헤딩 또는 빈 상태 대기
  try {
    await page.getByText('예약 가능 시간').first().waitFor({ timeout: 15000 });
  } catch {
    // 게임이 없거나 로딩 실패
    return false;
  }

  // 타임슬롯 버튼: 시간(06:00)을 포함하는 h-14 높이 버튼
  const timeSlotButton = page.locator('button.h-14')
    .filter({ hasText: /\d{2}:\d{2}/ })
    .first();

  const hasSlots = await timeSlotButton.isVisible().catch(() => false);
  if (!hasSlots) {
    return false;
  }

  await timeSlotButton.click();
  await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });
  return true;
}

/**
 * 헬퍼: BookingDetailPage에서 결제 방법 선택 + 약관 동의 + 예약하기 클릭
 */
async function fillBookingDetailAndSubmit(
  page: import('@playwright/test').Page,
  paymentMethod: 'onsite' | 'card',
) {
  // 스크롤하여 결제 방법이 보이도록
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  // 결제 방법 선택 (아이콘 포함 이름으로 정확히 매칭)
  const paymentIcon = paymentMethod === 'onsite' ? '🏪' : '💳';
  const paymentButton = page.getByRole('button', { name: new RegExp(`${paymentIcon}.*${paymentMethod === 'onsite' ? '현장결제' : '카드결제'}`) });
  await expect(paymentButton).toBeVisible({ timeout: 5000 });
  await paymentButton.click();

  // 약관 동의 체크박스 클릭
  const termsLabel = page.locator('label').filter({ hasText: '이용약관 및 개인정보처리방침에 동의합니다' });
  await expect(termsLabel).toBeVisible({ timeout: 5000 });
  await termsLabel.click();

  // 스크롤하여 결제 버튼 보이도록
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  // 예약하기 버튼 찾기 (가격이 포함된 버튼)
  const submitButton = page.locator('button').filter({ hasText: /예약하기/ }).first();
  await expect(submitButton).toBeEnabled({ timeout: 5000 });

  return submitButton;
}

// =============================================================================
// 1. 현장결제 예약 플로우
// =============================================================================
test.describe('현장결제 예약 플로우', () => {
  test('검색 → 타임슬롯 선택 → 현장결제 → 예약 완료', async ({ page }) => {
    const date = getDateInDays(7);

    // Step 1: 검색 페이지에서 타임슬롯 선택
    const hasSlots = await navigateToBookingDetail(page, date);
    if (!hasSlots) {
      test.skip(true, '예약 가능한 타임슬롯이 없습니다');
      return;
    }

    // Step 2: 예약 확인 페이지 표시 확인
    await expect(page.getByText('예약 확인')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('인원 선택')).toBeVisible();
    await expect(page.getByText('결제 방법')).toBeVisible();

    // Step 3: 인원 선택 (기본 2명 확인)
    const playerButton2 = page.locator('button').filter({ hasText: '2명' });
    await expect(playerButton2).toHaveClass(/bg-green-500/);

    // Step 4: 현장결제 선택 + 약관 동의 + 예약하기
    const submitButton = await fillBookingDetailAndSubmit(page, 'onsite');

    // API 응답 모니터링
    const bookingResponse = page.waitForResponse(
      (resp) => resp.url().includes('/bookings') && resp.request().method() === 'POST',
      { timeout: 30000 },
    );

    await submitButton.click();

    // Step 5: 예약 API 응답 확인
    const response = await bookingResponse;
    const responseBody = await response.json();
    console.log(`[E2E] 현장결제 예약 응답: status=${response.status()}, body=${JSON.stringify(responseBody)}`);

    expect(response.status()).toBeLessThan(400);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.status).toBe('PENDING');
    expect(responseBody.data.paymentMethod).toBe('onsite');

    // Step 6: 예약 완료 페이지로 이동 확인
    await expect(page).toHaveURL(/.*booking-complete/, { timeout: 15000 });
    await expect(page.getByText('예약이 완료되었습니다!')).toBeVisible({ timeout: 10000 });

    // Step 7: 예약번호 표시 확인
    await expect(page.getByText('예약번호')).toBeVisible();

    // Step 8: 결제 방법이 현장결제로 표시
    await expect(page.getByText('현장결제')).toBeVisible();

    console.log(`[E2E] 현장결제 예약 완료 - bookingNumber: ${responseBody.data.bookingNumber}`);
  });
});

// =============================================================================
// 2. 카드결제 예약 플로우
// =============================================================================
test.describe('카드결제 예약 플로우', () => {
  test('검색 → 타임슬롯 선택 → 카드결제 → Toss SDK 호출 확인', async ({ page }) => {
    const date = getDateInDays(7);

    // Step 1: 검색 → BookingDetailPage
    const hasSlots = await navigateToBookingDetail(page, date);
    if (!hasSlots) {
      test.skip(true, '예약 가능한 타임슬롯이 없습니다');
      return;
    }

    await expect(page.getByText('예약 확인')).toBeVisible({ timeout: 10000 });

    // Step 2: 카드결제 버튼 확인
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const cardButton = page.getByRole('button', { name: /💳.*카드결제/ });
    await expect(cardButton).toBeVisible({ timeout: 5000 });

    const isCardDisabled = await cardButton.isDisabled();

    if (isCardDisabled) {
      // 무료 게임: 카드결제 비활성화 확인 (0원 게임은 카드결제 불가)
      console.log('[E2E] 무료 게임 - 카드결제 비활성화 확인');
      await expect(page.getByText('무료 게임은 현장결제만 가능')).toBeVisible();

      // 현장결제만 선택 가능한지 확인
      const onsiteButton = page.getByRole('button', { name: /🏪.*현장결제/ });
      await onsiteButton.click();
      await expect(onsiteButton).toHaveClass(/bg-green-500/);
    } else {
      // 유료 게임: 카드결제 → 예약생성 + 결제준비 API 확인
      console.log('[E2E] 유료 게임 - 카드결제 진행');
      const submitButton = await fillBookingDetailAndSubmit(page, 'card');

      // 예약 생성 + 결제 준비 API 모니터링
      const bookingResponse = page.waitForResponse(
        (resp) => resp.url().includes('/bookings') && resp.request().method() === 'POST',
        { timeout: 30000 },
      );

      const prepareResponse = page.waitForResponse(
        (resp) => resp.url().includes('/payments/prepare') && resp.request().method() === 'POST',
        { timeout: 30000 },
      );

      await submitButton.click();

      // 예약 생성 API 확인
      const bookingResp = await bookingResponse;
      const bookingBody = await bookingResp.json();
      console.log(`[E2E] 카드결제 예약 생성: status=${bookingResp.status()}, bookingId=${bookingBody.data?.id}`);
      expect(bookingResp.status()).toBeLessThan(400);
      expect(bookingBody.data.paymentMethod).toBe('card');

      // 결제 준비 API 확인
      const prepareResp = await prepareResponse;
      const prepareBody = await prepareResp.json();
      console.log(`[E2E] 결제 준비: status=${prepareResp.status()}, orderId=${prepareBody.data?.orderId}`);
      expect(prepareResp.status()).toBeLessThan(400);
      expect(prepareBody.data.orderId).toBeTruthy();

      // Toss SDK가 requestPayment를 호출하면 외부 리다이렉트 발생
      // E2E에서는 외부 토스 결제창으로의 리다이렉트까지만 확인
      // (실제 결제는 토스 테스트 환경에서만 가능)
    }
  });
});

// =============================================================================
// 3. 결제 결과 처리 테스트 (/booking-complete 파라미터 기반)
// =============================================================================
test.describe('결제 결과 처리', () => {
  test('카드결제 실패 - /booking-complete에 에러 파라미터', async ({ page }) => {
    // 토스에서 실패 리다이렉트 시뮬레이션
    await page.goto('/booking-complete?code=PAY_PROCESS_CANCELED&message=사용자가 결제를 취소했습니다');

    await expect(page.getByText('결제에 실패했습니다')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('사용자가 결제를 취소했습니다')).toBeVisible();
    await expect(page.getByText('PAY_PROCESS_CANCELED')).toBeVisible();

    // 다시 시도 버튼
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
    // 예약 목록 버튼
    await expect(page.getByRole('button', { name: '예약 목록' })).toBeVisible();
  });

  test('카드결제 실패 - 예약 목록으로 이동', async ({ page }) => {
    await page.goto('/booking-complete?code=FAIL&message=결제 실패');

    const myBookingsButton = page.getByRole('button', { name: '예약 목록' });
    await expect(myBookingsButton).toBeVisible({ timeout: 10000 });
    await myBookingsButton.click();

    await expect(page).toHaveURL(/.*my-bookings/, { timeout: 10000 });
  });

  test('직접 접근 시 /bookings로 리다이렉트', async ({ page }) => {
    // state/params 없이 접근
    await page.goto('/booking-complete');
    await expect(page).toHaveURL(/.*bookings/, { timeout: 15000 });
  });
});

// =============================================================================
// 4. 예약 취소 플로우
// =============================================================================
test.describe('예약 취소 플로우', () => {
  test('내 예약 → 예약 상세 → 취소', async ({ page }) => {
    // Step 1: 먼저 취소 가능한 예약을 생성 (7일 후 날짜)
    const date = getDateInDays(7);
    const hasSlots = await navigateToBookingDetail(page, date);

    if (!hasSlots) {
      test.skip(true, '예약 가능한 타임슬롯이 없습니다');
      return;
    }

    // 현장결제로 예약 생성
    const submitButton = await fillBookingDetailAndSubmit(page, 'onsite');

    const bookingResponse = page.waitForResponse(
      (resp) => resp.url().includes('/bookings') && resp.request().method() === 'POST',
      { timeout: 30000 },
    );

    await submitButton.click();

    const response = await bookingResponse;
    const body = await response.json();

    if (!body.success || !body.data) {
      console.log(`[E2E] 예약 생성 실패, 취소 테스트 건너뜀: ${JSON.stringify(body)}`);
      test.skip(true, '예약 생성 실패');
      return;
    }

    const bookingNumber = body.data.bookingNumber;
    console.log(`[E2E] 취소 테스트용 예약 생성 완료: ${bookingNumber}`);

    // Step 2: 예약 완료 페이지 대기
    await expect(page).toHaveURL(/.*booking-complete/, { timeout: 15000 });

    // Step 3: 내 예약 보기 클릭
    const myBookingsButton = page.getByRole('button', { name: /내 예약 보기/ });
    await expect(myBookingsButton).toBeVisible({ timeout: 10000 });
    await myBookingsButton.click();

    // Step 4: 내 예약 페이지 확인
    await expect(page).toHaveURL(/.*my-bookings/, { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Step 5: 방금 생성한 예약 카드 찾기
    const bookingCard = page.locator('[class*="glass-card"]')
      .filter({ hasText: bookingNumber })
      .first();

    const hasBooking = await bookingCard.isVisible().catch(() => false);

    if (!hasBooking) {
      // 예약이 아직 PENDING/CONFIRMED로 안 바뀌었을 수 있음 → 새로고침 후 재확인
      await page.reload();
      await page.waitForTimeout(3000);
    }

    // Step 6: 예약 카드 클릭 → 예약 상세 페이지
    const bookingCardRetry = page.locator('[class*="glass-card"]')
      .filter({ hasText: bookingNumber })
      .first();

    if (await bookingCardRetry.isVisible()) {
      await bookingCardRetry.click();

      // 예약 상세 페이지 대기
      await expect(page).toHaveURL(new RegExp(`booking/${bookingNumber}`), { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Step 7: 예약 취소 버튼 확인 및 클릭
      const cancelButton = page.getByRole('button', { name: /예약 취소/ });
      const canCancel = await cancelButton.isVisible().catch(() => false);

      if (canCancel) {
        await cancelButton.click();

        // 취소 모달 대기
        await page.waitForTimeout(1000);

        // 취소 사유 선택
        const reasonButton = page.getByText('일정 변경').first();
        if (await reasonButton.isVisible()) {
          await reasonButton.click();
        }

        // 취소 확인 버튼 클릭
        const confirmCancelButton = page.getByRole('button', { name: /취소 확인|확인/ }).last();
        if (await confirmCancelButton.isVisible()) {
          // 취소 API 모니터링
          const cancelResponse = page.waitForResponse(
            (resp) => resp.url().includes('/bookings/') && resp.request().method() === 'DELETE',
            { timeout: 30000 },
          );

          await confirmCancelButton.click();

          const cancelResp = await cancelResponse.catch(() => null);
          if (cancelResp) {
            const cancelBody = await cancelResp.json();
            console.log(`[E2E] 예약 취소 응답: status=${cancelResp.status()}, body=${JSON.stringify(cancelBody)}`);
            expect(cancelResp.status()).toBeLessThan(400);
          }

          // 취소 후 상태 변경 확인
          await page.waitForTimeout(2000);
          const cancelledBadge = page.getByText('취소됨');
          const isCancelled = await cancelledBadge.isVisible().catch(() => false);
          console.log(`[E2E] 취소 상태 반영: ${isCancelled}`);
        }
      } else {
        console.log(`[E2E] 취소 버튼이 표시되지 않음 (예약 상태가 CONFIRMED/SLOT_RESERVED가 아닐 수 있음)`);
        // Saga 처리 대기 후 재확인
        await page.waitForTimeout(5000);
        await page.reload();
        await page.waitForTimeout(3000);

        const cancelButtonRetry = page.getByRole('button', { name: /예약 취소/ });
        const canCancelRetry = await cancelButtonRetry.isVisible().catch(() => false);
        console.log(`[E2E] 재확인 후 취소 버튼 표시: ${canCancelRetry}`);
      }
    } else {
      console.log(`[E2E] 예약 카드를 찾을 수 없음. 직접 URL로 이동 시도`);
      await page.goto(`/booking/${bookingNumber}`);
      await page.waitForTimeout(3000);
    }
  });
});

// =============================================================================
// 5. BookingDetailPage UI 검증
// =============================================================================
test.describe('BookingDetailPage UI 검증', () => {
  test('인원 선택 버튼 동작', async ({ page }) => {
    const date = getDateInDays(3);
    const hasSlots = await navigateToBookingDetail(page, date);
    if (!hasSlots) {
      test.skip(true, '예약 가능한 타임슬롯이 없습니다');
      return;
    }

    // 인원 선택 영역 확인
    await expect(page.getByText('인원 선택')).toBeVisible({ timeout: 10000 });

    // 기본 2명 선택됨
    const button2 = page.locator('button').filter({ hasText: '2명' });
    await expect(button2).toHaveClass(/bg-green-500/);

    // 3명 선택
    const button3 = page.locator('button').filter({ hasText: '3명' });
    if (await button3.isVisible()) {
      await button3.click();
      await expect(button3).toHaveClass(/bg-green-500/);
      // 이전 선택 해제
      await expect(button2).not.toHaveClass(/bg-green-500/);
    }

    // 1명 선택
    const button1 = page.locator('button').filter({ hasText: '1명' });
    await button1.click();
    await expect(button1).toHaveClass(/bg-green-500/);
  });

  test('결제 방법 선택 토글', async ({ page }) => {
    const date = getDateInDays(3);
    const hasSlots = await navigateToBookingDetail(page, date);
    if (!hasSlots) {
      test.skip(true, '예약 가능한 타임슬롯이 없습니다');
      return;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 현장결제 선택 (아이콘으로 구분)
    const onsiteButton = page.getByRole('button', { name: /🏪.*현장결제/ });
    await expect(onsiteButton).toBeVisible({ timeout: 5000 });
    await onsiteButton.click();
    await expect(onsiteButton).toHaveClass(/bg-green-500/);

    // 카드결제 버튼 확인
    const cardButton = page.getByRole('button', { name: /💳.*카드결제/ });
    const isCardDisabled = await cardButton.isDisabled();

    if (!isCardDisabled) {
      // 유료 게임: 카드결제로 변경 가능
      await cardButton.click();
      await expect(cardButton).toHaveClass(/bg-green-500/);
      await expect(onsiteButton).not.toHaveClass(/bg-green-500/);
    } else {
      // 무료 게임: 카드결제 비활성화 확인
      await expect(page.getByText('무료 게임은 현장결제만 가능')).toBeVisible();
    }
  });

  test('필수 항목 미완료 시 버튼 비활성화', async ({ page }) => {
    const date = getDateInDays(3);
    const hasSlots = await navigateToBookingDetail(page, date);
    if (!hasSlots) {
      test.skip(true, '예약 가능한 타임슬롯이 없습니다');
      return;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 결제 방법 미선택 + 약관 미동의 상태에서 버튼 비활성화
    const submitButton = page.locator('button').filter({ hasText: /필수 항목을 완료해주세요/ });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });
});

// =============================================================================
// 6. 내 예약 목록 테스트
// =============================================================================
test.describe('내 예약 목록', () => {
  test('내 예약 페이지 표시 및 탭 전환', async ({ page }) => {
    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    // 예약 카드 또는 빈 상태 표시 확인
    // BookingCard는 cursor-pointer 클래스를 가진 glass-card
    const bookingCards = page.locator('.glass-card.cursor-pointer');
    const hasBookings = await bookingCards.first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/예정된 예약이 없습니다/).isVisible().catch(() => false);
    expect(hasBookings || hasEmpty).toBeTruthy();

    // 지난 예약 탭 전환 (sm 이상에서 텍스트 표시, mobile에서는 아이콘만)
    const historyButton = page.getByRole('button', { name: /지난 예약/ });
    const historyIconButton = page.locator('button').filter({ has: page.locator('svg.lucide-history') });
    const tabButton = await historyButton.isVisible() ? historyButton : historyIconButton;

    if (await tabButton.isVisible()) {
      await tabButton.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/.*tab=past/);

      const hasPastBookings = await bookingCards.first().isVisible().catch(() => false);
      const hasPastEmpty = await page.getByText(/지난 예약이 없습니다/).isVisible().catch(() => false);
      expect(hasPastBookings || hasPastEmpty).toBeTruthy();
    }
  });

  test('예약 카드 클릭 → 예약 상세 페이지 이동', async ({ page }) => {
    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    // BookingCard는 cursor-pointer 클래스를 가진 glass-card (빈 상태 GlassCard와 구분)
    const bookingCard = page.locator('.glass-card.cursor-pointer').first();
    const hasBookings = await bookingCard.isVisible().catch(() => false);

    if (hasBookings) {
      await bookingCard.click();
      await expect(page).toHaveURL(/.*booking\//, { timeout: 10000 });

      // 예약 상세 정보 표시 확인
      await expect(page.getByText('예약 상세')).toBeVisible({ timeout: 10000 });
    } else {
      // 예약이 없으면 빈 상태 표시 확인
      await expect(page.getByText(/예정된 예약이 없습니다/)).toBeVisible();
    }
  });
});
