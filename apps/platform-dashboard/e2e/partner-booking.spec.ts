import { test, expect } from '@playwright/test';

/**
 * 외부 부킹 데이터 연동 E2E 테스트 (Platform Dashboard)
 *
 * 전체 흐름: 골프장 등록 → 파트너 설정 → 데이터 동기화
 *
 * 시나리오:
 *   0. API 연결 & 인증
 *   1. 골프장 기본정보 등록: Club → Course A, B → Game (A+B)
 *   2. 파트너 설정: Config 생성 → Game Mapping
 *   3. 데이터 동기화: Manual Sync → Sync Log 확인 → Mapping 조회
 *   4. 파트너 설정 CRUD 검증: 조회 → 수정 → 목록
 *   5. 게임 매핑 CRUD 검증: 수정 → 삭제 → 재생성
 *   6. 인증 에러 케이스
 *   7. 테스트 데이터 정리 (역순)
 *
 * 테스트 데이터 격리:
 *   - Club/Course/Game: [E2E] prefix, companyId: 1
 *   - Partner: clubId 동적 할당, externalClubId: EXT-TEST-{timestamp}
 *   - 테스트 종료 시 전체 삭제
 */

// 공유 상태 (serial, workers: 1)
let accessToken: string | null = null;

// 골프장 기본정보
let createdClubId: number | null = null;
let createdCourseAId: number | null = null;
let createdCourseBId: number | null = null;
let createdGameId: number | null = null;

// 파트너 설정
let createdPartnerId: number | null = null;
let createdGameMappingId: number | null = null;

const testTimestamp = Date.now();
const TEST_COMPANY_ID = 1;

// 인증 헬퍼
async function getToken(request: import('@playwright/test').APIRequestContext): Promise<string | null> {
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

// ========================================
// 0. API 연결 & 인증 확인
// ========================================
test.describe('0. API 연결 & 인증', () => {
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
// 1. 골프장 기본정보 등록
// ========================================
test.describe('1. 골프장 기본정보 등록', () => {
  test('TC-100: Club(골프장) 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.post('/api/admin/courses/clubs', {
      headers: authHeaders(token),
      data: {
        companyId: TEST_COMPANY_ID,
        name: `[E2E] 테스트 파크골프장 ${testTimestamp}`,
        location: '경기도 테스트시',
        address: '경기도 테스트시 테스트구 테스트로 123',
        phone: '031-000-0000',
        operatingHours: { open: '06:00', close: '18:00' },
        facilities: ['PARKING'],
        status: 'ACTIVE',
      },
    });

    const body = await response.json();
    console.log('TC-100:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeGreaterThan(0);

    createdClubId = body.data.id;
    console.log('  → clubId:', createdClubId);
  });

  test('TC-101: Course A (전반 9홀) 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.post('/api/admin/courses', {
      headers: authHeaders(token),
      data: {
        name: '[E2E] A코스',
        code: 'E2E-A',
        companyId: TEST_COMPANY_ID,
        clubId: createdClubId,
        holeCount: 9,
        description: 'E2E 테스트용 전반 코스',
      },
    });

    const body = await response.json();
    console.log('TC-101:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    createdCourseAId = body.data.id;
    console.log('  → courseAId:', createdCourseAId);
  });

  test('TC-102: Course B (후반 9홀) 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.post('/api/admin/courses', {
      headers: authHeaders(token),
      data: {
        name: '[E2E] B코스',
        code: 'E2E-B',
        companyId: TEST_COMPANY_ID,
        clubId: createdClubId,
        holeCount: 9,
        description: 'E2E 테스트용 후반 코스',
      },
    });

    const body = await response.json();
    console.log('TC-102:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    createdCourseBId = body.data.id;
    console.log('  → courseBId:', createdCourseBId);
  });

  test('TC-103: Game (A+B 코스 조합) 생성', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId || !createdCourseAId || !createdCourseBId) { test.skip(); return; }

    const response = await request.post('/api/admin/games', {
      headers: authHeaders(token),
      data: {
        clubId: createdClubId,
        name: '[E2E] A+B 코스',
        code: 'E2E-AB',
        frontNineCourseId: createdCourseAId,
        backNineCourseId: createdCourseBId,
        totalHoles: 18,
        maxPlayers: 4,
        basePrice: 10000,
      },
    });

    const body = await response.json();
    console.log('TC-103:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeGreaterThan(0);

    createdGameId = body.data.id;
    console.log('  → gameId:', createdGameId);
  });

  test('TC-104: 생성된 골프장 조회 확인', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.get(`/api/admin/courses/clubs/${createdClubId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-104:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdClubId);
    expect(body.data.name).toContain('[E2E]');
    expect(body.data.status).toBe('ACTIVE');
  });

  test('TC-105: 골프장 게임 목록 조회', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.get(`/api/admin/games/club/${createdClubId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-105:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ========================================
// 2. 파트너 설정
// ========================================
test.describe('2. 파트너 설정', () => {
  test('TC-200: 파트너 설정 생성 (골프장 연결)', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.post('/api/admin/partners', {
      headers: authHeaders(token),
      data: {
        clubId: createdClubId,
        companyId: TEST_COMPANY_ID,
        systemName: `[E2E] 외부 예약시스템 ${testTimestamp}`,
        externalClubId: `EXT-TEST-${testTimestamp}`,
        specUrl: 'http://localhost:8080/mock/openapi.json',
        apiKey: 'test-api-key-e2e-12345',
        responseMapping: {
          slots: {
            dataPath: 'data.slots',
            fields: {
              externalSlotId: 'slot_id',
              courseId: 'course_id',
              courseName: 'course_name',
              date: 'date',
              startTime: 'start_time',
              endTime: 'end_time',
              maxPlayers: 'max_players',
              bookedPlayers: 'booked_players',
              status: 'status',
            },
            statusMapping: { OPEN: 'AVAILABLE', FULL: 'FULLY_BOOKED', CLOSED: 'CLOSED' },
          },
          bookings: {
            dataPath: 'data.bookings',
            fields: {
              externalBookingId: 'booking_id',
              slotId: 'slot_id',
              playerName: 'player_name',
              playerPhone: 'player_phone',
              playerCount: 'player_count',
              status: 'status',
            },
            statusMapping: { CONFIRMED: 'CONFIRMED', CANCELLED: 'CANCELLED' },
          },
        },
      },
    });

    const body = await response.json();
    console.log('TC-200:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.clubId).toBe(createdClubId);
    expect(body.data.isActive).toBe(true);
    expect(body.data.slotSyncEnabled).toBe(true);
    expect(body.data.bookingSyncEnabled).toBe(true);
    expect(body.data.apiKey).toBe('********');

    createdPartnerId = body.data.id;
    console.log('  → partnerId:', createdPartnerId);
  });

  test('TC-201: 게임 매핑 생성 (외부 코스 → 내부 게임)', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId || !createdGameId) { test.skip(); return; }

    const response = await request.post(`/api/admin/partners/${createdPartnerId}/game-mappings`, {
      headers: authHeaders(token),
      data: {
        externalCourseName: 'A+B코스',
        externalCourseId: 'EXT-CRS-AB',
        internalGameId: createdGameId,
      },
    });

    const body = await response.json();
    console.log('TC-201:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.internalGameId).toBe(createdGameId);

    createdGameMappingId = body.data.id;
    console.log('  → gameMappingId:', createdGameMappingId);
  });

  test('TC-202: 파트너 설정 상세 조회 (게임 매핑 포함)', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-202:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdPartnerId);
    expect(body.data.gameMappings).toBeInstanceOf(Array);
    expect(body.data.gameMappings.length).toBeGreaterThanOrEqual(1);
  });
});

