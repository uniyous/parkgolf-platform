---
name: integration-test
description: Park Golf Platform 통합 테스트 가이드. API 테스트, 서비스 간 통신 테스트, E2E 테스트 실행 방법 안내. "통합테스트", "integration", "API 테스트", "서비스 테스트" 관련 질문 시 사용합니다.
---

# Integration Testing Guide

## 개요

Park Golf Platform의 통합 테스트는 다음 레벨로 구성됩니다:

1. **API Integration Test** - 단일 서비스 API 엔드포인트 테스트
2. **Service Integration Test** - 서비스 간 NATS 통신 테스트
3. **E2E Test** - 전체 시스템 흐름 테스트

---

## 서비스 URL (dev 환경)

```bash
# Base URLs
ADMIN_API=https://admin-api-dev-iihuzmuufa-du.a.run.app
USER_API=https://user-api-dev-iihuzmuufa-du.a.run.app
IAM_SERVICE=https://iam-service-dev-iihuzmuufa-du.a.run.app
COURSE_SERVICE=https://course-service-dev-iihuzmuufa-du.a.run.app
BOOKING_SERVICE=https://booking-service-dev-iihuzmuufa-du.a.run.app
NOTIFY_SERVICE=https://notify-service-dev-iihuzmuufa-du.a.run.app
```

---

## 1. Health Check 테스트

### 모든 서비스 상태 확인

```bash
#!/bin/bash
# health-check.sh

SERVICES=(
  "admin-api:https://admin-api-dev-iihuzmuufa-du.a.run.app"
  "user-api:https://user-api-dev-iihuzmuufa-du.a.run.app"
  "iam-service:https://iam-service-dev-iihuzmuufa-du.a.run.app"
  "course-service:https://course-service-dev-iihuzmuufa-du.a.run.app"
  "booking-service:https://booking-service-dev-iihuzmuufa-du.a.run.app"
  "notify-service:https://notify-service-dev-iihuzmuufa-du.a.run.app"
)

echo "=== Health Check ==="
for service in "${SERVICES[@]}"; do
  name="${service%%:*}"
  url="${service#*:}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url/health")
  if [ "$status" == "200" ]; then
    echo "✅ $name: OK"
  else
    echo "❌ $name: FAILED ($status)"
  fi
done
```

---

## 2. API Integration Tests

### 2.1 User API 테스트

#### 회원가입

```bash
curl -X POST "$USER_API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!@",
    "name": "테스트 사용자",
    "phoneNumber": "010-1234-5678"
  }'
```

#### 로그인

```bash
curl -X POST "$USER_API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!@"
  }'
```

#### 프로필 조회 (인증 필요)

```bash
TOKEN="your-jwt-token"
curl -X GET "$USER_API/auth/profile" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.2 코스 조회

```bash
# 코스 목록
curl -X GET "$USER_API/courses"

# 코스 검색
curl -X GET "$USER_API/courses/search?keyword=파크"

# 코스 상세
curl -X GET "$USER_API/courses/{courseId}"
```

### 2.3 예약

```bash
TOKEN="your-jwt-token"

# 예약 가능 시간 조회
curl -X GET "$USER_API/bookings/courses/{courseId}/time-slots?date=2025-01-15" \
  -H "Authorization: Bearer $TOKEN"

# 예약 생성
curl -X POST "$USER_API/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "courseId": "course-uuid",
    "date": "2025-01-15",
    "timeSlot": "09:00",
    "players": 4
  }'

# 내 예약 목록
curl -X GET "$USER_API/bookings" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Admin API 테스트

### 3.1 관리자 로그인

```bash
curl -X POST "$ADMIN_API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@parkgolf.com",
    "password": "Admin1234!@"
  }'
```

### 3.2 사용자 관리

```bash
ADMIN_TOKEN="admin-jwt-token"

# 사용자 목록
curl -X GET "$ADMIN_API/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 사용자 상세
curl -X GET "$ADMIN_API/users/{userId}" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3.3 코스 관리

```bash
# 코스 생성
curl -X POST "$ADMIN_API/courses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "테스트 파크골프장",
    "address": "서울시 강남구",
    "holes": 36,
    "description": "테스트용 골프장"
  }'

# 코스 수정
curl -X PUT "$ADMIN_API/courses/{courseId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "수정된 파크골프장"
  }'
```

---

## 4. Service Integration Test (NATS)

### 4.1 NATS 메시지 패턴

| 서비스 | 메시지 패턴 |
|--------|------------|
| iam-service | `auth.login`, `auth.validate`, `auth.refresh` |
| iam-service | `users.create`, `users.list`, `users.findById` |
| course-service | `courses.list`, `courses.findById`, `courses.search` |
| booking-service | `bookings.create`, `bookings.list`, `bookings.cancel` |
| notify-service | `notifications.send.email`, `notifications.send.sms` |

### 4.2 NATS 테스트 스크립트

```typescript
// test/integration/nats-test.ts
import { connect, StringCodec } from 'nats';

