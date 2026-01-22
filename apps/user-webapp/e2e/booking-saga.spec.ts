import { test, expect } from '@playwright/test';

/**
 * 예약 Saga 플로우 테스트
 *
 * 이 테스트는 예약 생성 시 Saga 패턴의 동작을 검증합니다.
 * 사용자가 보고한 문제: "1번째 예약 실패, 2번째 실패, 3번째 성공"
 *
 * 테스트 시나리오:
 * 1. 동일한 타임슬롯에 연속 예약 시도
 * 2. 예약 상태 변화 추적 (PENDING → CONFIRMED or FAILED)
 * 3. 에러 메시지 표시 확인
 */

test.describe.serial('예약 Saga 플로우 테스트', () => {
  // 테스트 데이터
  let selectedTimeSlot: string | null = null;
  let selectedDate: string;

  test.beforeAll(() => {
    // 내일 날짜 설정
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    selectedDate = tomorrow.toISOString().split('T')[0];
  });

  test('검색 페이지에서 예약 가능한 타임슬롯 확인', async ({ page }) => {
    await page.goto(`/search?date=${selectedDate}`);

    // 게임 카드 로딩 완료 대기 (스켈레톤이 아닌 실제 콘텐츠)
    await page.waitForSelector('[class*="glass-card"]:has-text("예약 가능 시간")', { timeout: 30000 }).catch(() => null);

    // 추가 대기 (데이터 렌더링)
    await page.waitForTimeout(3000);

    // 예약 가능한 타임슬롯 찾기 (HH:MM 형식 버튼)
    let timeSlotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    let count = await timeSlotButtons.count();

    // 타임슬롯이 없으면 다른 셀렉터 시도
    if (count === 0) {
      timeSlotButtons = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}/ });
      count = await timeSlotButtons.count();
      console.log(`[E2E] Alternative selector found ${count} time slots`);
    }

    console.log(`[E2E] Found ${count} available time slots for date ${selectedDate}`);

    if (count > 0) {
      // 첫 번째 타임슬롯 텍스트 저장 (시간 부분만 추출)
      const fullText = await timeSlotButtons.first().textContent();
      // 시간 패턴 추출 (HH:MM)
      const timeMatch = fullText?.match(/(\d{1,2}:\d{2})/);
      selectedTimeSlot = timeMatch ? timeMatch[1] : fullText;
      console.log(`[E2E] Selected time slot: ${selectedTimeSlot} (full: ${fullText})`);
    } else {
      // 페이지 상태 디버깅
      const pageContent = await page.content();
      const hasGames = pageContent.includes('예약 가능 시간') || pageContent.includes('예약 가능한 라운드');
      console.log(`[E2E] Page has games section: ${hasGames}`);
      console.log(`[E2E] Current URL: ${page.url()}`);
      // 예약 가능한 타임슬롯이 없으면 테스트 건너뛰기 (데이터 의존적)
      test.skip(true, '예약 가능한 타임슬롯이 없습니다 (모든 슬롯이 이미 예약됨)');
    }

    expect(count).toBeGreaterThan(0);
  });

  test('첫 번째 예약 시도 - 상태 및 응답 확인', async ({ page }) => {
    test.skip(!selectedTimeSlot, '예약 가능한 타임슬롯이 없습니다');

    console.log(`[E2E] ========== 첫 번째 예약 시도 시작 ==========`);
    await page.goto(`/search?date=${selectedDate}`);
    await page.waitForTimeout(3000);

    // 타임슬롯 선택
    const timeSlotButton = page.locator('button').filter({ hasText: selectedTimeSlot! }).first();
    await expect(timeSlotButton).toBeVisible();
    await timeSlotButton.click();

    // 예약 상세 페이지 이동 확인
    await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });
    console.log(`[E2E] 예약 상세 페이지로 이동 완료`);

    // 페이지 하단으로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 결제 방법 선택 (신용카드)
    const creditCardOption = page.locator('label').filter({ hasText: '신용카드' });
    if (await creditCardOption.isVisible()) {
      await creditCardOption.click();
      console.log(`[E2E] 결제 방법 선택: 신용카드`);
    }

    // 약관 동의 - Radix UI Checkbox는 button 역할이므로 label 클릭
    const termsLabel = page.locator('label').filter({ hasText: '이용약관에 동의합니다' });
    if (await termsLabel.isVisible()) {
      await termsLabel.click();
      console.log(`[E2E] 이용약관 동의 체크`);
    }

    const privacyLabel = page.locator('label').filter({ hasText: '개인정보처리방침에 동의합니다' });
    if (await privacyLabel.isVisible()) {
      await privacyLabel.click();
      console.log(`[E2E] 개인정보처리방침 동의 체크`);
    }

    // 다시 스크롤하여 결제 버튼이 보이도록
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 예약하기 버튼 찾기 - 가격이 포함된 "결제하기" 또는 "예약하기"
    const bookButton = page.locator('button').filter({ hasText: /결제하기/ }).first();
    await expect(bookButton).toBeEnabled({ timeout: 5000 });
    console.log(`[E2E] 예약 버튼 활성화 확인`);

    // 네트워크 요청 모니터링
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/bookings') && response.request().method() === 'POST',
      { timeout: 30000 }
    ).catch(() => null);

    // 예약 버튼 클릭
    const startTime = Date.now();
    await bookButton.click();
    console.log(`[E2E] 예약 버튼 클릭`);

    // API 응답 대기
    const response = await responsePromise;
    const elapsed = Date.now() - startTime;

    if (response) {
      const status = response.status();
      let body: any = null;
      try {
        body = await response.json();
      } catch (e) {
        // JSON 파싱 실패 무시
      }

      console.log(`[E2E] API 응답 (${elapsed}ms):`);
      console.log(`[E2E]   Status: ${status}`);
      console.log(`[E2E]   Body: ${JSON.stringify(body)}`);

      if (status >= 400) {
        console.log(`[E2E] 첫 번째 예약 실패: ${body?.message || body?.error || 'Unknown error'}`);
      } else {
        console.log(`[E2E] 첫 번째 예약 성공 (PENDING 상태로 생성됨)`);
      }
    } else {
      console.log(`[E2E] API 응답 없음 또는 타임아웃`);
    }

    // 결과 페이지 확인 (성공 또는 에러)
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const hasError = await page.getByText(/오류|실패|에러|error/i).isVisible().catch(() => false);
    const hasSuccess = await page.getByText(/예약이 완료|예약 성공|확인되었습니다/i).isVisible().catch(() => false);

    console.log(`[E2E] 현재 URL: ${currentUrl}`);
    console.log(`[E2E] 에러 메시지 표시: ${hasError}`);
    console.log(`[E2E] 성공 메시지 표시: ${hasSuccess}`);
    console.log(`[E2E] ========== 첫 번째 예약 시도 완료 ==========\n`);
  });

  test('두 번째 예약 시도 - 동일 타임슬롯 재시도', async ({ page }) => {
    test.skip(!selectedTimeSlot, '예약 가능한 타임슬롯이 없습니다');

    console.log(`[E2E] ========== 두 번째 예약 시도 시작 ==========`);
    await page.goto(`/search?date=${selectedDate}`);
    await page.waitForTimeout(3000);

    // 타임슬롯 선택 (같은 타임슬롯)
    const timeSlotButton = page.locator('button').filter({ hasText: selectedTimeSlot! }).first();
    const isAvailable = await timeSlotButton.isVisible().catch(() => false);

    if (!isAvailable) {
      console.log(`[E2E] 타임슬롯 ${selectedTimeSlot}이 더 이상 표시되지 않음 (아마 FULLY_BOOKED)`);
      return;
    }

    await timeSlotButton.click();
    await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });
    console.log(`[E2E] 예약 상세 페이지로 이동 완료`);

    // 페이지 하단으로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 결제 방법 선택
    const creditCardOption = page.locator('label').filter({ hasText: '신용카드' });
    if (await creditCardOption.isVisible()) {
      await creditCardOption.click();
    }

    // 약관 동의 - Radix UI Checkbox는 button 역할이므로 label 클릭
    const termsLabel = page.locator('label').filter({ hasText: '이용약관에 동의합니다' });
    if (await termsLabel.isVisible()) {
      await termsLabel.click();
    }

    const privacyLabel = page.locator('label').filter({ hasText: '개인정보처리방침에 동의합니다' });
    if (await privacyLabel.isVisible()) {
      await privacyLabel.click();
    }

    // 스크롤하여 결제 버튼이 보이도록
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 예약 버튼 클릭
    const bookButton = page.locator('button').filter({ hasText: /결제하기/ }).first();
    await expect(bookButton).toBeEnabled({ timeout: 5000 });

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/bookings') && response.request().method() === 'POST',
      { timeout: 30000 }
    ).catch(() => null);

    const startTime = Date.now();
    await bookButton.click();

    const response = await responsePromise;
    const elapsed = Date.now() - startTime;

    if (response) {
      const status = response.status();
      let body: any = null;
      try {
        body = await response.json();
      } catch (e) {}

      console.log(`[E2E] API 응답 (${elapsed}ms):`);
      console.log(`[E2E]   Status: ${status}`);
      console.log(`[E2E]   Body: ${JSON.stringify(body)}`);
    }

    await page.waitForTimeout(3000);
    console.log(`[E2E] ========== 두 번째 예약 시도 완료 ==========\n`);
  });

  test('세 번째 예약 시도 - 재시도', async ({ page }) => {
    test.skip(!selectedTimeSlot, '예약 가능한 타임슬롯이 없습니다');

    console.log(`[E2E] ========== 세 번째 예약 시도 시작 ==========`);
    await page.goto(`/search?date=${selectedDate}`);
    await page.waitForTimeout(3000);

    // 다른 타임슬롯 선택 (원래 슬롯이 없으면)
    let timeSlotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    let count = await timeSlotButtons.count();

    if (count === 0) {
      timeSlotButtons = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}/ });
      count = await timeSlotButtons.count();
    }

    if (count === 0) {
      console.log(`[E2E] 예약 가능한 타임슬롯이 없습니다`);
      return;
    }

    // 첫 번째 가용 타임슬롯 선택
    const firstAvailableSlot = timeSlotButtons.first();
    const slotText = await firstAvailableSlot.textContent();
    console.log(`[E2E] 세 번째 시도에서 선택한 타임슬롯: ${slotText}`);

    await firstAvailableSlot.click();
    await expect(page).toHaveURL(/.*booking-detail/, { timeout: 10000 });

    // 페이지 하단으로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 결제 방법 선택
    const creditCardOption = page.locator('label').filter({ hasText: '신용카드' });
    if (await creditCardOption.isVisible()) {
      await creditCardOption.click();
    }

    // 약관 동의 - Radix UI Checkbox는 button 역할이므로 label 클릭
    const termsLabel = page.locator('label').filter({ hasText: '이용약관에 동의합니다' });
    if (await termsLabel.isVisible()) {
      await termsLabel.click();
    }

    const privacyLabel = page.locator('label').filter({ hasText: '개인정보처리방침에 동의합니다' });
    if (await privacyLabel.isVisible()) {
      await privacyLabel.click();
    }

    // 스크롤하여 결제 버튼이 보이도록
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 예약 버튼 클릭
    const bookButton = page.locator('button').filter({ hasText: /결제하기/ }).first();
    await expect(bookButton).toBeEnabled({ timeout: 5000 });

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/bookings') && response.request().method() === 'POST',
      { timeout: 30000 }
    ).catch(() => null);

    const startTime = Date.now();
    await bookButton.click();

    const response = await responsePromise;
    const elapsed = Date.now() - startTime;

    if (response) {
      const status = response.status();
      let body: any = null;
      try {
        body = await response.json();
      } catch (e) {}

      console.log(`[E2E] API 응답 (${elapsed}ms):`);
      console.log(`[E2E]   Status: ${status}`);
      console.log(`[E2E]   Body: ${JSON.stringify(body)}`);
    }

    await page.waitForTimeout(5000);

    // 최종 결과 확인
    const currentUrl = page.url();
    const hasSuccess = await page.getByText(/예약이 완료|예약 성공|확인되었습니다/i).isVisible().catch(() => false);
    const isCompletePage = currentUrl.includes('booking-complete');

    console.log(`[E2E] 현재 URL: ${currentUrl}`);
    console.log(`[E2E] 성공 메시지 표시: ${hasSuccess}`);
    console.log(`[E2E] 완료 페이지: ${isCompletePage}`);
    console.log(`[E2E] ========== 세 번째 예약 시도 완료 ==========\n`);

    // 세 번째 시도는 성공해야 함 (사용자 보고 기준)
    expect(hasSuccess || isCompletePage).toBeTruthy();
  });
});

