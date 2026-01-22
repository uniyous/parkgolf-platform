/**
 * Playwright Global Setup
 * E2E 테스트 시작 전 서버 웜업 및 인증 토큰 관리
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'https://admin-api-dev-iihuzmuufa-du.a.run.app';
const AUTH_FILE = path.resolve(__dirname, '.auth/admin.json');

const API_ENDPOINTS = [
  `${API_BASE_URL}/health`,
  'https://user-api-dev-iihuzmuufa-du.a.run.app/health',
  'https://course-service-dev-iihuzmuufa-du.a.run.app/health',
  'https://iam-service-dev-iihuzmuufa-du.a.run.app/health',
  'https://booking-service-dev-iihuzmuufa-du.a.run.app/health',
];

const TEST_CREDENTIALS = {
  email: 'admin@parkgolf.com',
  password: 'admin123!@#',
};

async function warmupServer(url: string): Promise<{ url: string; status: number; time: number }> {
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
      console.log('  📁 인증 파일 없음');
      return false;
    }

    const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const localStorage = authData.origins?.[0]?.localStorage || [];
    const accessTokenItem = localStorage.find((item: any) => item.name === 'accessToken');

    if (!accessTokenItem?.value) {
      console.log('  🔑 액세스 토큰 없음');
      return false;
    }

    const token = accessTokenItem.value;
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const expTime = decoded.exp * 1000;
    const now = Date.now();
    const remainingMinutes = Math.round((expTime - now) / 60000);

    if (expTime > now + 5 * 60 * 1000) {
      console.log(`  ✅ 토큰 유효 (만료까지 ${remainingMinutes}분)`);
      return true;
    }

    console.log(`  ⚠️ 토큰 만료 임박 또는 만료됨 (${remainingMinutes}분)`);
    return false;
  } catch (error) {
    console.log('  ❌ 토큰 검증 실패:', error);
    return false;
  }
}

/**
 * API로 직접 로그인하여 토큰 획득
 */
async function loginAndSaveToken(): Promise<boolean> {
  try {
    console.log('  🔐 로그인 API 호출 중...');

    const response = await fetch(`${API_BASE_URL}/api/admin/iam/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.log(`  ❌ 로그인 실패: ${result.error?.message || response.statusText}`);
      return false;
    }

    const { accessToken, refreshToken, user } = result.data;

    // 사용자 정보에 추가 필드 설정
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

    // 디렉토리 생성
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    fs.writeFileSync(AUTH_FILE, JSON.stringify(authState, null, 2));
    console.log('  ✅ 새 토큰 저장 완료');
    return true;
  } catch (error) {
    console.log('  ❌ 로그인 에러:', error);
    return false;
  }
}

async function globalSetup() {
  console.log('\n🔥 서버 웜업 시작...\n');

  // 첫 번째 웜업 (Cold Start 트리거)
  console.log('1차 웜업 (Cold Start 트리거)...');
  const firstWarmup = await Promise.all(API_ENDPOINTS.map(warmupServer));

  firstWarmup.forEach((result) => {
    const serviceName = result.url.split('-dev-')[0]?.split('://')[1] || 'unknown';
    const status = result.status === 200 ? '✅' : result.status === 0 ? '❌' : '⚠️';
    console.log(`  ${status} ${serviceName}: ${result.time}ms (HTTP ${result.status})`);
  });

  // NATS 구독 등록 대기
  console.log('\n⏳ NATS 구독 등록 대기 (5초)...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 두 번째 웜업 (캐시 워밍)
  console.log('\n2차 웜업 (캐시 워밍)...');
  const secondWarmup = await Promise.all(API_ENDPOINTS.map(warmupServer));

  secondWarmup.forEach((result) => {
    const serviceName = result.url.split('-dev-')[0]?.split('://')[1] || 'unknown';
    const status = result.status === 200 ? '✅' : result.status === 0 ? '❌' : '⚠️';
    console.log(`  ${status} ${serviceName}: ${result.time}ms (HTTP ${result.status})`);
  });

  console.log('\n✅ 서버 웜업 완료!\n');

  // 인증 토큰 관리
  console.log('🔑 인증 토큰 확인...');
  if (!isTokenValid()) {
    const loginSuccess = await loginAndSaveToken();
    if (!loginSuccess) {
      console.log('  ⚠️ 로그인 실패 - 기존 토큰으로 테스트 진행 시도\n');
    }
  }
  console.log('');
}

export default globalSetup;
