import { test, expect, type Page } from '@playwright/test';

test.setTimeout(60000);

// ─── API 호출 헬퍼 ───

async function callApi<T = unknown>(
  page: Page,
  path: string,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  return page.evaluate(async (apiPath: string) => {
    const token = localStorage.getItem('accessToken');
    const baseUrl = location.origin;
    try {
      const res = await fetch(`${baseUrl}${apiPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      return { ok: res.ok, status: res.status, data: json.success ? json.data : json };
    } catch (err) {
      return { ok: false, status: 0, data: null };
    }
  }, path);
}

/**
 * BFF는 NATS 응답을 그대로 전달 → { success: true, data: { ... } }
 * 이 래핑을 풀어서 실제 데이터만 반환
 */
function unwrapNats(obj: any): any {
  if (obj && typeof obj === 'object' && obj.success === true && obj.data !== undefined) {
    return obj.data;
  }
  return obj;
}

async function navigateToDashboard(page: Page) {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const isCompanySelect = await page
    .getByText('지원할 가맹점을 선택하세요')
    .isVisible()
    .catch(() => false);

  if (isCompanySelect) {
    const companyButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();
    const hasButton = await companyButton
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    if (hasButton) {
      await companyButton.click();
      await page.waitForFunction(
        () =>
          !document.body.textContent?.includes('지원할 가맹점을 선택하세요'),
        { timeout: 15000 },
      );
    }
  }

  const loadingDialog = page.locator('[role="dialog"][aria-label="로딩"]');
  await loadingDialog
    .waitFor({ state: 'hidden', timeout: 30000 })
    .catch(() => {});
  await page.waitForTimeout(500);
}

// ─── 데이터 정합성 검증 ───

test.describe('대시보드 - 데이터 정합성 검증', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test('1. bookings.stats — 상태별 카운트 합계 검증', async ({ page }) => {
    const result = await callApi<any>(page, '/api/admin/dashboard/overview');
    expect(result.ok).toBeTruthy();

    const b = unwrapNats(result.data?.bookings);
    if (!b || b.error) {
      console.log('⚠ bookings 데이터 없음:', result.data?.bookings);
      test.skip();
      return;
    }

    console.log('\n──── bookings.stats 검증 ────');
    console.log(`  totalBookings:        ${b.totalBookings}`);
    console.log(`  confirmedBookings:    ${b.confirmedBookings}`);
    console.log(`  cancelledBookings:    ${b.cancelledBookings}`);
    console.log(`  completedBookings:    ${b.completedBookings}`);
    console.log(`  pendingBookings:      ${b.pendingBookings}`);
    console.log(`  noShowBookings:       ${b.noShowBookings}`);
    console.log(`  bookingGrowthRate:    ${b.bookingGrowthRate}%`);
    console.log(`  averageBookingsPerDay:${b.averageBookingsPerDay}`);
    console.log(`  count (RealTime):     ${b.count}`);
    console.log(`  revenue (RealTime):   ${b.revenue}`);

    // 검증 1: 모든 필드가 숫자
    const numFields = [
      'totalBookings', 'confirmedBookings', 'cancelledBookings',
      'completedBookings', 'pendingBookings', 'noShowBookings',
      'bookingGrowthRate', 'averageBookingsPerDay', 'count', 'revenue',
    ];
    for (const field of numFields) {
      expect(typeof b[field]).toBe('number');
    }

    // 검증 2: 카운트 >= 0
    expect(b.totalBookings).toBeGreaterThanOrEqual(0);
    expect(b.confirmedBookings).toBeGreaterThanOrEqual(0);
    expect(b.cancelledBookings).toBeGreaterThanOrEqual(0);
    expect(b.completedBookings).toBeGreaterThanOrEqual(0);
    expect(b.pendingBookings).toBeGreaterThanOrEqual(0);
    expect(b.noShowBookings).toBeGreaterThanOrEqual(0);

    // 검증 3: count === totalBookings (호환 필드)
    expect(b.count).toBe(b.totalBookings);

    // 검증 4: 상태별 합 <= totalBookings
    // (FAILED, SLOT_RESERVED 등 누락 상태가 있을 수 있으므로 <= )
    const statusSum = b.confirmedBookings + b.cancelledBookings
      + b.completedBookings + b.pendingBookings + b.noShowBookings;
    expect(statusSum).toBeLessThanOrEqual(b.totalBookings);
    console.log(`  상태별 합: ${statusSum}, total: ${b.totalBookings} (차이 ${b.totalBookings - statusSum} = FAILED/SLOT_RESERVED)`);

    // 검증 5: averageBookingsPerDay >= 0
    expect(b.averageBookingsPerDay).toBeGreaterThanOrEqual(0);

    console.log('  ✅ bookings.stats 정합성 통과');
    console.log('────────────────────────────\n');
  });

  test('2. payments.revenueStats — 매출 필드 정합성', async ({ page }) => {
    const result = await callApi<any>(page, '/api/admin/dashboard/overview');
    expect(result.ok).toBeTruthy();

    const r = unwrapNats(result.data?.revenue);
    if (!r || r.error) {
      console.log('⚠ revenue 데이터 없음:', result.data?.revenue);
      test.skip();
      return;
    }

    console.log('\n──── payments.revenueStats 검증 ────');
    console.log(`  totalRevenue:             ${r.totalRevenue}`);
    console.log(`  revenueGrowthRate:        ${r.revenueGrowthRate}%`);
    console.log(`  averageRevenuePerBooking: ${r.averageRevenuePerBooking}`);
    console.log(`  monthlyRecurringRevenue:  ${r.monthlyRecurringRevenue}`);
    console.log(`  transactionCount:         ${r.transactionCount}`);
    console.log(`  refundTotal:              ${r.refundTotal}`);
    console.log(`  total (RealTime):         ${r.total}`);
    console.log(`  growth (RealTime):        ${r.growth}%`);

    // 검증 1: 모든 필드가 숫자
    const numFields = [
      'totalRevenue', 'revenueGrowthRate', 'averageRevenuePerBooking',
      'monthlyRecurringRevenue', 'transactionCount', 'refundTotal',
      'total', 'growth',
    ];
    for (const field of numFields) {
      expect(typeof r[field]).toBe('number');
    }

    // 검증 2: total === totalRevenue (호환 필드)
    expect(r.total).toBe(r.totalRevenue);

    // 검증 3: growth === revenueGrowthRate (호환 필드)
    expect(r.growth).toBe(r.revenueGrowthRate);

    // 검증 4: refundTotal >= 0
    expect(r.refundTotal).toBeGreaterThanOrEqual(0);

    // 검증 5: transactionCount >= 0
    expect(r.transactionCount).toBeGreaterThanOrEqual(0);

    // 검증 6: totalRevenue >= 0 (환불이 결제보다 많을 수 없음 - 정상 상태)
    expect(r.totalRevenue).toBeGreaterThanOrEqual(0);

    // 검증 7: averageRevenuePerBooking >= 0
    expect(r.averageRevenuePerBooking).toBeGreaterThanOrEqual(0);

    console.log('  ✅ payments.revenueStats 정합성 통과');
    console.log('────────────────────────────\n');
  });

  test('3. notifications.stats — 비율 범위 0~100', async ({ page }) => {
    const result = await callApi<any>(page, '/api/admin/dashboard/overview');
    expect(result.ok).toBeTruthy();

    const n = unwrapNats(result.data?.notifications);
    if (!n || n.error) {
      console.log('⚠ notifications 데이터 없음:', result.data?.notifications);
      test.skip();
      return;
    }

    console.log('\n──── notifications.stats 검증 ────');
    console.log(`  totalSent:            ${n.totalSent}`);
    console.log(`  deliveryRate:         ${n.deliveryRate}%`);
    console.log(`  readRate:             ${n.readRate}%`);
    console.log(`  failedNotifications:  ${n.failedNotifications}`);

    // 검증 1: 모든 필드가 숫자
    for (const field of ['totalSent', 'deliveryRate', 'readRate', 'failedNotifications']) {
      expect(typeof n[field]).toBe('number');
    }

    // 검증 2: totalSent >= 0
    expect(n.totalSent).toBeGreaterThanOrEqual(0);

    // 검증 3: deliveryRate 0~100 범위
    expect(n.deliveryRate).toBeGreaterThanOrEqual(0);
    expect(n.deliveryRate).toBeLessThanOrEqual(100);

    // 검증 4: readRate 0~100 범위
    expect(n.readRate).toBeGreaterThanOrEqual(0);
    expect(n.readRate).toBeLessThanOrEqual(100);

    // 검증 5: failedNotifications >= 0
    expect(n.failedNotifications).toBeGreaterThanOrEqual(0);

    console.log('  ✅ notifications.stats 정합성 통과');
    console.log('────────────────────────────\n');
  });

  test('4. dashboard.stats 트렌드 — 배열 구조 및 날짜 정렬', async ({ page }) => {
    const result = await callApi<any>(page, '/api/admin/dashboard/stats/trends?period=7d');
    expect(result.ok).toBeTruthy();

    // BFF: { trends: NatsResponse } → unwrap 필요
    const trends = unwrapNats(result.data?.trends);
    if (!trends) {
      console.log('⚠ trends 데이터 없음:', result.data?.trends);
      test.skip();
      return;
    }

    console.log('\n──── dashboard.stats 트렌드 검증 ────');
    console.log(`  bookings entries:         ${trends.bookings?.length ?? 0}`);
    console.log(`  revenue entries:          ${trends.revenue?.length ?? 0}`);
    console.log(`  users entries:            ${trends.users?.length ?? 0}`);
    console.log(`  courseUtilization entries: ${trends.courseUtilization?.length ?? 0}`);

    // 검증 1: bookings, revenue, users, courseUtilization은 배열
    expect(Array.isArray(trends.bookings)).toBeTruthy();
    expect(Array.isArray(trends.revenue)).toBeTruthy();
    expect(Array.isArray(trends.users)).toBeTruthy();
    expect(Array.isArray(trends.courseUtilization)).toBeTruthy();

    // 검증 2: bookings와 revenue 배열 길이 일치
    expect(trends.bookings.length).toBe(trends.revenue.length);

    // 검증 3: 날짜 오름차순 정렬
    if (trends.bookings.length > 1) {
      for (let i = 1; i < trends.bookings.length; i++) {
        expect(trends.bookings[i].date >= trends.bookings[i - 1].date).toBeTruthy();
      }
      console.log('  날짜 오름차순 정렬: OK');
    }

    // 검증 4: 각 항목 구조 확인 (date:string, count:number / date:string, amount:number)
    for (const entry of trends.bookings) {
      expect(typeof entry.date).toBe('string');
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof entry.count).toBe('number');
      expect(entry.count).toBeGreaterThanOrEqual(0);
    }
    for (const entry of trends.revenue) {
      expect(typeof entry.date).toBe('string');
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof entry.amount).toBe('number');
      expect(entry.amount).toBeGreaterThanOrEqual(0);
    }

    // 출력: 데이터 샘플
    for (const entry of trends.bookings.slice(0, 5)) {
      const rev = trends.revenue.find((r: any) => r.date === entry.date);
      console.log(`    ${entry.date}: 예약 ${entry.count}건, 매출 ${rev?.amount ?? 0}원`);
    }

    console.log('  ✅ dashboard.stats 트렌드 정합성 통과');
    console.log('────────────────────────────\n');
  });

  test('5. real-time stats — bookings.stats 호환 필드 (count, revenue)', async ({ page }) => {
    const result = await callApi<any>(page, '/api/admin/dashboard/stats/real-time');
    expect(result.ok).toBeTruthy();

    const todayBookings = unwrapNats(result.data?.today?.bookings);
    const todayRevenue = unwrapNats(result.data?.today?.revenue);

    console.log('\n──── real-time stats 검증 ────');

    // bookings.stats의 count/revenue 필드
    if (todayBookings && !todayBookings.error) {
      console.log(`  today.bookings.count:          ${todayBookings.count}`);
      console.log(`  today.bookings.totalBookings:  ${todayBookings.totalBookings}`);
      console.log(`  today.bookings.revenue:        ${todayBookings.revenue}`);

      expect(typeof todayBookings.count).toBe('number');
      expect(todayBookings.count).toBe(todayBookings.totalBookings);
      expect(todayBookings.count).toBeGreaterThanOrEqual(0);
      console.log('  ✅ today.bookings 정합성 통과');
    } else {
      console.log('  ⚠ today.bookings 데이터 없음');
    }

    // payments.revenueStats의 total/growth 필드
    if (todayRevenue && !todayRevenue.error) {
      console.log(`  today.revenue.total:           ${todayRevenue.total}`);
      console.log(`  today.revenue.totalRevenue:     ${todayRevenue.totalRevenue}`);
      console.log(`  today.revenue.growth:          ${todayRevenue.growth}%`);

      expect(typeof todayRevenue.total).toBe('number');
      expect(todayRevenue.total).toBe(todayRevenue.totalRevenue);
      expect(typeof todayRevenue.growth).toBe('number');
      expect(todayRevenue.growth).toBe(todayRevenue.revenueGrowthRate);
      console.log('  ✅ today.revenue 정합성 통과');
    } else {
      console.log('  ⚠ today.revenue 데이터 없음');
    }

    console.log('────────────────────────────\n');
  });

  test('6. 트렌드 합계 vs overview 교차 검증 (30d)', async ({ page }) => {
    const [overviewResult, trendResult] = await Promise.all([
      callApi<any>(page, '/api/admin/dashboard/overview'),
      callApi<any>(page, '/api/admin/dashboard/stats/trends?period=30d'),
    ]);

    expect(overviewResult.ok).toBeTruthy();
    expect(trendResult.ok).toBeTruthy();

    const bookingStats = unwrapNats(overviewResult.data?.bookings);
    const trends = unwrapNats(trendResult.data?.trends);

    if (!bookingStats || bookingStats.error || !trends || !trends.bookings) {
      console.log('⚠ 데이터 부족으로 교차 검증 스킵');
      test.skip();
      return;
    }

    // 트렌드 일별 합산
    const trendTotalBookings = trends.bookings.reduce(
      (sum: number, e: any) => sum + e.count, 0,
    );
    const trendTotalRevenue = trends.revenue.reduce(
      (sum: number, e: any) => sum + e.amount, 0,
    );

    console.log('\n──── overview vs 트렌드 교차 검증 (30d) ────');
    console.log(`  overview.totalBookings: ${bookingStats.totalBookings}`);
    console.log(`  트렌드 합산 예약건수:   ${trendTotalBookings}`);
    console.log(`  overview.revenue:       ${bookingStats.revenue}`);
    console.log(`  트렌드 합산 매출:       ${trendTotalRevenue}`);

    // 검증 1: overview totalBookings == 트렌드 합산 (동일 기간이면 동일해야 함)
    expect(trendTotalBookings).toBe(bookingStats.totalBookings);

    // 검증 2: overview revenue (booking totalPrice 합) == 트렌드 매출 합산
    expect(trendTotalRevenue).toBe(bookingStats.revenue);

    console.log('  ✅ overview ↔ 트렌드 교차 검증 통과');
    console.log('────────────────────────────\n');
  });
});
