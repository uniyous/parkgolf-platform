import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { CoordinateConverter } from './coordinate-converter';
import { WeatherCacheService } from './weather-cache.service';
import { KmaApiService, KmaWeatherItem, WEATHER_CATEGORY } from './kma-api.service';
import { AppException, Errors } from '../../common/exceptions';
import {
  CurrentWeatherDto,
  HourlyForecastDto,
  DailyForecastDto,
  WeatherRequestDto,
} from '../dto/weather.dto';

/**
 * 하늘 상태
 */
export type SkyStatus = 'CLEAR' | 'PARTLY_CLOUDY' | 'CLOUDY' | 'OVERCAST';

/**
 * 강수 형태
 */
export type PrecipitationType = 'NONE' | 'RAIN' | 'SLEET' | 'SNOW' | 'DRIZZLE' | 'SNOW_FLURRY';

/**
 * 날씨 서비스
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private readonly coordinateConverter: CoordinateConverter,
    private readonly cacheService: WeatherCacheService,
    private readonly kmaApi: KmaApiService,
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  /**
   * 현재 날씨 조회
   */
  async getCurrentWeather(request: WeatherRequestDto): Promise<CurrentWeatherDto> {
    const { nx, ny } = await this.resolveCoordinates(request);

    // 캐시 확인
    const cached = this.cacheService.getCurrentWeather<CurrentWeatherDto>(nx, ny);
    if (cached) {
      this.logger.debug(`Cache hit: current weather for ${nx},${ny}`);
      return cached;
    }

    // 기상청 API 호출
    try {
      const items = await this.kmaApi.getUltraSrtNcst(nx, ny);
      const weather = this.parseCurrentWeather(items);

      // 캐시 저장
      this.cacheService.setCurrentWeather(nx, ny, weather);
      this.logger.debug(`Cache set: current weather for ${nx},${ny}`);

      return weather;
    } catch (error) {
      this.logger.error(`Failed to get current weather for ${nx},${ny}`, error);

      // 에러 시 기본값 반환 (서비스 중단 방지)
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException(Errors.Weather.FORECAST_NOT_AVAILABLE);
    }
  }

  /**
   * 시간별 예보 조회 (24시간)
   */
  async getHourlyForecast(request: WeatherRequestDto): Promise<HourlyForecastDto[]> {
    const { nx, ny } = await this.resolveCoordinates(request);
    const today = this.formatDate(new Date());

    // 캐시 확인
    const cached = this.cacheService.getHourlyForecast<HourlyForecastDto[]>(nx, ny, today);
    if (cached) {
      this.logger.debug(`Cache hit: hourly forecast for ${nx},${ny}`);
      return cached;
    }

    // 기상청 API 호출 (초단기예보 + 단기예보 조합)
    try {
      const [ultraItems, vilagItems] = await Promise.all([
        this.kmaApi.getUltraSrtFcst(nx, ny).catch(() => []),
        this.kmaApi.getVilageFcst(nx, ny).catch(() => []),
      ]);

      const forecasts = this.parseHourlyForecast(ultraItems, vilagItems);

      // 캐시 저장
      this.cacheService.setHourlyForecast(nx, ny, today, forecasts);
      this.logger.debug(`Cache set: hourly forecast for ${nx},${ny}`);

      return forecasts;
    } catch (error) {
      this.logger.error(`Failed to get hourly forecast for ${nx},${ny}`, error);
      throw new AppException(Errors.Weather.FORECAST_NOT_AVAILABLE);
    }
  }

  /**
   * 일별 예보 조회 (3일)
   */
  async getDailyForecast(request: WeatherRequestDto): Promise<DailyForecastDto[]> {
    const { nx, ny } = await this.resolveCoordinates(request);
    const today = this.formatDate(new Date());

    // 캐시 확인
    const cached = this.cacheService.getForecast<DailyForecastDto[]>(nx, ny, today);
    if (cached) {
      this.logger.debug(`Cache hit: daily forecast for ${nx},${ny}`);
      return cached;
    }

    // 기상청 API 호출
    try {
      const items = await this.kmaApi.getVilageFcst(nx, ny);
      const forecasts = this.parseDailyForecast(items);

      // 캐시 저장
      this.cacheService.setForecast(nx, ny, today, forecasts);
      this.logger.debug(`Cache set: daily forecast for ${nx},${ny}`);

      return forecasts;
    } catch (error) {
      this.logger.error(`Failed to get daily forecast for ${nx},${ny}`, error);
      throw new AppException(Errors.Weather.FORECAST_NOT_AVAILABLE);
    }
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 좌표 결정 (clubId 또는 lat/lon)
   */
  private async resolveCoordinates(request: WeatherRequestDto): Promise<{ nx: number; ny: number }> {
    let lat: number;
    let lon: number;

    if (request.clubId) {
      // course-service에서 골프장 좌표 조회
      const club = await this.getClubLocation(request.clubId);
      lat = club.lat;
      lon = club.lon;
    } else if (request.lat !== undefined && request.lon !== undefined) {
      lat = request.lat;
      lon = request.lon;
    } else {
      throw new AppException(Errors.Weather.INVALID_COORDINATES, 'clubId 또는 lat/lon이 필요합니다');
    }

    // 좌표 유효성 검증
    if (!this.coordinateConverter.isValidKoreaCoordinate(lat, lon)) {
      throw new AppException(Errors.Weather.INVALID_COORDINATES, '대한민국 범위 외 좌표입니다');
    }

    // 격자 좌표 변환
    return this.coordinateConverter.toGrid(lat, lon);
  }

  /**
   * 골프장 위치 조회
   */
  private async getClubLocation(clubId: string): Promise<{ lat: number; lon: number }> {
    try {
      const response = await firstValueFrom(
        this.courseClient.send('clubs.get', { id: clubId }).pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.warn(`Failed to get club location: ${clubId}`, err);
            throw new AppException(Errors.Weather.LOCATION_NOT_FOUND);
          }),
        ),
      );

      if (!response?.data?.latitude || !response?.data?.longitude) {
        throw new AppException(Errors.Weather.LOCATION_NOT_FOUND);
      }

      return {
        lat: response.data.latitude,
        lon: response.data.longitude,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException(Errors.Weather.LOCATION_NOT_FOUND);
    }
  }

  /**
   * 현재 날씨 파싱
   */
  private parseCurrentWeather(items: KmaWeatherItem[]): CurrentWeatherDto {
    const data: Record<string, string> = {};
    items.forEach((item) => {
      if (item.obsrValue) {
        data[item.category] = item.obsrValue;
      }
    });

    return {
      temperature: parseFloat(data[WEATHER_CATEGORY.T1H]) || 0,
      humidity: parseInt(data[WEATHER_CATEGORY.REH], 10) || 0,
      windSpeed: parseFloat(data[WEATHER_CATEGORY.WSD]) || 0,
      windDirection: parseInt(data[WEATHER_CATEGORY.VEC], 10) || 0,
      precipitation: parseFloat(data[WEATHER_CATEGORY.RN1]) || 0,
      precipitationType: this.parsePrecipitationType(data[WEATHER_CATEGORY.PTY]),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 시간별 예보 파싱
   */
  private parseHourlyForecast(ultraItems: KmaWeatherItem[], vilagItems: KmaWeatherItem[]): HourlyForecastDto[] {
    const forecastMap = new Map<string, Partial<HourlyForecastDto>>();

    // 초단기예보 데이터 (6시간)
    ultraItems.forEach((item) => {
      if (!item.fcstDate || !item.fcstTime) return;
      const key = `${item.fcstDate}-${item.fcstTime}`;

      if (!forecastMap.has(key)) {
        forecastMap.set(key, {
          dateTime: this.formatDateTime(item.fcstDate, item.fcstTime),
          date: item.fcstDate,
          time: item.fcstTime,
        });
      }

      const forecast = forecastMap.get(key)!;
      this.applyForecastValue(forecast, item);
    });

    // 단기예보 데이터 (3일) - 초단기 이후 시간대 보충
    vilagItems.forEach((item) => {
      if (!item.fcstDate || !item.fcstTime) return;
      const key = `${item.fcstDate}-${item.fcstTime}`;

      if (!forecastMap.has(key)) {
        forecastMap.set(key, {
          dateTime: this.formatDateTime(item.fcstDate, item.fcstTime),
          date: item.fcstDate,
          time: item.fcstTime,
        });
      }

      const forecast = forecastMap.get(key)!;
      // 초단기예보 데이터가 없는 경우만 적용
      if (forecast.temperature === undefined) {
        this.applyForecastValue(forecast, item);
      }
    });

    // 정렬 및 24시간 제한
    const now = new Date();
    const forecasts = Array.from(forecastMap.values())
      .filter((f) => {
        const fcstTime = this.parseDateTime(f.date!, f.time!);
        return fcstTime > now;
      })
      .sort((a, b) => {
        const aTime = `${a.date}${a.time}`;
        const bTime = `${b.date}${b.time}`;
        return aTime.localeCompare(bTime);
      })
      .slice(0, 24) as HourlyForecastDto[];

    return forecasts;
  }

  /**
   * 일별 예보 파싱
   */
  private parseDailyForecast(items: KmaWeatherItem[]): DailyForecastDto[] {
    const dailyMap = new Map<string, {
      minTemp?: number;
      maxTemp?: number;
      sky?: number;
      pop?: number;
      pty?: number;
    }>();

    items.forEach((item) => {
      if (!item.fcstDate || !item.fcstValue) return;

      if (!dailyMap.has(item.fcstDate)) {
        dailyMap.set(item.fcstDate, {});
      }

      const daily = dailyMap.get(item.fcstDate)!;
      const value = parseFloat(item.fcstValue);

      switch (item.category) {
        case WEATHER_CATEGORY.TMN:
          daily.minTemp = value;
          break;
        case WEATHER_CATEGORY.TMX:
          daily.maxTemp = value;
          break;
        case WEATHER_CATEGORY.SKY:
          // 대표값 (가장 많이 나온 값 또는 최대값)
          daily.sky = Math.max(daily.sky || 1, value);
          break;
        case WEATHER_CATEGORY.POP:
          daily.pop = Math.max(daily.pop || 0, value);
          break;
        case WEATHER_CATEGORY.PTY:
          daily.pty = Math.max(daily.pty || 0, value);
          break;
      }
    });

    // 3일치만 반환
    const dates = Array.from(dailyMap.keys()).sort().slice(0, 3);

    return dates.map((date) => {
      const data = dailyMap.get(date)!;
      return {
        date: this.formatDateStr(date),
        dayOfWeek: this.getDayOfWeek(date),
        minTemperature: data.minTemp ?? 0,
        maxTemperature: data.maxTemp ?? 0,
        sky: this.parseSkyStatus(data.sky),
        precipitationProbability: data.pop ?? 0,
        precipitationType: this.parsePrecipitationType(String(data.pty || 0)),
      };
    });
  }

  /**
   * 예보값 적용
   */
  private applyForecastValue(forecast: Partial<HourlyForecastDto>, item: KmaWeatherItem): void {
    const value = item.fcstValue ? parseFloat(item.fcstValue) : 0;

    switch (item.category) {
      case WEATHER_CATEGORY.TMP:
      case WEATHER_CATEGORY.T1H:
        forecast.temperature = value;
        break;
      case WEATHER_CATEGORY.SKY:
        forecast.sky = this.parseSkyStatus(value);
        break;
      case WEATHER_CATEGORY.POP:
        forecast.precipitationProbability = value;
        break;
      case WEATHER_CATEGORY.PTY:
        forecast.precipitationType = this.parsePrecipitationType(item.fcstValue || '0');
        break;
      case WEATHER_CATEGORY.REH:
        forecast.humidity = value;
        break;
      case WEATHER_CATEGORY.WSD:
        forecast.windSpeed = value;
        break;
    }
  }

  /**
   * 하늘 상태 파싱 (1:맑음, 3:구름많음, 4:흐림)
   */
  private parseSkyStatus(code?: number): SkyStatus {
    switch (code) {
      case 1: return 'CLEAR';
      case 3: return 'PARTLY_CLOUDY';
      case 4: return 'OVERCAST';
      default: return 'CLOUDY';
    }
  }

  /**
   * 강수 형태 파싱 (0:없음, 1:비, 2:비/눈, 3:눈, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
   */
  private parsePrecipitationType(code: string): PrecipitationType {
    switch (code) {
      case '0': return 'NONE';
      case '1': return 'RAIN';
      case '2': return 'SLEET';
      case '3': return 'SNOW';
      case '5': return 'DRIZZLE';
      case '6': return 'SLEET';
      case '7': return 'SNOW_FLURRY';
      default: return 'NONE';
    }
  }

  /**
   * 날짜 포맷 (YYYYMMDD → YYYY-MM-DD)
   */
  private formatDateStr(dateStr: string): string {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  /**
   * 날짜 포맷
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 날짜시간 포맷
   */
  private formatDateTime(date: string, time: string): string {
    return `${this.formatDateStr(date)}T${time.slice(0, 2)}:${time.slice(2, 4)}:00`;
  }

  /**
   * 날짜시간 파싱
   */
  private parseDateTime(date: string, time: string): Date {
    const year = parseInt(date.slice(0, 4), 10);
    const month = parseInt(date.slice(4, 6), 10) - 1;
    const day = parseInt(date.slice(6, 8), 10);
    const hour = parseInt(time.slice(0, 2), 10);
    const minute = parseInt(time.slice(2, 4), 10);
    return new Date(year, month, day, hour, minute);
  }

  /**
   * 요일 반환
   */
  private getDayOfWeek(dateStr: string): string {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const date = new Date(
      parseInt(dateStr.slice(0, 4), 10),
      parseInt(dateStr.slice(4, 6), 10) - 1,
      parseInt(dateStr.slice(6, 8), 10),
    );
    return days[date.getDay()];
  }
}
