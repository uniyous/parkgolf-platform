import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정 - User WebApp
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false, // Cloud Run 콜드 스타트 방지를 위해 순차 실행
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // 순차 실행
  timeout: 60000, // 60초 기본 타임아웃
  expect: { timeout: 30000 },
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  use: {
    // 기본 URL (로컬 개발 서버 - 포트 3002)
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3002',

    // 트레이스 수집 (실패 시)
    trace: 'on-first-retry',

    // 스크린샷 (실패 시)
    screenshot: 'only-on-failure',

    // 비디오 녹화 (실패 시)
    video: 'on-first-retry',
  },

  // 프로젝트 설정
  projects: [
    // 로그인 상태 설정
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Chromium 테스트
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // 모바일 테스트 (Optional)
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // 로컬 개발 서버 자동 실행
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev:e2e',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
