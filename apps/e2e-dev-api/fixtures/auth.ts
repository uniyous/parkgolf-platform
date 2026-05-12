import { APIRequestContext, expect } from '@playwright/test';

/**
 * 인증 헬퍼 — admin / user 로그인 + 토큰 발급
 */

export interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@parkgolf.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!@#';

/**
 * BFF 공통 응답 shape: { success, data } 또는 { data } 또는 직접
 * 어느 형태든 accessToken을 찾아 반환
 */
function extractToken(body: any): string | undefined {
  if (!body) return undefined;
  if (typeof body.accessToken === 'string') return body.accessToken;
  if (body.data?.accessToken) return body.data.accessToken;
  if (body.data?.token) return body.data.token;
  return undefined;
}

export async function loginAdmin(
  request: APIRequestContext,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<LoginResult> {
  const res = await request.post('/api/admin/iam/login', {
    data: { email, password },
  });
  expect(res.ok(), `admin login failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  const accessToken = extractToken(body);
  expect(accessToken, 'accessToken not found in response').toBeTruthy();
  return {
    accessToken: accessToken!,
    refreshToken: body?.data?.refreshToken ?? body?.refreshToken,
    user: body?.data?.user ?? body?.user,
  };
}

export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<LoginResult> {
  const res = await request.post('/api/user/iam/login', {
    data: { email, password },
  });
  expect(res.ok(), `user login failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  const accessToken = extractToken(body);
  expect(accessToken, 'accessToken not found').toBeTruthy();
  return { accessToken: accessToken!, user: body?.data?.user };
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
