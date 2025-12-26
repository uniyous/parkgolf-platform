# E2E Testing Skills

## 개요
Playwright를 사용한 End-to-End 테스트 실행 및 관리

## 테스트 실행 명령어

### 기본 테스트 실행
```bash
cd apps/admin-dashboard
npm run test:e2e
```

### UI 모드로 테스트 (시각적 디버깅)
```bash
npm run test:e2e:ui
```

### 브라우저 표시하며 테스트
```bash
npm run test:e2e:headed
```

### 디버그 모드
```bash
npm run test:e2e:debug
```

### 테스트 리포트 확인
```bash
npm run test:e2e:report
```

## 테스트 구조

```
apps/admin-dashboard/
├── e2e/
│   ├── .auth/              # 인증 상태 저장
│   │   └── admin.json
│   ├── auth.setup.ts       # 로그인 설정
│   ├── login.spec.ts       # 로그인 테스트
│   └── admin-crud.spec.ts  # 관리자 CRUD 테스트
└── playwright.config.ts    # Playwright 설정
```

## 테스트 시나리오

### 1. 로그인 테스트 (login.spec.ts)
- 로그인 페이지 렌더링
- ADMIN/MANAGER/STAFF/VIEWER 역할별 로그인
- 잘못된 비밀번호 처리
- 존재하지 않는 계정 처리

### 2. 관리자 CRUD 테스트 (admin-crud.spec.ts)
- 관리자 목록 조회
- 관리자 상세 조회
- 새 관리자 생성
- 관리자 정보 수정
- 관리자 역할 변경
- 관리자 삭제
- 역할별 권한 테스트

## 환경 설정

### 기본 URL 변경
```bash
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

### 개발 서버 URL (배포 환경 테스트)
```bash
E2E_BASE_URL=https://admin-dev.example.com npm run test:e2e
```

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| ADMIN | admin@parkgolf.com | admin123!@# |
| SUPPORT | support@parkgolf.com | admin123!@# |
| MANAGER | manager@gangnam-golf.com | admin123!@# |
| STAFF | staff@gangnam-golf.com | admin123!@# |
| VIEWER | viewer@parkgolf.com | admin123!@# |

## 새 테스트 추가

### 1. 테스트 파일 생성
```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('내 기능 테스트', () => {
  test('기능 동작 확인', async ({ page }) => {
    await page.goto('/my-feature');
    await expect(page.getByText('예상 텍스트')).toBeVisible();
  });
});
```

### 2. 특정 테스트만 실행
```bash
npx playwright test my-feature.spec.ts
```

### 3. 특정 테스트 케이스만 실행
```bash
npx playwright test -g "기능 동작 확인"
```

## CI/CD 통합

### GitHub Actions 예시
```yaml
- name: Run E2E Tests
  run: |
    cd apps/admin-dashboard
    npm ci
    npx playwright install chromium
    npm run test:e2e
```

## 트러블슈팅

### 브라우저 설치
```bash
npx playwright install chromium
```

### 캐시 정리
```bash
rm -rf e2e/.auth
```

### 타임아웃 증가
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 60초
});
```
