import { test, expect } from '../../fixtures/test';

/**
 * 공공 데이터 게이트웨이 — weather (KMA) / location (Kakao)
 *
 *   GET /api/user/weather/current?lat=&lon=     — 현재 날씨
 *   GET /api/user/weather/hourly?lat=&lon=      — 24시간 예보
 *   GET /api/user/weather/forecast?lat=&lon=    — 3일 일별
 *   GET /api/user/location/reverse-geo?lat=&lon=
 *   GET /api/user/location/nearby-clubs?lat=&lon=&radius=&limit=
 *
 * 토큰 불요. 외부 API 의존 — 5xx도 인정 (기상청/카카오 일시 장애).
 */

// 강남역 부근
const LAT = 37.4979;
const LON = 127.0276;

test.describe('User > Weather (public)', () => {
  test('현재 날씨 — lat/lon', async ({ request }) => {
    const res = await request.get(`/api/user/weather/current?lat=${LAT}&lon=${LON}`);
    expect([200, 502, 503]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      const data = body?.data ?? body;
      expect(data).toBeTruthy();
    }
  });

  test('시간별 예보', async ({ request }) => {
    const res = await request.get(`/api/user/weather/hourly?lat=${LAT}&lon=${LON}`);
    expect([200, 502, 503]).toContain(res.status());
  });

  test('일별 예보', async ({ request }) => {
    const res = await request.get(`/api/user/weather/forecast?lat=${LAT}&lon=${LON}`);
    expect([200, 502, 503]).toContain(res.status());
  });

  test('잘못된 좌표 → 4xx', async ({ request }) => {
    const res = await request.get('/api/user/weather/current?lat=abc&lon=xyz');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('User > Location (public)', () => {
  test('reverse-geo — 좌표 → 행정동', async ({ request }) => {
    const res = await request.get(`/api/user/location/reverse-geo?lat=${LAT}&lon=${LON}`);
    expect([200, 502, 503]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      const data = body?.data ?? body;
      expect(data).toBeTruthy();
    }
  });

  test('nearby-clubs — 강남역 30km 반경', async ({ request }) => {
    const res = await request.get(
      `/api/user/location/nearby-clubs?lat=${LAT}&lon=${LON}&radius=30&limit=20`,
    );
    expect([200, 502, 503]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      const data = body?.data ?? body;
      const items = Array.isArray(data) ? data : data?.items ?? data?.clubs ?? [];
      expect(Array.isArray(items)).toBeTruthy();
    }
  });

  test('nearby-clubs — 반경 미지정 (기본 30km)', async ({ request }) => {
    const res = await request.get(
      `/api/user/location/nearby-clubs?lat=${LAT}&lon=${LON}`,
    );
    expect([200, 502, 503]).toContain(res.status());
  });
});
