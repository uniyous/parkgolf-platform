# 환경 변수 설정 가이드

## GitHub Secrets 설정

개발(develop) 브랜치와 프로덕션(main) 브랜치를 위해 다음 GitHub Secrets을 설정해야 합니다.

### 1. GCP 인증
- `GCP_SA_KEY`: Google Cloud Service Account JSON 키 (필수)

### 2. 개발 환경 변수 (develop 브랜치)

#### 데이터베이스
- `DEV_DATABASE_HOST`: PostgreSQL 호스트 (예: 34.47.122.22)
- `DEV_DATABASE_PASSWORD`: 데이터베이스 비밀번호
- `DATABASE_PORT`: 5432 (기본값)
- `DATABASE_USER`: postgres (기본값)

#### NATS 메시지 브로커
- `DEV_NATS_URL`: NATS 서버 URL (예: nats://34.64.85.225:4222)
- `NATS_USER`: NATS 사용자명
- `NATS_PASSWORD`: NATS 비밀번호

#### Redis
- `REDIS_HOST`: Redis 서버 호스트

#### 보안
- `JWT_SECRET`: JWT 토큰 서명용 시크릿 키

#### 외부 서비스 (선택)
- `SENDGRID_API_KEY`: SendGrid 이메일 서비스 API 키
- `TWILIO_ACCOUNT_SID`: Twilio SMS 서비스 계정 SID
- `TWILIO_AUTH_TOKEN`: Twilio 인증 토큰

### 3. 프로덕션 환경 변수 (main 브랜치)

프로덕션용으로 다음 추가 시크릿들을 설정할 수 있습니다:
- `PROD_DATABASE_HOST`: 프로덕션 데이터베이스 호스트
- `PROD_DATABASE_PASSWORD`: 프로덕션 데이터베이스 비밀번호
- `PROD_NATS_URL`: 프로덕션 NATS 서버 URL

## GitHub Secrets 설정 방법

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name과 Value 입력
4. "Add secret" 클릭

## 환경별 자동 설정

GitHub Actions 워크플로우는 다음과 같이 환경을 자동으로 구분합니다:

### Development (develop 브랜치)
```yaml
environment: development
SERVICE_SUFFIX: -dev
NODE_ENV: development
```

### Production (main 브랜치)
```yaml
environment: production
SERVICE_SUFFIX: -prod
NODE_ENV: production
```

## 서비스별 데이터베이스

각 서비스는 독립적인 데이터베이스를 사용합니다:
- `auth-service`: auth_db
- `course-service`: course_db
- `booking-service`: booking_db

## 로컬 개발 환경

로컬 개발 시 `.env` 파일 설정:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=auth_db  # 서비스별로 변경

# NATS
NATS_URL=nats://localhost:4222
NATS_USER=nats
NATS_PASSWORD=nats123

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_key

# Node
NODE_ENV=development
PORT=8080  # Cloud Run에서 자동 설정
```

## 보안 주의사항

1. **절대 하지 말아야 할 것**:
   - 비밀번호를 코드에 하드코딩
   - .env 파일을 Git에 커밋
   - 프로덕션 시크릿을 공유

2. **반드시 해야 할 것**:
   - GitHub Secrets 사용
   - 환경별 시크릿 분리
   - 정기적인 비밀번호 변경
   - 최소 권한 원칙 적용

## 문제 해결

### 환경 변수가 설정되지 않음
- GitHub Secrets이 올바르게 설정되었는지 확인
- 워크플로우에서 환경(development/production) 선택 확인

### 데이터베이스 연결 실패
- DATABASE_HOST가 올바른지 확인
- 방화벽 규칙에서 Cloud Run IP 허용 확인
- 데이터베이스 사용자 권한 확인

### NATS 연결 실패
- NATS_URL 형식 확인 (nats://host:port)
- NATS 서버가 실행 중인지 확인
- 네트워크 연결 확인