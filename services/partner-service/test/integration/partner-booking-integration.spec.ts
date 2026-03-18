/**
 * Partner Service - 외부 부킹 데이터 연동 통합 테스트
 *
 * 테스트 대상: 파트너 설정, 동기화, 웹훅, 아웃바운드 전체 흐름
 *
 * 사전 조건:
 * - DATABASE_URL이 .env에 설정되어 있어야 함 (테스트 DB)
 * - NATS 불필요 (mock 처리)
 * - 외부 API 불필요 (mock 처리)
 *
 * 시나리오 그룹:
 *   Group 1: 파트너 설정 (Config CRUD + checkByClub)
 *   Group 2: 인바운드 동기화 (Slot Sync + externalBooked)
 *   Group 3: 웹훅 수신 (booking.created/cancelled/updated, slot.updated)
 *   Group 4: 아웃바운드 (예약 통보, 취소 통보, 슬롯 검증)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PartnerConfigService } from '../../src/partner/service/partner-config.service';
import { CryptoService } from '../../src/partner/service/crypto.service';
import { WebhookService } from '../../src/partner/service/webhook.service';
import { SyncService } from '../../src/partner/service/sync.service';
import { GameMappingService } from '../../src/partner/service/game-mapping.service';
import { PartnerClientService } from '../../src/client/partner-client.service';
import { PartnerResilienceService } from '../../src/client/partner-resilience.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResult = any;

// ===== Mock 설정 =====

/** Mock NATS Client — send/emit 호출 기록 및 응답 제어 */
function createMockNatsClient() {
  const calls: { pattern: string; data: unknown }[] = [];
  let nextResponse: unknown = { success: true, data: {} };

  return {
    calls,
    setResponse(response: unknown) {
      nextResponse = response;
    },
    send: jest.fn((pattern: string, data: unknown) => {
      calls.push({ pattern, data });
      const response = nextResponse;
      return {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        toPromise: jest.fn().mockResolvedValue(response),
        // rxjs firstValueFrom 호환
        [Symbol.observable]: () => ({
          subscribe: (observer: { next: (v: unknown) => void; complete: () => void }) => {
            observer.next(response);
            observer.complete();
            return { unsubscribe: jest.fn() };
          },
        }),
      };
    }),
    emit: jest.fn((pattern: string, data: unknown) => {
      calls.push({ pattern, data });
    }),
    clearCalls() {
      calls.length = 0;
    },
  };
}

// Test DB 데이터 정리용 헬퍼
async function cleanupTestData(prisma: PrismaService) {
  // 순서 중요: FK 의존 순서대로 삭제
  await prisma.syncLog.deleteMany({});
  await prisma.bookingMapping.deleteMany({});
  await prisma.slotMapping.deleteMany({});
  await prisma.gameMapping.deleteMany({});
  await prisma.partnerConfig.deleteMany({});
}

