import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { ToolCall } from './deepseek.service';

/**
 * 도구 실행 결과
 */
export interface ToolResult {
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

/**
 * 도구 실행 서비스
 * LLM Function Call을 실제 NATS 요청으로 변환
 */
@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);
  private readonly REQUEST_TIMEOUT = 10000; // 10초

  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('WEATHER_SERVICE') private readonly weatherClient: ClientProxy,
    @Inject('LOCATION_SERVICE') private readonly locationClient: ClientProxy,
  ) {}

  /**
   * 도구 호출 실행
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    this.logger.debug(`Executing tool: ${toolCall.name}`, toolCall.args);

    try {
      const result = await this.executeToolCall(toolCall);
      return {
        name: toolCall.name,
        result,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolCall.name}`, error);
      return {
        name: toolCall.name,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 여러 도구 호출 병렬 실행
   */
  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((tc) => this.execute(tc)));
  }

  /**
   * 도구별 실행 로직
   */
  private async executeToolCall(toolCall: ToolCall): Promise<unknown> {
    switch (toolCall.name) {
      case 'search_clubs':
        return this.searchClubs(toolCall.args);

      case 'search_clubs_with_slots':
        return this.searchClubsWithSlots(toolCall.args);

      case 'get_club_info':
        return this.getClubInfo(toolCall.args);

      case 'get_weather':
        return this.getWeather(toolCall.args);

      case 'get_available_slots':
        return this.getAvailableSlots(toolCall.args);

      case 'create_booking':
        return this.createBooking(toolCall.args);

      case 'search_address':
        return this.searchAddress(toolCall.args);

      case 'get_nearby_clubs':
        return this.getNearbyClubs(toolCall.args);

      case 'get_booking_policy':
        return this.getBookingPolicy(toolCall.args);

      default:
        throw new Error(`Unknown tool: ${toolCall.name}`);
    }
  }

  /**
   * 골프장 검색
   */
  private async searchClubs(args: Record<string, unknown>): Promise<unknown> {
    const { location, name } = args as { location: string; name?: string };
    const query = name ? `${location} ${name}` : location;

    const response = await firstValueFrom(
      this.courseClient.send('club.search', { query }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to search clubs: ${err.message}`);
        }),
      ),
    );

    // 응답에서 데이터 추출
    if (response?.success && response?.data) {
      const clubs = response.data;
      return {
        found: clubs.length,
        clubs: clubs.slice(0, 5).map((club: any) => ({
          id: club.id,
          name: club.name,
          address: club.address,
          region: club.location,
        })),
      };
    }

    return { found: 0, clubs: [] };
  }

  /**
   * 날짜 기반 골프장 검색 (타임슬롯 있는 골프장만 반환)
   */
  private async searchClubsWithSlots(args: Record<string, unknown>): Promise<unknown> {
    const { location, date, name, timePreference } = args as {
      location: string;
      date: string;
      name?: string;
      timePreference?: 'morning' | 'afternoon' | 'evening';
    };

    // 1) 골프장 검색
    const query = name ? `${location} ${name}` : location;
    const searchResponse = await firstValueFrom(
      this.courseClient.send('club.search', { query }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to search clubs: ${err.message}`);
        }),
      ),
    );

    if (!searchResponse?.success || !searchResponse?.data?.length) {
      return { found: 0, date, clubs: [] };
    }

    const clubs = searchResponse.data.slice(0, 10);

    // 2) 각 골프장의 가용 슬롯 병렬 조회
    const clubsWithSlots = await Promise.all(
      clubs.map(async (club: any) => {
        try {
          const slotsResponse = await firstValueFrom(
            this.courseClient.send('games.available-slots', { clubId: club.id, date }).pipe(
              timeout(this.REQUEST_TIMEOUT),
              catchError(() => [{ success: false }]),
            ),
          );

          let slots = slotsResponse?.success && slotsResponse?.data ? slotsResponse.data : [];

          // 시간대 필터링
          if (timePreference && slots.length > 0) {
            slots = this.filterByTimePreference(slots, timePreference);
          }

          if (slots.length === 0) return null;

          const times = slots.map((s: any) => s.startTime).sort();

          return {
            id: club.id,
            name: club.name,
            address: club.address,
            region: club.location,
            availableSlotCount: slots.length,
            earliestTime: times[0],
            latestTime: times[times.length - 1],
          };
        } catch {
          return null;
        }
      }),
    );

    // 3) 슬롯이 있는 골프장만 필터링
    const available = clubsWithSlots.filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      found: available.length,
      date,
      clubs: available,
    };
  }

  /**
   * 골프장 상세 정보
   */
  private async getClubInfo(args: Record<string, unknown>): Promise<unknown> {
    const { clubId } = args as { clubId: string };

    const response = await firstValueFrom(
      this.courseClient.send('clubs.get', { id: clubId }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get club info: ${err.message}`);
        }),
      ),
    );

    if (response?.success && response?.data) {
      const club = response.data;
      return {
        id: club.id,
        name: club.name,
        address: club.address,
        phone: club.phone,
        operatingHours: club.operatingHours,
        facilities: club.facilities,
        courses: club.courses?.map((c: any) => ({
          id: c.id,
          name: c.name,
          holes: c.holes,
        })),
      };
    }

    return null;
  }

  /**
   * 날씨 정보 조회
   */
  private async getWeather(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, date } = args as { clubId: string; date: string };

    // 먼저 골프장 위치 조회
    const clubResponse = await firstValueFrom(
      this.courseClient.send('clubs.get', { id: clubId }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get club location: ${err.message}`);
        }),
      ),
    );

    if (!clubResponse?.success || !clubResponse?.data) {
      return { error: '골프장 정보를 찾을 수 없습니다' };
    }

    const club = clubResponse.data;
    const lat = club.latitude || 36.5; // 기본값
    const lon = club.longitude || 127.0;

    // 날씨 조회
    const weatherResponse = await firstValueFrom(
      this.weatherClient.send('weather.forecast', { lat, lon, date }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get weather: ${err.message}`);
        }),
      ),
    );

    if (weatherResponse?.success && weatherResponse?.data) {
      const weather = weatherResponse.data;
      return {
        date,
        clubName: club.name,
        temperature: weather.temperature,
        humidity: weather.humidity,
        sky: weather.sky,
        precipitation: weather.precipitation,
        windSpeed: weather.windSpeed,
        recommendation: this.getWeatherRecommendation(weather),
      };
    }

    return {
      date,
      clubName: club.name,
      message: '날씨 정보를 가져올 수 없습니다',
    };
  }

  /**
   * 날씨 기반 추천 메시지
   */
  private getWeatherRecommendation(weather: any): string {
    const temp = weather.temperature;
    const precipitation = weather.precipitation;

    if (precipitation > 0) {
      return '비가 예보되어 있어요. 우산을 챙기시거나 다른 날을 추천드려요.';
    }

    if (temp < 5) {
      return '추운 날씨예요. 따뜻하게 입고 오시면 좋겠어요.';
    }

    if (temp > 30) {
      return '더운 날씨예요. 이른 아침이나 저녁 시간대를 추천드려요.';
    }

    return '골프 치기 좋은 날씨예요!';
  }

  /**
   * 예약 가능 슬롯 조회
   */
  private async getAvailableSlots(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, date, timePreference } = args as {
      clubId: string;
      date: string;
      timePreference?: 'morning' | 'afternoon' | 'evening';
    };

    const response = await firstValueFrom(
      this.courseClient.send('games.available-slots', { clubId, date }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get available slots: ${err.message}`);
        }),
      ),
    );

    if (response?.success && response?.data) {
      let slots = response.data;

      // 시간대 필터링
      if (timePreference) {
        slots = this.filterByTimePreference(slots, timePreference);
      }

      return {
        date,
        availableCount: slots.length,
        slots: slots.slice(0, 10).map((slot: any) => ({
          id: slot.id,
          time: slot.startTime,
          endTime: slot.endTime,
          availableSpots: slot.availableSpots,
          price: slot.price,
          courseName: slot.courseName,
        })),
      };
    }

    return { date, availableCount: 0, slots: [] };
  }

  /**
   * 시간대별 필터링
   */
  private filterByTimePreference(slots: any[], preference: string): any[] {
    return slots.filter((slot) => {
      const hour = parseInt(slot.startTime?.split(':')[0] || '0', 10);

      switch (preference) {
        case 'morning':
          return hour >= 6 && hour < 12;
        case 'afternoon':
          return hour >= 12 && hour < 17;
        case 'evening':
          return hour >= 17 && hour < 21;
        default:
          return true;
      }
    });
  }

  /**
   * 예약 생성
   */
  private async createBooking(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, slotId, playerCount, userId } = args as {
      clubId: string;
      slotId: string;
      playerCount: number;
      userId: number;
    };

    const response = await firstValueFrom(
      this.bookingClient
        .send('booking.create', {
          userId,
          clubId,
          slotId,
          playerCount,
          source: 'AI_AGENT',
        })
        .pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((err) => {
            throw new Error(`Failed to create booking: ${err.message}`);
          }),
        ),
    );

    if (response?.success && response?.data) {
      const booking = response.data;
      return {
        success: true,
        bookingId: booking.id,
        confirmationNumber: booking.confirmationNumber,
        message: '예약이 완료되었습니다!',
        details: {
          date: booking.date,
          time: booking.startTime,
          playerCount: booking.playerCount,
          totalPrice: booking.totalPrice,
        },
      };
    }

    return {
      success: false,
      message: response?.error?.message || '예약에 실패했습니다',
    };
  }

  /**
   * 주소 검색 (위경도 추출)
   */
  private async searchAddress(args: Record<string, unknown>): Promise<unknown> {
    const { address } = args as { address: string };

    const response = await firstValueFrom(
      this.locationClient.send('location.search.address', { query: address }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err: any) => {
          throw new Error(`Failed to search address: ${err.message}`);
        }),
      ),
    );

    if (response?.success && response?.data?.addresses?.length > 0) {
      const addresses = response.data.addresses;
      return {
        found: addresses.length,
        addresses: addresses.slice(0, 3).map((addr: any) => ({
          addressName: addr.addressName,
          roadAddressName: addr.roadAddressName,
          region: `${addr.region1} ${addr.region2} ${addr.region3}`,
          postalCode: addr.postalCode,
          latitude: addr.coordinates.latitude,
          longitude: addr.coordinates.longitude,
        })),
      };
    }

    return { found: 0, addresses: [], message: '주소를 찾을 수 없습니다' };
  }

  /**
   * 근처 골프장 검색 (현재 위치 기반)
   */
  private async getNearbyClubs(args: Record<string, unknown>): Promise<unknown> {
    const { latitude, longitude, radius } = args as {
      latitude: number;
      longitude: number;
      radius?: number;
    };

    // 카카오 API로 근처 파크골프장 검색
    const locationResponse = await firstValueFrom(
      this.locationClient
        .send('location.nearbyGolf', {
          x: longitude,
          y: latitude,
          radius: radius || 10000,
        })
        .pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((err: any) => {
            throw new Error(`Failed to search nearby clubs: ${err.message}`);
          }),
        ),
    );

    if (locationResponse?.success && locationResponse?.data?.places?.length > 0) {
      const places = locationResponse.data.places;
      return {
        found: places.length,
        nearbyClubs: places.slice(0, 5).map((place: any) => ({
          name: place.placeName,
          address: place.addressName,
          phone: place.phone,
          distance: place.distance ? `${(place.distance / 1000).toFixed(1)}km` : undefined,
          latitude: place.coordinates.latitude,
          longitude: place.coordinates.longitude,
        })),
      };
    }

    return { found: 0, nearbyClubs: [], message: '근처에 파크골프장을 찾을 수 없습니다' };
  }

  /**
   * 골프장 부킹 정책 조회
   */
  private async getBookingPolicy(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, policyType = 'all' } = args as { clubId: string; policyType?: string };

    // 클럽의 companyId 조회
    const clubResponse = await firstValueFrom(
      this.courseClient.send('clubs.get', { id: clubId }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get club info: ${err.message}`);
        }),
      ),
    );

    const club = clubResponse?.success ? clubResponse.data : null;
    const companyId = club?.companyId;

    const resolvePayload = {
      scopeLevel: 'CLUB',
      companyId: companyId || undefined,
      clubId,
    };

    const results: Record<string, unknown> = {};

    const policyRequests: Array<{ key: string; pattern: string }> = [];
    if (policyType === 'all' || policyType === 'operating') {
      policyRequests.push({ key: 'operating', pattern: 'policy.operating.resolve' });
    }
    if (policyType === 'all' || policyType === 'cancellation') {
      policyRequests.push({ key: 'cancellation', pattern: 'policy.cancellation.resolve' });
    }
    if (policyType === 'all' || policyType === 'refund') {
      policyRequests.push({ key: 'refund', pattern: 'policy.refund.resolve' });
    }
    if (policyType === 'all' || policyType === 'noshow') {
      policyRequests.push({ key: 'noshow', pattern: 'policy.noshow.resolve' });
    }

    // 병렬 호출
    await Promise.all(
      policyRequests.map(async ({ key, pattern }) => {
        try {
          const response = await firstValueFrom(
            this.bookingClient.send(pattern, resolvePayload).pipe(
              timeout(this.REQUEST_TIMEOUT),
              catchError(() => {
                return [{ success: false }];
              }),
            ),
          );
          if (response?.success && response?.data) {
            results[key] = response.data;
          }
        } catch {
          this.logger.warn(`Failed to resolve ${key} policy for club ${clubId}`);
        }
      }),
    );

    return {
      clubId,
      clubName: club?.name,
      policies: results,
    };
  }
}
