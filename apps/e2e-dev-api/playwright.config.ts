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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  timeout: 30_000,
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
