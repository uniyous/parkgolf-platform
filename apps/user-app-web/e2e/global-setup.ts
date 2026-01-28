/**
 * Playwright Global Setup - User WebApp
 * E2E 테스트 시작 전 서버 웜업 진행
 *
 * Cloud Run 콜드 스타트와 NATS 구독 등록을 고려하여
 * 충분한 웜업 시간을 제공합니다.
 */

const USER_API_URL = 'https://user-api-dev-iihuzmuufa-du.a.run.app';

const API_ENDPOINTS = [
  `${USER_API_URL}/health`,
  'https://iam-service-dev-iihuzmuufa-du.a.run.app/health',
  'https://course-service-dev-iihuzmuufa-du.a.run.app/health',
  'https://booking-service-dev-iihuzmuufa-du.a.run.app/health',
];

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

async function testLogin(): Promise<{ success: boolean; time: number; message?: string }> {
  const start = Date.now();
  try {
    const response = await fetch(`${USER_API_URL}/api/user/iam/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@parkgolf.com', password: 'test1234' }),
    });
    const time = Date.now() - start;
    const data = await response.json();

    if (data.accessToken) {
      return { success: true, time };
    }
    return { success: false, time, message: data.error?.message || 'No access token' };
  } catch (error) {
    return {
      success: false,
      time: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function globalSetup() {
  console.log('\n🔥 서버 웜업 시작 (User WebApp E2E)...\n');

  // 1차 웜업 (Cold Start 트리거)
  console.log('1차 웜업 (Cold Start 트리거)...');
  const firstWarmup = await Promise.all(API_ENDPOINTS.map(warmupServer));

  firstWarmup.forEach((result) => {
    const serviceName = result.url.split('-dev-')[0]?.split('://')[1] || 'unknown';
    const status = result.status === 200 ? '✅' : result.status === 0 ? '❌' : '⚠️';
    console.log(`  ${status} ${serviceName}: ${result.time}ms (HTTP ${result.status})`);
  });

  // NATS 구독 등록 대기 (Cloud Run 콜드 스타트 대비)
  console.log('\n⏳ NATS 구독 등록 대기 (15초)...');
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // 2차 웜업 (캐시 워밍)
  console.log('\n2차 웜업 (캐시 워밍)...');
  const secondWarmup = await Promise.all(API_ENDPOINTS.map(warmupServer));

  secondWarmup.forEach((result) => {
    const serviceName = result.url.split('-dev-')[0]?.split('://')[1] || 'unknown';
    const status = result.status === 200 ? '✅' : result.status === 0 ? '❌' : '⚠️';
    console.log(`  ${status} ${serviceName}: ${result.time}ms (HTTP ${result.status})`);
  });

  // 3차: 로그인 테스트로 NATS 연결 확인 (최대 3회 재시도)
  console.log('\n🔐 NATS 연결 확인 (로그인 테스트)...');
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`  시도 ${attempt}/${maxRetries}...`);
    const loginResult = await testLogin();

    if (loginResult.success) {
      console.log(`  ✅ 로그인 성공 (${loginResult.time}ms)`);
      console.log('\n✅ 서버 웜업 완료!\n');
      return;
    }

    console.log(`  ⚠️ 로그인 실패: ${loginResult.message} (${loginResult.time}ms)`);

    if (attempt < maxRetries) {
      const waitTime = attempt * 5000;
      console.log(`  ${waitTime / 1000}초 후 재시도...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // 모든 재시도 실패해도 테스트는 계속 진행
  console.log('\n⚠️ 웜업 로그인 테스트 실패 - 테스트 계속 진행...\n');
}

export default globalSetup;
