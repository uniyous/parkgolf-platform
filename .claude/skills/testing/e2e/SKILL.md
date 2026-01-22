---
name: e2e
description: Playwright 기반 E2E 테스트 작성 규칙. 타임아웃 설정, 인증 상태 관리, 페이지 로드 대기, 요소 선택 우선순위 안내. "e2e", "playwright", "브라우저 테스트" 관련 질문 시 사용합니다.
---

# E2E 테스트 규칙

Playwright 기반 E2E 테스트 작성 시 적용되는 규칙입니다.

---

## 프로젝트 구조

```
apps/{app-name}/
├── e2e/
│   ├── .auth/admin.json       # 인증 상태 저장
│   ├── global-setup.ts        # 서버 웜업 + 토큰 관리
│   ├── auth.setup.ts          # 브라우저 로그인 (fallback)
│   ├── {feature}.spec.ts      # 테스트 파일
│   └── playwright.config.ts   # 설정 파일
```

---

## 필수 규칙

### 1. 타임아웃 설정

```typescript
// 테스트 파일 상단에 전역 타임아웃 설정
test.setTimeout(60000);

// 느린 테스트는 test.slow() 사용
test('API 호출이 많은 테스트', async ({ page }) => {
  test.slow(); // 타임아웃 3배 증가
});

// expect에도 명시적 타임아웃
await expect(element).toBeVisible({ timeout: 15000 });
```

### 2. 인증 상태 관리

```typescript
// 인증된 상태로 테스트 (storageState 사용)
test.describe('인증 필요 테스트', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('대시보드 표시', async ({ page }) => {
    // 이미 로그인된 상태
  });
});

// 비인증 상태로 테스트
test.describe('로그인 테스트', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('로그인 페이지 렌더링', async ({ page }) => {
    // 로그아웃 상태
  });
});
```

### 3. 페이지 로드 대기

```typescript
// 로딩 다이얼로그 대기 헬퍼 (필수)
async function waitForPageLoad(page: Page, timeout = 30000) {
  try {
    await page.waitForSelector('[role="dialog"][aria-label="로딩"]', {
      state: 'hidden',
      timeout
    });
  } catch {
    // 로딩 다이얼로그가 없을 수 있음
  }
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // 렌더링 안정화
}

// 사용
await page.goto('/companies');
await waitForPageLoad(page);
```

### 4. 요소 선택 우선순위

```typescript
// 1순위: Role + Name (접근성 기반)
await page.getByRole('button', { name: '회사 추가' }).click();
await page.getByRole('heading', { name: /회사 관리/ }).first();

// 2순위: Label (폼 요소)
await page.getByLabel('관리자 ID').fill('admin@test.com');

// 3순위: Placeholder
await page.getByPlaceholder('회사명, 사업자번호').fill('검색어');

// 4순위: Test ID (복잡한 요소)
await page.getByTestId('filter-toggle-button').click();

// 주의: Text 선택자는 정규식 사용
await expect(page.getByText(/로그인 실패|Invalid|오류/i)).toBeVisible();

// 주의: 중복 요소는 first() 사용
await page.getByRole('button', { name: /회사 추가/ }).first().click();
```

### 5. 조건부 테스트 스킵

```typescript
test('데이터 있을 때만 테스트', async ({ page }) => {
  await page.goto('/companies');
  await waitForPageLoad(page);

  // 테이블 로드 시도
  try {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
  } catch {
    // 데이터 없으면 스킵
    const isEmpty = await page.getByText('등록된 회사가 없습니다').isVisible();
    if (isEmpty) {
      console.log('데이터 없음. 테스트 스킵.');
      test.skip();
      return;
    }
  }

  // 테스트 진행
});
```

### 6. API 응답 대기

```typescript
// API 응답 모니터링
test('회사 등록', async ({ page }) => {
  // ... 폼 입력 ...

  // 등록 버튼 클릭
  await submitButton.click();

  // POST 응답 대기
  const response = await page.waitForResponse(
    (resp) =>
      resp.url().includes('/api/admin/companies') &&
      resp.request().method() === 'POST',
    { timeout: 20000 }
  );

  const body = await response.json();
  if (!body.success) {
    throw new Error(`API 실패: ${body.error?.message}`);
  }
});
```

### 7. 모달 처리

```typescript
// 모달 열기
await page.getByRole('button', { name: /회사 추가/ }).first().click();
await expect(page.locator('[role="dialog"]')).toBeVisible();

// 모달 내 요소 선택 (스코프 제한)
const modal = page.locator('[role="dialog"]');
await modal.locator('input[placeholder*="회사명"]').fill('테스트회사');
await modal.getByRole('button', { name: /등록/ }).click();

// 모달 닫기
await page.keyboard.press('Escape');
await expect(page.locator('[role="dialog"]')).not.toBeVisible();
```

---

## 테스트 파일 구조

```typescript
import { test, expect } from '@playwright/test';

// 전역 타임아웃
test.setTimeout(60000);

// 헬퍼 함수
async function waitForPageLoad(page: Page, timeout = 30000) { /* ... */ }

// 테스트 그룹 1: API 연결
test.describe('API 연결 테스트', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('0.1 목록 API 호출', async ({ page, request }) => { /* ... */ });
});

// 테스트 그룹 2: 목록 페이지
test.describe('목록 페이지', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });
  test.slow();

  test('1.1 페이지 로드', async ({ page }) => { /* ... */ });
  test('1.2 검색 기능', async ({ page }) => { /* ... */ });
  test('1.3 필터 초기화', async ({ page }) => { /* ... */ });
});

// 테스트 그룹 3: CRUD
test.describe('생성/수정/삭제', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('2.1 모달 열기/닫기', async ({ page }) => { /* ... */ });
  test('2.2 신규 등록', async ({ page }) => { /* ... */ });
  test('2.3 수정', async ({ page }) => { /* ... */ });
  test('2.4 삭제 확인', async ({ page }) => { /* ... */ });
});

// 테스트 그룹 4: 통합 시나리오
test.describe('통합 시나리오', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });
  test.slow();

  test('전체 워크플로우', async ({ page }) => {
    // 1. 목록 로드
    // 2. 검색
    // 3. 상세 조회
    // 4. 목록 복귀
    console.log('=== 통합 시나리오 완료 ===');
  });
});
```

---

## 실행 명령

```bash
# 전체 테스트 (UI 모드)
cd apps/admin-dashboard
npx playwright test --ui

# 헤드리스 실행
npx playwright test

# 특정 파일
npx playwright test company-management.spec.ts

# 디버그 모드
npx playwright test --debug

# 리포트 열기
npx playwright show-report
```

---

## 주의사항

1. **Cloud Run Cold Start**: `fullyParallel: false`, `workers: 1` 유지
2. **고유 테스트 데이터**: 타임스탬프로 고유값 생성 (`E2E테스트_${Date.now()}`)
3. **API 에러 처리**: 응답 확인 후 에러 시 명확한 메시지 출력
4. **스크린샷/비디오**: 실패 시 자동 캡처 (`screenshot: 'only-on-failure'`)
5. **테스트 독립성**: 각 테스트는 다른 테스트에 의존하지 않아야 함
