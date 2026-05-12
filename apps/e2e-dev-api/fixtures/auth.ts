import { APIRequestContext, expect } from '@playwright/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * 인증 헬퍼 — admin / user 로그인 + 토큰 발급
 *
 * admin 토큰은 파일 캐시(~/.parkgolf-e2e/admin-token.json, TTL 30분)로
 * 재기동/재시도 시 재로그인 회피 → rate limit 방지.
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

const CACHE_DIR = path.join(os.homedir(), '.parkgolf-e2e');
const ADMIN_CACHE = path.join(CACHE_DIR, 'admin-token.json');
const TTL_MS = 30 * 60 * 1000; // 30분

function extractToken(body: any): string | undefined {
  if (!body) return undefined;
  if (typeof body.accessToken === 'string') return body.accessToken;
  if (body.data?.accessToken) return body.data.accessToken;
  if (body.data?.token) return body.data.token;
  return undefined;
}

function readAdminCache(): LoginResult | null {
  try {
    const raw = fs.readFileSync(ADMIN_CACHE, 'utf8');
    const parsed = JSON.parse(raw) as { savedAt: number; result: LoginResult; baseURL?: string };
    if (Date.now() - parsed.savedAt < TTL_MS) return parsed.result;
  } catch {
    /* miss */
  }
  return null;
}

function writeAdminCache(result: LoginResult, baseURL?: string): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(
      ADMIN_CACHE,
      JSON.stringify({ savedAt: Date.now(), result, baseURL }, null, 2),
    );
  } catch {
    /* best-effort */
  }
}

export function clearAdminCache(): void {
  try {
    fs.unlinkSync(ADMIN_CACHE);
  } catch {
    /* ignore */
  }
}

async function verifyToken(
  request: APIRequestContext,
  token: string,
): Promise<boolean> {
  try {
    const res = await request.get('/api/admin/iam/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok();
  } catch {
    return false;
  }
}

export async function loginAdmin(
  request: APIRequestContext,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<LoginResult> {
  // 1) 캐시 확인 — TTL 내 + token 유효성 검증
  const cached = readAdminCache();
  if (cached && (await verifyToken(request, cached.accessToken))) {
    return cached;
  }

  // 2) 실로그인
  const res = await request.post('/api/admin/iam/login', {
    data: { email, password },
  });
  expect(res.ok(), `admin login failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  const accessToken = extractToken(body);
  expect(accessToken, 'accessToken not found in response').toBeTruthy();
  const result: LoginResult = {
    accessToken: accessToken!,
    refreshToken: body?.data?.refreshToken ?? body?.refreshToken,
    user: body?.data?.user ?? body?.user,
  };
  writeAdminCache(result);
  return result;
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
