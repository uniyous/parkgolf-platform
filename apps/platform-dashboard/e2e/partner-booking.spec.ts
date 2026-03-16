import { test, expect } from '@playwright/test';

/**
 * 외부 부킹 데이터 연동 E2E 테스트 (Platform Dashboard)
 *
 * API: admin-api → NATS → partner-service 전체 흐름
 *
 * 시나리오:
 *   1. 인증: API 로그인 → 토큰 획득
 *   2. 파트너 설정 CRUD: 생성 → 조회 → 수정 → 삭제
 *   3. 게임 매핑 CRUD: 생성 → 목록 → 수정 → 삭제
 *   4. 동기화 이력 & 매핑 조회
 *   5. 인증 에러 케이스
 *   6. 테스트 데이터 정리
 *
 * 테스트 데이터 격리:
 *   - clubId: 99901 (존재하지 않는 테스트용 ID)
 *   - externalClubId: EXT-TEST-{timestamp}
 *   - systemName: [테스트] prefix
 *   - 테스트 종료 시 생성된 데이터 삭제
 */

// 공유 상태 (serial 실행, workers: 1 이므로 안전)
let accessToken: string | null = null;
let createdPartnerId: number | null = null;
let createdGameMappingId: number | null = null;

const TEST_CLUB_ID = 99901;
const testTimestamp = Date.now();

// API 로그인으로 토큰 획득
async function getToken(request: import('@playwright/test').APIRequestContext): Promise<string | null> {
  if (accessToken) return accessToken;

  const response = await request.post('/api/admin/iam/login', {
    data: {
      email: 'admin@parkgolf.com',
      password: 'admin123!@#',
    },
  });

  const body = await response.json();
  if (body.success && body.data?.accessToken) {
    accessToken = body.data.accessToken;
    return accessToken;
  }
  return null;
}

// ========================================
// 0. API 연결 & 인증 확인
// ========================================
test.describe('0. API 연결 & 인증 확인', () => {
  test('TC-000: Health Check', async ({ request }) => {
    const response = await request.get('/api/admin/health');
    console.log('TC-000: Health Status:', response.status());
    expect([200, 404]).toContain(response.status());
  });

  test('TC-001: API 로그인 → 토큰 획득', async ({ request }) => {
    const token = await getToken(request);
    console.log('TC-001: Token exists:', !!token);
    expect(token).toBeTruthy();
  });
});

// ========================================
// 1. 파트너 설정 CRUD
// ========================================
test.describe('1. 파트너 설정 CRUD', () => {
  const testPartnerConfig = {
    clubId: TEST_CLUB_ID,
    companyId: 1,
    systemName: '[테스트] 외부 파크골프 예약시스템',
    externalClubId: `EXT-TEST-${testTimestamp}`,
    specUrl: 'http://localhost:8080/mock/openapi.json',
    apiKey: 'test-api-key-e2e-12345',
    responseMapping: {
      slots: { path: 'data.slots', fields: {} },
      bookings: { path: 'data.bookings', fields: {} },
    },
  };

  test('TC-002: 파트너 설정 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.post('/api/admin/partners', {
      headers: { Authorization: `Bearer ${token}` },
      data: testPartnerConfig,
    });

    const body = await response.json();
    console.log('TC-002:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.clubId).toBe(TEST_CLUB_ID);
    expect(body.data.systemName).toBe(testPartnerConfig.systemName);
    expect(body.data.apiKey).toBe('********');

    createdPartnerId = body.data.id;
  });

  test('TC-003: 파트너 설정 상세 조회 (ID)', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-003:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdPartnerId);
    expect(body.data.clubId).toBe(TEST_CLUB_ID);
  });

  test('TC-004: 파트너 설정 목록 조회 (페이지네이션)', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.get('/api/admin/partners?page=1&limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-004:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.page).toBe(1);
  });

  test('TC-005: 파트너 설정 수정', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.put(`/api/admin/partners/${createdPartnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        systemName: '[테스트-수정] 외부 파크골프 예약시스템',
        syncIntervalMin: 15,
      },
    });

    const body = await response.json();
    console.log('TC-005:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.systemName).toBe('[테스트-수정] 외부 파크골프 예약시스템');
  });

  test('TC-006: 내 골프장 파트너 설정 조회 (clubId)', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/my/club/${TEST_CLUB_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-006:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.clubId).toBe(TEST_CLUB_ID);
  });

  test('TC-007: 존재하지 않는 파트너 조회 → 에러', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.get('/api/admin/partners/99999', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-007:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });
});

// ========================================
// 2. 게임 매핑 CRUD
// ========================================
test.describe('2. 게임 매핑 CRUD', () => {
  test('TC-008: 게임 매핑 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.post(`/api/admin/partners/${createdPartnerId}/game-mappings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        externalCourseName: 'A+B코스',
        externalCourseId: 'CRS-001',
        internalGameId: 1,
      },
    });

    const body = await response.json();
    console.log('TC-008:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.externalCourseName).toBe('A+B코스');

    createdGameMappingId = body.data.id;
  });

  test('TC-009: 게임 매핑 목록 조회', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}/game-mappings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-009:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('TC-010: 게임 매핑 수정', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdGameMappingId) { test.skip(); return; }

    const response = await request.put(`/api/admin/partners/game-mappings/${createdGameMappingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        externalCourseName: 'A+B코스(수정)',
      },
    });

    const body = await response.json();
    console.log('TC-010:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
  });

  test('TC-011: 게임 매핑 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdGameMappingId) { test.skip(); return; }

    const response = await request.delete(`/api/admin/partners/game-mappings/${createdGameMappingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-011:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
  });
});

// ========================================
// 3. 동기화 이력 & 매핑 조회
// ========================================
test.describe('3. 동기화 이력 & 매핑 조회', () => {
  test('TC-012: 동기화 이력 조회', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/my/club/${TEST_CLUB_ID}/sync-logs?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-012:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
  });

  test('TC-013: 예약 매핑 목록 조회', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/my/club/${TEST_CLUB_ID}/booking-mappings?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-013:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
  });

  test('TC-014: 슬롯 매핑 목록 조회', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}/slot-mappings?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-014:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
  });
});

// ========================================
// 4. 인증 에러 케이스
// ========================================
test.describe('4. 인증 에러 케이스', () => {
  test('TC-015: 토큰 없이 파트너 목록 조회 → 인증 에러', async ({ request }) => {
    const response = await request.get('/api/admin/partners');
    const status = response.status();
    console.log('TC-015: Status:', status);

    expect(status).toBeGreaterThanOrEqual(400);
  });

  test('TC-016: 잘못된 토큰으로 파트너 생성 → 에러', async ({ request }) => {
    const response = await request.post('/api/admin/partners', {
      headers: { Authorization: 'Bearer invalid_token' },
      data: { clubId: 1 },
    });

    const status = response.status();
    console.log('TC-016: Status:', status);

    expect(status).toBeGreaterThanOrEqual(400);
  });
});

// ========================================
// 5. 테스트 데이터 정리
// ========================================
test.describe('5. 테스트 데이터 정리', () => {
  test('TC-017: 테스트 파트너 설정 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.delete(`/api/admin/partners/${createdPartnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-017:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
  });

  test('TC-018: 삭제된 파트너 조회 → 에러', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    console.log('TC-018:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(false);
  });
});
