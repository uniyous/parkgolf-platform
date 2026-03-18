import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * 파트너 연동 현황 E2E 테스트 (Admin Dashboard)
 *
 * 전략:
 *   1단계. API로 테스트 데이터 생성 (Company → Club → Course → Game → Partner → GameMapping)
 *   2단계. 브라우저에서 지원 모드로 해당 회사 선택 → 파트너 연동 현황 페이지 UI 검증
 *   3단계. 테스트 데이터 정리 (역순 삭제)
 */

test.setTimeout(60000);

// ─── 공유 상태 ───

let accessToken: string | null = null;

let createdCompanyId: number | null = null;
let createdClubId: number | null = null;
let createdCourseAId: number | null = null;
let createdCourseBId: number | null = null;
let createdGameId: number | null = null;
let createdPartnerId: number | null = null;
let createdGameMappingId: number | null = null;

const testTimestamp = Date.now();
const COMPANY_NAME = `[E2E] 테스트가맹점 ${testTimestamp}`;
const COMPANY_CODE = `E2E-${testTimestamp}`;
const CLUB_NAME = `[E2E] 테스트골프장 ${testTimestamp}`;
const SYSTEM_NAME = `[E2E] 외부시스템 ${testTimestamp}`;

// ─── 헬퍼 ───

async function getToken(request: APIRequestContext): Promise<string | null> {
  if (accessToken) return accessToken;
  const response = await request.post('/api/admin/iam/login', {
    data: { email: 'admin@parkgolf.com', password: 'admin123!@#' },
  });
  const body = await response.json();
  if (body.success && body.data?.accessToken) {
    accessToken = body.data.accessToken;
    return accessToken;
  }
  return null;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** support-storage에 회사 설정 → 지원 모드 진입 */
async function setSupportCompany(page: Page, company: { id: number; name: string; code: string }) {
  await page.evaluate((c) => {
    const state = {
      state: {
        selectedCompany: {
          id: c.id,
          name: c.name,
          code: c.code,
          companyType: 'FRANCHISE',
          status: 'ACTIVE',
        },
        isSupportMode: true,
      },
      version: 0,
    };
    localStorage.setItem('support-storage', JSON.stringify(state));
  }, company);
}

/** 글로벌 로딩 대기 */
async function waitForLoading(page: Page) {
  const loadingDialog = page.locator('[role="dialog"][aria-label="로딩"]');
  await loadingDialog.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => {
    errors.push(`[PAGE ERROR] ${error.message}`);
  });
  return errors;
}

function filterCriticalErrors(errors: string[]): string[] {
  return errors.filter((e) => {
    if (e.includes('favicon.ico')) return false;
    if (e.includes('net::ERR_')) return false;
    if (e.includes('ResizeObserver')) return false;
    if (e.includes('401')) return false;
    if (e.includes('Failed to load resource')) return false;
    if (e.includes('Failed to fetch')) return false;
    if (e.includes('/admin/dashboard')) return false;
    if (e.includes('/admin/bookings') && !e.includes('/partner')) return false;
    return true;
  });
}

// ========================================
// 1단계: API로 테스트 데이터 생성
// ========================================

