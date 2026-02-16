import { test, expect } from '@playwright/test';

/**
 * 홈 화면 날씨/위치 통합 E2E 테스트
 *
 * 테스트 대상:
 * - 브라우저 Geolocation → reverse-geo → 행정동 표시
 * - 현재 좌표 → weather.current → 기온 표시
 * - 현재 좌표 → nearby-clubs → 주변 골프장 or 인기 골프장 fallback
 * - 위치 권한 거부 시 fallback UI
 */

// 서울 송파구 좌표 (테스트용)
const MOCK_LOCATION = {
  latitude: 37.5145,
  longitude: 127.1059,
};

test.describe('홈 화면 - 위치/날씨 통합 (위치 허용)', () => {
  test.use({
    geolocation: MOCK_LOCATION,
    permissions: ['geolocation'],
  });

  test('위치 허용 시 행정동 이름과 기온이 표시된다', async ({ page }) => {
    // API 응답을 기다리면서 페이지 로드
    const [reverseGeoResponse, weatherResponse] = await Promise.all([
      page.waitForResponse((res) =>
        res.url().includes('/api/user/location/reverse-geo') && res.status() === 200
      ),
      page.waitForResponse((res) =>
        res.url().includes('/api/user/weather/current') && res.status() === 200
      ),
      page.goto('/'),
    ]);

    // API 응답 데이터 확인
    const geoData = await reverseGeoResponse.json();
    const weatherData = await weatherResponse.json();

    expect(geoData.success).toBe(true);
    expect(weatherData.success).toBe(true);

    // 인사 메시지 확인
    const greeting = page.locator('h1');
    await expect(greeting).toBeVisible({ timeout: 10000 });
    await expect(greeting).toHaveText(/좋은 아침이에요|안녕하세요|좋은 저녁이에요/);

    // 행정동 이름 표시 확인 (reverse-geo에서 반환된 region3 또는 region2)
    const expectedRegion = geoData.data.region3 || geoData.data.region2;
    await expect(page.getByText(expectedRegion)).toBeVisible({ timeout: 10000 });

    // 기온 표시 확인
    const expectedTemp = `${weatherData.data.temperature}°C`;
    await expect(page.getByText(expectedTemp)).toBeVisible({ timeout: 10000 });

    // fallback 메시지가 표시되지 않아야 함
    await expect(page.getByText('오늘도 파크골프하기 좋은 날이에요')).not.toBeVisible();
  });

  test('골프장 섹션이 표시된다 (주변 골프장 or 인기 골프장)', async ({ page }) => {
    // nearby-clubs API 응답 대기
    const [nearbyResponse] = await Promise.all([
      page.waitForResponse((res) =>
        res.url().includes('/api/user/location/nearby-clubs') && res.status() === 200
      ),
      page.goto('/'),
    ]);

    const nearbyData = await nearbyResponse.json();
    expect(nearbyData.success).toBe(true);

    if (nearbyData.data.length > 0) {
      // 주변 골프장이 있으면 "주변 골프장" 섹션 + 거리 정보
      await expect(page.getByText('주변 골프장')).toBeVisible({ timeout: 10000 });

      // 거리 표시 확인 (예: "3.2km")
      await expect(page.locator('text=/\\d+\\.\\d+km/').first()).toBeVisible();

      // 첫 번째 골프장 카드 클릭 → 상세 페이지 이동
      const clubCard = page.locator('button').filter({ hasText: /km/ }).first();
      await clubCard.click();
      await expect(page).toHaveURL(/club\//, { timeout: 10000 });
    } else {
      // 주변 골프장이 없으면 "이번 주 인기 골프장" fallback
      await expect(page.getByText('이번 주 인기 골프장')).toBeVisible({ timeout: 10000 });

      // 정적 골프장 카드 4개 확인
      await expect(page.getByText('서울 파크골프장')).toBeVisible();
      await expect(page.getByText('부산 해운대 파크골프')).toBeVisible();
    }
  });
});

test.describe('홈 화면 - 위치 거부 시 fallback', () => {
  test.use({
    geolocation: undefined,
    permissions: [],
  });

  test('위치 거부 시 fallback 메시지와 인기 골프장이 표시된다', async ({ page }) => {
    await page.context().clearPermissions();
    await page.goto('/');

    // 인사 메시지는 항상 표시
    const greeting = page.locator('h1');
    await expect(greeting).toBeVisible({ timeout: 30000 });
    await expect(greeting).toHaveText(/좋은 아침이에요|안녕하세요|좋은 저녁이에요/);

    // 위치/날씨 없으면 fallback 메시지 표시
    await expect(page.getByText('오늘도 파크골프하기 좋은 날이에요')).toBeVisible({ timeout: 15000 });

    // 기온이 표시되지 않아야 함
    const tempEl = page.locator('text=/^-?\\d+\\.?\\d*°C$/');
    await expect(tempEl).not.toBeVisible();

    // 위치 없으면 "이번 주 인기 골프장" fallback 표시
    await expect(page.getByText('이번 주 인기 골프장')).toBeVisible({ timeout: 15000 });

    // "주변 골프장"은 표시되지 않아야 함
    await expect(page.getByText('주변 골프장')).not.toBeVisible();
  });
});

test.describe('홈 화면 - 공통 섹션', () => {
  test.use({
    geolocation: MOCK_LOCATION,
    permissions: ['geolocation'],
  });

  test('다가오는 라운드 섹션이 표시된다', async ({ page }) => {
    // bookings API 응답 대기
    await Promise.all([
      page.waitForResponse((res) =>
        res.url().includes('/api/user/bookings') && res.status() === 200
      ),
      page.goto('/'),
    ]);

    // "다가오는 라운드" 섹션 확인
    await expect(page.getByText('다가오는 라운드')).toBeVisible({ timeout: 10000 });

    // 예약 카드 또는 빈 상태 메시지 (둘 중 하나는 반드시 표시)
    const bookingCard = page.getByText('확정').first();
    const emptyState = page.getByText('예정된 라운드가 없습니다');

    await expect(bookingCard.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('라운드 검색하기 CTA 클릭 시 예약 페이지로 이동한다', async ({ page }) => {
    await page.goto('/');

    const searchCTA = page.getByRole('button', { name: /라운드 검색하기/ });
    await expect(searchCTA).toBeVisible({ timeout: 30000 });

    await searchCTA.click();
    await expect(page).toHaveURL(/bookings/, { timeout: 10000 });
  });
});
