import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../partner/service/crypto.service';
import { AppException, Errors } from '../common/exceptions';
import SwaggerClient from 'swagger-client';

/**
 * 외부 데이터 인터페이스
 */
export interface ExternalSlotData {
  externalSlotId: string;
  courseName: string;
  courseId?: string;
  date: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  bookedPlayers: number;
  status: 'AVAILABLE' | 'FULLY_BOOKED' | 'CLOSED';
  price?: number;
}

export interface ExternalBookingData {
  externalBookingId: string;
  courseName: string;
  courseId?: string;
  slotId: string;
  date: string;
  startTime: string;
  playerCount: number;
  playerName: string;
  playerPhone?: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paidAmount?: number;
}

@Injectable()
export class PartnerClientService {
  private readonly logger = new Logger(PartnerClientService.name);

  // 파트너별 클라이언트 캐싱
  private clientCache = new Map<number, {
    client: SwaggerClient;
    resolvedAt: Date;
  }>();

  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * 파트너 클라이언트 가져오기 (캐싱)
   */
  async getClient(partnerId: number): Promise<SwaggerClient> {
    const cached = this.clientCache.get(partnerId);
    if (cached && Date.now() - cached.resolvedAt.getTime() < this.CACHE_TTL_MS) {
      return cached.client;
    }

    const config = await this.prisma.partnerConfig.findUniqueOrThrow({
      where: { id: partnerId },
    });

    try {
      const client = await SwaggerClient({
        url: config.specUrl,
        authorizations: this.buildAuth(config),
      });

      this.clientCache.set(partnerId, {
        client,
        resolvedAt: new Date(),
      });

      this.logger.log(`swagger-client initialized for partner ${partnerId} (${config.systemName})`);
      return client;
    } catch (error) {
      this.logger.error(`Failed to load spec for partner ${partnerId}: ${error.message}`);
      throw new AppException(Errors.Partner.SPEC_LOAD_FAILED, `스펙 로딩 실패: ${error.message}`);
    }
  }

  /**
   * operationId로 API 호출
   */
  async execute(
    partnerId: number,
    operationId: string,
    params: Record<string, unknown> = {},
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const client = await this.getClient(partnerId);

    try {
      const result = await client.execute({
        operationId,
        parameters: params,
        requestBody: body,
      });

      return result.body;
    } catch (error) {
      this.logger.error(`API call failed: partner=${partnerId}, op=${operationId}: ${error.message}`);
      throw new AppException(Errors.Partner.EXTERNAL_API_ERROR, `외부 API 호출 실패: ${error.message}`);
    }
  }

  /**
   * 타임슬롯 조회 → 내부 모델로 변환
   */
  async fetchSlots(
    partnerId: number,
    startDate: string,
    endDate: string,
  ): Promise<ExternalSlotData[]> {
    const config = await this.prisma.partnerConfig.findUniqueOrThrow({
      where: { id: partnerId },
    });

    const rawResponse = await this.execute(partnerId, 'getSlots', {
      club_id: config.externalClubId,
      start_date: startDate,
      end_date: endDate,
    });

    return this.mapResponse(rawResponse, config.responseMapping as Record<string, unknown>, 'slots');
  }

  /**
   * 예약 목록 조회 → 내부 모델로 변환
   */
  async fetchBookings(
    partnerId: number,
    since: Date,
  ): Promise<ExternalBookingData[]> {
    const config = await this.prisma.partnerConfig.findUniqueOrThrow({
      where: { id: partnerId },
    });

    const rawResponse = await this.execute(partnerId, 'getBookings', {
      club_id: config.externalClubId,
      since: since.toISOString(),
    });

    return this.mapResponse(rawResponse, config.responseMapping as Record<string, unknown>, 'bookings');
  }

  /**
   * 예약 생성 (Outbound)
   */
  async createBooking(
    partnerId: number,
    request: {
      slotId: string;
      playerCount: number;
      playerName: string;
      playerPhone?: string;
      referenceId: string;
    },
  ): Promise<{ externalBookingId: string; status: string }> {
    const result = await this.execute(partnerId, 'createBooking', {}, {
      slot_id: request.slotId,
      player_count: request.playerCount,
      player_name: request.playerName,
      phone: request.playerPhone,
      source: 'PARKGOLF_MATE',
      reference_id: request.referenceId,
    });

    const response = result as Record<string, unknown>;
    return {
      externalBookingId: String(response.booking_id || response.bookingId || ''),
      status: String(response.status || 'CONFIRMED'),
    };
  }

  /**
   * 예약 취소 (Outbound)
   */
  async cancelBooking(partnerId: number, externalBookingId: string, reason: string): Promise<void> {
    await this.execute(partnerId, 'cancelBooking', {
      bookingId: externalBookingId,
    });
  }

  /**
   * 연결 테스트
   */
  async testConnection(partnerId: number): Promise<{
    success: boolean;
    message: string;
    slotsCount?: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const slots = await this.fetchSlots(partnerId, today, today);
      return {
        success: true,
        message: `연결 성공. 오늘 슬롯 ${slots.length}건 조회됨`,
        slotsCount: slots.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `연결 실패: ${error.message}`,
      };
    }
  }

  /**
   * 캐시 무효화 (스펙 변경 시)
   */
  invalidateCache(partnerId: number): void {
    this.clientCache.delete(partnerId);
    this.logger.log(`Cache invalidated for partner ${partnerId}`);
  }

  // ── Private ──

  private buildAuth(config: { apiKey: string; apiSecret?: string }) {
    const apiKey = this.cryptoService.decrypt(config.apiKey);

    return {
      apiKey: { value: apiKey },
      bearerAuth: { value: apiKey },
    };
  }

  /**
   * 응답 필드 매핑: 파트너 응답 → 내부 모델
   */
  private mapResponse<T>(
    rawResponse: unknown,
    responseMapping: Record<string, unknown>,
    type: 'slots' | 'bookings',
  ): T[] {
    const mapping = responseMapping[type] as Record<string, unknown>;
    if (!mapping) {
      throw new AppException(Errors.Partner.INVALID_SPEC, `responseMapping에 "${type}" 설정이 없습니다`);
    }

    const dataPath = mapping.dataPath as string;
    const fields = mapping.fields as Record<string, string>;
    const statusMapping = (mapping.statusMapping as Record<string, string>) || {};

    // dataPath로 배열 추출
    const items = this.getNestedValue(rawResponse, dataPath);
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      const mapped: Record<string, unknown> = {};
      for (const [internalField, externalField] of Object.entries(fields)) {
        mapped[internalField] = this.getNestedValue(item, externalField);
      }

      // 상태값 매핑
      if (statusMapping && mapped['status']) {
        mapped['status'] = statusMapping[mapped['status'] as string] || mapped['status'];
      }

      return mapped as unknown as T;
    });
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((acc, key) => (acc as Record<string, unknown>)?.[key], obj);
  }
}