test.describe('예약 상태 확인 테스트', () => {
  test('내 예약에서 예약 상태 확인', async ({ page }) => {
    await page.goto('/my-bookings');

    // 로딩 완료 대기
    await page.waitForTimeout(3000);

    // 예약 목록 확인
    const bookingCards = page.locator('[class*="glass-card"]');
    const count = await bookingCards.count();

    console.log(`[E2E] 내 예약 목록에 ${count}개의 예약이 있습니다`);

    if (count > 0) {
      // 첫 번째 예약의 상태 확인
      const firstBooking = bookingCards.first();
      const statusBadge = firstBooking.locator('[class*="badge"], span').filter({ hasText: /대기|확정|취소|실패|완료/ });

      if (await statusBadge.first().isVisible()) {
        const statusText = await statusBadge.first().textContent();
        console.log(`[E2E] 첫 번째 예약 상태: ${statusText}`);
      }

      // 예약 상세 페이지로 이동
      await firstBooking.click();
      await page.waitForTimeout(2000);

      // 예약 상세 정보 확인
      const statusInDetail = await page.getByText(/대기중|확정|취소|실패|완료/).first().textContent().catch(() => null);
      console.log(`[E2E] 예약 상세 상태: ${statusInDetail}`);
    }
  });
});

test.describe('Saga 타임아웃 테스트', () => {
  test('PENDING 상태 예약이 타임아웃되는지 확인', async ({ page }) => {
    // 이 테스트는 1분 이상 대기해야 하므로 별도 실행 권장
    test.skip(true, 'Saga 타임아웃 테스트는 별도로 실행해야 합니다 (1분 이상 소요)');

    // TODO: PENDING 상태 예약 생성 후 1분 대기 → FAILED 상태 확인
  });
});
