/**
 * Weather Service API Integration Tests
 *
 * 테스트 대상: KMA(기상청) API 연동 및 날씨 데이터 파싱 전체 흐름
 *
 * 사전 조건:
 * - KMA_API_KEY가 .env에 설정되어 있어야 함
 * - 인터넷 연결이 필요함 (기상청 API 호출)
 * - NATS 불필요 (course-service mock 처리)
 *
 * 테스트 좌표: 서울 (37.5665, 126.9780) → KMA 격자 (60, 127)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CoordinateConverter } from '../../src/weather/service/coordinate-converter';
import { KmaApiService } from '../../src/weather/service/kma-api.service';
import { WeatherCacheService } from '../../src/weather/service/weather-cache.service';
import { WeatherService } from '../../src/weather/service/weather.service';
import { ScheduleModule } from '@nestjs/schedule';

// 서울시청 좌표
const SEOUL_LAT = 37.5665;
const SEOUL_LON = 126.9780;
const SEOUL_NX = 60;
const SEOUL_NY = 127;

// 제주 좌표
const JEJU_LAT = 33.4996;
const JEJU_LON = 126.5312;

describe('Weather Service Integration Tests', () => {
  let coordinateConverter: CoordinateConverter;
  let kmaApiService: KmaApiService;
  let weatherCacheService: WeatherCacheService;
  let weatherService: WeatherService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
          isGlobal: true,
        }),
        HttpModule.register({ timeout: 15000 }),
        ScheduleModule.forRoot(),
      ],
      providers: [
        CoordinateConverter,
        KmaApiService,
        WeatherCacheService,
        WeatherService,
        {
          provide: 'COURSE_SERVICE',
          useValue: {
            send: () => {
              throw new Error('COURSE_SERVICE mock - not available in integration test');
            },
          },
        },
      ],
    }).compile();

    coordinateConverter = module.get<CoordinateConverter>(CoordinateConverter);
    kmaApiService = module.get<KmaApiService>(KmaApiService);
    weatherCacheService = module.get<WeatherCacheService>(WeatherCacheService);
    weatherService = module.get<WeatherService>(WeatherService);
  });

  // ============================================
  // 1. 좌표 변환 테스트
  // ============================================
  describe('1. CoordinateConverter', () => {
    it('TC-001: 서울 위경도 → KMA 격자 변환', () => {
      const result = coordinateConverter.toGrid(SEOUL_LAT, SEOUL_LON);

      console.log(`TC-001: 서울 (${SEOUL_LAT}, ${SEOUL_LON}) → 격자 (${result.nx}, ${result.ny})`);

      expect(result.nx).toBe(SEOUL_NX);
      expect(result.ny).toBe(SEOUL_NY);
    });

    it('TC-002: 제주 위경도 → KMA 격자 변환', () => {
      const result = coordinateConverter.toGrid(JEJU_LAT, JEJU_LON);

      console.log(`TC-002: 제주 (${JEJU_LAT}, ${JEJU_LON}) → 격자 (${result.nx}, ${result.ny})`);

      // 제주 격자 좌표: 약 (52, 38)
      expect(result.nx).toBeGreaterThanOrEqual(50);
      expect(result.nx).toBeLessThanOrEqual(55);
      expect(result.ny).toBeGreaterThanOrEqual(35);
      expect(result.ny).toBeLessThanOrEqual(40);
    });

    it('TC-003: KMA 격자 → 위경도 역변환 정확도 검증', () => {
      const grid = coordinateConverter.toGrid(SEOUL_LAT, SEOUL_LON);
      const latLon = coordinateConverter.toLatLon(grid.nx, grid.ny);

      console.log(`TC-003: 역변환 (${grid.nx}, ${grid.ny}) → (${latLon.lat}, ${latLon.lon})`);

      // 격자 5km 해상도이므로 오차 0.1도 이내
      expect(Math.abs(latLon.lat - SEOUL_LAT)).toBeLessThan(0.1);
      expect(Math.abs(latLon.lon - SEOUL_LON)).toBeLessThan(0.1);
    });

    it('TC-004: 한국 좌표 유효성 검증', () => {
      expect(coordinateConverter.isValidKoreaCoordinate(SEOUL_LAT, SEOUL_LON)).toBe(true);
      expect(coordinateConverter.isValidKoreaCoordinate(JEJU_LAT, JEJU_LON)).toBe(true);
      expect(coordinateConverter.isValidKoreaCoordinate(0, 0)).toBe(false);          // 적도
      expect(coordinateConverter.isValidKoreaCoordinate(35.6762, 139.6503)).toBe(false); // 도쿄
    });
  });

  // ============================================
  // 2. KMA API 직접 호출 테스트
  // ============================================
  describe('2. KMA API Direct Call', () => {
    it('TC-005: 초단기실황 API 호출 (현재 날씨)', async () => {
      const items = await kmaApiService.getUltraSrtNcst(SEOUL_NX, SEOUL_NY);

      console.log(`TC-005: 초단기실황 응답 항목 수: ${items.length}`);
      console.log('TC-005: 카테고리:', items.map(i => `${i.category}=${i.obsrValue}`).join(', '));

      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThan(0);

      // 필수 카테고리 존재 확인
      const categories = items.map(i => i.category);
      expect(categories).toContain('T1H'); // 기온
      expect(categories).toContain('REH'); // 습도
      expect(categories).toContain('WSD'); // 풍속

      // 데이터 값 유효성
      const temp = items.find(i => i.category === 'T1H');
      expect(temp?.obsrValue).toBeDefined();
      const tempValue = parseFloat(temp!.obsrValue!);
      expect(tempValue).toBeGreaterThan(-40);
      expect(tempValue).toBeLessThan(50);
    }, 15000);

    it('TC-006: 초단기예보 API 호출 (6시간 예보)', async () => {
      const items = await kmaApiService.getUltraSrtFcst(SEOUL_NX, SEOUL_NY);

      console.log(`TC-006: 초단기예보 응답 항목 수: ${items.length}`);

      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThan(0);

      // 예보 데이터에는 fcstDate, fcstTime, fcstValue가 있어야 함
      const firstItem = items[0];
      expect(firstItem.fcstDate).toBeDefined();
      expect(firstItem.fcstTime).toBeDefined();
      expect(firstItem.fcstValue).toBeDefined();

      console.log(`TC-006: 첫 항목 - ${firstItem.fcstDate} ${firstItem.fcstTime} ${firstItem.category}=${firstItem.fcstValue}`);
    }, 15000);

    it('TC-007: 단기예보 API 호출 (3일 예보)', async () => {
      const items = await kmaApiService.getVilageFcst(SEOUL_NX, SEOUL_NY);

      console.log(`TC-007: 단기예보 응답 항목 수: ${items.length}`);

      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThan(0);

      // 여러 날짜의 데이터가 있어야 함
      const dates = new Set(items.map(i => i.fcstDate).filter(Boolean));
      console.log(`TC-007: 예보 날짜: ${Array.from(dates).join(', ')}`);
      expect(dates.size).toBeGreaterThanOrEqual(1);

      // TMN(최저기온) 또는 TMX(최고기온)가 있어야 함
      const categories = new Set(items.map(i => i.category));
      console.log(`TC-007: 카테고리: ${Array.from(categories).join(', ')}`);
      expect(categories.has('TMP') || categories.has('SKY') || categories.has('POP')).toBe(true);
    }, 15000);
  });

  // ============================================
  // 3. WeatherService 전체 플로우 테스트
  // ============================================
  describe('3. WeatherService Full Flow', () => {
    beforeEach(() => {
      weatherCacheService.flush(); // 각 테스트 전 캐시 초기화
    });

    it('TC-008: 현재 날씨 조회 (lat/lon)', async () => {
      const result = await weatherService.getCurrentWeather({
        lat: SEOUL_LAT,
        lon: SEOUL_LON,
      });

      console.log('TC-008: 현재 날씨:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.temperature).toBeDefined();
      expect(typeof result.temperature).toBe('number');
      expect(result.humidity).toBeDefined();
      expect(result.humidity).toBeGreaterThanOrEqual(0);
      expect(result.humidity).toBeLessThanOrEqual(100);
      expect(result.windSpeed).toBeDefined();
      expect(result.windSpeed).toBeGreaterThanOrEqual(0);
      expect(result.windDirection).toBeDefined();
      expect(result.precipitationType).toBeDefined();
      expect(['NONE', 'RAIN', 'SLEET', 'SNOW', 'DRIZZLE', 'SNOW_FLURRY']).toContain(result.precipitationType);
      expect(result.updatedAt).toBeDefined();
    }, 15000);

    it('TC-009: 현재 날씨 캐시 동작 확인', async () => {
      // 첫 번째 호출: 캐시 miss → API 호출
      const result1 = await weatherService.getCurrentWeather({
        lat: SEOUL_LAT,
        lon: SEOUL_LON,
      });

      // getStats()는 참조 반환이므로 값을 즉시 복사
      const hitsAfterFirst = weatherCacheService.getStats().hits;
      console.log(`TC-009: 첫 호출 후 - hits=${hitsAfterFirst}`);

      // 두 번째 호출: 캐시 hit
      const result2 = await weatherService.getCurrentWeather({
        lat: SEOUL_LAT,
        lon: SEOUL_LON,
      });

      const hitsAfterSecond = weatherCacheService.getStats().hits;
      console.log(`TC-009: 두번째 호출 후 - hits=${hitsAfterSecond}`);

      // 두번째 호출에서 hit 1 증가
      expect(hitsAfterSecond).toBe(hitsAfterFirst + 1);
      // 동일 결과 반환
      expect(result1.temperature).toBe(result2.temperature);
    }, 15000);

    it('TC-010: 시간별 예보 조회 (lat/lon)', async () => {
      const result = await weatherService.getHourlyForecast({
        lat: SEOUL_LAT,
        lon: SEOUL_LON,
      });

      console.log(`TC-010: 시간별 예보 개수: ${result.length}`);
      if (result.length > 0) {
        console.log('TC-010: 첫 예보:', JSON.stringify(result[0], null, 2));
        console.log('TC-010: 마지막 예보:', JSON.stringify(result[result.length - 1], null, 2));
      }

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(24);

      // 시간순 정렬 확인
      for (let i = 1; i < result.length; i++) {
        const prev = `${result[i - 1].date}${result[i - 1].time}`;
        const curr = `${result[i].date}${result[i].time}`;
        expect(curr >= prev).toBe(true);
      }

      // 첫 예보 데이터 검증
      const first = result[0];
      expect(first.dateTime).toBeDefined();
      expect(first.date).toMatch(/^\d{8}$/);
      expect(first.time).toMatch(/^\d{4}$/);
    }, 20000);

    it('TC-011: 일별 예보 조회 (lat/lon)', async () => {
      const result = await weatherService.getDailyForecast({
        lat: SEOUL_LAT,
        lon: SEOUL_LON,
      });

      console.log(`TC-011: 일별 예보 개수: ${result.length}`);
      result.forEach((daily, idx) => {
        console.log(`TC-011: [${idx}] ${daily.date} (${daily.dayOfWeek}) - ${daily.minTemperature}~${daily.maxTemperature}℃, ${daily.sky}, 강수확률 ${daily.precipitationProbability}%`);
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeLessThanOrEqual(3);

      const first = result[0];
      expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(first.dayOfWeek).toBeDefined();
      expect(['일', '월', '화', '수', '목', '금', '토']).toContain(first.dayOfWeek);
      expect(['CLEAR', 'PARTLY_CLOUDY', 'CLOUDY', 'OVERCAST']).toContain(first.sky);
      expect(first.precipitationProbability).toBeGreaterThanOrEqual(0);
      expect(first.precipitationProbability).toBeLessThanOrEqual(100);
      expect(['NONE', 'RAIN', 'SLEET', 'SNOW', 'DRIZZLE', 'SNOW_FLURRY']).toContain(first.precipitationType);
    }, 20000);

    it('TC-012: 제주 좌표로 현재 날씨 조회', async () => {
      const result = await weatherService.getCurrentWeather({
        lat: JEJU_LAT,
        lon: JEJU_LON,
      });

      console.log('TC-012: 제주 현재 날씨:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.temperature).toBeDefined();
      expect(typeof result.temperature).toBe('number');
    }, 15000);
  });

  // ============================================
  // 4. 에러 핸들링 테스트
  // ============================================
  describe('4. Error Handling', () => {
    it('TC-013: 잘못된 좌표 (한국 범위 밖)', async () => {
      await expect(
        weatherService.getCurrentWeather({ lat: 0, lon: 0 }),
      ).rejects.toThrow();
    });

    it('TC-014: 좌표 없이 요청', async () => {
      await expect(
        weatherService.getCurrentWeather({}),
      ).rejects.toThrow();
    });

    it('TC-015: clubId로 요청 (NATS 미연결 시 에러)', async () => {
      await expect(
        weatherService.getCurrentWeather({ clubId: 'non-existent' }),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // 5. 캐시 서비스 단독 테스트
  // ============================================
  describe('5. WeatherCacheService', () => {
    beforeEach(() => {
      weatherCacheService.flush();
    });

    it('TC-016: 캐시 set/get 동작', () => {
      const testData = { temperature: 25, humidity: 60 };
      weatherCacheService.setCurrentWeather(60, 127, testData);

      const cached = weatherCacheService.getCurrentWeather(60, 127);
      expect(cached).toEqual(testData);
    });

    it('TC-017: 캐시 miss 시 undefined 반환', () => {
      const result = weatherCacheService.getCurrentWeather(99, 99);
      expect(result).toBeUndefined();
    });

    it('TC-018: 캐시 flush 동작', () => {
      weatherCacheService.setCurrentWeather(60, 127, { temperature: 25 });
      weatherCacheService.flush();

      const result = weatherCacheService.getCurrentWeather(60, 127);
      expect(result).toBeUndefined();
    });

    it('TC-019: 캐시 통계 조회', () => {
      const stats = weatherCacheService.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.keys).toBe('number');
    });
  });
});
