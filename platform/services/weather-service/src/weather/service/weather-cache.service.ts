import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import NodeCache from 'node-cache';

/**
 * 캐시 통계
 */
export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}

/**
 * 인메모리 캐시 서비스
 * node-cache 기반 LRU 캐시
 */
@Injectable()
export class WeatherCacheService implements OnModuleInit {
  private readonly logger = new Logger(WeatherCacheService.name);
  private cache: NodeCache;

  // 캐시 TTL (초)
  private readonly ttlCurrent: number;
  private readonly ttlForecast: number;

  // 캐시 키 프리픽스
  private readonly PREFIX = {
    CURRENT: 'weather:current',
    FORECAST: 'weather:forecast',
    HOURLY: 'weather:hourly',
  };

  constructor(private readonly configService: ConfigService) {
    this.ttlCurrent = Number(this.configService.get('CACHE_TTL_CURRENT')) || 1800; // 30분
    this.ttlForecast = Number(this.configService.get('CACHE_TTL_FORECAST')) || 3600; // 1시간

    this.cache = new NodeCache({
      stdTTL: this.ttlCurrent,
      checkperiod: 120, // 2분마다 만료 체크
      maxKeys: 1000, // 최대 1000개 항목
      useClones: false, // 성능 최적화
    });
  }

  onModuleInit() {
    this.logger.log(`Cache initialized: TTL current=${this.ttlCurrent}s, forecast=${this.ttlForecast}s`);
  }

  /**
   * 현재 날씨 캐시 키 생성
   */
  private currentKey(nx: number, ny: number): string {
    return `${this.PREFIX.CURRENT}:${nx}:${ny}`;
  }

  /**
   * 시간별 예보 캐시 키 생성
   */
  private hourlyKey(nx: number, ny: number, baseDate: string): string {
    return `${this.PREFIX.HOURLY}:${nx}:${ny}:${baseDate}`;
  }

  /**
   * 단기 예보 캐시 키 생성
   */
  private forecastKey(nx: number, ny: number, baseDate: string): string {
    return `${this.PREFIX.FORECAST}:${nx}:${ny}:${baseDate}`;
  }

  // ============================================
  // 현재 날씨 캐시
  // ============================================

  getCurrentWeather<T>(nx: number, ny: number): T | undefined {
    const key = this.currentKey(nx, ny);
    return this.cache.get<T>(key);
  }

  setCurrentWeather<T>(nx: number, ny: number, data: T): void {
    const key = this.currentKey(nx, ny);
    this.cache.set(key, data, this.ttlCurrent);
  }

  // ============================================
  // 시간별 예보 캐시
  // ============================================

  getHourlyForecast<T>(nx: number, ny: number, baseDate: string): T | undefined {
    const key = this.hourlyKey(nx, ny, baseDate);
    return this.cache.get<T>(key);
  }

  setHourlyForecast<T>(nx: number, ny: number, baseDate: string, data: T): void {
    const key = this.hourlyKey(nx, ny, baseDate);
    this.cache.set(key, data, this.ttlCurrent);
  }

  // ============================================
  // 단기 예보 캐시
  // ============================================

  getForecast<T>(nx: number, ny: number, baseDate: string): T | undefined {
    const key = this.forecastKey(nx, ny, baseDate);
    return this.cache.get<T>(key);
  }

  setForecast<T>(nx: number, ny: number, baseDate: string, data: T): void {
    const key = this.forecastKey(nx, ny, baseDate);
    this.cache.set(key, data, this.ttlForecast);
  }

  // ============================================
  // 캐시 관리
  // ============================================

  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * 전체 캐시 삭제
   */
  flush(): void {
    this.cache.flushAll();
    this.logger.log('Cache flushed');
  }

  /**
   * 캐시 상태 로깅 (10분마다)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  logStats(): void {
    const stats = this.getStats();
    this.logger.log(
      `Cache stats: keys=${stats.keys}, hits=${stats.hits}, misses=${stats.misses}, ` +
      `hitRate=${stats.hits + stats.misses > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) : 0}%`,
    );
  }
}
