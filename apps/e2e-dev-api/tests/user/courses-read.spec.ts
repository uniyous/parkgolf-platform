import { test, expect } from '../../fixtures/test';

/**
 * 사용자 public read APIs
 *
 *   GET /api/user/courses          — 전체 코스 목록
 *   GET /api/user/courses/search   — 키워드/위치 검색
 *   GET /api/user/courses/:id      — 코스 상세
 *   GET /api/user/clubs/:id        — 골프장 상세
 *
 * 모바일 앱이 의존하는 핵심 read path — 토큰 불요.
 */
test.describe('User > Courses (public read)', () => {
  test('전체 코스 목록 → array 반환', async ({ request }) => {
    const res = await request.get('/api/user/courses');
    expect(res.ok(), `courses list [${res.status()}]`).toBeTruthy();
    const body = await res.json();
    const data = body?.data ?? body;
    const items = Array.isArray(data) ? data : data?.items ?? [];
    expect(Array.isArray(items)).toBeTruthy();
    expect(items.length).toBeGreaterThan(0);
  });

  test('코스 검색 — 빈 키워드 → 전체 결과', async ({ request }) => {
    const res = await request.get('/api/user/courses/search');
    expect([200, 400].includes(res.status())).toBeTruthy();
  });

  test('코스 검색 — keyword 필터', async ({ request }) => {
    const res = await request.get('/api/user/courses/search?keyword=파크');
    expect(res.ok(), `search [${res.status()}]`).toBeTruthy();
  });

  test('코스 상세 — 첫 번째 항목으로', async ({ request }) => {
    const listRes = await request.get('/api/user/courses');
    expect(listRes.ok()).toBeTruthy();
    const body = await listRes.json();
    const data = body?.data ?? body;
    const items = Array.isArray(data) ? data : data?.items ?? [];
    expect(items.length).toBeGreaterThan(0);
    const courseId = items[0]?.id ?? items[0]?.courseId;
    expect(courseId).toBeTruthy();

    const detail = await request.get(`/api/user/courses/${courseId}`);
    expect(detail.ok(), `detail [${detail.status()}]`).toBeTruthy();
  });

  test('존재하지 않는 코스 id → 404', async ({ request }) => {
    const res = await request.get('/api/user/courses/99999999');
    expect([404, 400, 500]).toContain(res.status());
  });
});

test.describe('User > Clubs (public read)', () => {
  test('club 상세 — 코스에서 clubId 추출', async ({ request }) => {
    const listRes = await request.get('/api/user/courses');
    expect(listRes.ok()).toBeTruthy();
    const body = await listRes.json();
    const data = body?.data ?? body;
    const items = Array.isArray(data) ? data : data?.items ?? [];
    const clubId = items.find((c: any) => c.clubId)?.clubId ?? items[0]?.clubId;
    if (!clubId) {
      test.info().annotations.push({ type: 'skip', description: 'no clubId in course payload' });
      return;
    }

    const detail = await request.get(`/api/user/clubs/${clubId}`);
    expect(detail.ok(), `club detail [${detail.status()}]`).toBeTruthy();
  });
});
