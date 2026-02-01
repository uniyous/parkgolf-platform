import { test, expect, request } from '@playwright/test';

/**
 * 보안 E2E 테스트 (Admin Dashboard)
 *
 * 테스트 항목:
 * - SEC-01: Rate Limiting (429 응답 확인)
 * - SEC-02: 패스워드 정책 (약한 비밀번호 거부)
 * - SEC-03: Refresh Token 회전 (로그아웃 후 이전 토큰 무효화)
 */

const API_BASE_URL = process.env.E2E_BASE_URL || 'https://dev-api.goparkmate.com';

// ============================================
// SEC-01: Rate Limiting
// ============================================

test.describe('SEC-01: Rate Limiting', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(60000);

  test('관리자 로그인 엔드포인트 연속 요청 시 429 응답', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    const results: number[] = [];

    // 6회 연속 로그인 시도 (제한: 5회/60초)
    for (let i = 0; i < 6; i++) {
      const response = await apiContext.post('/api/admin/iam/login', {
        data: {
          email: `ratelimit-admin-${Date.now()}@example.com`,
          password: 'WrongPass1!',
        },
      });
      results.push(response.status());
    }

    await apiContext.dispose();

    // 마지막 요청은 429(Too Many Requests) 이어야 함
    const has429 = results.includes(429);
    expect(has429).toBe(true);

    // 처음 몇 요청은 401(인증 실패)이어야 함
    const non429 = results.filter(s => s !== 429);
    expect(non429.length).toBeGreaterThan(0);
    expect(non429.every(s => s === 401)).toBe(true);
  });

  test('관리자 회원가입 엔드포인트 연속 요청 시 429 응답', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    const results: number[] = [];
    const timestamp = Date.now();

    // 6회 연속 회원가입 시도 (제한: 5회/60초)
    for (let i = 0; i < 6; i++) {
      const response = await apiContext.post('/api/admin/iam/signup', {
        data: {
          username: `ratelimit${timestamp}${i}`,
          email: `ratelimit-${timestamp}-${i}@example.com`,
          password: 'Str0ngP@ss!',
          name: `RateTest${i}`,
          role: 'VIEWER',
        },
      });
      results.push(response.status());
    }

    await apiContext.dispose();

    // 마지막 요청은 429이어야 함
    const has429 = results.includes(429);
    expect(has429).toBe(true);
  });
});

// ============================================
// SEC-02: 패스워드 정책
// ============================================

test.describe('SEC-02: 패스워드 정책 (관리자 회원가입)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(30000);

  test('8자 미만 비밀번호로 가입 시 400 에러', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    const response = await apiContext.post('/api/admin/iam/signup', {
      data: {
        username: `weakpw${Date.now()}`,
        email: `weakpw-${Date.now()}@example.com`,
        password: 'Ab1!xy',
        name: '약한비밀번호',
        role: 'VIEWER',
      },
    });

    await apiContext.dispose();
    expect(response.status()).toBe(400);
  });

  test('특수문자 없는 비밀번호로 가입 시 400 에러', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    const response = await apiContext.post('/api/admin/iam/signup', {
      data: {
        username: `weakpw${Date.now()}`,
        email: `weakpw-${Date.now()}@example.com`,
        password: 'abcd1234',
        name: '약한비밀번호',
        role: 'VIEWER',
      },
    });

    await apiContext.dispose();
    expect(response.status()).toBe(400);
  });

  test('숫자 없는 비밀번호로 가입 시 400 에러', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    const response = await apiContext.post('/api/admin/iam/signup', {
      data: {
        username: `weakpw${Date.now()}`,
        email: `weakpw-${Date.now()}@example.com`,
        password: 'abcdefgh!',
        name: '약한비밀번호',
        role: 'VIEWER',
      },
    });

    await apiContext.dispose();
    expect(response.status()).toBe(400);
  });

  test('영문+숫자+특수문자 8자 이상 비밀번호로 가입 성공', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    const response = await apiContext.post('/api/admin/iam/signup', {
      data: {
        username: `strongpw${Date.now()}`,
        email: `strongpw-${Date.now()}@example.com`,
        password: 'Str0ngP@ss!',
        name: '강한비밀번호',
        role: 'VIEWER',
      },
    });

    await apiContext.dispose();
    // 201(생성) 또는 409(중복) - 400이 아니면 비밀번호 정책 통과
    expect(response.status()).not.toBe(400);
  });

  test('8자 미만 비밀번호로 관리자 로그인 시 400 에러', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    const response = await apiContext.post('/api/admin/iam/login', {
      data: {
        email: 'admin@parkgolf.com',
        password: 'short',
      },
    });

    await apiContext.dispose();
    expect(response.status()).toBe(400);
  });
});

// ============================================
// SEC-03: Refresh Token 회전 및 로그아웃 무효화
// ============================================

test.describe('SEC-03: Refresh Token 회전 및 로그아웃 무효화', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(60000);

  test('관리자 로그아웃 후 이전 refresh token으로 갱신 시 401 응답', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    // 1. 관리자 로그인
    const loginRes = await apiContext.post('/api/admin/iam/login', {
      data: {
        email: 'admin@parkgolf.com',
        password: 'admin123!@#',
      },
    });

    if (loginRes.status() !== 200) {
      test.skip(true, '관리자 테스트 계정 로그인 실패 - 환경 확인 필요');
      return;
    }

    const loginData = await loginRes.json();
    const accessToken = loginData.data?.accessToken;
    const refreshToken = loginData.data?.refreshToken;

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // 2. 로그아웃 (서버 측 토큰 무효화)
    const logoutRes = await apiContext.post('/api/admin/iam/logout', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(logoutRes.ok()).toBe(true);

    // 3. 이전 refresh token으로 갱신 시도 → 401 예상
    const refreshRes = await apiContext.post('/api/admin/iam/refresh', {
      data: { refreshToken },
    });
    expect(refreshRes.status()).toBe(401);

    await apiContext.dispose();
  });

  test('관리자 토큰 갱신 시 새로운 refresh token 발급 (회전)', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    // 1. 로그인
    const loginRes = await apiContext.post('/api/admin/iam/login', {
      data: {
        email: 'admin@parkgolf.com',
        password: 'admin123!@#',
      },
    });

    if (loginRes.status() !== 200) {
      test.skip(true, '관리자 테스트 계정 로그인 실패 - 환경 확인 필요');
      return;
    }

    const loginData = await loginRes.json();
    const firstRefreshToken = loginData.data?.refreshToken;

    // 2. 첫 번째 갱신
    const refresh1Res = await apiContext.post('/api/admin/iam/refresh', {
      data: { refreshToken: firstRefreshToken },
    });
    expect(refresh1Res.ok()).toBe(true);

    const refresh1Data = await refresh1Res.json();
    const secondRefreshToken = refresh1Data.data?.refreshToken;

    // 새 토큰이 이전과 다른지 확인 (회전)
    expect(secondRefreshToken).toBeTruthy();
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // 3. 이전 refresh token으로 재사용 시도 → 401 (재사용 탐지)
    const reuseRes = await apiContext.post('/api/admin/iam/refresh', {
      data: { refreshToken: firstRefreshToken },
    });
    expect(reuseRes.status()).toBe(401);

    await apiContext.dispose();
  });
});
