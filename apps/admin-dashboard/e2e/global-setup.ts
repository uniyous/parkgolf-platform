/**
 * Playwright Global Setup - Admin Dashboard
 * E2E 테스트 시작 전 서버 health check 및 인증 토큰 관리
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://dev-api.goparkmate.com';
const AUTH_FILE = path.resolve(__dirname, '.auth/admin.json');

const HEALTH_ENDPOINTS = [
  `${BASE_URL}/api/admin/iam/health`,
  `${BASE_URL}/api/user/iam/health`,
];

const TEST_CREDENTIALS = {
  email: 'admin@parkgolf.com',
  password: 'admin123!@#',
};

async function checkHealth(url: string): Promise<{ url: string; status: number; time: number }> {
  const start = Date.now();
  try {
    const response = await fetch(url, { method: 'GET' });
    return {
      url,
      status: response.status,
      time: Date.now() - start,
    };
  } catch {
    return {
      url,
      status: 0,
      time: Date.now() - start,
    };
  }
}

/**
 * 기존 토큰이 유효한지 확인 (5분 여유)
 */
function isTokenValid(): boolean {
  try {
    if (!fs.existsSync(AUTH_FILE)) {
      console.log('  인증 파일 없음');
      return false;
    }

    const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const localStorage = authData.origins?.[0]?.localStorage || [];
    const accessTokenItem = localStorage.find((item: any) => item.name === 'accessToken');

    if (!accessTokenItem?.value) {
      console.log('  액세스 토큰 없음');
      return false;
    }

    const token = accessTokenItem.value;
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const expTime = decoded.exp * 1000;
    const now = Date.now();
    const remainingMinutes = Math.round((expTime - now) / 60000);

    if (expTime > now + 5 * 60 * 1000) {
      console.log(`  [OK] 토큰 유효 (만료까지 ${remainingMinutes}분)`);
      return true;
    }

    console.log(`  [WARN] 토큰 만료 임박 또는 만료됨 (${remainingMinutes}분)`);
    return false;
  } catch (error) {
    console.log('  [FAIL] 토큰 검증 실패:', error);
    return false;
  }
}

/**
 * API로 직접 로그인하여 토큰 획득
 */
async function loginAndSaveToken(): Promise<boolean> {
  try {
    console.log('  로그인 API 호출 중...');

    const response = await fetch(`${BASE_URL}/api/admin/iam/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.log(`  [FAIL] 로그인 실패: ${result.error?.message || response.statusText}`);
      return false;
    }

    const { accessToken, refreshToken, user } = result.data;

    const currentUser = {
      ...user,
      username: user.email,
      primaryRole: user.roleCode || user.roles?.[0],
      primaryScope: user.companies?.[0]?.company?.companyType || 'PLATFORM',
      role: user.roleCode || user.roles?.[0],
    };

    // Playwright storageState 형식으로 저장
    const authState = {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:3001',
          localStorage: [
            { name: 'accessToken', value: accessToken },
            { name: 'refreshToken', value: refreshToken },
            {
              name: 'auth-storage',
              value: JSON.stringify({ state: { token: accessToken }, version: 0 }),
            },
            { name: 'currentUser', value: JSON.stringify(currentUser) },
          ],
        },
      ],
    };

    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    fs.writeFileSync(AUTH_FILE, JSON.stringify(authState, null, 2));
    console.log('  [OK] 새 토큰 저장 완료');
    return true;
  } catch (error) {
    console.log('  [FAIL] 로그인 에러:', error);
    return false;
  }
}

async function globalSetup() {
  console.log('\n Health Check (Admin Dashboard E2E)...\n');

  const results = await Promise.all(HEALTH_ENDPOINTS.map(checkHealth));

  let allHealthy = true;
  results.forEach((result) => {
    const status = result.status === 200 ? 'OK' : 'FAIL';
    if (result.status !== 200) allHealthy = false;
    console.log(`  [${status}] ${result.url} - ${result.time}ms (HTTP ${result.status})`);
  });

  if (!allHealthy) {
    console.log('\n  [WARN] Some services are not healthy. Tests may fail.\n');
  } else {
    console.log('\n  All services healthy.\n');
  }

  // 인증 토큰 관리
  console.log('Auth token check...');
  if (!isTokenValid()) {
    const loginSuccess = await loginAndSaveToken();
    if (!loginSuccess) {
      console.log('  [WARN] 로그인 실패 - 기존 토큰으로 테스트 진행 시도\n');
    }
  }
  console.log('');
}

export default globalSetup;
