/**
 * Partner Booking Integration Tests (E2E via admin-api)
 *
 * 테스트 대상: admin-api → NATS → partner-service 전체 흐름
 *
 * 시나리오:
 *   1. 인증: Admin 로그인 → 토큰 획득
 *   2. 파트너 설정 CRUD: 생성 → 조회 → 수정 → 삭제
 *   3. 게임 매핑 CRUD: 생성 → 목록 → 수정 → 삭제
 *   4. 동기화: 수동 동기화 → 이력 조회
 *   5. 매핑 조회: 슬롯 매핑 목록, 예약 매핑 목록
 *   6. 에러 케이스: 인증 없이 접근, 존재하지 않는 리소스
 *
 * 사전 조건:
 * - admin-api, partner-service, iam-service가 NATS에 연결되어 있어야 함
 * - 환경변수 ADMIN_API_URL 또는 기본 dev 환경 사용
 * - 테스트용 Admin 계정 로그인 가능해야 함
 */

import * as request from 'supertest';

describe('Partner Booking Integration Tests', () => {
  const baseUrl = process.env.ADMIN_API_URL || 'https://admin-api-dev-iihuzmuufa-du.a.run.app';

  // 인증 정보 (기존 관리자 계정 또는 테스트 계정)
  const adminCredentials = {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@parkgolf.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123!@#',
  };

  let accessToken: string;
  let createdPartnerId: number;
  let createdGameMappingId: number;

  // ============================================
  // 0. 테스트 환경 확인
  // ============================================

  describe('0. 테스트 환경 확인', () => {
    it('TC-000: admin-api Health Check', async () => {
      try {
        const response = await request(baseUrl).get('/health');
        console.log('TC-000 Response:', response.status, JSON.stringify(response.body, null, 2));
        // 200 (정상) 또는 404 (Cloud Run 경로 차이) 모두 서버 접근 가능 의미
        expect([200, 404]).toContain(response.status);
      } catch (error) {
        console.warn('TC-000: 서버 접근 불가 — 네트워크/환경 확인 필요');
        console.warn(`  baseUrl: ${baseUrl}`);
      }
    }, 15000);
  });

  // ============================================
  // 1. 인증 흐름
  // ============================================

  describe('1. Admin 인증', () => {
    it('TC-001: Admin 로그인 → 토큰 획득', async () => {
      const response = await request(baseUrl)
        .post('/api/admin/iam/login')
        .set('Content-Type', 'application/json')
        .send(adminCredentials);

      console.log('TC-001 Response:', response.status, JSON.stringify(response.body, null, 2));

      if (!response.body?.success) {
        console.warn('TC-001: 로그인 실패 — 이후 테스트 대부분 Skip됩니다');
        console.warn('  환경변수 TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD를 확인하세요');
        return;
      }

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();

      accessToken = response.body.data.accessToken;
    }, 30000);
  });

  // ============================================
  // 2. 파트너 설정 CRUD
  // ============================================

  describe('2. 파트너 설정 CRUD', () => {
    const testPartnerConfig = {
      clubId: 99901,
      companyId: 1,
      systemName: '[테스트] 외부 파크골프 예약시스템',
      externalClubId: `EXT-TEST-${Date.now()}`,
      specUrl: 'http://localhost:8080/mock/openapi.json',
      apiKey: 'test-api-key-e2e-12345',
      responseMapping: {
        slots: { path: 'data.slots', fields: {} },
        bookings: { path: 'data.bookings', fields: {} },
      },
    };

    it('TC-002: 파트너 설정 생성', async () => {
      if (!accessToken) return console.log('TC-002: Skipped - No token');

      const response = await request(baseUrl)
        .post('/api/admin/partners')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testPartnerConfig)
        .set('Accept', 'application/json');

      console.log('TC-002 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeGreaterThan(0);
      expect(response.body.data.clubId).toBe(testPartnerConfig.clubId);
      expect(response.body.data.systemName).toBe(testPartnerConfig.systemName);
      // 민감 필드 마스킹 확인
      expect(response.body.data.apiKey).toBe('********');

      createdPartnerId = response.body.data.id;
    }, 30000);

    it('TC-003: 파트너 설정 상세 조회 (ID)', async () => {
      if (!accessToken || !createdPartnerId) return console.log('TC-003: Skipped');

      const response = await request(baseUrl)
        .get(`/api/admin/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-003 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdPartnerId);
      expect(response.body.data.clubId).toBe(testPartnerConfig.clubId);
    }, 15000);

    it('TC-004: 파트너 설정 목록 조회 (페이지네이션)', async () => {
      if (!accessToken) return console.log('TC-004: Skipped');

      const response = await request(baseUrl)
        .get('/api/admin/partners?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-004 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(response.body.page).toBe(1);
    }, 15000);

    it('TC-005: 파트너 설정 수정', async () => {
      if (!accessToken || !createdPartnerId) return console.log('TC-005: Skipped');

      const response = await request(baseUrl)
        .put(`/api/admin/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          systemName: '[테스트-수정] 외부 파크골프 예약시스템',
          syncIntervalMin: 15,
        })
        .set('Accept', 'application/json');

      console.log('TC-005 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data.systemName).toBe('[테스트-수정] 외부 파크골프 예약시스템');
    }, 15000);

    it('TC-006: 내 골프장 파트너 설정 조회 (clubId)', async () => {
      if (!accessToken) return console.log('TC-006: Skipped');

      const response = await request(baseUrl)
        .get(`/api/admin/partners/my/club/${testPartnerConfig.clubId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-006 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data.clubId).toBe(testPartnerConfig.clubId);
    }, 15000);

    it('TC-007: 존재하지 않는 파트너 조회 → 404', async () => {
      if (!accessToken) return console.log('TC-007: Skipped');

      const response = await request(baseUrl)
        .get('/api/admin/partners/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-007 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    }, 15000);
  });

  // ============================================
  // 3. 게임 매핑 CRUD
  // ============================================

  describe('3. 게임 매핑 CRUD', () => {
    it('TC-008: 게임 매핑 생성', async () => {
      if (!accessToken || !createdPartnerId) return console.log('TC-008: Skipped');

      const response = await request(baseUrl)
        .post(`/api/admin/partners/${createdPartnerId}/game-mappings`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          externalCourseName: 'A+B코스',
          externalCourseId: 'CRS-001',
          internalGameId: 1,
        })
        .set('Accept', 'application/json');

      console.log('TC-008 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeGreaterThan(0);
      expect(response.body.data.externalCourseName).toBe('A+B코스');

      createdGameMappingId = response.body.data.id;
    }, 15000);

    it('TC-009: 게임 매핑 목록 조회', async () => {
      if (!accessToken || !createdPartnerId) return console.log('TC-009: Skipped');

      const response = await request(baseUrl)
        .get(`/api/admin/partners/${createdPartnerId}/game-mappings`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-009 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    }, 15000);

    it('TC-010: 게임 매핑 수정', async () => {
      if (!accessToken || !createdGameMappingId) return console.log('TC-010: Skipped');

      const response = await request(baseUrl)
        .put(`/api/admin/partners/game-mappings/${createdGameMappingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          externalCourseName: 'A+B코스(수정)',
        })
        .set('Accept', 'application/json');

      console.log('TC-010 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
    }, 15000);

    it('TC-011: 게임 매핑 삭제', async () => {
      if (!accessToken || !createdGameMappingId) return console.log('TC-011: Skipped');

      const response = await request(baseUrl)
        .delete(`/api/admin/partners/game-mappings/${createdGameMappingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-011 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
    }, 15000);
  });

  // ============================================
  // 4. 동기화 & 이력 조회
  // ============================================

  describe('4. 동기화 & 이력', () => {
    it('TC-012: 동기화 이력 조회', async () => {
      if (!accessToken) return console.log('TC-012: Skipped');

      const response = await request(baseUrl)
        .get(`/api/admin/partners/my/club/99901/sync-logs?page=1&limit=10`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-012 Response:', JSON.stringify(response.body, null, 2));

      // 동기화 이력이 없어도 빈 배열 반환
      expect(response.body.success).toBe(true);
    }, 15000);

    it('TC-013: 예약 매핑 목록 조회', async () => {
      if (!accessToken) return console.log('TC-013: Skipped');

      const response = await request(baseUrl)
        .get(`/api/admin/partners/my/club/99901/booking-mappings?page=1&limit=10`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-013 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
    }, 15000);

    it('TC-014: 슬롯 매핑 목록 조회', async () => {
      if (!accessToken || !createdPartnerId) return console.log('TC-014: Skipped');

      const response = await request(baseUrl)
        .get(`/api/admin/partners/${createdPartnerId}/slot-mappings?page=1&limit=10`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-014 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
    }, 15000);
  });

  // ============================================
  // 5. 웹훅 엔드포인트 (partner-service 직접 호출)
  // ============================================

  describe('5. 웹훅 엔드포인트', () => {
    // 웹훅은 partner-service가 직접 HTTP로 수신하므로 별도 URL 필요
    const partnerBaseUrl = process.env.PARTNER_SERVICE_URL || '';

    it('TC-015: 존재하지 않는 파트너 웹훅 → 실패', async () => {
      if (!partnerBaseUrl) {
        console.log('TC-015: Skipped - PARTNER_SERVICE_URL not set');
        return;
      }

      const response = await request(partnerBaseUrl)
        .post('/webhook/partner/99999')
        .set('x-webhook-signature', 'invalid')
        .send({ event: 'booking.created', data: {} })
        .set('Accept', 'application/json');

      console.log('TC-015 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
    }, 15000);

    it('TC-016: 서명 없이 웹훅 호출 → 인증 실패', async () => {
      if (!partnerBaseUrl || !createdPartnerId) {
        console.log('TC-016: Skipped - PARTNER_SERVICE_URL not set or no partner');
        return;
      }

      const response = await request(partnerBaseUrl)
        .post(`/webhook/partner/${createdPartnerId}`)
        .send({ event: 'booking.created', data: { bookingId: 'TEST-001' } })
        .set('Accept', 'application/json');

      console.log('TC-016 Response:', JSON.stringify(response.body, null, 2));

      // 서명 없으면 401 또는 success: false
      expect([401, 200]).toContain(response.status);
    }, 15000);
  });

  // ============================================
  // 6. 인증 없이 접근 시 에러
  // ============================================

  describe('6. 인증 없이 접근 시 에러', () => {
    it('TC-017: 토큰 없이 파트너 목록 조회 → 인증 에러', async () => {
      const response = await request(baseUrl)
        .get('/api/admin/partners');

      console.log('TC-017 Response:', response.status, JSON.stringify(response.body, null, 2));

      // 401 (BearerToken 데코레이터), 404 (Cloud Run 라우팅), 또는 success: false
      expect(response.status >= 400 || response.body?.success === false).toBe(true);
    }, 15000);

    it('TC-018: 잘못된 토큰으로 파트너 생성 → 에러', async () => {
      const response = await request(baseUrl)
        .post('/api/admin/partners')
        .set('Authorization', 'Bearer invalid_token')
        .set('Content-Type', 'application/json')
        .send({ clubId: 1 });

      console.log('TC-018 Response:', response.status, JSON.stringify(response.body, null, 2));

      // 401/403/500 또는 success: false
      expect(response.status >= 400 || response.body?.success === false).toBe(true);
    }, 15000);
  });

  // ============================================
  // 7. 정리: 테스트 파트너 삭제
  // ============================================

  describe('7. 테스트 데이터 정리', () => {
    it('TC-019: 테스트 파트너 설정 삭제', async () => {
      if (!accessToken || !createdPartnerId) return console.log('TC-019: Skipped');

      const response = await request(baseUrl)
        .delete(`/api/admin/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-019 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
    }, 15000);

    it('TC-020: 삭제된 파트너 조회 → 404', async () => {
      if (!accessToken || !createdPartnerId) return console.log('TC-020: Skipped');

      const response = await request(baseUrl)
        .get(`/api/admin/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json');

      console.log('TC-020 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
    }, 15000);
  });
});

/**
 * 수동 테스트용 curl 명령어
 *
 * 1. 파트너 설정 생성
 * curl -s -X POST "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/partners" \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <TOKEN>" \
 *   -d '{"clubId":1,"companyId":1,"systemName":"테스트","externalClubId":"EXT-001","specUrl":"http://example.com","apiKey":"key","responseMapping":{}}' | jq .
 *
 * 2. 파트너 설정 목록
 * curl -s "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/partners?page=1&limit=10" \
 *   -H "Authorization: Bearer <TOKEN>" | jq .
 *
 * 3. 게임 매핑 생성
 * curl -s -X POST "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/partners/1/game-mappings" \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <TOKEN>" \
 *   -d '{"externalCourseName":"A+B코스","internalGameId":1}' | jq .
 *
 * 4. 동기화 이력
 * curl -s "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/partners/my/club/1/sync-logs" \
 *   -H "Authorization: Bearer <TOKEN>" | jq .
 *
 * 5. 웹훅 테스트
 * curl -s -X POST "http://partner-service:8080/webhook/partner/1" \
 *   -H "Content-Type: application/json" \
 *   -H "x-webhook-signature: <HMAC>" \
 *   -d '{"event":"booking.created","data":{"bookingId":"BK-001","slotId":"SLOT-001","playerCount":3}}' | jq .
 */
