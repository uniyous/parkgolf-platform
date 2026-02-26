---
name: testing
description: Park Golf Platform 테스트 전략 가이드. 테스트 피라미드(Contract → Integration → E2E), 테스트 실행 방법, CI/CD 통합 안내. "테스트", "test", "검증" 관련 질문 시 사용합니다.
---

# Testing Skill

Park Golf Platform 테스트 전략 및 실행 가이드

---

## 테스트 피라미드

```
                    ┌─────────────┐
                    │   E2E Test  │  ← 적음 (비용 높음)
                    │  Playwright │
                 ┌──┴─────────────┴──┐
                 │ Integration Test  │  ← 중간
                 │   API / NATS      │
              ┌──┴───────────────────┴──┐
              │    Contract Test        │  ← 많음 (비용 낮음)
              │  Pact / Schema / Unit   │
              └─────────────────────────┘
```

| 레벨 | 범위 | 도구 | 실행 시점 |
|------|------|------|----------|
| Contract | 서비스 계약 검증 | Pact, JSON Schema | PR 생성 시 |
| Integration | API 엔드포인트, NATS 통신 | Jest, curl | 배포 후 |
| E2E | 브라우저 전체 흐름 | Playwright | 배포 후 |

---

## 1. Contract Test

서비스 간 계약(스키마)을 검증하여 독립적 배포 보장.

### 실행

```bash
# Consumer 테스트 (Pact 파일 생성)
cd services/user-api
npm run test:contract:consumer

# Provider 검증
cd services/iam-service
npm run test:contract:provider

# NATS 스키마 검증
npm run test:nats-contract
```

### 패턴

| 유형 | 설명 |
|------|------|
| Pact Consumer | Consumer가 기대하는 API 계약 정의 |
| Pact Provider | Provider가 계약 충족 검증 |
| NATS Schema | 메시지 요청/응답 JSON Schema 검증 |

### 작성 규칙

- Consumer 테스트는 BFF 서비스(`user-api`, `admin-api`)에 작성
- Provider 테스트는 대상 Microservice에 작성
- NATS 메시지 스키마는 `test/contract/` 폴더에 JSON Schema로 정의

---

## 2. Integration Test

API 엔드포인트와 서비스 간 NATS 통신 검증.

### 실행

```bash
# Health Check (모든 서비스)
./scripts/health-check.sh

# API 테스트
npm run test:integration

# 특정 서비스
npm run test:integration -- --grep "User API"
```

### 주요 시나리오

```bash
# 인증 플로우
curl -X POST "$API_URL/api/user/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test1234!@"}'

# NATS 통신 테스트
npx ts-node test/integration/nats-test.ts
```

### 서비스 접근 (GKE 기반)

| 환경 | API URL |
|------|---------|
| dev | `https://dev-api.parkgolfmate.com` |
| prod | `https://api.parkgolfmate.com` |

> 개별 서비스는 K8s 내부 통신 (`http://{service}:8080`). 외부 접근은 Ingress를 통해.

---

## 3. E2E Test

브라우저 기반 전체 사용자 시나리오 검증 (Playwright).

### 실행

```bash
# admin-dashboard
cd apps/admin-dashboard
npm run test:e2e        # Headless
npm run test:e2e:ui     # UI 모드
npm run test:e2e:debug  # 디버그

# user-app-web
cd apps/user-app-web
npm run test:e2e
npm run test:e2e:ui

# 특정 파일
npx playwright test company-management.spec.ts
npx playwright test booking-flow.spec.ts
```

### 테스트 파일

| 앱 | 주요 테스트 |
|----|------------|
| admin-dashboard | login, company, club, booking, user, admin, role |
| user-app-web | login, booking-flow, my-bookings |

### 테스트 계정

| 앱 | 역할 | 이메일 | 비밀번호 |
|----|------|--------|----------|
| admin | 플랫폼관리자 | admin@parkgolf.com | admin123!@# |
| admin | 강남대표 | manager@gangnam-golf.com | admin123!@# |
| user | 테스트사용자 | test@parkgolf.com | test123!@# |

### Playwright 작성 규칙

- `test.describe`로 기능별 그룹화
- `page.getByRole()`, `page.getByText()` 등 시멘틱 로케이터 우선
- 인증 상태는 `storageState`로 캐싱 (`e2e/.auth/`)
- 네트워크 대기: `page.waitForResponse()` 사용
- 테스트 간 독립성 보장 (DB 상태에 의존하지 않음)

---

## 테스트 실행 순서

### PR 생성 시 (CI 자동)

```
1. Contract Test → Pact Consumer/Provider 검증
2. Unit Test → 개별 함수/모듈 검증
3. Build → 빌드 검증
```

### 배포 후 (수동/스케줄)

```
1. Health Check → 모든 서비스 상태 확인
2. Integration Test → API 엔드포인트 검증
3. E2E Test → 브라우저 사용자 시나리오
```

---

## CI/CD 통합

```yaml
# PR 시 Contract Test
- name: Run Contract Tests
  run: npm run test:contract

# 배포 후 Integration Test
- name: Run Integration Tests
  run: npm run test:integration
  env:
    API_URL: ${{ secrets.API_URL }}

# 배포 후 E2E Test
- name: Run E2E Tests
  run: npm run test:e2e
  working-directory: apps/admin-dashboard
```

---

## 트러블슈팅

### 인증 캐시 초기화
```bash
rm -rf e2e/.auth
```

### Playwright 브라우저 설치
```bash
npx playwright install chromium
```

### NATS 연결 실패
- K8s 내부 네트워크 확인
- NATS_URL 환경변수 확인 (`nats://nats:4222`)
- NATS Pod 상태 확인: `kubectl get pods -n parkgolf-{env} | grep nats`

### 테스트 타임아웃
- Playwright 기본 타임아웃: 30초
- 느린 테스트: `test.slow()` 사용 (타임아웃 3배)
- API 응답 대기: `page.waitForResponse()` 활용
