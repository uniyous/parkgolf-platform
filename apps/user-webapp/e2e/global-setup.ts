/**
 * Playwright Global Setup - User WebApp
 * E2E 테스트 시작 전 서버 웜업 진행
 */

const API_ENDPOINTS = [
  'https://user-api-dev-iihuzmuufa-du.a.run.app/health',
  'https://auth-service-dev-iihuzmuufa-du.a.run.app/health',
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
  } catch (error) {
    return {
      url,
      status: 0,
      time: Date.now() - start,
    };
  }
}

async function globalSetup() {
  console.log('\n🔥 서버 웜업 시작 (User WebApp E2E)...\n');

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
}

export default globalSetup;
