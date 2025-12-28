# E2E Testing Skill

## 개요
admin-dashboard의 Playwright E2E 테스트 실행 및 관리

## 디렉토리
```
apps/admin-dashboard/
```

## 테스트 실행

### 기본 실행 (Headless)
```bash
cd apps/admin-dashboard
npm run test:e2e
```

### UI 모드 (시각적 디버깅)
```bash
npm run test:e2e:ui
```

### 브라우저 표시
```bash
npm run test:e2e:headed
```

### 디버그 모드
```bash
npm run test:e2e:debug
```

### 리포트 확인
```bash
npm run test:e2e:report
```

### 특정 테스트 파일 실행
```bash
npx playwright test login.spec.ts
npx playwright test admin-crud.spec.ts
```

### 특정 테스트 케이스 실행
```bash
npx playwright test -g "ADMIN 역할로 로그인"
```

## 테스트 파일 구조
```
e2e/
├── .auth/              # 인증 상태 저장 (gitignore)
├── auth.setup.ts       # 로그인 설정 (테스트 전 실행)
├── login.spec.ts       # 로그인 테스트
└── admin-crud.spec.ts  # 관리자 CRUD 테스트
```

## 테스트 시나리오

### login.spec.ts (7개)
- 로그인 페이지 렌더링
- ADMIN 역할로 로그인 성공
- MANAGER 역할로 로그인 성공
- STAFF 역할로 로그인 성공
- VIEWER 역할로 로그인 성공
- 잘못된 비밀번호로 로그인 실패
- 존재하지 않는 계정으로 로그인 실패

### admin-crud.spec.ts (9개)
- 관리자 목록 조회
- 관리자 상세 조회
- 새 관리자 생성
- 관리자 정보 수정
- 관리자 역할 변경
- 관리자 삭제
- ADMIN은 관리자 관리 접근 가능
- VIEWER는 수정/삭제 버튼 비활성화

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| ADMIN | admin@parkgolf.com | admin123!@# |
| SUPPORT | support@parkgolf.com | admin123!@# |
| MANAGER | manager@gangnam-golf.com | admin123!@# |
| STAFF | staff@gangnam-golf.com | admin123!@# |
| VIEWER | viewer@parkgolf.com | admin123!@# |

## 환경 변수

### 기본 URL 변경
```bash
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

### 배포 환경 테스트
```bash
E2E_BASE_URL=https://admin-dev.parkgolf.com npm run test:e2e
```

## 새 테스트 추가

### 1. 테스트 파일 생성
```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('기능 테스트', () => {
  test('기능 동작 확인', async ({ page }) => {
    await page.goto('/my-feature');
    await expect(page.getByText('예상 텍스트')).toBeVisible();
  });
});
```

### 2. 인증 필요한 테스트
```typescript
// 기본적으로 auth.setup.ts에서 ADMIN으로 로그인됨
// storageState가 자동 적용됨

test('인증 필요한 페이지', async ({ page }) => {
  await page.goto('/admin-management');
  // 이미 로그인된 상태
});
```

### 3. 다른 역할로 테스트
```typescript
test('VIEWER 권한 테스트', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByLabel('이메일').fill('viewer@parkgolf.com');
  await page.getByLabel('비밀번호').fill('admin123!@#');
  await page.getByRole('button', { name: '로그인' }).click();

  // VIEWER 테스트 진행
  await context.close();
});
```

## 트러블슈팅

### 브라우저 설치
```bash
npx playwright install chromium
```

### 인증 캐시 초기화
```bash
rm -rf e2e/.auth
```

### 타임아웃 에러
playwright.config.ts에서 timeout 증가:
```typescript
export default defineConfig({
  timeout: 60000, // 60초
});
```

### 개발 서버 자동 시작 비활성화
```typescript
// playwright.config.ts
webServer: undefined
```

## CI/CD 통합

### GitHub Actions
```yaml
- name: Install Playwright
  run: npx playwright install chromium

- name: Run E2E Tests
  run: npm run test:e2e
  working-directory: apps/admin-dashboard
```
