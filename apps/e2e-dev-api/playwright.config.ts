import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Park Golf Platform - API E2E
 *
 * 기본 dev API: https://dev-api.parkgolfmate.com
 * 환경변수 E2E_BASE_URL로 prod 등 전환 가능
 */
const BASE_URL = process.env.E2E_BASE_URL || 'https://dev-api.parkgolfmate.com';

export default defineConfig({
  testDir: './tests',
  // rate limit 회피 — 로그인이 많은 spec이라 직렬
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // 실패 시 재시도는 register/login throttler를 더 자극 → 로컬은 0
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  // throttler 60s 충돌 대기 + saga polling 여유
  timeout: 90_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    trace: 'on-first-retry',
    screenshot: 'off',
    video: 'off',
  },

  projects: [
    {
      name: 'api',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
