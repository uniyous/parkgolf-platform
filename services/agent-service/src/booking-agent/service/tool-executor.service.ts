import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
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
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    @Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy,
    @Inject('NOTIFY_SERVICE') private readonly notifyClient: ClientProxy,
  ) {}

  /**
   * 좌표 → 지역명 변환 (location.coord2region)
   */
  async resolveRegionName(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.locationClient.send('location.coord2region', {
          x: longitude,
          y: latitude,
        }).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError(() => [null]),
        ),
      );

      if (response?.success && response.data) {
        const { region1, region2, region3 } = response.data;
        return [region1, region2, region3].filter(Boolean).join(' ');
      }
      return null;
    } catch {
      return null;
    }
  }

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
   * 결제 준비 (payment.prepare 호출)
   * 원샷 처리: booking.create → Saga 폴링 → payment.prepare
   */
  async preparePayment(params: {
    bookingId: number;
    amount: number;
    orderName: string;
    userId: number;
  }): Promise<{ orderId: string; paymentId: number } | null> {
    try {
      const response = await firstValueFrom(
        this.paymentClient
          .send('payment.prepare', {
            bookingId: params.bookingId,
            amount: params.amount,
            orderName: params.orderName,
            userId: params.userId,
          })
          .pipe(
            timeout(this.REQUEST_TIMEOUT),
            catchError((err) => {
              this.logger.error(`payment.prepare failed: ${err.message}`);
              return [null];
            }),
          ),
      );

      if (response?.success && response?.data) {
        return {
          orderId: response.data.orderId,
          paymentId: response.data.id,
        };
      }

      this.logger.warn('payment.prepare returned unsuccessful response');
      return null;
    } catch (error) {
      this.logger.error('preparePayment unexpected error', error);
      return null;
    }
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

      case 'get_weather_by_location':
        return this.getWeatherByLocation(toolCall.args);

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
   * games.search NATS 패턴을 사용하여 단일 호출로 Game + Club + TimeSlot 조회
   */
  private async searchClubsWithSlots(args: Record<string, unknown>): Promise<unknown> {
    const { location, date, name, timePreference } = args as {
      location: string;
      date: string;
      name?: string;
      timePreference?: 'morning' | 'afternoon' | 'evening';
    };

    // timePreference → games.search의 timeOfDay 매핑
    const timeOfDayMap: Record<string, string> = {
      morning: 'MORNING',
      afternoon: 'AFTERNOON',
      evening: 'EVENING',
    };

    const search = name ? `${location} ${name}` : location;

    const response = await firstValueFrom(
      this.courseClient.send('games.search', {
        search,
        date,
        timeOfDay: timePreference ? timeOfDayMap[timePreference] : undefined,
        limit: 20,
      }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to search clubs with slots: ${err.message}`);
        }),
      ),
    );

    if (!response?.success || !response?.data?.length) {
      return { found: 0, date, clubs: [] };
    }

    // games.search 응답을 Club 단위로 그룹핑 (rounds/slots 포함)
    const clubMap = new Map<number, {
      id: number;
      name: string;
      address: string;
      region: string;
      availableSlotCount: number;
      rounds: Array<{ gameId: number; name: string; price: number; slots: any[] }>;
    }>();

    for (const game of response.data) {
      const club = game.club;
      if (!club) continue;

      const slots = game.timeSlots || [];
      if (slots.length === 0) continue;

      const roundSlots = slots.map((slot: any) => ({
        id: slot.id,
        time: slot.startTime,
        endTime: slot.endTime,
        availableSpots: slot.availablePlayers ?? (slot.maxPlayers - slot.bookedPlayers),
        price: Number(slot.price),
      })).sort((a: any, b: any) => a.time.localeCompare(b.time));

      const existing = clubMap.get(club.id);

      if (existing) {
        existing.availableSlotCount += roundSlots.length;
        existing.rounds.push({
          gameId: game.id,
          name: game.name,
          price: Number(roundSlots[0]?.price || 0),
          slots: roundSlots,
        });
      } else {
        clubMap.set(club.id, {
          id: club.id,
          name: club.name,
          address: club.address,
          region: club.location,
          availableSlotCount: roundSlots.length,
          rounds: [{
            gameId: game.id,
            name: game.name,
            price: Number(roundSlots[0]?.price || 0),
            slots: roundSlots,
          }],
        });
      }
    }

    const clubs = Array.from(clubMap.values());

    return {
      found: clubs.length,
      date,
      clubs,
    };
  }

  /**
   * 골프장 상세 정보
   */
  private async getClubInfo(args: Record<string, unknown>): Promise<unknown> {
    const { clubId } = args as { clubId: string };

    const response = await firstValueFrom(
      this.courseClient.send('club.findOne', { id: Number(clubId) }).pipe(
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
      this.courseClient.send('club.findOne', { id: Number(clubId) }).pipe(
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
      this.weatherClient.send('weather.forecast', { lat, lon }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get weather: ${err.message}`);
        }),
      ),
    );

    if (weatherResponse?.success && weatherResponse?.data) {
      const forecasts = Array.isArray(weatherResponse.data) ? weatherResponse.data : [weatherResponse.data];
      const weather = forecasts.find((f: any) => f.date === date) || forecasts[0];

      if (weather) {
        return {
          date,
          clubName: club.name,
          temperature: weather.maxTemperature ?? weather.temperature,
          minTemperature: weather.minTemperature,
          maxTemperature: weather.maxTemperature,
          sky: weather.sky,
          precipitation: weather.precipitationProbability ?? weather.precipitation ?? 0,
          recommendation: this.getWeatherRecommendation(weather),
        };
      }
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
    const temp = weather.maxTemperature ?? weather.temperature;
    const precipitation = weather.precipitationProbability ?? weather.precipitation ?? 0;

    if (precipitation > 50) {
      return '비가 예보되어 있어요. 우산을 챙기시거나 다른 날을 추천드려요.';
    }

    if (precipitation > 30) {
      return '비 올 가능성이 있어요. 우산을 준비하시면 좋겠어요.';
    }

    if (temp !== undefined && temp < 5) {
      return '추운 날씨예요. 따뜻하게 입고 오시면 좋겠어요.';
    }

    if (temp !== undefined && temp > 30) {
      return '더운 날씨예요. 이른 아침이나 저녁 시간대를 추천드려요.';
    }

    return '골프 치기 좋은 날씨예요!';
  }

  /**
   * 지역명으로 날씨 정보 조회
   * location.search.address → 좌표 추출 → weather.forecast
   */
  private async getWeatherByLocation(args: Record<string, unknown>): Promise<unknown> {
    const { location, date, latitude, longitude } = args as {
      location: string;
      date: string;
      latitude?: number;
      longitude?: number;
    };

    let lat: number;
    let lon: number;
    let resolvedLocation = location;

    // 좌표가 직접 전달되면 주소 검색 건너뜀
    if (latitude && longitude) {
      lat = latitude;
      lon = longitude;
    } else {
      // 지역명 → 좌표 변환
      const addrResponse = await firstValueFrom(
        this.locationClient.send('location.search.address', { query: location }).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((err: any) => {
            this.logger.warn(`Address search failed for "${location}": ${err.message}`);
            return [null];
          }),
        ),
      );

      if (addrResponse?.success && addrResponse?.data?.addresses?.length > 0) {
        const addr = addrResponse.data.addresses[0];
        lat = addr.coordinates.latitude;
        lon = addr.coordinates.longitude;
        resolvedLocation = addr.region1
          ? `${addr.region1} ${addr.region2 || ''}`.trim()
          : location;
      } else {
        // 주소 검색 실패 시 키워드 검색 시도
        const keywordResponse = await firstValueFrom(
          this.locationClient.send('location.search.keyword', { query: location }).pipe(
            timeout(this.REQUEST_TIMEOUT),
            catchError(() => [null]),
          ),
        );

        if (keywordResponse?.success && keywordResponse?.data?.places?.length > 0) {
          const place = keywordResponse.data.places[0];
          lat = place.coordinates.latitude;
          lon = place.coordinates.longitude;
          resolvedLocation = place.addressName || location;
        } else {
          return { date, location, message: `"${location}" 지역을 찾을 수 없습니다. 다른 지역명으로 시도해주세요.` };
        }
      }
    }

    // 2. 날씨 조회
    const weatherResponse = await firstValueFrom(
      this.weatherClient.send('weather.forecast', { lat, lon }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get weather: ${err.message}`);
        }),
      ),
    );

    if (weatherResponse?.success && weatherResponse?.data) {
      const forecasts = Array.isArray(weatherResponse.data) ? weatherResponse.data : [weatherResponse.data];
      const weather = forecasts.find((f: any) => f.date === date) || forecasts[0];

      if (weather) {
        return {
          date,
          location: resolvedLocation,
          temperature: weather.maxTemperature ?? weather.temperature,
          minTemperature: weather.minTemperature,
          maxTemperature: weather.maxTemperature,
          sky: weather.sky,
          precipitation: weather.precipitationProbability ?? weather.precipitation ?? 0,
          recommendation: this.getWeatherRecommendation(weather),
        };
      }
    }

    return {
      date,
      location: resolvedLocation,
      message: '날씨 정보를 가져올 수 없습니다',
    };
  }

  /**
   * 예약 가능 슬롯 조회
   * games.search NATS 패턴을 사용하여 clubId + date로 조회
   */
  private async getAvailableSlots(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, date, timePreference } = args as {
      clubId: string;
      date: string;
      timePreference?: 'morning' | 'afternoon' | 'evening';
    };

    const timeOfDayMap: Record<string, string> = {
      morning: 'MORNING',
      afternoon: 'AFTERNOON',
      evening: 'EVENING',
    };

    const response = await firstValueFrom(
      this.courseClient.send('games.search', {
        clubId: Number(clubId),
        date,
        timeOfDay: timePreference ? timeOfDayMap[timePreference] : undefined,
        limit: 50,
      }).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get available slots: ${err.message}`);
        }),
      ),
    );

    if (response?.success && response?.data?.length) {
      // 골프장 정보 추출
      const firstGame = response.data[0];
      const club = firstGame.club;

      // 게임 라운드별 그룹핑
      const rounds: any[] = [];
      const allSlots: any[] = [];

      for (const game of response.data) {
        const slots = game.timeSlots || [];
        if (slots.length === 0) continue;

        const roundSlots = slots.map((slot: any) => ({
          id: slot.id,
          time: slot.startTime,
          endTime: slot.endTime,
          availableSpots: slot.availablePlayers ?? (slot.maxPlayers - slot.bookedPlayers),
          price: Number(slot.price),
        }));
        roundSlots.sort((a: any, b: any) => a.time.localeCompare(b.time));

        rounds.push({
          gameId: game.id,
          name: game.name,
          price: Number(roundSlots[0]?.price || 0),
          slots: roundSlots,
        });

        // 하위 호환용 flat 목록
        for (const slot of roundSlots) {
          allSlots.push({ ...slot, gameName: game.name });
        }
      }

      allSlots.sort((a, b) => a.time.localeCompare(b.time));

      return {
        clubName: club?.name || '',
        clubAddress: club?.address || '',
        date,
        availableCount: allSlots.length,
        rounds,
        slots: allSlots.slice(0, 10),
      };
    }

    return { date, availableCount: 0, rounds: [], slots: [] };
  }

  /**
   * 예약 생성
   * booking.create 후 Saga 완료를 폴링하여 최종 상태를 반환
   */
  private async createBooking(args: Record<string, unknown>): Promise<unknown> {
    const { gameTimeSlotId, playerCount, userId, userName, userEmail, paymentMethod } = args as {
      gameTimeSlotId: number;
      playerCount: number;
      userId: number;
      userName?: string;
      userEmail?: string;
      paymentMethod?: string;
    };

    const response = await firstValueFrom(
      this.bookingClient
        .send('booking.create', {
          idempotencyKey: crypto.randomUUID(),
          userId,
          userName: userName || '',
          userEmail: userEmail || '',
          gameTimeSlotId,
          playerCount,
          paymentMethod: paymentMethod || 'onsite',
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
      const bookingId = booking.id;

      // Saga 완료 대기 (polling)
      const finalStatus = await this.waitForSagaCompletion(bookingId, paymentMethod);

      if (finalStatus === 'FAILED') {
        return {
          success: false,
          message: '슬롯 예약에 실패했습니다. 다른 시간을 선택해 주세요.',
        };
      }

      return {
        success: true,
        bookingId,
        bookingNumber: booking.bookingNumber,
        confirmationNumber: booking.bookingNumber,
        status: finalStatus, // 'CONFIRMED' | 'SLOT_RESERVED' | 'PENDING'
        message: finalStatus === 'CONFIRMED'
          ? '예약이 완료되었습니다!'
          : '결제를 진행해 주세요.',
        details: {
          date: booking.bookingDate || booking.date,
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
   * Saga 완료 대기 (폴링)
   * booking.create 직후 PENDING 상태에서 CONFIRMED/SLOT_RESERVED/FAILED까지 폴링
   */
  private async waitForSagaCompletion(
    bookingId: number,
    paymentMethod?: string,
  ): Promise<string> {
    const POLL_INTERVAL = 300; // 300ms
    const MAX_ATTEMPTS = 20;   // 최대 6초
    const targetStatus =
      !paymentMethod || paymentMethod === 'onsite'
        ? 'CONFIRMED'
        : 'SLOT_RESERVED';

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

      try {
        const response = await firstValueFrom(
          this.bookingClient
            .send('booking.findById', { id: bookingId })
            .pipe(
              timeout(5000),
              catchError(() => [null]),
            ),
        );

        const status = response?.data?.status;
        if (status === targetStatus || status === 'CONFIRMED') return status;
        if (status === 'FAILED') return 'FAILED';
        // PENDING → 계속 폴링
      } catch {
        // ignore, retry
      }
    }

    this.logger.warn(`Saga polling timeout for booking ${bookingId}`);
    return 'PENDING'; // 타임아웃 시 PENDING 반환 (graceful degradation)
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
   * 근처 골프장 검색 (현재 위치 기반, course-service DB Haversine 조회)
   */
  private async getNearbyClubs(args: Record<string, unknown>): Promise<unknown> {
    const { latitude, longitude, radius } = args as {
      latitude: number;
      longitude: number;
      radius?: number;
    };

    // radius: LLM이 미터 단위로 넘길 수 있으므로 km로 변환 (1000 이상이면 미터로 간주)
    const radiusKm = radius && radius >= 1000 ? Math.round(radius / 1000) : (radius || 10);

    const response = await firstValueFrom(
      this.courseClient
        .send('club.findNearby', {
          latitude,
          longitude,
          radiusKm,
        })
        .pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((err: any) => {
            throw new Error(`Failed to search nearby clubs: ${err.message}`);
          }),
        ),
    );

    if (response?.success && Array.isArray(response?.data) && response.data.length > 0) {
      const clubs = response.data;
      return {
        found: clubs.length,
        nearbyClubs: clubs.slice(0, 5).map((club: any) => ({
          id: club.id,
          name: club.name,
          address: club.address,
          region: club.location,
          phone: club.phone,
          distance: club.distance != null ? `${club.distance}km` : undefined,
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
      this.courseClient.send('club.findOne', { id: Number(clubId) }).pipe(
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

  // ── 팀 예약 관련 메서드 ──

  /**
   * 채팅방 멤버 목록 조회
   */
  async getChatRoomMembers(roomId: string): Promise<Array<{
    userId: number;
    userName: string;
    userEmail: string;
  }> | null> {
    try {
      const response = await firstValueFrom(
        this.chatClient.send('chat.room.getMembers', { roomId }).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError(() => [null]),
        ),
      );

      if (response?.success && Array.isArray(response.data)) {
        return response.data.map((m: any) => ({
          userId: m.userId,
          userName: m.userName,
          userEmail: m.userEmail || '',
        }));
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 분할결제 준비
   */
  async prepareSplitPayment(params: {
    bookingGroupId?: number;
    bookingId: number;
    participants: Array<{
      userId: number;
      userName: string;
      userEmail: string;
      amount: number;
    }>;
  }): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.paymentClient.send('payment.splitPrepare', params).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((err) => {
            this.logger.error(`payment.splitPrepare failed: ${err.message}`);
            return [null];
          }),
        ),
      );

      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.logger.error('prepareSplitPayment unexpected error', error);
      return null;
    }
  }

  /**
   * 분할결제 상태 조회 (bookingId 기반)
   */
  async getSplitStatus(bookingId: number): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.paymentClient.send('payment.splitGet', { bookingId }).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((err) => {
            this.logger.error(`payment.splitGet failed: ${err.message}`);
            return [null];
          }),
        ),
      );

      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.logger.error('getSplitStatus unexpected error', error);
      return null;
    }
  }

  /**
   * 분할결제 상태 조회 (orderId 기반 → bookingId 역추적)
   */
  async getSplitStatusByOrderId(orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.paymentClient.send('payment.splitGet', { orderId }).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((err) => {
            this.logger.error(`payment.splitGet (orderId) failed: ${err.message}`);
            return [null];
          }),
        ),
      );

      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.logger.error('getSplitStatusByOrderId unexpected error', error);
      return null;
    }
  }

  /**
   * 예약의 진행자(booker) userId 조회
   */
  async getBookingBookerId(bookingId: number): Promise<number | undefined> {
    try {
      const response = await firstValueFrom(
        this.bookingClient
          .send('booking.findById', { id: bookingId })
          .pipe(
            timeout(5000),
            catchError(() => [null]),
          ),
      );
      return response?.data?.userId || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 분할결제 요청 알림 발송 (fire-and-forget)
   */
  emitSplitPaymentNotification(data: {
    bookerId: number;
    bookerName: string;
    bookingGroupId: number;
    chatRoomId: string;
    participants: Array<{
      userId: number;
      userName: string;
      amount: number;
    }>;
  }): void {
    try {
      this.notifyClient.emit('payment.splitRequested', data);
    } catch (error) {
      this.logger.error('emitSplitPaymentNotification failed', error);
    }
  }

  /**
   * 정산 카드 브로드캐스트 (fire-and-forget)
   * 1개 AI_ASSISTANT 메시지(senderId=0)를 DB에 저장하고,
   * NATS 이벤트로 chat-gateway에 전달하여 Socket.IO 룸 브로드캐스트.
   * 클라이언트는 metadata.targetUserIds로 본인 해당 여부를 판단.
   */
  broadcastSettlementCard(
    roomId: string,
    targetUserIds: number[],
    settlementData: Record<string, unknown>,
    content?: string,
    bookerUserId?: number,
  ): void {
    const metadata = JSON.stringify({
      conversationId: null,
      state: 'SETTLING',
      actions: [{ type: 'SETTLEMENT_STATUS', data: settlementData }],
      targetUserIds,
      bookerUserId: bookerUserId || null,
    });

    const message = {
      id: crypto.randomUUID(),
      roomId,
      senderId: 0,
      senderName: 'AI 예약 도우미',
      content: content || '더치페이 결제 요청이 도착했습니다.',
      type: 'AI_ASSISTANT',
      metadata,
      createdAt: new Date().toISOString(),
    };

    // 1. DB 저장 (@MessagePattern 핸들러이므로 send() 사용)
    this.logger.log(`broadcastSettlementCard DB save - roomId=${roomId}, msgId=${message.id}, targetUserIds=${JSON.stringify(targetUserIds)}`);
    firstValueFrom(
      this.chatClient.send('chat.messages.save', message).pipe(
        timeout(5000),
        catchError((err) => {
          this.logger.error(`broadcastSettlementCard DB save failed: ${err.message}`, err.stack);
          return of(null);
        }),
      ),
    ).then((result) => {
      if (result) {
        this.logger.log(`broadcastSettlementCard DB save success - msgId=${message.id}`);
      } else {
        this.logger.warn(`broadcastSettlementCard DB save returned null - msgId=${message.id}`);
      }
    }).catch((err) => {
      this.logger.error(`broadcastSettlementCard DB save promise rejected: ${err.message}`, err.stack);
    });

    // 2. NATS 이벤트 발행 → chat-gateway가 Socket.IO 룸으로 브로드캐스트
    try {
      this.notifyClient.emit('chat.message.room', {
        roomId,
        message: {
          ...message,
          messageType: 'AI_ASSISTANT',
        },
      });
    } catch (error) {
      this.logger.error('broadcastSettlementCard NATS emit failed', error);
    }
  }

  /**
   * 채팅방에 SYSTEM 메시지 전송 (fire-and-forget)
   */
  sendSystemMessage(roomId: string, content: string): void {
    // @MessagePattern 핸들러이므로 send() 사용 (emit은 @EventPattern용)
    firstValueFrom(
      this.chatClient.send('chat.messages.save', {
        id: crypto.randomUUID(),
        roomId,
        senderId: 0,
        senderName: 'SYSTEM',
        content,
        type: 'SYSTEM',
        createdAt: new Date().toISOString(),
      }).pipe(
        timeout(5000),
        catchError((err) => {
          this.logger.error(`sendSystemMessage failed: ${err.message}`);
          return of(null);
        }),
      ),
    );
  }
}
