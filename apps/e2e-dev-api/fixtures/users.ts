import { APIRequestContext, expect } from '@playwright/test';

/**
 * E2E용 user 헬퍼 — 동적 사용자 생성 + 즉시 토큰 발급
 *
 * /api/user/iam/register 응답이 accessToken / refreshToken을 즉시 반환하므로
 * 별도 login 호출 불필요.
 */
export interface E2EUser {
  email: string;
  password: string;
  userId: number;
  name: string;
  phone: string;
  accessToken: string;
}

const USER_PASSWORD = 'E2eTest1234!';

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 9999)}@e2e.parkgolfmate.local`;
}

function randomPhone(): string {
  const rand = () => String(Math.floor(1000 + Math.random() * 9000));
  return `010-${rand()}-${rand()}`;
}

function extractAccessToken(body: any): string | undefined {
  if (!body) return undefined;
  if (typeof body.accessToken === 'string') return body.accessToken;
  if (body.data?.accessToken) return body.data.accessToken;
  return undefined;
}

function extractUserId(body: any): number | undefined {
  if (!body) return undefined;
  return (
    body?.user?.id ??
    body?.data?.user?.id ??
    body?.userId ??
    body?.data?.userId
  );
}

export async function createE2EUser(
  request: APIRequestContext,
  namePrefix = 'tester',
): Promise<E2EUser> {
  const email = uniqueEmail(namePrefix);
  // user 이름 10자 제한 — namePrefix 짧게 + 5자리 suffix
  const shortPrefix = namePrefix.slice(0, 4);
  const name = `${shortPrefix}${Date.now().toString().slice(-5)}`.slice(0, 10);
  const phone = randomPhone();

  const reg = await request.post('/api/user/iam/register', {
    data: { email, password: USER_PASSWORD, name, phone },
  });
  const regBody = await reg.json().catch(() => ({}));

  if (!reg.ok()) {
    expect(
      false,
      `register failed [${reg.status()}]: ${JSON.stringify(regBody).slice(0, 300)}`,
    ).toBeTruthy();
  }

  const accessToken = extractAccessToken(regBody);
  expect(accessToken, 'register did not return accessToken').toBeTruthy();
  const userId = extractUserId(regBody) ?? 0;

  return {
    email,
    password: USER_PASSWORD,
    name,
    phone,
    userId,
    accessToken: accessToken!,
  };
}
