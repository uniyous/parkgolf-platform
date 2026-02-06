import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { ToolCall } from './gemini.service';

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
 * Gemini Function Call을 실제 NATS 요청으로 변환
 */
@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);
  private readonly REQUEST_TIMEOUT = 10000; // 10초

  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('WEATHER_SERVICE') private readonly weatherClient: ClientProxy,
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

      case 'get_club_info':
        return this.getClubInfo(toolCall.args);

      case 'get_weather':
        return this.getWeather(toolCall.args);

      case 'get_available_slots':
        return this.getAvailableSlots(toolCall.args);

      case 'create_booking':
        return this.createBooking(toolCall.args);

      default:
        throw new Error(`Unknown tool: ${toolCall.name}`);
    }
  }

  /**
   * 골프장 검색
   */
  private async searchClubs(args: Record<string, unknown>): Promise<unknown> {
    const { location, name } = args as { location: string; name?: string };

    const response = await firstValueFrom(
      this.courseClient.send('clubs.search', { location, name }).pipe(
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
          region: club.region,
        })),
      };
    }

    return { found: 0, clubs: [] };
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
}
