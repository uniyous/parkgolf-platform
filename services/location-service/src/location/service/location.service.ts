import { Injectable, Logger } from '@nestjs/common';
import { KakaoApiService } from './kakao-api.service';
import { LocationCacheService } from './location-cache.service';
import {
  AddressSearchDto,
  KeywordSearchDto,
  CoordToAddressDto,
  CategorySearchDto,
  AddressInfo,
  PlaceInfo,
  AddressSearchResult,
  PlaceSearchResult,
  Coordinates,
} from '../dto/location.dto';

/**
 * 위치 서비스 (캐싱 + API 통합)
 */
const DEFAULT_NEARBY_RADIUS = 10000;
const DEFAULT_KEYWORD_SIZE = 15;

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly kakaoApi: KakaoApiService,
    private readonly cache: LocationCacheService,
  ) {}

  /**
   * 주소 검색 (캐시 포함)
   */
  async searchAddress(dto: AddressSearchDto): Promise<AddressSearchResult> {
    const cacheKey = this.cache.makeAddressKey(dto.query, dto.page, dto.size);
    const cached = this.cache.getAddressSearch<AddressSearchResult>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const result = await this.kakaoApi.searchAddress(dto);
    this.cache.setAddressSearch(cacheKey, result);

    return result;
  }

  /**
   * 키워드로 장소 검색 (캐시 포함)
   */
  async searchKeyword(dto: KeywordSearchDto): Promise<PlaceSearchResult> {
    const cacheKey = this.cache.makeKeywordKey(dto.query, dto.x, dto.y, dto.radius);
    const cached = this.cache.getKeywordSearch<PlaceSearchResult>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const result = await this.kakaoApi.searchKeyword(dto);
    this.cache.setKeywordSearch(cacheKey, result);

    return result;
  }

  /**
   * 카테고리로 장소 검색
   */
  async searchCategory(dto: CategorySearchDto): Promise<PlaceSearchResult> {
    return this.kakaoApi.searchCategory(dto);
  }

  /**
   * 좌표 → 주소 변환 (캐시 포함)
   */
  async coordToAddress(dto: CoordToAddressDto): Promise<AddressInfo | null> {
    const cacheKey = this.cache.makeCoordKey(dto.x, dto.y);
    const cached = this.cache.getCoordConversion<AddressInfo>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const result = await this.kakaoApi.coordToAddress(dto);

    if (result) {
      this.cache.setCoordConversion(cacheKey, result);
    }

    return result;
  }

  /**
   * 좌표 → 행정구역 정보 변환
   */
  async coordToRegion(
    x: number,
    y: number,
  ): Promise<{ address: string; region1: string; region2: string; region3: string } | null> {
    return this.kakaoApi.coordToRegion(x, y);
  }

  /**
   * 주소에서 좌표 추출 (첫 번째 결과)
   */
  async getCoordinates(address: string): Promise<Coordinates | null> {
    const result = await this.searchAddress({ query: address, size: 1 });

    if (result.addresses.length === 0) {
      return null;
    }

    return result.addresses[0].coordinates;
  }

  /**
   * 근처 골프장 검색 (파크골프)
   */
  async searchNearbyGolfCourses(
    x: number,
    y: number,
    radius: number = DEFAULT_NEARBY_RADIUS,
  ): Promise<PlaceInfo[]> {
    // "파크골프" 키워드로 검색
    const result = await this.kakaoApi.searchKeyword({
      query: '파크골프',
      x,
      y,
      radius,
      size: DEFAULT_KEYWORD_SIZE,
    });

    return result.places;
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
