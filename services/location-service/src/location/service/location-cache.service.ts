import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import NodeCache from 'node-cache';

/**
 * 위치 정보 캐시 서비스
 */
@Injectable()
export class LocationCacheService {
  private readonly logger = new Logger(LocationCacheService.name);
  private readonly addressCache: NodeCache;
  private readonly coordCache: NodeCache;

  constructor(private readonly configService: ConfigService) {
    // 주소 검색 캐시 (기본 1시간)
    const addressTTL = this.configService.get<number>('CACHE_TTL_ADDRESS') || 3600;
    this.addressCache = new NodeCache({
      stdTTL: addressTTL,
      checkperiod: 120,
      useClones: true,
    });

    // 좌표 변환 캐시 (기본 24시간 - 좌표는 잘 안 바뀜)
    const coordTTL = this.configService.get<number>('CACHE_TTL_COORD') || 86400;
    this.coordCache = new NodeCache({
      stdTTL: coordTTL,
      checkperiod: 600,
      useClones: true,
    });

    this.logger.log(`Cache initialized - Address TTL: ${addressTTL}s, Coord TTL: ${coordTTL}s`);
  }

  /**
   * 주소 검색 결과 캐시 조회
   */
  getAddressSearch<T>(key: string): T | undefined {
    return this.addressCache.get<T>(key);
  }

  /**
   * 주소 검색 결과 캐시 저장
   */
  setAddressSearch<T>(key: string, value: T): void {
    this.addressCache.set(key, value);
  }

  /**
   * 좌표 변환 결과 캐시 조회
   */
  getCoordConversion<T>(key: string): T | undefined {
    return this.coordCache.get<T>(key);
  }

  /**
   * 좌표 변환 결과 캐시 저장
   */
  setCoordConversion<T>(key: string, value: T): void {
    this.coordCache.set(key, value);
  }

  /**
   * 캐시 키 생성 - 주소 검색
   */
  makeAddressKey(query: string, page?: number, size?: number): string {
    return `addr:${query}:${page || 1}:${size || 10}`;
  }

  /**
   * 캐시 키 생성 - 키워드 검색
   */
  makeKeywordKey(query: string, x?: number, y?: number, radius?: number): string {
    return `kw:${query}:${x || ''}:${y || ''}:${radius || ''}`;
  }

  /**
   * 캐시 키 생성 - 좌표 변환
   */
  makeCoordKey(x: number, y: number): string {
    // 소수점 6자리까지 (약 10cm 정밀도)
    return `coord:${x.toFixed(6)}:${y.toFixed(6)}`;
  }

  /**
   * 캐시 통계
   */
  getStats() {
    return {
      address: {
        keys: this.addressCache.keys().length,
        hits: this.addressCache.getStats().hits,
        misses: this.addressCache.getStats().misses,
      },
      coord: {
        keys: this.coordCache.keys().length,
        hits: this.coordCache.getStats().hits,
        misses: this.coordCache.getStats().misses,
      },
    };
  }
}
