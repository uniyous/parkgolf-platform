import { test, expect } from '@playwright/test';

/**
 * 401 토큰 자동 갱신 E2E 테스트 (User WebApp)
 *
 * API 호출 시 401 응답을 받으면:
 * 1. refresh_token으로 새 토큰을 발급받고
 * 2. 갱신 성공 시 새 토큰 저장 (caller가 재시도)
 * 3. 갱신 실패 시 로그인 페이지로 이동
 *
 * 테스트 방법: page.route()로 API 응답을 인터셉트하여 401 시뮬레이션
 */

const OLD_ACCESS_TOKEN = 'expired_access_token_for_test';
const OLD_REFRESH_TOKEN = 'valid_refresh_token_for_test';
const NEW_ACCESS_TOKEN = 'new_access_token_after_refresh';
const NEW_REFRESH_TOKEN = 'new_refresh_token_after_refresh';

/** localStorage에 인증 상태를 설정하는 헬퍼 */
async function setupAuth(
  page: any,
  options: { accessToken: string; refreshToken?: string }
) {
  await page.evaluate(
    ({ accessToken, refreshToken }: { accessToken: string; refreshToken?: string }) => {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem(
        'currentUser',
        JSON.stringify({
          id: '1',
          email: 'test@parkgolf.com',
          name: '테스트사용자',
          roles: ['USER'],
        })
      );
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: { token: accessToken, refreshToken: refreshToken || null },
          version: 0,
        })
      );
    },
    options
  );
}

test.describe('401 토큰 자동 갱신', () => {
  // 기본 storageState 대신 커스텀 인증 상태 사용
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(30000);

  /**
   * 시나리오 1: access token 만료 → refresh 성공 → 새 토큰 저장
   *
   * 흐름:
   *   API 호출 (OLD_TOKEN) → 401 → refresh 호출 → 새 토큰 반환
   *   → localStorage에 새 토큰 저장
   *   → 로그인 페이지로 이동하지 않음
   */
  test('access token 만료 시 refresh 성공하면 새 토큰이 저장된다', async ({ page }) => {
    let refreshCalled = false;

    // 1. 로그인 페이지에서 인증 상태 수동 설정
    await page.goto('/login');
    await setupAuth(page, {
      accessToken: OLD_ACCESS_TOKEN,
      refreshToken: OLD_REFRESH_TOKEN,
    });

    // 2. API 라우트 mock 설정
    await page.route('**/api/user/**', async (route, request) => {
      const url = request.url();

      // refresh 엔드포인트 → 새 토큰 반환
      if (url.includes('/iam/refresh')) {
        refreshCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: NEW_ACCESS_TOKEN,
              refreshToken: NEW_REFRESH_TOKEN,
            },
          }),
        });
        return;
      }

      // 일반 API 호출 → 만료된 토큰이면 401, 새 토큰이면 200
      const authHeader = request.headers()['authorization'] || '';
      if (authHeader.includes(OLD_ACCESS_TOKEN)) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Token expired' },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      }
    });

    // 3. 검색 페이지로 이동 → API 호출 트리거
    await page.goto('/search');
    await page.waitForTimeout(3000);

    // 4. 검증: refresh 엔드포인트 호출됨
    expect(refreshCalled).toBe(true);

    // 5. 검증: 새 토큰이 localStorage에 저장됨
    const savedAccessToken = await page.evaluate(() =>
      localStorage.getItem('accessToken')
    );
    expect(savedAccessToken).toBe(NEW_ACCESS_TOKEN);

    const savedRefreshToken = await page.evaluate(() =>
      localStorage.getItem('refreshToken')
    );
    expect(savedRefreshToken).toBe(NEW_REFRESH_TOKEN);

    // 6. 검증: 로그인 페이지로 이동하지 않음
    expect(page.url()).not.toContain('/login');
  });

  /**
   * 시나리오 2: access token 만료 → refresh 실패 → 로그인 페이지 이동
   *
   * 흐름:
   *   API 호출 → 401 → refresh 호출 → 401 (refresh도 만료)
   *   → 인증 정보 삭제 → /login 리다이렉트
   */
  test('refresh token 만료 시 로그인 페이지로 이동한다', async ({ page }) => {
    let refreshCalled = false;

    await page.goto('/login');
    await setupAuth(page, {
      accessToken: OLD_ACCESS_TOKEN,
      refreshToken: 'expired_refresh_token',
    });

    await page.route('**/api/user/**', async (route, request) => {
      const url = request.url();

      // refresh 엔드포인트 → 실패 (401)
      if (url.includes('/iam/refresh')) {
        refreshCalled = true;
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Refresh token expired' },
          }),
        });
        return;
      }

      // 모든 API 호출 → 401
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        }),
      });
    });

    await page.goto('/search');

    // 로그인 페이지로 리다이렉트 대기
    await page.waitForURL('**/login', { timeout: 10000 });

    // 검증: refresh 시도됨
    expect(refreshCalled).toBe(true);

    // 검증: 인증 정보 삭제됨
    const accessToken = await page.evaluate(() =>
      localStorage.getItem('accessToken')
    );
    expect(accessToken).toBeNull();
  });

  /**
   * 시나리오 3: refresh token 없음 → refresh 시도 없이 로그인 이동
   *
   * 흐름:
   *   API 호출 → 401 → refreshToken 없음 → refresh 미호출
   *   → 인증 정보 삭제 → /login 리다이렉트
   */
  test('refresh token 없을 때 로그인 페이지로 이동한다', async ({ page }) => {
    let refreshCalled = false;

    await page.goto('/login');
    // refreshToken 없이 설정
    await setupAuth(page, {
      accessToken: OLD_ACCESS_TOKEN,
    });

    await page.route('**/api/user/**', async (route, request) => {
      const url = request.url();

      if (url.includes('/iam/refresh')) {
        refreshCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} }),
        });
        return;
      }

      // 모든 API 호출 → 401
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        }),
      });
    });

    await page.goto('/search');
    await page.waitForURL('**/login', { timeout: 10000 });

    // 검증: refresh 호출되지 않음 (refreshToken이 없으므로)
    expect(refreshCalled).toBe(false);
  });

  /**
   * 시나리오 4: refresh 엔드포인트 401 → 무한루프 없이 로그인 이동
   *
   * 흐름:
   *   API 호출 → 401 → refresh 호출 → 401
   *   → refresh 재시도 안 함 (무한루프 방지)
   *   → /login 리다이렉트
   */
  test('refresh 실패 시 무한루프 없이 로그인으로 이동한다', async ({ page }) => {
    let refreshCallCount = 0;

    await page.goto('/login');
    await setupAuth(page, {
      accessToken: OLD_ACCESS_TOKEN,
      refreshToken: 'some_refresh_token',
    });

    await page.route('**/api/user/**', async (route, request) => {
      const url = request.url();

      if (url.includes('/iam/refresh')) {
        refreshCallCount++;
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Refresh token invalid' },
          }),
        });
        return;
      }

      // 모든 API 호출 → 401
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        }),
      });
    });

    await page.goto('/search');
    await page.waitForURL('**/login', { timeout: 10000 });

    // 검증: refresh는 1회만 호출됨 (무한루프 아님)
    expect(refreshCallCount).toBe(1);
  });
});
