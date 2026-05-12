import { APIRequestContext, expect } from '@playwright/test';

/**
 * E2E용 user 헬퍼 — 동적 사용자 생성/로그인 (테스트 격리)
 */
export interface E2EUser {
  email: string;
  password: string;
  userId: number;
  name: string;
  accessToken: string;
}

const USER_PASSWORD = 'E2eTest1234!';

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 9999)}@e2e.parkgolfmate.local`;
}

/**
 * 신규 user 회원가입 + 로그인. 4명 동시 생성 시 await Promise.all 사용.
 */
export async function createE2EUser(
  request: APIRequestContext,
  namePrefix = 'tester',
): Promise<E2EUser> {
  const email = uniqueEmail(namePrefix);
  const name = `${namePrefix}-${Date.now().toString().slice(-5)}`;

  // 회원가입
  const reg = await request.post('/api/user/iam/register', {
    data: { email, password: USER_PASSWORD, name, phone: '01000000000' },
  });
  // 가입 응답 시 user 정보 (이미 가입된 케이스 처리)
  if (!reg.ok() && reg.status() !== 409) {
    const body = await reg.text();
    expect(reg.ok(), `register failed [${reg.status()}]: ${body}`).toBeTruthy();
  }

  // 로그인
  const login = await request.post('/api/user/iam/login', {
    data: { email, password: USER_PASSWORD },
  });
  expect(login.ok(), `login failed [${login.status()}]`).toBeTruthy();
  const body = await login.json();
  const accessToken = body?.data?.accessToken ?? body?.accessToken;
  const user = body?.data?.user ?? body?.user;
  expect(accessToken).toBeTruthy();

  return {
    email,
    password: USER_PASSWORD,
    name,
    userId: user?.id,
    accessToken,
  };
}
