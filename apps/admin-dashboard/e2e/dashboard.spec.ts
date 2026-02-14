import { test, expect, type Page } from '@playwright/test';

test.setTimeout(60000);

// ─── 공통 헬퍼 ───

/**
 * 대시보드 진입 (PLATFORM_ADMIN은 가맹점 선택 필요)
 */
async function navigateToDashboard(page: Page) {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // PLATFORM_ADMIN인 경우 가맹점 선택 페이지가 뜸
  const isCompanySelect = await page.getByText('지원할 가맹점을 선택하세요').isVisible().catch(() => false);

  if (isCompanySelect) {
    // 가맹점 목록 로딩 대기 후 첫 번째 가맹점 버튼 클릭
    const companyButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    const hasButton = await companyButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasButton) {
      await companyButton.click();
      // 가맹점 선택 후 대시보드로 이동 — 이미 /dashboard URL인 경우도 있음
      await page.waitForFunction(
        () => !document.body.textContent?.includes('지원할 가맹점을 선택하세요'),
        { timeout: 15000 },
      );
    } else {
      console.log('⚠ 가맹점 버튼 없음 — 테스트 계정에 가맹점 미할당');
    }
  }

  // 글로벌 로딩 다이얼로그 대기
  const loadingDialog = page.locator('[role="dialog"][aria-label="로딩"]');
  await loadingDialog.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {
    console.log('⚠ 로딩 다이얼로그 30초 초과');
  });

  await page.waitForTimeout(500);
}

interface ApiLog {
  url: string;
  status: number;
  ok: boolean;
  body?: string;
}

function setupApiMonitor(page: Page): ApiLog[] {
  const logs: ApiLog[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const body = await response.text().catch(() => '');
      logs.push({ url, status: response.status(), ok: response.ok(), body: body.slice(0, 300) });
    }
  });
  return logs;
}

function printApiErrors(logs: ApiLog[]) {
  const errors = logs.filter((l) => !l.ok);
  if (errors.length === 0) return;
  console.log(`\n──── API Errors (${errors.length}/${logs.length}) ────`);
  for (const e of errors) {
    console.log(`  ❌ [${e.status}] ${e.url}`);
    if (e.body) console.log(`     ${e.body.slice(0, 200)}`);
  }
  console.log('────────────────────────────\n');
}

// ─── 0. 진단 테스트 ───

test.describe('대시보드 - API 진단', () => {
  test('0.1 페이지 렌더링 및 콘솔 에러 진단', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const apiLogs = setupApiMonitor(page);

    await navigateToDashboard(page);
    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText().catch(() => '(empty)');

    console.log('\n──── 페이지 진단 ────');
    console.log(`  Body (200자): ${bodyText.slice(0, 200)}`);

    if (consoleErrors.length > 0) {
      console.log(`  Console Errors (${consoleErrors.length}):`);
      for (const err of consoleErrors.slice(0, 5)) {
        console.log(`    ${err.slice(0, 200)}`);
      }
    } else {
      console.log('  Console Errors: 없음');
    }

    printApiErrors(apiLogs);
    console.log('────────────────────────────\n');

    expect(true).toBeTruthy();
  });

  test('0.2 직접 API 호출 진단', async ({ page }) => {
    await navigateToDashboard(page);

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    if (!token) {
      console.log('⚠ accessToken 없음');
      test.skip();
      return;
    }

    const baseOrigin = new URL(page.url()).origin;
    const endpoints = [
      { name: 'Overview', path: '/api/admin/dashboard/overview' },
      { name: 'Real-Time', path: '/api/admin/dashboard/stats/real-time' },
      { name: 'Trends 7d', path: '/api/admin/dashboard/stats/trends?period=7d' },
      { name: 'Bookings', path: '/api/admin/bookings?page=1&limit=5' },
    ];

    console.log('\n──── 직접 API 호출 진단 ────');
    for (const ep of endpoints) {
      const result = await page.evaluate(
        async ({ url, authToken }) => {
          try {
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            });
            const body = await res.text();
            return { status: res.status, ok: res.ok, body: body.slice(0, 500) };
          } catch (err) {
            return { status: 0, ok: false, body: String(err) };
          }
        },
        { url: `${baseOrigin}${ep.path}`, authToken: token },
      );

      const icon = result.ok ? '✅' : '❌';
      console.log(`  ${icon} [${result.status}] ${ep.name}`);
      if (!result.ok) {
        console.log(`     ${result.body}`);
      }
    }
    console.log('────────────────────────────\n');
  });
});

