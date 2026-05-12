import { test as base } from '@playwright/test';
import { loginAdmin } from './auth';

/**
 * Worker-scoped fixture — admin 토큰을 worker 당 1번만 발급해서 모든 spec이 공유.
 * rate limit 회피 + 속도 향상.
 *
 * 사용법
 *   import { test, expect } from '../../fixtures/test';
 *   test('...', async ({ request, adminToken }) => { ... });
 *
 * negative test(잘못된 비밀번호 등)는 그대로 baseTest의 request만 사용 가능.
 */
type WorkerFixtures = {
  adminToken: string;
};

export const test = base.extend<{}, WorkerFixtures>({
  adminToken: [
    async ({ playwright }, use) => {
      const baseURL =
        process.env.E2E_BASE_URL || 'https://dev-api.parkgolfmate.com';
      const ctx = await playwright.request.newContext({ baseURL });
      const { accessToken } = await loginAdmin(ctx);
      await ctx.dispose();
      await use(accessToken);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
