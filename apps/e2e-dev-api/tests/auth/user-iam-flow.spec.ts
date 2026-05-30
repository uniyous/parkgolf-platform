import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * 사용자 인증 flow
 *
 *   POST /api/user/iam/register   — 가입 + 토큰 즉시 발급
 *   POST /api/user/iam/login      — 로그인
 *   GET  /api/user/iam/profile    — 프로필 조회
 *   PATCH /api/user/iam/profile   — 프로필 수정
 *   POST /api/user/iam/refresh    — 토큰 갱신
 *   POST /api/user/iam/logout     — 로그아웃
 *
 * @write — user 1건 생성 (cleanup endpoint 없음 — soft persistent)
 */
test.describe('User > IAM flow @write', () => {
  test('register → profile read → profile update → login → refresh', async ({
    request,
  }) => {
    const user = await createE2EUser(request, 'iamflow');
    const auth = authHeaders(user.accessToken);

    // profile 조회
    const profileRes = await request.get('/api/user/iam/profile', { headers: auth });
    expect(profileRes.ok(), `profile [${profileRes.status()}]`).toBeTruthy();
    const profileBody = await profileRes.json();
    const profile = profileBody?.data ?? profileBody;
    expect(profile?.email).toBe(user.email);
    expect(profile?.name).toBe(user.name);

    // profile 수정 — name 변경
    const newName = (user.name.slice(0, 6) + 'X').slice(0, 10);
    const updateRes = await request.patch('/api/user/iam/profile', {
      headers: auth,
      data: { name: newName },
    });
    expect(updateRes.ok() || updateRes.status() === 200).toBeTruthy();

    // 로그인 — 가입 시 발급된 토큰과 별개 검증
    const loginRes = await request.post('/api/user/iam/login', {
      data: { email: user.email, password: user.password },
    });
    expect(loginRes.ok(), `login [${loginRes.status()}]`).toBeTruthy();
    const loginBody = await loginRes.json();
    const loginToken =
      loginBody?.accessToken ?? loginBody?.data?.accessToken;
    const refreshToken =
      loginBody?.refreshToken ?? loginBody?.data?.refreshToken;
    expect(loginToken, 'login: accessToken missing').toBeTruthy();

    // refresh — refreshToken 있을 때만
    if (refreshToken) {
      const refRes = await request.post('/api/user/iam/refresh', {
        data: { refreshToken },
      });
      expect([200, 201].includes(refRes.status())).toBeTruthy();
    }
  });

  test('잘못된 비밀번호 로그인 → 4xx', async ({ request }) => {
    const res = await request.post('/api/user/iam/login', {
      data: { email: 'nonexistent@e2e.parkgolfmate.local', password: 'wrongpw' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('중복 이메일 가입 → 4xx', async ({ request }) => {
    const user = await createE2EUser(request, 'dup');
    const res = await request.post('/api/user/iam/register', {
      data: {
        email: user.email,
        password: 'E2eTest1234!',
        name: 'duplicate',
        phone: '010-9999-9999',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('토큰 없이 profile 조회 → 401', async ({ request }) => {
    const res = await request.get('/api/user/iam/profile');
    expect(res.status()).toBe(401);
  });
});
