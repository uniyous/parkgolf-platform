# 환경 변수 설정 가이드 (JSON 기반)

## GitHub Secrets 설정

JSON 형태로 환경 변수를 관리하여 더 깔끔하고 유지보수하기 쉽게 구성했습니다.

### 1. GCP 인증
- `GCP_SA_KEY`: Google Cloud Service Account JSON 키 (필수)

### 2. 개발 환경 설정 (develop 브랜치)
- `DEV_ENV_CONFIG`: 개발 환경 JSON 설정

### 3. 프로덕션 환경 설정 (main 브랜치)
- `PROD_ENV_CONFIG`: 프로덕션 환경 JSON 설정

## JSON 템플릿

### DEV_ENV_CONFIG (개발 환경)
```json
{
  "database": {
    "auth_url": "postgresql://parkgolf:parkgolf123@34.47.122.22:5432/auth_db?schema=public",
    "course_url": "postgresql://parkgolf:parkgolf123@34.47.122.22:5432/course_db?schema=public",
    "booking_url": "postgresql://parkgolf:parkgolf123@34.47.122.22:5432/booking_db?schema=public",
    "notify_url": "postgresql://parkgolf:parkgolf123@34.47.122.22:5432/notify_db?schema=public"
  },
  "server": {
    "port": "8080",
    "node_env": "development"
  },
  "jwt": {
    "secret": "dev-super-secret-jwt-key-change-in-production",
    "expires_in": "15m",
    "refresh_secret": "dev-refresh-secret-key",
    "refresh_expires_in": "7d"
  },
  "nats": {
    "url": "nats://34.64.85.225:4222"
  }
}
```

### PROD_ENV_CONFIG (프로덕션 환경)
```json
{
  "database": {
    "auth_url": "postgresql://parkgolf:production-password@production-db-host:5432/auth_db?schema=public",
    "course_url": "postgresql://parkgolf:production-password@production-db-host:5432/course_db?schema=public",
    "booking_url": "postgresql://parkgolf:production-password@production-db-host:5432/booking_db?schema=public",
    "notify_url": "postgresql://parkgolf:production-password@production-db-host:5432/notify_db?schema=public"
  },
  "server": {
    "port": "8080",
    "node_env": "production"
  },
  "jwt": {
    "secret": "production-jwt-secret-change-this",
    "expires_in": "15m",
    "refresh_secret": "production-refresh-secret",
    "refresh_expires_in": "7d"
  },
  "nats": {
    "url": "nats://production-nats-host:4222"
  }
}
```

## GitHub Secrets 설정 방법

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 다음 시크릿들을 설정:

### 필수 Secrets
- **Name**: `GCP_SA_KEY`
  - **Value**: Google Cloud Service Account JSON 키 전체 내용

- **Name**: `DEV_ENV_CONFIG`
  - **Value**: 위의 개발 환경 JSON 템플릿을 복사하여 실제 값으로 수정

- **Name**: `PROD_ENV_CONFIG` (프로덕션용, 선택사항)
  - **Value**: 위의 프로덕션 환경 JSON 템플릿을 복사하여 실제 값으로 수정

## JSON 기반 관리의 장점

1. **중앙 집중 관리**: 모든 환경 변수를 하나의 JSON에서 관리
2. **가독성**: 구조화된 형태로 설정 확인 용이
3. **유지보수**: 새로운 변수 추가 시 JSON만 수정하면 됨
4. **보안**: 민감한 정보가 워크플로우 파일에 노출되지 않음
5. **환경 분리**: 개발/프로덕션 환경을 완전히 분리

## 환경별 자동 설정

GitHub Actions 워크플로우는 다음과 같이 환경을 자동으로 구분합니다:

### Development (develop 브랜치)
- 사용 JSON: `DEV_ENV_CONFIG`
- 서비스 접미사: `-dev`
- NODE_ENV: `development`

### Production (main 브랜치)
- 사용 JSON: `PROD_ENV_CONFIG` (없으면 `DEV_ENV_CONFIG` 사용)
- 서비스 접미사: `-prod`
- NODE_ENV: `production`

## 서비스별 데이터베이스

각 서비스는 독립적인 데이터베이스를 사용합니다:
- `auth-service`: auth_db (Users, Admins, Roles, Permissions)
- `course-service`: course_db (Companies, Clubs, Courses, Holes, TimeSlots)
- `booking-service`: booking_db (Bookings, Payments, BookingHistory, Caches)
- `notify-service`: notify_db (Notifications, Templates, Logs)

## 로컬 개발 환경

로컬 개발 시 `.env` 파일 설정:

```env
# Database
DATABASE_URL=postgresql://parkgolf:parkgolf123@localhost:5432/auth_db?schema=public  # 서비스별로 변경

# NATS
NATS_URL=nats://localhost:4222

# JWT
JWT_SECRET=dev-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=dev-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Node
NODE_ENV=development
PORT=8080  # Cloud Run에서 자동 설정
```

## 변수 추가/수정 방법

새로운 환경 변수가 필요한 경우:

1. **JSON 업데이트**: `DEV_ENV_CONFIG`의 JSON에 새 필드 추가
2. **워크플로우 수정**: 필요 시 `.github/workflows/deploy-backend.yml`에서 jq 추출 로직 추가
3. **테스트**: 개발 환경에서 배포 테스트

## 보안 주의사항

1. **절대 하지 말아야 할 것**:
   - JSON 내용을 코드에 하드코딩
   - GitHub Secrets을 로그에 출력
   - 프로덕션 시크릿을 개발에서 사용

2. **반드시 해야 할 것**:
   - JSON 형식 검증 후 GitHub Secrets 저장
   - 환경별 시크릿 분리
   - 정기적인 비밀번호 변경

## 문제 해결

### JSON 파싱 오류
- JSON 형식이 올바른지 확인 (JSON validator 사용)
- 특수문자 이스케이프 확인

### 환경 변수가 설정되지 않음
- `jq` 경로가 올바른지 확인
- JSON 구조와 jq 쿼리 일치 확인

### 새로운 변수가 반영되지 않음
- GitHub Secrets 업데이트 후 워크플로우 재실행
- jq 추출 로직이 워크플로우에 추가되었는지 확인

---

## 📋 Recent Updates (2025-10-09)
- Added notify_db database configuration
- Updated JWT token expiration times to actual implementation (Access: 15m, Refresh: 7d)
- Added detailed database descriptions for each service
- Clarified service-specific database usage

---

**Document Version**: 1.1.0
**Last Updated**: 2025-10-09
**Next Review**: 2025-11-01