// ========================================
// 3. 데이터 동기화 (Manual Sync via admin-api)
// ========================================
test.describe('3. 데이터 동기화', () => {
  test('TC-300: 수동 동기화 트리거', async ({ request }) => {
    test.setTimeout(30000);

    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.post(`/api/admin/partners/my/club/${createdClubId}/sync`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-300:', JSON.stringify(body, null, 2));

    // 동기화 실행됨 (외부 API 없으므로 FAILED 예상, 하지만 응답은 success)
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    // 동기화 결과 배열 (slot, booking 각각)
    if (Array.isArray(body.data)) {
      for (const result of body.data) {
        console.log(`  → ${result.action}: ${result.status} (${result.durationMs}ms)`);
        // 외부 API가 없으므로 FAILED 예상
        expect(['SUCCESS', 'PARTIAL', 'FAILED']).toContain(result.status);
      }
    }
  });

  test('TC-301: 동기화 이력 확인', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/my/club/${createdClubId}/sync-logs?page=1&limit=10`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-301:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    // 수동 동기화 후 이력이 존재해야 함
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    // 첫 번째 로그 검증
    const latestLog = body.data[0];
    console.log(`  → Latest: ${latestLog.action} / ${latestLog.status} / ${latestLog.recordCount} records`);
    expect(latestLog.partnerId).toBe(createdPartnerId);
    expect(['SLOT_SYNC', 'BOOKING_IMPORT']).toContain(latestLog.action);
  });

  test('TC-302: 파트너 설정 동기화 상태 확인', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-302:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    // 동기화 시도 후 lastSlotSyncAt이 업데이트됨
    expect(body.data.lastSlotSyncAt).not.toBeNull();
    expect(body.data.lastSlotSyncStatus).toBeDefined();
    console.log(`  → lastSlotSyncStatus: ${body.data.lastSlotSyncStatus}`);
    console.log(`  → lastSlotSyncAt: ${body.data.lastSlotSyncAt}`);
  });

  test('TC-303: 슬롯 매핑 조회', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}/slot-mappings?page=1&limit=10`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-303:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    // 외부 API 연결 불가이므로 매핑 데이터 없을 수 있음
    expect(body.data).toBeInstanceOf(Array);
  });

  test('TC-304: 예약 매핑 조회', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/my/club/${createdClubId}/booking-mappings?page=1&limit=10`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-304:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
  });
});

// ========================================
// 4. 파트너 설정 CRUD 검증
// ========================================
test.describe('4. 파트너 설정 CRUD 검증', () => {
  test('TC-400: 파트너 설정 수정', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.put(`/api/admin/partners/${createdPartnerId}`, {
      headers: authHeaders(token),
      data: {
        systemName: `[E2E-수정] 외부 예약시스템`,
        syncIntervalMin: 15,
        syncRangeDays: 5,
      },
    });

    const body = await response.json();
    console.log('TC-400:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.systemName).toContain('[E2E-수정]');
    expect(body.data.syncIntervalMin).toBe(15);
    expect(body.data.syncRangeDays).toBe(5);
  });

  test('TC-401: 파트너 목록 조회 (페이지네이션)', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.get('/api/admin/partners?page=1&limit=10', {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-401:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  test('TC-402: 내 골프장 파트너 설정 조회 (clubId)', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/my/club/${createdClubId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-402:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.clubId).toBe(createdClubId);
  });

  test('TC-403: 존재하지 않는 파트너 조회 → 에러', async ({ request }) => {
    const token = await getToken(request);
    if (!token) { test.skip(); return; }

    const response = await request.get('/api/admin/partners/99999', {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-403:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(false);
  });
});

// ========================================
// 5. 게임 매핑 CRUD 검증
// ========================================
test.describe('5. 게임 매핑 CRUD 검증', () => {
  test('TC-500: 게임 매핑 목록 조회', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}/game-mappings`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-500:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('TC-501: 게임 매핑 수정', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdGameMappingId) { test.skip(); return; }

    const response = await request.put(`/api/admin/partners/game-mappings/${createdGameMappingId}`, {
      headers: authHeaders(token),
      data: { externalCourseName: 'A+B코스(수정)' },
    });

    const body = await response.json();
    console.log('TC-501:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
  });

  test('TC-502: 게임 매핑 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdGameMappingId) { test.skip(); return; }

    const response = await request.delete(`/api/admin/partners/game-mappings/${createdGameMappingId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-502:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    createdGameMappingId = null;
  });
});

// ========================================
// 6. 인증 에러 케이스
// ========================================
test.describe('6. 인증 에러 케이스', () => {
  test('TC-600: 토큰 없이 파트너 목록 → 401', async ({ request }) => {
    const response = await request.get('/api/admin/partners');
    console.log('TC-600: Status:', response.status());
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC-601: 잘못된 토큰으로 골프장 생성 → 에러', async ({ request }) => {
    const response = await request.post('/api/admin/courses/clubs', {
      headers: { Authorization: 'Bearer invalid_token' },
      data: { name: 'test' },
    });
    console.log('TC-601: Status:', response.status());
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

// ========================================
// 7. 테스트 데이터 정리 (역순)
// ========================================
test.describe('7. 테스트 데이터 정리', () => {
  test('TC-700: 파트너 설정 삭제 (게임 매핑, 동기화 이력 cascade)', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.delete(`/api/admin/partners/${createdPartnerId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-700:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
  });

  test('TC-701: 삭제된 파트너 조회 → 에러', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdPartnerId) { test.skip(); return; }

    const response = await request.get(`/api/admin/partners/${createdPartnerId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-701:', JSON.stringify(body, null, 2));
    expect(body.success).toBe(false);
  });

  test('TC-702: Game 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdGameId) { test.skip(); return; }

    const response = await request.delete(`/api/admin/games/${createdGameId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-702:', JSON.stringify(body, null, 2));
    expect(body.success).toBe(true);
  });

  test('TC-703: Course A 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdCourseAId) { test.skip(); return; }

    const response = await request.delete(`/api/admin/courses/${createdCourseAId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-703:', JSON.stringify(body, null, 2));
    expect(body.success).toBe(true);
  });

  test('TC-704: Course B 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdCourseBId) { test.skip(); return; }

    const response = await request.delete(`/api/admin/courses/${createdCourseBId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-704:', JSON.stringify(body, null, 2));
    expect(body.success).toBe(true);
  });

  test('TC-705: Club 삭제', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.delete(`/api/admin/courses/clubs/${createdClubId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-705:', JSON.stringify(body, null, 2));
    expect(body.success).toBe(true);
  });

  test('TC-706: 삭제된 Club 조회 → 에러', async ({ request }) => {
    const token = await getToken(request);
    if (!token || !createdClubId) { test.skip(); return; }

    const response = await request.get(`/api/admin/courses/clubs/${createdClubId}`, {
      headers: authHeaders(token),
    });

    const body = await response.json();
    console.log('TC-706:', JSON.stringify(body, null, 2));
    expect(body.success).toBe(false);
  });
});
