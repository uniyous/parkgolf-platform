# Park Golf Platform

## 📋 프로젝트 개요
파크골프 코스 예약 및 관리를 위한 마이크로서비스 기반 플랫폼

- **Repository**: `https://github.com/uniyous/parkgolf-platform`
- **Architecture**: Microservices + BFF Pattern + Event-Driven
- **Infrastructure**: GCP Cloud Run + GitOps
- **Language**: TypeScript (NestJS), Golang, Python

## 🏗️ 서비스 구조

### 핵심 마이크로서비스
- **auth-service** `:3011` - JWT 인증, 사용자 관리 (NestJS)
- **course-service** `:3012` - 코스/홀 관리 (NestJS)
- **booking-service** `:3013` - 예약 관리 (NestJS)
- **notify-service** `:3014` - 알림 발송 (NestJS)
- **search-service** `:3015` - 검색 엔진 (Golang + ElasticSearch)
- **ml-service** `:3016` - 머신러닝 추천 (Python FastAPI)

### BFF (Backend for Frontend)
- **admin-api** `:3091` - 관리자 대시보드 BFF (NestJS)
- **user-api** `:3092` - 사용자 앱 BFF (NestJS)

### 프론트엔드
- **admin-dashboard** `:3001` - 관리자 UI (React + Redux Toolkit)
- **user-webapp** `:3002` - 사용자 UI (React + Recoil)

### 인프라스트럭처
- **PostgreSQL** `:5432` - 각 서비스별 독립 스키마
- **ElasticSearch** `:9200` - 검색 인덱싱
- **Redis** `:6379` - 캐시
- **NATS** `:4222` - 메시지 브로커

## 📁 디렉토리 구조
```
parkgolf-platform/
├── .claude/CLAUDE.md        # 이 파일 (Claude Code 가이드)
├── .devtools/               # 개발 도구 모음
│   ├── config/             # 프로젝트 설정 (services.json, environments.json)
│   ├── scripts/            # 개발/배포 스크립트
│   ├── schemas/            # API/DB/Event 스키마
│   ├── types/              # TypeScript 공통 타입
│   └── docs/               # 상세 문서
├── services/               # 모든 마이크로서비스
└── shared/                 # 인프라 설정 (Terraform, configs)
```

## 🚀 빠른 시작

### 전체 개발 환경 시작
```bash
# 1. 인프라 서비스 시작
docker-compose up -d

# 2. 모든 서비스 시작 (tmux 세션으로 관리)
./.devtools/scripts/development/start-dev.sh

# 3. 접속
# - Admin: http://localhost:3001
# - User: http://localhost:3002
# - API Docs: http://localhost:3091/api/docs
```

### 개별 서비스 개발
```bash
cd services/auth-service
npm run start:dev  # 개발 모드
npm run test       # 테스트
npm run lint       # 린트 체크
```

### 서비스 배포
```bash
# 개별 서비스 배포
./.devtools/scripts/deployment/deploy-service.sh -s auth-service -e staging

# 인프라 배포 (Terraform)
cd shared/terraform/environments/prod && terraform apply
```

## 🔧 개발 패턴 & 규칙

### 아키텍처 패턴
- **Domain-Driven Design**: 각 서비스는 명확한 도메인 경계
- **Event Sourcing**: NATS를 통한 이벤트 기반 통신
- **CQRS**: Command/Query 분리 (특히 검색 서비스)
- **Circuit Breaker**: 서비스 간 호출 안정성 보장

### 코딩 표준
- **Language**: TypeScript 우선, Golang(검색), Python(ML)
- **Framework**: NestJS (마이크로서비스), React (프론트엔드)
- **Database**: Prisma ORM, PostgreSQL
- **Testing**: Jest (단위), Supertest (통합)
- **Linting**: ESLint + Prettier

### API 설계
- **REST**: 외부 클라이언트 통신
- **Event Messages**: 내부 서비스 통신 (NATS)
- **OpenAPI**: 모든 API 문서화 필수
- **Versioning**: `/api/v1/` prefix 사용

### 보안 요구사항
- **Authentication**: JWT (access + refresh token)
- **Authorization**: 계층적 RBAC 시스템
  - 플랫폼 레벨: PLATFORM_OWNER, PLATFORM_ADMIN, PLATFORM_SUPPORT, PLATFORM_ANALYST
  - 회사 레벨: COMPANY_OWNER, COMPANY_MANAGER, COURSE_MANAGER, STAFF, READONLY_STAFF
  - 범위 기반 접근 제어: PLATFORM, COMPANY, COURSE
- **Permission System**: 세분화된 권한 관리 (40+ permissions)
- **Validation**: DTO + class-validator 사용
- **Secrets**: 환경변수로 관리, 운영환경은 Secret Manager

## 🚨 자주 발생하는 문제 & 해결법

### 포트 충돌
```bash
lsof -i :3011 && kill -9 <PID>  # 포트 사용 프로세스 종료
```

### 데이터베이스 연결 오류
```bash
cd services/auth-service
npx prisma db push     # 스키마 동기화
npx prisma migrate reset  # 마이그레이션 초기화
```

### NATS 연결 실패
```bash
docker-compose restart nats  # NATS 컨테이너 재시작
```

### Docker 서비스 초기화
```bash
docker-compose down && docker-compose up -d
```

## 📚 상세 문서 위치
- **전체 문서**: `.devtools/docs/README.md`
- **마이그레이션 이력**: `.devtools/docs/MIGRATION_HISTORY.md`
- **API 스키마**: `.devtools/schemas/api/common.yaml`
- **공통 타입**: `.devtools/types/typescript/`
- **Terraform 모듈**: `shared/terraform/modules/`

## 🎯 현재 상태 & 우선순위

### ✅ 완료된 기능
- Auth Service (JWT 인증, 사용자 관리)
- Course Service (골프장, 코스, 홀 관리)
- Notify Service (알림 발송, 템플릿)
- Admin API (BFF로 모든 서비스 연동)
- Admin Dashboard (관리자 UI - 일부 TypeScript 오류 있음)

### ⚠️ 부분 구현
- Booking Service (기본 API만, NATS 연동 필요)
- User WebApp (로그인만 구현)

### ❌ 미구현
- Search Service (Golang 전환 예정)
- ML Service (Python FastAPI 전환 예정)
- User API (BFF 구현 필요)

### 🔥 최근 완료 (2025-01-11)
1. ✅ 포괄적인 RBAC (Role-Based Access Control) 시스템 구현
2. ✅ AdminAuthContext로 인증/인가 통합
3. ✅ Redux에서 Context API로 마이그레이션
4. ✅ 권한 기반 UI 렌더링 및 라우트 보호
5. ✅ 범위 기반 데이터 필터링 (PLATFORM/COMPANY/COURSE)

### 🔥 즉시 해결 필요
1. Booking Service NATS 이벤트 발행 구현
2. 각 서비스 Docker 빌드 테스트
3. User API (BFF) 구현 시작

**지원**: GitHub Issues 또는 admin@parkgolf.com