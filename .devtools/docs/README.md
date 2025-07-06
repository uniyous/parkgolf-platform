# Park Golf Platform Documentation

## 📋 Project Overview

Park Golf Platform은 파크골프 코스 예약 및 관리를 위한 마이크로서비스 기반 플랫폼입니다.

## 🏗️ Architecture

### Microservices
- **Auth Service**: 사용자 인증 및 권한 관리
- **Course Service**: 코스 및 홀 관리
- **Booking Service**: 예약 관리
- **Notify Service**: 알림 발송
- **Search Service**: 검색 기능 (Golang + ElasticSearch)
- **ML Service**: 머신러닝 기반 추천 및 예측 (Python FastAPI)

### BFF (Backend for Frontend)
- **Admin API**: 관리자 대시보드용 BFF
- **User API**: 사용자 앱용 BFF

### Frontend Applications
- **Admin Dashboard**: React + TypeScript + Redux Toolkit
- **User Web App**: React + TypeScript + Recoil

## 🛠️ Technology Stack

### Backend
- **NestJS**: 대부분의 마이크로서비스 및 BFF
- **Golang**: Search Service
- **Python FastAPI**: ML Service
- **PostgreSQL**: 주 데이터베이스
- **ElasticSearch**: 검색 엔진
- **Redis**: 캐시
- **NATS Streaming**: 메시지 브로커

### Frontend
- **React 19.x**: UI 라이브러리
- **TypeScript**: 타입 안전성
- **Redux Toolkit**: 상태관리 (Admin)
- **Recoil**: 상태관리 (User)
- **Tailwind CSS**: 스타일링

### Infrastructure
- **Google Cloud Platform**: 클라우드 인프라
- **Cloud Run**: 컨테이너 오케스트레이션
- **Cloud Build**: CI/CD 파이프라인
- **Terraform**: 인프라 코드화

## 📁 Project Structure

```
parkgolf-platform/
├── .claude/                # Claude Code settings
│   └── CLAUDE.md          # Project guide for Claude Code
├── .devtools/             # Development tools and scripts
│   ├── config/            # Project configurations
│   ├── schemas/           # Common schemas (API, DB, events)
│   ├── types/             # Common TypeScript types
│   ├── scripts/           # Development and deployment scripts
│   └── docs/              # Detailed documentation
├── services/               # 마이크로서비스들
│   ├── auth-service/
│   ├── course-service/
│   ├── booking-service/
│   ├── notify-service/
│   ├── search-service/
│   ├── ml-service/
│   ├── admin-api/
│   ├── user-api/
│   ├── admin-dashboard/
│   └── user-webapp/
└── shared/                 # 공통 설정
    ├── configs/            # 설정 파일
    └── terraform/          # 인프라 코드
```

## 🚀 Getting Started

### 1. 환경 설정
```bash
# 프로젝트 초기화
./.devtools/scripts/setup/init-project.sh

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 값들을 설정
```

### 2. 개발 환경 시작
```bash
# Docker 서비스 시작 (PostgreSQL, ElasticSearch, Redis, NATS)
docker-compose up -d

# 모든 서비스 시작
./.devtools/scripts/development/start-dev.sh
```

### 3. 접속 URL
- Admin Dashboard: http://localhost:3001
- User Web App: http://localhost:3002
- Admin API: http://localhost:3091/api/docs
- User API: http://localhost:3092/api/docs

## 🔧 Development

### 서비스별 개발
각 서비스는 독립적으로 개발할 수 있습니다:

```bash
# 특정 서비스 개발
cd services/auth-service
npm run start:dev

# 테스트 실행
npm run test

# 빌드
npm run build
```

### 데이터베이스 마이그레이션
```bash
cd services/auth-service
npx prisma migrate dev
npx prisma generate
```

## 🚢 Deployment

### Cloud Build를 통한 배포
각 서비스는 `cloudbuild.yaml` 파일을 가지고 있어 GitOps 방식으로 배포됩니다.

```bash
# 특정 서비스 배포
./.claude-workspace/scripts/deployment/deploy-service.sh -s auth-service -e staging
```

### Terraform을 통한 인프라 관리
```bash
cd shared/terraform/environments/prod
terraform init
terraform plan
terraform apply
```

## 📊 Monitoring

### 로그 확인
- Cloud Logging을 통한 중앙 집중식 로그 관리
- 각 서비스별 구조화된 로그

### 메트릭 모니터링
- Cloud Monitoring을 통한 성능 메트릭
- 알림 정책 설정

## 🔐 Security

### 인증 및 권한
- JWT 기반 인증
- 역할 기반 접근 제어 (RBAC)
- API Gateway를 통한 요청 검증

### 네트워크 보안
- VPC를 통한 네트워크 격리
- Cloud Run의 내부 통신 보안

## 📝 API Documentation

각 서비스는 Swagger/OpenAPI 문서를 제공합니다:
- Auth Service: http://localhost:3011/api/docs
- Course Service: http://localhost:3012/api/docs
- Booking Service: http://localhost:3013/api/docs

## 🤝 Contributing

1. 새로운 기능 개발 시 feature 브랜치 생성
2. 코드 스타일 가이드 준수
3. 테스트 코드 작성
4. Pull Request 생성

## 📚 Additional Documentation

- [Migration History](./MIGRATION_HISTORY.md): 프로젝트 구조 변경 이력
- [API Schemas](../schemas/api/): OpenAPI 스키마 정의
- [Database Schemas](../schemas/database/): 데이터베이스 스키마
- [Event Schemas](../schemas/events/): 이벤트 스키마
- [Common Types](../types/typescript/): TypeScript 공통 타입

## 📞 Support

- 이슈 리포팅: GitHub Issues
- 문의사항: admin@parkgolf.com