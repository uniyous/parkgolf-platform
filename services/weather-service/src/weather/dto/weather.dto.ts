import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * 날씨 조회 요청 DTO
 */
export class WeatherRequestDto {
  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsNumber()
  @Min(33)
  @Max(43)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(124)
  @Max(132)
  lon?: number;

  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD
}

/**
 * 현재 날씨 응답 DTO
 */
export class CurrentWeatherDto {
  /** 기온 (℃) */
  temperature: number;

  /** 습도 (%) */
  humidity: number;

  /** 풍속 (m/s) */
  windSpeed: number;

  /** 풍향 (도) */
  windDirection: number;

  /** 1시간 강수량 (mm) */
  precipitation: number;

  /** 강수 형태 */
  precipitationType: 'NONE' | 'RAIN' | 'SLEET' | 'SNOW' | 'DRIZZLE' | 'SNOW_FLURRY';

  /** 업데이트 시간 */
  updatedAt: string;
}

/**
 * 시간별 예보 DTO
 */
export class HourlyForecastDto {
  /** 예보 일시 (ISO 8601) */
  dateTime: string;

  /** 날짜 (YYYYMMDD) */
  date: string;

  /** 시간 (HHMM) */
  time: string;

  /** 기온 (℃) */
  temperature?: number;

  /** 습도 (%) */
  humidity?: number;

  /** 풍속 (m/s) */
  windSpeed?: number;

  /** 하늘 상태 */
  sky?: 'CLEAR' | 'PARTLY_CLOUDY' | 'CLOUDY' | 'OVERCAST';

  /** 강수 확률 (%) */
  precipitationProbability?: number;

  /** 강수 형태 */
  precipitationType?: 'NONE' | 'RAIN' | 'SLEET' | 'SNOW' | 'DRIZZLE' | 'SNOW_FLURRY';
}

/**
 * 일별 예보 DTO
 */
export class DailyForecastDto {
  /** 날짜 (YYYY-MM-DD) */
  date: string;

  /** 요일 */
  dayOfWeek: string;

  /** 최저 기온 (℃) */
  minTemperature: number;

  /** 최고 기온 (℃) */
  maxTemperature: number;

  /** 하늘 상태 */
  sky: 'CLEAR' | 'PARTLY_CLOUDY' | 'CLOUDY' | 'OVERCAST';

  /** 강수 확률 (%) */
  precipitationProbability: number;

  /** 강수 형태 */
  precipitationType: 'NONE' | 'RAIN' | 'SLEET' | 'SNOW' | 'DRIZZLE' | 'SNOW_FLURRY';
}

/**
 * 캐시 통계 DTO
 */
export class CacheStatsDto {
  hits: number;
  misses: number;
  keys: number;
  hitRate: string;
}
