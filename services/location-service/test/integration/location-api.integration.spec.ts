/**
 * Location Service API Integration Tests
 *
 * 테스트 대상: 카카오 로컬 API 연동 및 위치 데이터 파싱 전체 흐름
 *
 * 사전 조건:
 * - KAKAO_API_KEY가 .env에 설정되어 있어야 함
 * - 인터넷 연결이 필요함 (카카오 API 호출)
 * - NATS 불필요
 *
 * 테스트 좌표: 서울시청 (경도 126.9780, 위도 37.5665)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { KakaoApiService } from '../../src/location/service/kakao-api.service';
import { LocationCacheService } from '../../src/location/service/location-cache.service';
import { LocationService } from '../../src/location/service/location.service';

// 서울시청 좌표 (경도, 위도)
const SEOUL_X = 126.978;
const SEOUL_Y = 37.5665;

// 제주시청 좌표
const JEJU_X = 126.5312;
const JEJU_Y = 33.4996;

describe('Location Service Integration Tests', () => {
  let kakaoApiService: KakaoApiService;
  let locationCacheService: LocationCacheService;
  let locationService: LocationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
          isGlobal: true,
        }),
        HttpModule.register({ timeout: 15000 }),
      ],
      providers: [KakaoApiService, LocationCacheService, LocationService],
    }).compile();

    kakaoApiService = module.get<KakaoApiService>(KakaoApiService);
    locationCacheService = module.get<LocationCacheService>(LocationCacheService);
    locationService = module.get<LocationService>(LocationService);

    // onModuleInit 수동 호출 (API 키 초기화)
    kakaoApiService.onModuleInit();
  });

  // ============================================
  // TC-001 ~ TC-004: KakaoApiService 직접 호출
  // ============================================

  describe('KakaoApiService - 주소 검색', () => {
    it('TC-001: 주소 검색 - "서울시청"', async () => {
      const result = await kakaoApiService.searchAddress({
        query: '서울특별시 중구 세종대로 110',
        size: 5,
      });

      expect(result).toBeDefined();
      expect(result.addresses).toBeDefined();
      expect(result.addresses.length).toBeGreaterThan(0);
      expect(result.meta.totalCount).toBeGreaterThan(0);

      const first = result.addresses[0];
      expect(first.addressName).toBeDefined();
      expect(first.coordinates).toBeDefined();
      expect(first.coordinates.latitude).toBeCloseTo(SEOUL_Y, 1);
      expect(first.coordinates.longitude).toBeCloseTo(SEOUL_X, 1);
    }, 15000);

    it('TC-002: 주소 검색 - 존재하지 않는 주소', async () => {
      const result = await kakaoApiService.searchAddress({
        query: '존재하지않는주소12345XYZABC',
        size: 5,
      });

      expect(result).toBeDefined();
      expect(result.addresses).toHaveLength(0);
      expect(result.meta.totalCount).toBe(0);
    }, 15000);
  });

  describe('KakaoApiService - 키워드 검색', () => {
    it('TC-003: 키워드 검색 - "파크골프"', async () => {
      const result = await kakaoApiService.searchKeyword({
        query: '파크골프',
        size: 5,
      });

      expect(result).toBeDefined();
      expect(result.places).toBeDefined();
      expect(result.places.length).toBeGreaterThan(0);

      const first = result.places[0];
      expect(first.id).toBeDefined();
      expect(first.placeName).toBeDefined();
      expect(first.coordinates).toBeDefined();
      expect(typeof first.coordinates.latitude).toBe('number');
      expect(typeof first.coordinates.longitude).toBe('number');
    }, 15000);

    it('TC-004: 키워드 검색 - 좌표 기반 반경 검색', async () => {
      const result = await kakaoApiService.searchKeyword({
        query: '카페',
        x: SEOUL_X,
        y: SEOUL_Y,
        radius: 1000,
        size: 5,
      });

      expect(result).toBeDefined();
      expect(result.places.length).toBeGreaterThan(0);

      // 반경 검색 시 distance 필드 존재
      const first = result.places[0];
      expect(first.distance).toBeDefined();
      expect(typeof first.distance).toBe('number');
    }, 15000);
  });

  describe('KakaoApiService - 카테고리 검색', () => {
    it('TC-005: 카테고리 검색 - CE7(카페) 서울시청 근처', async () => {
      const result = await kakaoApiService.searchCategory({
        categoryGroupCode: 'CE7',
        x: SEOUL_X,
        y: SEOUL_Y,
        radius: 500,
        size: 5,
      });

      expect(result).toBeDefined();
      expect(result.places.length).toBeGreaterThan(0);

      const first = result.places[0];
      expect(first.categoryGroupCode).toBe('CE7');
      expect(first.distance).toBeDefined();
    }, 15000);
  });

  describe('KakaoApiService - 좌표 변환', () => {
    it('TC-006: 좌표 → 주소 변환 (서울시청)', async () => {
      const result = await kakaoApiService.coordToAddress({
        x: SEOUL_X,
        y: SEOUL_Y,
      });

      expect(result).not.toBeNull();
      expect(result!.addressName).toBeDefined();
      expect(result!.region1).toBe('서울');
      expect(result!.coordinates.latitude).toBe(SEOUL_Y);
      expect(result!.coordinates.longitude).toBe(SEOUL_X);
    }, 15000);

    it('TC-007: 좌표 → 행정구역 변환 (서울시청)', async () => {
      const result = await kakaoApiService.coordToRegion(SEOUL_X, SEOUL_Y);

      expect(result).not.toBeNull();
      expect(result!.address).toBeDefined();
      expect(result!.region1).toBe('서울특별시');
      expect(result!.region2).toBeDefined();
    }, 15000);

    it('TC-008: 좌표 → 행정구역 변환 (제주)', async () => {
      const result = await kakaoApiService.coordToRegion(JEJU_X, JEJU_Y);

      expect(result).not.toBeNull();
      expect(result!.region1).toBe('제주특별자치도');
    }, 15000);
  });

  // ============================================
  // TC-009 ~ TC-013: LocationService (캐시 통합)
  // ============================================

  describe('LocationService - 캐시 통합', () => {
    it('TC-009: searchAddress - 첫 호출은 API, 두 번째는 캐시', async () => {
      // 첫 번째 호출 (API)
      const result1 = await locationService.searchAddress({
        query: '강남구 역삼동',
        size: 3,
      });

      expect(result1.addresses.length).toBeGreaterThan(0);

      // 캐시 통계 확인 - 첫 호출이므로 miss
      const stats1Misses = locationCacheService.getStats().address.misses;

      // 두 번째 호출 (캐시)
      const result2 = await locationService.searchAddress({
        query: '강남구 역삼동',
        size: 3,
      });

      expect(result2).toEqual(result1);

      // 캐시 hit 발생 확인
      const stats2 = locationCacheService.getStats().address;
      expect(stats2.hits).toBeGreaterThan(0);
    }, 15000);

    it('TC-010: searchKeyword - 캐시 동작 확인', async () => {
      const result1 = await locationService.searchKeyword({
        query: '서울 파크골프',
        size: 3,
      });

      expect(result1.places).toBeDefined();

      // 같은 쿼리 다시 호출 (캐시 hit)
      const result2 = await locationService.searchKeyword({
        query: '서울 파크골프',
        size: 3,
      });

      expect(result2).toEqual(result1);
    }, 15000);

    it('TC-011: coordToAddress - 좌표 변환 캐시 동작', async () => {
      const result1 = await locationService.coordToAddress({
        x: JEJU_X,
        y: JEJU_Y,
      });

      expect(result1).not.toBeNull();

      // 같은 좌표 다시 호출 (캐시 hit)
      const result2 = await locationService.coordToAddress({
        x: JEJU_X,
        y: JEJU_Y,
      });

      expect(result2).toEqual(result1);

      // 좌표 캐시 hit 확인
      const stats = locationCacheService.getStats().coord;
      expect(stats.hits).toBeGreaterThan(0);
    }, 15000);

    it('TC-012: getCoordinates - 주소에서 좌표 추출', async () => {
      const result = await locationService.getCoordinates('서울시 강남구 역삼동');

      expect(result).not.toBeNull();
      expect(result!.latitude).toBeDefined();
      expect(result!.longitude).toBeDefined();
      expect(typeof result!.latitude).toBe('number');
      expect(typeof result!.longitude).toBe('number');
    }, 15000);

    it('TC-013: searchNearbyGolfCourses - 근처 골프장 검색', async () => {
      const result = await locationService.searchNearbyGolfCourses(
        SEOUL_X,
        SEOUL_Y,
        20000,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // 파크골프 검색 결과가 있을 수 있음 (지역에 따라 다름)
      if (result.length > 0) {
        expect(result[0].placeName).toBeDefined();
        expect(result[0].coordinates).toBeDefined();
      }
    }, 15000);
  });

  // ============================================
  // TC-014 ~ TC-016: 에러 처리
  // ============================================

  describe('Error Handling', () => {
    it('TC-014: API 키 없으면 AppException 발생', async () => {
      // API 키를 임시로 제거
      const originalKey = (kakaoApiService as any).apiKey;
      (kakaoApiService as any).apiKey = '';

      await expect(
        kakaoApiService.searchAddress({ query: '서울' }),
      ).rejects.toThrow();

      // API 키 복구
      (kakaoApiService as any).apiKey = originalKey;
    }, 15000);

    it('TC-015: coordToRegion - 서비스 범위 밖 좌표는 에러 발생', async () => {
      // 좌표 (0, 0)은 카카오 서비스 범위 밖이므로 400 에러 발생
      await expect(
        kakaoApiService.coordToRegion(0, 0),
      ).rejects.toThrow();
    }, 15000);
  });

  // ============================================
  // TC-016 ~ TC-018: 캐시 서비스 단독 테스트
  // ============================================

  describe('LocationCacheService', () => {
    it('TC-016: 주소 캐시 set/get', () => {
      const key = 'test:address:key';
      const data = { test: true, value: '서울' };

      locationCacheService.setAddressSearch(key, data);
      const result = locationCacheService.getAddressSearch<typeof data>(key);

      expect(result).toEqual(data);
    });

    it('TC-017: 키워드 캐시 set/get', () => {
      const key = 'test:keyword:key';
      const data = { test: true, value: '파크골프' };

      locationCacheService.setKeywordSearch(key, data);
      const result = locationCacheService.getKeywordSearch<typeof data>(key);

      expect(result).toEqual(data);
    });

    it('TC-018: 좌표 캐시 set/get', () => {
      const key = 'test:coord:key';
      const data = { lat: 37.5665, lng: 126.978 };

      locationCacheService.setCoordConversion(key, data);
      const result = locationCacheService.getCoordConversion<typeof data>(key);

      expect(result).toEqual(data);
    });

    it('TC-019: 캐시 키 생성 확인', () => {
      expect(locationCacheService.makeAddressKey('서울', 1, 10)).toBe('addr:서울:1:10');
      expect(locationCacheService.makeKeywordKey('카페', 126.978, 37.5665, 1000)).toBe(
        'kw:카페:126.978:37.5665:1000',
      );
      expect(locationCacheService.makeCoordKey(126.978, 37.5665)).toBe(
        'coord:126.978000:37.566500',
      );
    });

    it('TC-020: 캐시 통계 확인', () => {
      const stats = locationCacheService.getStats();

      expect(stats).toBeDefined();
      expect(stats.address).toBeDefined();
      expect(stats.coord).toBeDefined();
      expect(typeof stats.address.keys).toBe('number');
      expect(typeof stats.address.hits).toBe('number');
      expect(typeof stats.address.misses).toBe('number');
    });
  });
});