const sc = StringCodec();

async function testNatsIntegration() {
  const nc = await connect({ servers: 'nats://10.1.2.2:4222' });

  // auth.validate 테스트
  console.log('Testing auth.validate...');
  const response = await nc.request(
    'auth.validate',
    sc.encode(JSON.stringify({ token: 'test-token' })),
    { timeout: 5000 }
  );
  console.log('Response:', sc.decode(response.data));

  // courses.list 테스트
  console.log('Testing courses.list...');
  const coursesResponse = await nc.request(
    'courses.list',
    sc.encode(JSON.stringify({ page: 1, limit: 10 })),
    { timeout: 5000 }
  );
  console.log('Courses:', sc.decode(coursesResponse.data));

  await nc.close();
}

testNatsIntegration().catch(console.error);
```

---

## 5. E2E Test Flow

### 5.1 사용자 시나리오 테스트

```bash
#!/bin/bash
# e2e-user-flow.sh

USER_API="https://user-api-dev-iihuzmuufa-du.a.run.app"
EMAIL="e2e-test-$(date +%s)@example.com"
PASSWORD="Test1234!@"

echo "=== E2E User Flow Test ==="

# 1. 회원가입
echo "1. Register..."
REGISTER_RESULT=$(curl -s -X POST "$USER_API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"E2E 테스트\",
    \"phoneNumber\": \"010-9999-9999\"
  }")
echo "Register: $REGISTER_RESULT"

# 2. 로그인
echo "2. Login..."
LOGIN_RESULT=$(curl -s -X POST "$USER_API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")
TOKEN=$(echo $LOGIN_RESULT | jq -r '.accessToken')
echo "Token: ${TOKEN:0:50}..."

# 3. 프로필 조회
echo "3. Get Profile..."
curl -s -X GET "$USER_API/auth/profile" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. 코스 목록 조회
echo "4. List Courses..."
curl -s -X GET "$USER_API/courses" | jq '.data[:2]'

echo "=== E2E Test Complete ==="
```

---

## 6. 테스트 자동화 (Jest)

### 6.1 설정

```json
// package.json
{
  "scripts": {
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "jest --config jest.e2e.config.js"
  }
}
```

```javascript
// jest.integration.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['./test/setup.ts'],
  globalSetup: './test/global-setup.ts',
  globalTeardown: './test/global-teardown.ts',
  testTimeout: 30000,
};
```

### 6.2 테스트 코드 예시

```typescript
// test/integration/user-api.test.ts
import axios from 'axios';

const USER_API = process.env.USER_API_URL || 'https://user-api-dev-iihuzmuufa-du.a.run.app';

describe('User API Integration Tests', () => {
  let authToken: string;

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${USER_API}/health`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
    });
  });

  describe('Authentication', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Test1234!@';

    it('should register a new user', async () => {
      const response = await axios.post(`${USER_API}/auth/register`, {
        email: testEmail,
        password: testPassword,
        name: 'Integration Test User',
        phoneNumber: '010-1234-5678'
      });
      expect(response.status).toBe(201);
    });

    it('should login', async () => {
      const response = await axios.post(`${USER_API}/auth/login`, {
        email: testEmail,
        password: testPassword
      });
      expect(response.status).toBe(200);
      expect(response.data.accessToken).toBeDefined();
      authToken = response.data.accessToken;
    });

    it('should get profile', async () => {
      const response = await axios.get(`${USER_API}/auth/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(200);
      expect(response.data.email).toBe(testEmail);
    });
  });

  describe('Courses', () => {
    it('should list courses', async () => {
      const response = await axios.get(`${USER_API}/courses`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });
});
```

---

## 7. CI/CD 통합

### GitHub Actions Workflow

```yaml
# .github/workflows/integration-test.yml
name: Integration Tests

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Test environment'
        required: true
        type: choice
        options:
          - dev
          - staging
  schedule:
    - cron: '0 9 * * *'  # 매일 오전 9시 (UTC)

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci
        working-directory: test

      - name: Run integration tests
        env:
          USER_API_URL: https://user-api-${{ inputs.environment }}-iihuzmuufa-du.a.run.app
          ADMIN_API_URL: https://admin-api-${{ inputs.environment }}-iihuzmuufa-du.a.run.app
        run: npm run test:integration
        working-directory: test

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test/reports/
```

---

## 8. 테스트 실행 체크리스트

- [ ] 모든 서비스 Health Check 통과
- [ ] User API 인증 플로우 (회원가입 → 로그인 → 프로필)
- [ ] Admin API 인증 및 CRUD
- [ ] NATS 메시지 통신 확인
- [ ] E2E 사용자 시나리오 통과
