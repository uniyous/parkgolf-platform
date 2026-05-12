# parkgolf-e2e-dev-api

Park Golf Platform — API E2E tests (Playwright)

dev/prod API 직접 호출로 인증·도메인·saga·webhook 흐름을 검증.

## 디렉토리

```
apps/e2e-dev-api/
├── package.json
├── playwright.config.ts          baseURL: dev-api.parkgolfmate.com
├── tsconfig.json
├── .env.example                  → .env로 복사 후 값 채우기
├── fixtures/
│   └── auth.ts                   loginAdmin / loginUser / authHeaders
└── tests/
    ├── auth/admin-login.spec.ts
    ├── admin/clubs-read.spec.ts
    ├── booking/create-booking.spec.ts      (skip — 골격)
    └── payment/
        ├── dutch-payment.spec.ts            (skip — 골격)
        └── webhook-idempotency.spec.ts      (skip — 골격)
```

## 설치

```bash
cd apps/e2e-dev-api
npm install
npx playwright install chromium    # API 전용이라 chromium만
```

## 환경변수

```bash
cp .env.example .env
# E2E_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD 등 조정
```

| 변수 | 기본값 |
|---|---|
| `E2E_BASE_URL` | `https://dev-api.parkgolfmate.com` |
| `ADMIN_EMAIL` | `admin@parkgolf.com` |
| `ADMIN_PASSWORD` | `admin123!@#` |

## 실행

```bash
# 전체 (dev 기본)
npm test

# 특정 카테고리
npm run test:auth
npm run test:admin
npm run test:booking
npm run test:payment

# prod (읽기 전용 — @write 태그 자동 제외)
npm run test:prod

# 리포트
npm run report

# 새 spec 작성 시 브라우저 codegen
npm run codegen
```

## 태그 정책

| 태그 | 의미 |
|---|---|
| (없음) | read-only — prod에서도 실행 가능 |
| `@write` | 실 데이터 변경 — dev/staging만 |
| `@slow` | 시간 오래 걸림 (예: 더치페이 타임아웃 5분 대기) |
| `@external` | 외부 의존성 (토스 sandbox) |

`test:prod` 스크립트는 `--grep-invert @write`로 write 테스트 제외.

## CI 통합 (제안)

```yaml
# .github/workflows/e2e-api.yml
on:
  workflow_dispatch:
  schedule: [{ cron: '0 18 * * *' }]   # 매일 03:00 KST (UTC 18:00)

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: '20', cache: 'npm', cache-dependency-path: apps/e2e-dev-api/package-lock.json }
      - run: npm ci
        working-directory: apps/e2e-dev-api
      - run: npx playwright install --with-deps chromium
        working-directory: apps/e2e-dev-api
      - run: npx playwright test
        working-directory: apps/e2e-dev-api
        env:
          E2E_BASE_URL: https://dev-api.parkgolfmate.com
          ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: apps/e2e-dev-api/playwright-report
```

## 디버깅

| 상황 | 명령 |
|---|---|
| 단일 spec 디버그 | `npx playwright test tests/auth/admin-login.spec.ts --debug` |
| trace 확인 | 실패한 테스트 → `npx playwright show-trace test-results/...` |
| 신규 spec 작성 보조 | `npm run codegen` |

## Cloud Trace 연계

E2E 실패 시 같은 시각의 Cloud Trace + Cloud Logging에서 분산 흐름 원인 즉시 추적 가능:

```bash
# 실패 시각 기준 1시간 trace
gcloud trace traces list --start-time=-PT1H --project=parkgolf-uniyous

# 같은 시각 ERROR 로그
gcloud logging read 'severity>=ERROR
  AND resource.labels.cluster_name="parkgolf-dev-cluster"' \
  --freshness=1h --limit=20 --project=parkgolf-uniyous
```