describe('Partner Service - 외부 부킹 데이터 연동 통합 테스트', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let configService: PartnerConfigService;
  let cryptoService: CryptoService;
  let webhookService: WebhookService;
  let syncService: SyncService;

  const mockBookingClient = createMockNatsClient();
  const mockCourseClient = createMockNatsClient();

  // 테스트용 상수
  const TEST_CLUB_ID = 99901;
  const TEST_COMPANY_ID = 99901;
  const TEST_GAME_ID = 99901;
  const TEST_SLOT_ID = 99901;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
          isGlobal: true,
        }),
      ],
      providers: [
        PrismaService,
        CryptoService,
        PartnerConfigService,
        GameMappingService,
        WebhookService,
        SyncService,
        {
          provide: PartnerClientService,
          useValue: {
            getClient: jest.fn(),
            testConnection: jest.fn().mockResolvedValue({ connected: true }),
            fetchSlots: jest.fn().mockResolvedValue([]),
            fetchBookings: jest.fn().mockResolvedValue([]),
            createBooking: jest.fn().mockResolvedValue({ externalBookingId: 'EXT-BK-MOCK' }),
            cancelBooking: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: PartnerResilienceService,
          useValue: {
            executeWithResilience: jest.fn((partnerId: number, fn: () => unknown) => fn()),
          },
        },
        {
          provide: 'BOOKING_SERVICE',
          useValue: mockBookingClient,
        },
        {
          provide: 'COURSE_SERVICE',
          useValue: mockCourseClient,
        },
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<PartnerConfigService>(PartnerConfigService);
    cryptoService = module.get<CryptoService>(CryptoService);
    webhookService = module.get<WebhookService>(WebhookService);
    syncService = module.get<SyncService>(SyncService);

    // 테스트 데이터 정리
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await module.close();
  });

  beforeEach(() => {
    mockBookingClient.clearCalls();
    mockCourseClient.clearCalls();
    mockBookingClient.setResponse({ success: true, data: {} });
    mockCourseClient.setResponse({ success: true, data: {} });
  });

  // ============================================
  // Group 1: 파트너 설정 (Config)
  // ============================================

  describe('Group 1: 파트너 설정 CRUD + checkByClub', () => {
    let createdConfigId: number;

    it('TC-001: 파트너 설정 생성', async () => {
      const dto = {
        clubId: TEST_CLUB_ID,
        companyId: TEST_COMPANY_ID,
        systemName: '테스트 파크골프 예약시스템',
        externalClubId: 'EXT-CLUB-001',
        specUrl: 'http://localhost:8080/mock/openapi.json',
        apiKey: 'test-api-key-12345',
        apiSecret: 'test-api-secret-67890',
        webhookSecret: 'test-webhook-secret',
        responseMapping: {
          slots: { path: 'data.slots', fields: {} },
          bookings: { path: 'data.bookings', fields: {} },
        },
      };

      const result = await configService.create(dto) as AnyResult;

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.clubId).toBe(TEST_CLUB_ID);
      expect(result.systemName).toBe('테스트 파크골프 예약시스템');
      // 민감 필드 마스킹 확인
      expect(result.apiKey).toBe('********');
      expect(result.apiSecret).toBe('********');
      expect(result.webhookSecret).toBe('********');

      createdConfigId = result.id;
      console.log(`  ✅ TC-001: 파트너 설정 생성 완료 (id=${createdConfigId})`);
    });

    it('TC-002: 파트너 설정 조회 (ID)', async () => {
      const result = await configService.findById(createdConfigId) as AnyResult;

      expect(result).toBeDefined();
      expect(result.id).toBe(createdConfigId);
      expect(result.clubId).toBe(TEST_CLUB_ID);
      expect(result.gameMappings).toBeDefined();
      expect(result.apiKey).toBe('********'); // 마스킹

      console.log(`  ✅ TC-002: 파트너 설정 ID 조회 성공`);
    });

    it('TC-003: 파트너 설정 조회 (clubId)', async () => {
      const result = await configService.findByClubId(TEST_CLUB_ID) as AnyResult;

      expect(result).toBeDefined();
      expect(result.clubId).toBe(TEST_CLUB_ID);

      console.log(`  ✅ TC-003: 파트너 설정 clubId 조회 성공`);
    });

    it('TC-004: isPartnerClub — 활성 파트너 골프장', async () => {
      const result = await configService.isPartnerClub(TEST_CLUB_ID);

      expect(result).toBe(true);

      console.log(`  ✅ TC-004: isPartnerClub(${TEST_CLUB_ID}) = true`);
    });

    it('TC-005: isPartnerClub — 일반 골프장 (설정 없음)', async () => {
      const result = await configService.isPartnerClub(99999);

      expect(result).toBe(false);

      console.log(`  ✅ TC-005: isPartnerClub(99999) = false`);
    });

    it('TC-006: 파트너 설정 목록 조회 (페이지네이션)', async () => {
      const result = await configService.findAll({ page: 1, limit: 10 });

      expect(result.data).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);

      console.log(`  ✅ TC-006: 파트너 목록 조회 (total=${result.total})`);
    });

    it('TC-007: 파트너 설정 업데이트', async () => {
      const result = await configService.update({
        id: createdConfigId,
        systemName: '수정된 파크골프 예약시스템',
        syncIntervalMin: 15,
      }) as AnyResult;

      expect(result.systemName).toBe('수정된 파크골프 예약시스템');

      console.log(`  ✅ TC-007: 파트너 설정 업데이트 성공`);
    });

    it('TC-008: 존재하지 않는 파트너 조회 시 에러', async () => {
      await expect(configService.findById(99999)).rejects.toThrow();

      console.log(`  ✅ TC-008: 존재하지 않는 파트너 에러 확인`);
    });
  });

  // ============================================
  // Group 2: 암호화 서비스
  // ============================================

  describe('Group 2: CryptoService — 암호화/복호화', () => {
    it('TC-009: API 키 암호화 → 복호화 라운드트립', () => {
      const original = 'my-secret-api-key-12345';
      const encrypted = cryptoService.encrypt(original);
      const decrypted = cryptoService.decrypt(encrypted);

      expect(encrypted).not.toBe(original);
      expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:encrypted
      expect(decrypted).toBe(original);

      console.log(`  ✅ TC-009: 암호화/복호화 라운드트립 성공`);
    });

    it('TC-010: 동일 평문 → 다른 암호문 (IV 랜덤)', () => {
      const plainText = 'same-input';
      const encrypted1 = cryptoService.encrypt(plainText);
      const encrypted2 = cryptoService.encrypt(plainText);

      expect(encrypted1).not.toBe(encrypted2);
      expect(cryptoService.decrypt(encrypted1)).toBe(plainText);
      expect(cryptoService.decrypt(encrypted2)).toBe(plainText);

      console.log(`  ✅ TC-010: IV 랜덤화 확인 (같은 입력 → 다른 암호문)`);
    });

    it('TC-011: 잘못된 암호문 복호화 시 에러', () => {
      expect(() => cryptoService.decrypt('invalid-format')).toThrow();

      console.log(`  ✅ TC-011: 잘못된 암호문 에러 확인`);
    });
  });

  // ============================================
  // Group 3: 웹훅 — 서명 검증
  // ============================================

  describe('Group 3: 웹훅 서명 검증', () => {
    it('TC-012: 유효한 HMAC-SHA256 서명으로 웹훅 처리', async () => {
      // 파트너 설정의 webhookSecret 복호화 키로 서명 생성
      const config = await prisma.partnerConfig.findUnique({
        where: { clubId: TEST_CLUB_ID },
      });
      expect(config).toBeDefined();

      const secret = cryptoService.decrypt(config!.webhookSecret!);
      const body = { event: 'booking.created', data: { bookingId: 'EXT-BK-001' } };
      const payload = JSON.stringify(body);
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // booking.created는 BookingMapping 생성 필요 → 슬롯 매핑 없이 기본 처리
      const result = await webhookService.processWebhook(config!.id, signature, body);

      expect(result.success).toBeDefined();
      console.log(`  ✅ TC-012: 유효한 서명 웹훅 처리 (message=${result.message})`);
    });

    it('TC-013: 잘못된 서명 → UnauthorizedException', async () => {
      const config = await prisma.partnerConfig.findUnique({
        where: { clubId: TEST_CLUB_ID },
      });

      const body = { event: 'booking.created', data: {} };
      const invalidSignature = 'invalid-signature-value';

      await expect(
        webhookService.processWebhook(config!.id, invalidSignature, body),
      ).rejects.toThrow(UnauthorizedException);

      console.log(`  ✅ TC-013: 잘못된 서명 → UnauthorizedException 확인`);
    });

    it('TC-014: 비활성 파트너 → 처리 거부', async () => {
      // 일시적으로 비활성화
      const config = await prisma.partnerConfig.findUnique({
        where: { clubId: TEST_CLUB_ID },
      });
      await prisma.partnerConfig.update({
        where: { id: config!.id },
        data: { isActive: false },
      });

      const result = await webhookService.processWebhook(config!.id, 'any', {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found or inactive');

      // 복원
      await prisma.partnerConfig.update({
        where: { id: config!.id },
        data: { isActive: true },
      });

      console.log(`  ✅ TC-014: 비활성 파트너 웹훅 거부 확인`);
    });

    it('TC-015: 존재하지 않는 파트너 ID → 처리 거부', async () => {
      const result = await webhookService.processWebhook(99999, 'any', {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found or inactive');

      console.log(`  ✅ TC-015: 존재하지 않는 파트너 웹훅 거부 확인`);
    });
  });

  // ============================================
  // Group 4: 웹훅 — 이벤트 라우팅
  // ============================================

  describe('Group 4: 웹훅 이벤트 라우팅', () => {
    let partnerId: number;
    let gameMappingId: number;
    let webhookSecret: string;

    beforeAll(async () => {
      const config = await prisma.partnerConfig.findUnique({
        where: { clubId: TEST_CLUB_ID },
      });
      partnerId = config!.id;
      webhookSecret = cryptoService.decrypt(config!.webhookSecret!);

      // GameMapping 생성
      const gameMapping = await prisma.gameMapping.create({
        data: {
          partnerId,
          externalCourseName: 'A+B코스',
          externalCourseId: 'CRS-001',
          internalGameId: TEST_GAME_ID,
        },
      });
      gameMappingId = gameMapping.id;

      // SlotMapping 생성
      await prisma.slotMapping.create({
        data: {
          gameMappingId,
          externalSlotId: 'SLOT-00001',
          date: new Date('2026-03-20'),
          startTime: '07:00',
          endTime: '10:00',
          internalSlotId: TEST_SLOT_ID,
          externalMaxPlayers: 4,
          externalBooked: 1,
          externalStatus: 'AVAILABLE',
        },
      });
    });

    function signPayload(body: Record<string, unknown>): string {
      return crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(body)).digest('hex');
    }

    it('TC-016: booking.created — 슬롯 매핑 있는 경우 booking-service 호출', async () => {
      mockBookingClient.setResponse({
        success: true,
        data: { bookingId: 1001 },
      });

      const body = {
        event: 'booking.created',
        data: {
          bookingId: 'EXT-BK-100',
          slotId: 'SLOT-00001',
          date: '2026-03-20',
          startTime: '07:00',
          playerCount: 3,
          playerName: '김테스트',
          playerPhone: '010-1234-5678',
        },
      };
      const signature = signPayload(body);

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Booking created');

      // booking.createExternal 호출 확인
      const createCall = mockBookingClient.calls.find(
        (c) => c.pattern === 'booking.createExternal',
      );
      expect(createCall).toBeDefined();
      expect((createCall!.data as Record<string, unknown>).gameTimeSlotId).toBe(TEST_SLOT_ID);
      expect((createCall!.data as Record<string, unknown>).playerCount).toBe(3);

      // BookingMapping 생성 확인
      const mapping = await prisma.bookingMapping.findUnique({
        where: { partnerId_externalBookingId: { partnerId, externalBookingId: 'EXT-BK-100' } },
      });
      expect(mapping).toBeDefined();
      expect(mapping!.syncDirection).toBe('INBOUND');
      expect(mapping!.syncStatus).toBe('SYNCED');
      expect(mapping!.internalBookingId).toBe(1001);

      console.log(`  ✅ TC-016: booking.created 처리 → booking-service 호출 + BookingMapping 생성`);
    });

    it('TC-017: booking.created — 중복 예약 ID는 무시', async () => {
      const body = {
        event: 'booking.created',
        data: {
          bookingId: 'EXT-BK-100', // 이미 TC-016에서 생성됨
          slotId: 'SLOT-00001',
          date: '2026-03-20',
          startTime: '07:00',
          playerCount: 2,
          playerName: '박중복',
        },
      };
      const signature = signPayload(body);
      mockBookingClient.clearCalls();

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('already processed');
      // booking-service 호출 없어야 함
      expect(mockBookingClient.calls).toHaveLength(0);

      console.log(`  ✅ TC-017: 중복 booking.created 멱등 처리`);
    });

    it('TC-018: booking.created — 슬롯 매핑 없는 경우 BookingMapping만 기록', async () => {
      const body = {
        event: 'booking.created',
        data: {
          bookingId: 'EXT-BK-UNMAPPED',
          slotId: 'SLOT-UNKNOWN',
          date: '2026-03-20',
          startTime: '08:00',
          playerCount: 2,
          playerName: '이미매핑',
        },
      };
      const signature = signPayload(body);
      mockBookingClient.clearCalls();

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('no slot mapping');

      const mapping = await prisma.bookingMapping.findUnique({
        where: { partnerId_externalBookingId: { partnerId, externalBookingId: 'EXT-BK-UNMAPPED' } },
      });
      expect(mapping).toBeDefined();
      expect(mapping!.syncStatus).toBe('PENDING');
      // booking-service 호출 없어야 함
      expect(mockBookingClient.calls).toHaveLength(0);

      console.log(`  ✅ TC-018: 슬롯 미매핑 → BookingMapping PENDING 기록`);
    });

    it('TC-019: booking.cancelled — 매핑된 예약 취소', async () => {
      mockBookingClient.setResponse({ success: true, data: {} });

      const body = {
        event: 'booking.cancelled',
        data: {
          bookingId: 'EXT-BK-100',
          reason: '고객 변심',
        },
      };
      const signature = signPayload(body);

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('cancelled');

      // booking.cancelExternal 호출 확인
      const cancelCall = mockBookingClient.calls.find(
        (c) => c.pattern === 'booking.cancelExternal',
      );
      expect(cancelCall).toBeDefined();

      // BookingMapping 상태 확인
      const mapping = await prisma.bookingMapping.findUnique({
        where: { partnerId_externalBookingId: { partnerId, externalBookingId: 'EXT-BK-100' } },
      });
      expect(mapping!.status).toBe('CANCELLED');
      expect(mapping!.syncStatus).toBe('SYNCED');

      console.log(`  ✅ TC-019: booking.cancelled → 예약 취소 + BookingMapping 상태 업데이트`);
    });

    it('TC-020: booking.cancelled — 이미 취소된 예약은 무시', async () => {
      const body = {
        event: 'booking.cancelled',
        data: { bookingId: 'EXT-BK-100' },
      };
      const signature = signPayload(body);
      mockBookingClient.clearCalls();

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Already cancelled');
      expect(mockBookingClient.calls).toHaveLength(0);

      console.log(`  ✅ TC-020: 이미 취소된 예약 재취소 멱등 처리`);
    });

    it('TC-021: booking.cancelled — 매핑 없는 예약은 무시', async () => {
      const body = {
        event: 'booking.cancelled',
        data: { bookingId: 'EXT-BK-NONEXIST' },
      };
      const signature = signPayload(body);

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No mapping found');

      console.log(`  ✅ TC-021: 매핑 없는 예약 취소 → 무시`);
    });

    it('TC-022: booking.updated — 충돌 감지', async () => {
      // 먼저 새 BookingMapping 생성 (SYNCED 상태)
      await prisma.bookingMapping.create({
        data: {
          partnerId,
          externalBookingId: 'EXT-BK-200',
          internalBookingId: 2001,
          gameMappingId,
          syncDirection: 'OUTBOUND',
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          date: new Date('2026-03-21'),
          startTime: '08:00',
          playerCount: 2,
          playerName: '홍충돌',
          status: 'CONFIRMED',
        },
      });

      const body = {
        event: 'booking.updated',
        data: {
          bookingId: 'EXT-BK-200',
          playerCount: 4, // 변경: 2 → 4
          status: 'CONFIRMED',
        },
      };
      const signature = signPayload(body);

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('conflict');

      const mapping = await prisma.bookingMapping.findUnique({
        where: { partnerId_externalBookingId: { partnerId, externalBookingId: 'EXT-BK-200' } },
      });
      expect(mapping!.syncStatus).toBe('CONFLICT');
      expect(mapping!.conflictData).toBeDefined();

      const conflictData = mapping!.conflictData as Record<string, unknown>;
      expect((conflictData.internal as Record<string, unknown>).playerCount).toBe(2);
      expect((conflictData.external as Record<string, unknown>).playerCount).toBe(4);

      console.log(`  ✅ TC-022: booking.updated 충돌 감지 (playerCount 2→4)`);
    });

    it('TC-023: slot.updated — 외부 슬롯 변경 → course-service 업데이트', async () => {
      mockCourseClient.setResponse({ success: true, data: {} });

      const body = {
        event: 'slot.updated',
        data: {
          slotId: 'SLOT-00001',
          bookedPlayers: 3,
          status: 'AVAILABLE',
        },
      };
      const signature = signPayload(body);

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Slot updated');

      // slot.updateExternalBooked 호출 확인
      const updateCall = mockCourseClient.calls.find(
        (c) => c.pattern === 'slot.updateExternalBooked',
      );
      expect(updateCall).toBeDefined();
      expect((updateCall!.data as Record<string, unknown>).timeSlotId).toBe(TEST_SLOT_ID);
      expect((updateCall!.data as Record<string, unknown>).externalBooked).toBe(3);

      // SlotMapping 업데이트 확인
      const slotMapping = await prisma.slotMapping.findFirst({
        where: { externalSlotId: 'SLOT-00001' },
      });
      expect(slotMapping!.externalBooked).toBe(3);
      expect(slotMapping!.syncStatus).toBe('SYNCED');

      console.log(`  ✅ TC-023: slot.updated → course-service externalBooked 업데이트`);
    });

    it('TC-024: 알 수 없는 이벤트 → 무시 (acknowledged)', async () => {
      const body = { event: 'unknown.event', data: {} };
      const signature = signPayload(body);

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('acknowledged but not processed');

      console.log(`  ✅ TC-024: 알 수 없는 이벤트 → acknowledged 응답`);
    });

    it('TC-025: booking.created — bookingId 누락 시 실패', async () => {
      const body = {
        event: 'booking.created',
        data: {
          // bookingId 누락
          slotId: 'SLOT-00001',
          playerCount: 2,
        },
      };
      const signature = signPayload(body);

      const result = await webhookService.processWebhook(partnerId, signature, body);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing bookingId');

      console.log(`  ✅ TC-025: bookingId 누락 → 실패 응답`);
    });
  });

  // ============================================
  // Group 5: 데이터 매핑 무결성
  // ============================================

  describe('Group 5: 데이터 매핑 무결성', () => {
    it('TC-026: GameMapping 유니크 제약 (partnerId + externalCourseName)', async () => {
      const config = await prisma.partnerConfig.findUnique({
        where: { clubId: TEST_CLUB_ID },
      });

      // 같은 partnerId + externalCourseName 중복 생성 시도
      await expect(
        prisma.gameMapping.create({
          data: {
            partnerId: config!.id,
            externalCourseName: 'A+B코스', // 이미 존재
            internalGameId: TEST_GAME_ID + 1,
          },
        }),
      ).rejects.toThrow();

      console.log(`  ✅ TC-026: GameMapping 유니크 제약 확인`);
    });

    it('TC-027: BookingMapping 유니크 제약 (partnerId + externalBookingId)', async () => {
      const config = await prisma.partnerConfig.findUnique({
        where: { clubId: TEST_CLUB_ID },
      });

      await expect(
        prisma.bookingMapping.create({
          data: {
            partnerId: config!.id,
            externalBookingId: 'EXT-BK-UNMAPPED', // 이미 존재
            syncDirection: 'INBOUND',
            date: new Date('2026-03-20'),
            startTime: '08:00',
            playerCount: 2,
            status: 'CONFIRMED',
          },
        }),
      ).rejects.toThrow();

      console.log(`  ✅ TC-027: BookingMapping 유니크 제약 확인`);
    });

    it('TC-028: SlotMapping 유니크 제약 (gameMappingId + externalSlotId)', async () => {
      const gameMapping = await prisma.gameMapping.findFirst({
        where: { externalCourseName: 'A+B코스' },
      });

      await expect(
        prisma.slotMapping.create({
          data: {
            gameMappingId: gameMapping!.id,
            externalSlotId: 'SLOT-00001', // 이미 존재
            date: new Date('2026-03-20'),
            startTime: '07:00',
            endTime: '10:00',
            externalMaxPlayers: 4,
            externalStatus: 'AVAILABLE',
          },
        }),
      ).rejects.toThrow();

      console.log(`  ✅ TC-028: SlotMapping 유니크 제약 확인`);
    });

    it('TC-029: PartnerConfig 삭제 시 GameMapping 캐스케이드 삭제', async () => {
      // 별도 테스트용 파트너 생성 → 삭제
      const tempConfig = await prisma.partnerConfig.create({
        data: {
          clubId: 99999,
          companyId: 99999,
          systemName: '임시 파트너',
          externalClubId: 'EXT-TEMP-001',
          specUrl: 'http://example.com/spec',
          apiKey: cryptoService.encrypt('temp-key'),
          responseMapping: {},
        },
      });

      await prisma.gameMapping.create({
        data: {
          partnerId: tempConfig.id,
          externalCourseName: '임시코스',
          internalGameId: 99999,
        },
      });

      // 파트너 삭제
      await prisma.partnerConfig.delete({ where: { id: tempConfig.id } });

      // 연관 GameMapping도 삭제 확인
      const orphanMappings = await prisma.gameMapping.findMany({
        where: { partnerId: tempConfig.id },
      });
      expect(orphanMappings).toHaveLength(0);

      console.log(`  ✅ TC-029: 캐스케이드 삭제 확인 (PartnerConfig → GameMapping)`);
    });
  });

  // ============================================
  // Group 6: SyncLog 기록
  // ============================================

  describe('Group 6: SyncLog 기록', () => {
    it('TC-030: SyncLog 생성 및 조회', async () => {
      const config = await prisma.partnerConfig.findUnique({
        where: { clubId: TEST_CLUB_ID },
      });

      const log = await prisma.syncLog.create({
        data: {
          partnerId: config!.id,
          action: 'SLOT_SYNC',
          direction: 'INBOUND',
          status: 'SUCCESS',
          recordCount: 20,
          createdCount: 5,
          updatedCount: 15,
          errorCount: 0,
          durationMs: 1500,
        },
      });

      expect(log.id).toBeGreaterThan(0);
      expect(log.action).toBe('SLOT_SYNC');
      expect(log.recordCount).toBe(20);

      // 조회
      const logs = await prisma.syncLog.findMany({
        where: { partnerId: config!.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);

      console.log(`  ✅ TC-030: SyncLog 생성/조회 확인 (${logs.length}건)`);
    });
  });

  // ============================================
  // Group 7: isPartnerClub 비활성화 시나리오
  // ============================================

  describe('Group 7: isPartnerClub 비활성화 시나리오', () => {
    it('TC-031: isActive=false인 파트너 → isPartnerClub = false', async () => {
      const config = await prisma.partnerConfig.findUnique({
        where: { clubId: TEST_CLUB_ID },
      });
      await prisma.partnerConfig.update({
        where: { id: config!.id },
        data: { isActive: false },
      });

      const result = await configService.isPartnerClub(TEST_CLUB_ID);
      expect(result).toBe(false);

      // 복원
      await prisma.partnerConfig.update({
        where: { id: config!.id },
        data: { isActive: true },
      });

      console.log(`  ✅ TC-031: 비활성 파트너 → isPartnerClub=false 확인`);
    });
  });
});
