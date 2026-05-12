import { APIRequestContext, expect } from '@playwright/test';

/**
 * E2E용 user 헬퍼 — 동적 사용자 생성 + 즉시 토큰 발급
 *
 * /api/user/iam/register 응답이 accessToken / refreshToken을 즉시 반환하므로
 * 별도 login 호출 불필요.
 *
 * Throttler(429) 대응: 짧은 백오프 후 재시도 (총 3회).
 * register는 IP 기준 throttler에 걸리기 쉬워 spec 다수 실행 시 필요.
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createE2EUser(
  request: APIRequestContext,
  namePrefix = 'tester',
): Promise<E2EUser> {
  const email = uniqueEmail(namePrefix);
  const shortPrefix = namePrefix.slice(0, 4);
  const name = `${shortPrefix}${Date.now().toString().slice(-5)}`.slice(0, 10);
  const phone = randomPhone();
  const data = { email, password: USER_PASSWORD, name, phone };

  // 429 처리: x-ratelimit-reset 헤더(초) + 2초 버퍼 만큼 대기 후 재시도.
  // user-api throttler = 60s 5req/IP — 충돌 시 최대 ~62s 대기.
  let last: { status: number; body: any } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const reg = await request.post('/api/user/iam/register', { data });
    const regBody = await reg.json().catch(() => ({}));
    if (reg.ok()) {
      const accessToken = extractAccessToken(regBody);
      expect(accessToken, 'register did not return accessToken').toBeTruthy();
      const userId = extractUserId(regBody) ?? 0;
      return { email, password: USER_PASSWORD, name, phone, userId, accessToken: accessToken! };
    }
    last = { status: reg.status(), body: regBody };
    if (reg.status() !== 429) break;
    const headers = reg.headers();
    const resetSec = Number(headers['x-ratelimit-reset'] ?? headers['retry-after'] ?? 60);
    const waitMs = Math.min(Math.max(resetSec * 1000, 1000), 65_000) + 2000;
    // eslint-disable-next-line no-console
    console.log(`[register] 429 — wait ${Math.round(waitMs / 1000)}s before retry (attempt ${attempt + 1})`);
    await sleep(waitMs);
  }

  expect(
    false,
    `register failed [${last?.status}]: ${JSON.stringify(last?.body).slice(0, 300)}`,
  ).toBeTruthy();
  throw new Error('unreachable');
}
