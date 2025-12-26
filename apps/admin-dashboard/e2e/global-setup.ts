/**
 * Playwright Global Setup
 * E2E 테스트 시작 전 서버 웜업 진행
 */

const API_ENDPOINTS = [
  'https://parkgolf-admin-api-144712599315.asia-northeast3.run.app/',
  'https://parkgolf-user-api-144712599315.asia-northeast3.run.app/',
  'https://parkgolf-course-service-144712599315.asia-northeast3.run.app/',
  'https://parkgolf-auth-service-144712599315.asia-northeast3.run.app/',
  'https://parkgolf-booking-service-144712599315.asia-northeast3.run.app/',
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
  console.log('\n🔥 서버 웜업 시작...\n');

  // 첫 번째 웜업 (Cold Start 트리거)
  console.log('1차 웜업 (Cold Start 트리거)...');
  const firstWarmup = await Promise.all(API_ENDPOINTS.map(warmupServer));

  firstWarmup.forEach((result) => {
    const serviceName = result.url.split('parkgolf-')[1]?.split('-144')[0] || 'unknown';
    const status = result.status === 404 ? '✅' : result.status === 0 ? '❌' : '⚠️';
    console.log(`  ${status} ${serviceName}: ${result.time}ms`);
  });

  // NATS 구독 등록 대기
  console.log('\n⏳ NATS 구독 등록 대기 (5초)...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 두 번째 웜업 (캐시 워밍)
  console.log('\n2차 웜업 (캐시 워밍)...');
  const secondWarmup = await Promise.all(API_ENDPOINTS.map(warmupServer));

  secondWarmup.forEach((result) => {
    const serviceName = result.url.split('parkgolf-')[1]?.split('-144')[0] || 'unknown';
    const status = result.status === 404 ? '✅' : result.status === 0 ? '❌' : '⚠️';
    console.log(`  ${status} ${serviceName}: ${result.time}ms`);
  });

  console.log('\n✅ 서버 웜업 완료!\n');
}

export default globalSetup;
