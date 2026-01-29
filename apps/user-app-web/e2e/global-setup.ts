/**
 * Playwright Global Setup - User WebApp
 * E2E 테스트 시작 전 서비스 health check
 */

const BASE_URL = 'https://dev-api.goparkmate.com';

const HEALTH_ENDPOINTS = [
  `${BASE_URL}/api/user/iam/health`,
  `${BASE_URL}/api/admin/iam/health`,
];

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

async function globalSetup() {
  console.log('\n Health Check (User WebApp E2E)...\n');

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
}

export default globalSetup;