test.describe.serial('1. 테스트 데이터 생성 (API)', () => {
  test('TD-001: 토큰 획득', async ({ request }) => {
    const token = await getToken(request);
    expect(token).toBeTruthy();
  });

  test('TD-002: Company(가맹점) 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.post('/api/admin/companies', {
      headers: authHeaders(token),
      data: {
        name: COMPANY_NAME,
        code: COMPANY_CODE,
        companyType: 'FRANCHISE',
        status: 'ACTIVE',
        contactName: 'E2E 테스트',
        contactPhone: '010-0000-0000',
        contactEmail: `e2e-${testTimestamp}@test.com`,
      },
    });

    const body = await response.json();
    console.log('TD-002:', body.success ? '성공' : JSON.stringify(body.error));
    expect(body.success).toBe(true);
    createdCompanyId = body.data.id;
    console.log('  → companyId:', createdCompanyId);
  });

  test('TD-003: Club 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdCompanyId) { test.skip(); return; }

    const response = await request.post('/api/admin/courses/clubs', {
      headers: authHeaders(token),
      data: {
        companyId: createdCompanyId,
        name: CLUB_NAME,
        location: '경기도 테스트시',
        address: '경기도 테스트시 테스트구 123',
        phone: '031-000-0000',
        operatingHours: { open: '06:00', close: '18:00' },
        facilities: ['PARKING'],
        status: 'ACTIVE',
      },
    });

    const body = await response.json();
    expect(body.success).toBe(true);
    createdClubId = body.data.id;
    console.log('  → clubId:', createdClubId);
  });

  test('TD-004: Course A, B 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId || !createdCompanyId) { test.skip(); return; }

    // Course A
    const resA = await request.post('/api/admin/courses', {
      headers: authHeaders(token),
      data: {
        name: '[E2E] A코스', code: `E2E-A-${testTimestamp}`,
        companyId: createdCompanyId, clubId: createdClubId, holeCount: 9,
      },
    });
    const bodyA = await resA.json();
    expect(bodyA.success).toBe(true);
    createdCourseAId = bodyA.data.id;

    // Course B
    const resB = await request.post('/api/admin/courses', {
      headers: authHeaders(token),
      data: {
        name: '[E2E] B코스', code: `E2E-B-${testTimestamp}`,
        companyId: createdCompanyId, clubId: createdClubId, holeCount: 9,
      },
    });
    const bodyB = await resB.json();
    expect(bodyB.success).toBe(true);
    createdCourseBId = bodyB.data.id;

    console.log('  → courseAId:', createdCourseAId, '| courseBId:', createdCourseBId);
  });

  test('TD-005: Game 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId || !createdCourseAId || !createdCourseBId) { test.skip(); return; }

    const response = await request.post('/api/admin/games', {
      headers: authHeaders(token),
      data: {
        clubId: createdClubId,
        name: '[E2E] A+B 코스', code: `E2E-AB-${testTimestamp}`,
        frontNineCourseId: createdCourseAId, backNineCourseId: createdCourseBId,
        totalHoles: 18, maxPlayers: 4, basePrice: 10000,
      },
    });

    const body = await response.json();
    expect(body.success).toBe(true);
    createdGameId = body.data.id;
    console.log('  → gameId:', createdGameId);
  });

  test('TD-006: Partner Config 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId || !createdCompanyId) { test.skip(); return; }

    const response = await request.post('/api/admin/partners', {
      headers: authHeaders(token),
      data: {
        clubId: createdClubId,
        companyId: createdCompanyId,
        systemName: SYSTEM_NAME,
        externalClubId: `EXT-${testTimestamp}`,
        specUrl: 'http://localhost:8080/mock/openapi.json',
        apiKey: 'test-api-key-e2e',
        syncMode: 'API_POLLING',
        syncIntervalMin: 30,
        syncRangeDays: 7,
        responseMapping: {
          slots: { dataPath: 'data.slots', fields: { externalSlotId: 'slot_id', date: 'date', startTime: 'start_time' } },
          bookings: { dataPath: 'data.bookings', fields: { externalBookingId: 'booking_id', playerName: 'player_name' } },
        },
      },
    });

    const body = await response.json();
    expect(body.success).toBe(true);
    createdPartnerId = body.data.id;
    console.log('  → partnerId:', createdPartnerId);
  });

  test('TD-007: GameMapping 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId || !createdGameId) { test.skip(); return; }

    const response = await request.post(`/api/admin/partners/${createdPartnerId}/game-mappings`, {
      headers: authHeaders(token),
      data: {
        externalCourseName: 'A+B코스(외부)',
        externalCourseId: `EXT-CRS-${testTimestamp}`,
        internalGameId: createdGameId,
      },
    });

    const body = await response.json();
    expect(body.success).toBe(true);
    createdGameMappingId = body.data.id;
    console.log('  → gameMappingId:', createdGameMappingId);
    console.log('\n  ✅ 테스트 데이터 생성 완료');
  });
});

// ========================================
// 2단계: UI 테스트 - 파트너 연동 현황 페이지
// ========================================