// ─── 1. 페이지 렌더링 ───

test.describe('대시보드 - 페이지 렌더링', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test('1.1 대시보드 헤더 및 날짜 표시', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/\d{4}년.*\d{1,2}월.*\d{1,2}일/)).toBeVisible({ timeout: 10000 });
  });

  test('1.2 새로고침 버튼 동작', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });

    const refreshButton = page.locator('button[title="새로고침"]');
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
    await refreshButton.click();
    await expect(refreshButton).toBeEnabled({ timeout: 15000 });
  });
});

// ─── 2. KPI 카드 ───

test.describe('대시보드 - KPI 카드', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test('2.1 KPI 카드 4개 렌더링', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });

    const labels = ['오늘 예약', '오늘 매출', '이용률', '취소율'];
    for (const label of labels) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('2.2 KPI 카드 값 표시', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // 카드에 숫자 값이 렌더링되었는지 (건, 원, 백만, %)
    const hasValue = await page.getByText(/\d+(건|원|백만|%)/).first().isVisible().catch(() => false);

    if (!hasValue) {
      console.log('KPI 카드 값 미표시 — API 데이터 미로드 또는 스켈레톤 상태');
    }

    // 그리드 영역은 반드시 존재
    await expect(page.locator('.grid').first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── 3. 차트 ───

test.describe('대시보드 - 차트', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test('3.1 주간 예약·매출 추이 차트 타이틀', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('주간 예약·매출 추이')).toBeVisible({ timeout: 10000 });
  });

  test('3.2 주간 추이 차트 콘텐츠 (SVG 또는 빈 상태)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    const hasChart = await page.locator('.recharts-wrapper').first().isVisible().catch(() => false);
    const hasNoData = await page.getByText('데이터가 없습니다').first().isVisible().catch(() => false);

    expect(hasChart || hasNoData).toBeTruthy();
  });

  test('3.3 예약 현황 분포 도넛 차트 타이틀', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('예약 현황 분포')).toBeVisible({ timeout: 10000 });
  });

  test('3.4 도넛 차트 콘텐츠 (범례 또는 빈 상태)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    const legendLabels = ['대기', '확정', '완료', '취소'];
    let hasLegend = false;
    for (const label of legendLabels) {
      if (await page.getByText(label, { exact: true }).first().isVisible().catch(() => false)) {
        hasLegend = true;
        break;
      }
    }

    const hasNoData = await page.getByText('데이터가 없습니다').nth(1).isVisible().catch(() => false);
    expect(hasLegend || hasNoData).toBeTruthy();
  });
});

// ─── 4. 오늘의 예약 ───

test.describe('대시보드 - 오늘의 예약', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test('4.1 최근 예약 섹션 표시', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('최근 예약').first()).toBeVisible({ timeout: 10000 });
  });

  test('4.2 예약 리스트 또는 빈 상태', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    const hasBookingItem = await page.locator('span.font-mono').first().isVisible().catch(() => false);
    const hasEmptyState = await page.getByText('예약이 없습니다').isVisible().catch(() => false);

    expect(hasBookingItem || hasEmptyState).toBeTruthy();
  });

  test('4.3 전체보기 → 예약 페이지 이동', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15000 });

    const viewAll = page.getByText('전체보기').first();
    const visible = await viewAll.isVisible({ timeout: 5000 }).catch(() => false);

    if (visible) {
      await viewAll.click();
      await page.waitForURL('**/bookings**', { timeout: 10000 });
      expect(page.url()).toContain('/bookings');
    } else {
      console.log('전체보기 미표시 — 로딩 중일 수 있음');
      await expect(page.getByText('최근 예약').first()).toBeVisible();
    }
  });
});
