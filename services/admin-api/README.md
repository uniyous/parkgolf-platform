# Admin API Service

## 📋 개요

Admin API는 Park Golf Platform의 관리자 대시보드를 위한 Backend-for-Frontend (BFF) 서비스입니다.
여러 마이크로서비스의 기능을 통합하여 관리자 인터페이스에 최적화된 API를 제공합니다.

## 🏗️ 아키텍처

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15 with Prisma ORM
- **Message Queue**: NATS 2.x
- **Cache**: Redis 7.x
- **Authentication**: JWT with Passport

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18.x 이상
- PostgreSQL 15
- Redis 7
- NATS Server

### 개발 환경 설정
```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.development

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 개발 서버 시작
npm run dev
```

### 테스트 실행
```bash
# 유닛 테스트
npm test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

### 빌드
```bash
# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

## 📁 프로젝트 구조

```
src/
├── common/                 # 공통 모듈
│   ├── filters/           # 예외 필터
│   ├── interceptors/      # 인터셉터
│   ├── pipes/            # 파이프
│   └── utils/            # 유틸리티
├── controllers/           # API 컨트롤러
│   ├── admin-auth.controller.ts
│   ├── admin-courses.controller.ts
│   ├── admin-bookings.controller.ts
│   └── ...
├── services/             # 비즈니스 로직
│   ├── auth.service.ts
│   ├── course-nats.service.ts
│   └── ...
├── prisma/               # Prisma 설정
│   ├── schema.prisma
│   └── migrations/
├── app.module.ts         # 루트 모듈
└── main.ts              # 애플리케이션 진입점
```

## 🔌 API 엔드포인트

### Authentication
- `POST /api/admin/auth/login` - 관리자 로그인
- `POST /api/admin/auth/logout` - 로그아웃
- `POST /api/admin/auth/refresh` - 토큰 갱신
- `GET /api/admin/auth/profile` - 프로필 조회

### Courses Management
- `GET /api/admin/courses` - 코스 목록 조회
- `GET /api/admin/courses/:id` - 코스 상세 조회
- `POST /api/admin/courses` - 코스 생성
- `PUT /api/admin/courses/:id` - 코스 수정
- `DELETE /api/admin/courses/:id` - 코스 삭제

### Time Slots Management
- `GET /api/admin/courses/:id/time-slots` - 타임슬롯 목록
- `POST /api/admin/courses/:id/time-slots` - 타임슬롯 생성
- `PUT /api/admin/courses/:id/time-slots/:slotId` - 타임슬롯 수정
- `DELETE /api/admin/courses/:id/time-slots/:slotId` - 타임슬롯 삭제

### Bookings Management
- `GET /api/admin/bookings` - 예약 목록
- `GET /api/admin/bookings/:id` - 예약 상세
- `PUT /api/admin/bookings/:id/status` - 예약 상태 변경

## 🔐 환경 변수

```env
# Server
PORT=3091
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/admin_api_db?schema=public"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="30d"

# Redis
REDIS_URL="redis://:password@localhost:6379"

# NATS
NATS_URL="nats://localhost:4222"

# Microservices
AUTH_SERVICE_URL="http://localhost:3011"
CLUB_SERVICE_URL="http://localhost:3012"
BOOKING_SERVICE_URL="http://localhost:3013"
NOTIFY_SERVICE_URL="http://localhost:3014"
```

## 🧪 테스트

### 테스트 구조
```
test/
├── unit/              # 유닛 테스트
├── integration/       # 통합 테스트
└── e2e/              # E2E 테스트
```

### 테스트 실행
```bash
# 특정 테스트 파일 실행
npm test -- auth.service.spec.ts

# Watch 모드
npm run test:watch

# 디버그 모드
npm run test:debug
```

## 📊 모니터링

- **Health Check**: `GET /health`
- **Metrics**: Prometheus 형식 메트릭 제공
- **Logging**: Winston 로거 사용
- **Tracing**: OpenTelemetry 지원

## 🐛 문제 해결

### 일반적인 문제

1. **데이터베이스 연결 오류**
   ```bash
   # PostgreSQL 서비스 확인
   sudo systemctl status postgresql
   
   # 연결 테스트
   npx prisma db pull
   ```

2. **NATS 연결 오류**
   ```bash
   # NATS 서버 실행
   docker run -d --name nats -p 4222:4222 nats:latest
   ```

3. **Redis 연결 오류**
   ```bash
   # Redis 서버 실행
   docker run -d --name redis -p 6379:6379 redis:latest
   ```

## 📚 추가 문서

- [API 문서](./docs/API.md)
- [데이터베이스 스키마](./docs/DATABASE.md)
- [NATS 통신 가이드](./docs/NATS.md)

## 🤝 기여하기

1. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
2. 변경사항 커밋 (`git commit -m 'feat: Add amazing feature'`)
3. 브랜치 푸시 (`git push origin feature/amazing-feature`)
4. Pull Request 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

Last updated: 2024-07-06