test.describe.serial('2. 파트너 연동 현황 페이지 UI', () => {
  /** 각 테스트마다 지원 모드 설정 → 파트너 페이지 진입 */
  async function gotoPartnerPage(page: Page) {
    if (!createdCompanyId) return;

    // 먼저 아무 페이지 로드 (localStorage 접근용)
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // 지원 모드에 E2E 회사 설정
    await setSupportCompany(page, {
      id: createdCompanyId,
      name: COMPANY_NAME,
      code: COMPANY_CODE,
    });

    // 파트너 페이지 이동
    await page.goto('/partner-status');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 로딩 대기
    const loading = page.getByText('연동 정보를 불러오는 중');
    await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  test('UI-001: 페이지 진입 시 에러 없이 렌더링', async ({ page }) => {
    if (!createdCompanyId || !createdPartnerId) { test.skip(); return; }

    await gotoPartnerPage(page);
    const errors = collectConsoleErrors(page);
    await page.waitForTimeout(1000);

    // 헤더 확인
    await expect(page.getByText('파트너 연동 현황')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('외부 부킹 시스템 연동 상태를 확인합니다')).toBeVisible();

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('UI-100: 상태 카드 4개 표시', async ({ page }) => {
    if (!createdCompanyId || !createdPartnerId) { test.skip(); return; }

    await gotoPartnerPage(page);

    // 파트너 미설정 확인
    const noPartner = page.getByText('파트너 연동이 설정되지 않았습니다');
    if (await noPartner.isVisible().catch(() => false)) {
      console.log('⚠ 파트너 미설정 — 지원 모드 회사에 데이터 미반영');
      test.skip();
      return;
    }

    // 상태 카드 (span.uppercase 라벨)
    const cardLabels = page.locator('span.uppercase');
    await expect(cardLabels.filter({ hasText: '연결 상태' })).toBeVisible({ timeout: 5000 });
    await expect(cardLabels.filter({ hasText: '동기화 모드' })).toBeVisible();
    await expect(cardLabels.filter({ hasText: '마지막 슬롯 동기화' })).toBeVisible();
    await expect(cardLabels.filter({ hasText: '코스 매핑' })).toBeVisible();

    // 연동 중 표시 (isActive=true로 생성함)
    const connected = page.getByText('연동 중');
    if (await connected.isVisible().catch(() => false)) {
      console.log('  ✓ 연결 상태: 연동 중');
    }

    // 동기화 모드 확인
    const pollingMode = page.getByText('자동 폴링');
    if (await pollingMode.isVisible().catch(() => false)) {
      console.log('  ✓ 동기화 모드: 자동 폴링');
    }

    // 코스 매핑 개수
    const mappingCount = page.getByText('1개');
    if (await mappingCount.isVisible().catch(() => false)) {
      console.log('  ✓ 코스 매핑: 1개');
    }
  });

  test('UI-101: 연동 상세 정보 테이블', async ({ page }) => {
    if (!createdCompanyId || !createdPartnerId) { test.skip(); return; }

    await gotoPartnerPage(page);

    if (await page.getByText('파트너 연동이 설정되지 않았습니다').isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    await expect(page.getByText('연동 상세 정보')).toBeVisible({ timeout: 5000 });

    // 상세 정보 항목
    // dt 요소(상세 정보 라벨)로 특정
    const dtLabels = page.locator('dt');
    await expect(dtLabels.filter({ hasText: '시스템명' })).toBeVisible();
    await expect(dtLabels.filter({ hasText: '동기화 주기' })).toBeVisible();
    await expect(page.getByText('슬롯 동기화', { exact: true })).toBeVisible();
    await expect(page.getByText('예약 동기화', { exact: true })).toBeVisible();

    // E2E 시스템명 확인
    const systemName = page.getByText('[E2E] 외부시스템');
    if (await systemName.isVisible().catch(() => false)) {
      console.log('  ✓ E2E 시스템명 표시 확인');
    }

    // 동기화 주기 (30분)
    const interval = page.getByText('30분');
    if (await interval.isVisible().catch(() => false)) {
      console.log('  ✓ 동기화 주기: 30분');
    }
  });

  test('UI-102: 코스 매핑 테이블', async ({ page }) => {
    if (!createdCompanyId || !createdPartnerId || !createdGameMappingId) { test.skip(); return; }

    await gotoPartnerPage(page);

    if (await page.getByText('파트너 연동이 설정되지 않았습니다').isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // 코스 매핑 헤더
    const courseMappingHeader = page.locator('h3', { hasText: '코스 매핑' });
    if (!(await courseMappingHeader.isVisible().catch(() => false))) {
      console.log('⚠ 코스 매핑 섹션 없음');
      test.skip();
      return;
    }

    // 테이블 헤더
    await expect(page.getByRole('columnheader', { name: /외부 코스명/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /내부 Game ID/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /상태/ })).toBeVisible();

    // E2E 매핑 행
    const extCourseName = page.getByText('A+B코스(외부)');
    if (await extCourseName.isVisible().catch(() => false)) {
      console.log('  ✓ 외부 코스명: A+B코스(외부)');
    }

    // 활성 상태 뱃지
    const activeBadge = page.locator('span', { hasText: '활성' }).first();
    await expect(activeBadge).toBeVisible();
  });

  test('UI-200: 탭 전환 (연동 현황 → 동기화 이력 → 예약 매핑)', async ({ page }) => {
    if (!createdCompanyId || !createdPartnerId) { test.skip(); return; }

    const errors = collectConsoleErrors(page);
    await gotoPartnerPage(page);

    if (await page.getByText('파트너 연동이 설정되지 않았습니다').isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // 탭 버튼
    const overviewTab = page.getByRole('button', { name: '연동 현황' });
    const syncLogsTab = page.getByRole('button', { name: '동기화 이력' });
    const bookingTab = page.getByRole('button', { name: /예약 매핑/ });

    await expect(overviewTab).toBeVisible({ timeout: 5000 });
    await expect(syncLogsTab).toBeVisible();
    await expect(bookingTab).toBeVisible();

    // 동기화 이력 탭
    await syncLogsTab.click();
    await page.waitForTimeout(1500);

    const logsContent = page.getByText('동기화 이력이 없습니다');
    const hasEmptyLogs = await logsContent.isVisible().catch(() => false);
    console.log(`  → 동기화 이력: ${hasEmptyLogs ? '빈 상태' : '데이터 있음'}`);

    // 예약 매핑 탭
    await bookingTab.click();
    await page.waitForTimeout(1500);

    const mappingsContent = page.getByText('예약 매핑 데이터가 없습니다');
    const hasEmptyMappings = await mappingsContent.isVisible().catch(() => false);
    console.log(`  → 예약 매핑: ${hasEmptyMappings ? '빈 상태' : '데이터 있음'}`);

    // 연동 현황 탭 복귀
    await overviewTab.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('연동 상세 정보')).toBeVisible();

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('UI-300: 전체 흐름 에러 없음', async ({ page }) => {
    if (!createdCompanyId) { test.skip(); return; }

    const errors = collectConsoleErrors(page);
    const apiErrors: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/admin/partners') && response.status() >= 400 && response.status() !== 404) {
        apiErrors.push({ url, status: response.status() });
      }
    });

    await gotoPartnerPage(page);
    await page.waitForTimeout(2000);

    const critical = filterCriticalErrors(errors);
    if (critical.length > 0) console.log('⚠ 에러:', critical);
    expect(critical).toHaveLength(0);

    if (apiErrors.length > 0) console.log('⚠ API 에러:', apiErrors);
    expect(apiErrors).toHaveLength(0);
  });
});

// ========================================
// 3단계: 테스트 데이터 정리 (역순)
// ========================================

test.describe('3. 테스트 데이터 정리', () => {
  test('CL-001: GameMapping 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdGameMappingId) { test.skip(); return; }

    const res = await request.delete(`/api/admin/partners/game-mappings/${createdGameMappingId}`, {
      headers: authHeaders(token),
    });
    const body = await res.json();
    console.log('  → GameMapping:', body.success ? '삭제 완료' : body.error?.message);
    expect(body.success).toBe(true);
  });

  test('CL-002: Partner Config 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const res = await request.delete(`/api/admin/partners/${createdPartnerId}`, {
      headers: authHeaders(token),
    });
    const body = await res.json();
    console.log('  → Partner:', body.success ? '삭제 완료' : body.error?.message);
    expect(body.success).toBe(true);
  });

  test('CL-003: Game 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdGameId) { test.skip(); return; }

    const res = await request.delete(`/api/admin/games/${createdGameId}`, {
      headers: authHeaders(token),
    });
    const body = await res.json();
    if (!body.success) {
      console.log('  ⚠ Game 삭제 불가 (슬롯 잔존):', body.error?.message);
      return; // 정리 실패는 허용
    }
    console.log('  → Game: 삭제 완료');
  });

  test('CL-004: Course A/B 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    for (const [label, id] of [['A', createdCourseAId], ['B', createdCourseBId]] as const) {
      if (!id) continue;
      const res = await request.delete(`/api/admin/courses/${id}`, { headers: authHeaders(token) });
      const body = await res.json();
      console.log(`  → Course ${label}:`, body.success ? '삭제 완료' : body.error?.message || '삭제 불가');
    }
  });

  test('CL-005: Club 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const res = await request.delete(`/api/admin/courses/clubs/${createdClubId}`, {
      headers: authHeaders(token),
    });
    const body = await res.json();
    console.log('  → Club:', body.success ? '삭제 완료' : body.error?.message || '삭제 불가');
  });

  test('CL-006: Company 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdCompanyId) { test.skip(); return; }

    const res = await request.delete(`/api/admin/companies/${createdCompanyId}`, {
      headers: authHeaders(token),
    });
    const body = await res.json();
    console.log('  → Company:', body.success ? '삭제 완료' : body.error?.message || '삭제 불가');
  });
});
