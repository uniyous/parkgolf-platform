# E2E Testing Skill

## 개요
admin-dashboard 및 user-webapp의 Playwright E2E 테스트 실행 및 관리

## 디렉토리
```
apps/admin-dashboard/   # 관리자 대시보드
apps/user-webapp/       # 사용자 웹앱
```

---

# Admin Dashboard E2E 테스트

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

---

# User WebApp E2E 테스트

## 디렉토리
```
apps/user-webapp/
```

## 테스트 실행

### 기본 실행 (Headless)
```bash
cd apps/user-webapp
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
npx playwright test booking-flow.spec.ts
npx playwright test my-bookings.spec.ts
```

### 특정 테스트 케이스 실행
```bash
npx playwright test -g "테스트사용자로 로그인 성공"
```

## 테스트 파일 구조
```
e2e/
├── .auth/                # 인증 상태 저장 (gitignore)
├── global-setup.ts       # 서버 웜업 (Cloud Run 콜드 스타트 대비)
├── auth.setup.ts         # 로그인 설정 (테스트 전 실행)
├── login.spec.ts         # 로그인 테스트
├── booking-flow.spec.ts  # 예약 플로우 테스트
└── my-bookings.spec.ts   # 내 예약 테스트
```

## 테스트 시나리오

### login.spec.ts (10개)
- 로그인 페이지 렌더링
- 테스트사용자로 로그인 성공
- 김철수 계정으로 로그인 성공
- 박영희 계정으로 로그인 성공
- 이민수 계정으로 로그인 성공
- 잘못된 비밀번호로 로그인 실패
- 존재하지 않는 계정으로 로그인 실패
- 빈 필드로 로그인 시도 시 유효성 검사
- 회원가입 페이지로 이동
- 로그인 없이 둘러보기 링크 동작

### booking-flow.spec.ts (12개)
- 검색 페이지 렌더링 확인
- 날짜 필터 변경
- 시간대 필터 변경 - 오전
- 시간대 필터 변경 - 오후
- 검색어 입력
- 필터 버튼 토글
- 게임 카드가 표시됨
- 타임슬롯 선택 시 예약 상세 페이지로 이동
- 내 예약 버튼 클릭
- 로그아웃 버튼 클릭
- 페이지네이션 동작
- 예약 상세 페이지 직접 접근 시 리다이렉트

### my-bookings.spec.ts (10개)
- 내 예약 페이지 렌더링 확인
- 예정된 예약 표시
- 지난 예약 보기 탭 전환
- 예정된 예약 보기 탭 전환
- 뒤로가기 버튼 동작
- 새로고침 버튼 동작
- 빈 상태에서 라운드 찾기 버튼
- 예약 카드 상세보기 클릭
- 예약 취소 버튼 표시 (취소 가능한 예약)
- 페이지네이션 표시 (예약이 많은 경우)

## 테스트 계정

| 이름 | 이메일 | 비밀번호 |
|------|--------|----------|
| 테스트사용자 | test@parkgolf.com | test123!@# |
| 김철수 | kim@parkgolf.com | test123!@# |
| 박영희 | park@parkgolf.com | test123!@# |
| 이민수 | lee@parkgolf.com | test123!@# |

## 환경 변수

### 기본 URL 변경
```bash
E2E_BASE_URL=http://localhost:3002 npm run test:e2e
```

### 배포 환경 테스트
```bash
E2E_BASE_URL=https://user-dev.parkgolf.com npm run test:e2e
```

## 서버 웜업

user-webapp은 Cloud Run 서비스들을 사용하므로 콜드 스타트 대응을 위해 global-setup.ts에서 서버 웜업을 수행합니다:

```typescript
const API_ENDPOINTS = [
  'https://user-api-dev-iihuzmuufa-du.a.run.app/health',
  'https://auth-service-dev-iihuzmuufa-du.a.run.app/health',
  'https://course-service-dev-iihuzmuufa-du.a.run.app/health',
  'https://booking-service-dev-iihuzmuufa-du.a.run.app/health',
];
```

웜업 과정:
1. 1차 웜업 - Cold Start 트리거
2. NATS 구독 등록 대기 (5초)
3. 2차 웜업 - 캐시 워밍

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
// 기본적으로 auth.setup.ts에서 테스트사용자로 로그인됨
// storageState가 자동 적용됨

test('인증 필요한 페이지', async ({ page }) => {
  await page.goto('/my-bookings');
  // 이미 로그인된 상태
});
```

### 3. 다른 계정으로 테스트
```typescript
test('김철수 계정 테스트', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByRole('button', { name: /김철수/ }).click();
  await page.getByRole('button', { name: '로그인' }).click();

  // 테스트 진행
  await context.close();
});
```

## 모바일 테스트

user-webapp은 모바일 환경도 테스트합니다 (Pixel 5):

```bash
# 모바일 테스트만 실행
npx playwright test --project=mobile-chrome
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

### Cloud Run 콜드 스타트 이슈
global-setup.ts의 웜업 시간을 늘리거나, expect의 timeout을 증가:
```typescript
await expect(page).toHaveURL(/.*search/, { timeout: 30000 });
```

## CI/CD 통합

### GitHub Actions
```yaml
- name: Install Playwright
  run: npx playwright install chromium

- name: Run E2E Tests
  run: npm run test:e2e
  working-directory: apps/user-webapp
  env:
    E2E_BASE_URL: https://user-dev.parkgolf.com
```
