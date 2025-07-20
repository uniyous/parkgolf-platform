# Park Golf Platform - Unified Monorepo

## 🏗️ 아키텍처 개요

Park Golf Platform은 마이크로서비스 아키텍처 기반의 통합 골프장 관리 시스템입니다.
모든 서비스가 단일 모노레포에서 관리되며, GitOps 기반의 CI/CD 파이프라인을 통해 배포됩니다.

### 핵심 특징
- **통합 모노레포**: 모든 MSA 서비스를 단일 저장소에서 관리
- **서비스별 독립 빌드**: GitHub Actions workflows로 선택적 빌드/배포
- **GitOps 최적화**: 각 서비스별 Docker 및 Kubernetes 배포 설정
- **타입 안전성**: TypeScript 기반 전체 스택
- **실시간 통신**: NATS 기반 마이크로서비스 통신

## 📁 프로젝트 구조

```
parkgolf-platform/
├── services/                    # 마이크로서비스들
│   ├── admin-api/              # BFF for admin dashboard (NestJS)
│   ├── admin-dashboard/        # React admin frontend (타임슬롯 관리 포함)
│   ├── auth-service/           # JWT authentication service (NestJS)
│   ├── course-service/         # Course & time slot management (NestJS)
│   ├── booking-service/        # Booking & reservation system (NestJS)
│   ├── notify-service/         # Notification service (NestJS)
│   ├── search-service/         # Search & indexing (NestJS + Elasticsearch)
│   ├── ml-service/             # ML & analytics (Python/Node.js hybrid)
│   ├── user-api/              # User-facing API (NestJS)
│   └── user-webapp/           # User React frontend
├── claude-workspace/           # Claude AI 통합 작업공간
│   ├── quick-start/           # 빠른 시작 가이드
│   ├── development/           # 개발 도구
│   │   ├── scripts/          # 자동화 스크립트
│   │   ├── templates/        # 서비스 템플릿
│   │   ├── environments/     # 환경 설정
│   │   └── docker/           # Docker 설정
│   ├── shared/               # 공유 리소스
│   │   ├── configs/          # 설정 파일들
│   │   ├── schemas/          # 스키마 정의
│   │   ├── types/            # TypeScript 타입
│   │   └── utils/            # 유틸리티 함수
│   ├── testing/              # 테스트 도구
│   ├── operations/           # 운영 도구
│   └── docs/                 # 통합 문서
├── .github/                    # GitHub 설정
│   ├── workflows/             # 서비스별 CI/CD pipelines
│   └── ISSUE_TEMPLATE/        # 이슈 템플릿
└── infrastructure/             # 인프라 코드 (Terraform, K8s manifests)

```

## 🎯 완료된 주요 기능

### ✅ 타임슬롯 관리 시스템 (2024-07-08)
- **완전한 CRUD 작업**: 생성, 읽기, 수정, 삭제
- **고급 기능**: 벌크 작업, 분석 대시보드, 통계 위젯
- **스마트 생성**: 09:00-18:00 자동 타임슬롯 생성 및 반복 패턴
- **실시간 UI**: 로컬 상태 관리 최적화 및 즉시 업데이트
- **필터링**: 코스별, 상태별, 날짜별 고급 필터링

### ✅ Enhanced GNB & Navigation (2024-07-08)
- **사용자 드롭다운**: 프로필, 설정, 로그아웃 통합 메뉴
- **알림 센터**: 실시간 알림 및 읽음 상태 관리
- **계층적 네비게이션**: 그룹별 메뉴, 즐겨찾기, 최근 방문
- **검색 기능**: 통합 검색 및 빠른 액세스
- **반응형 디자인**: 모바일 친화적 UI/UX

### ✅ 통합 모노레포 구조 (2024-07-06)
- **모든 MSA 서비스 통합**: 10개 서비스를 단일 저장소로
- **최적화된 gitignore**: 빌드 아티팩트 자동 제외
- **서비스별 독립성 유지**: 개별 package.json 및 설정

### ✅ BFF 패턴 구현
- **admin-api**: 관리자 대시보드용 통합 API
- **user-api**: 사용자 앱용 통합 API
- **NATS 통신**: 마이크로서비스간 메시징
- **실제 API 연동**: 모든 프론트엔드가 실제 데이터로 작동

## 🚀 빠른 시작

### 전체 개발 환경 실행
```bash
# 인프라 서비스 시작 (PostgreSQL, Redis, NATS)
docker-compose -f claude-workspace/development/docker/docker-compose.yml up -d

# 모든 서비스 시작
./claude-workspace/development/scripts/start-all-services.sh

# 특정 서비스만 시작
./claude-workspace/development/scripts/start-service.sh [service-name]

# Admin Dashboard 접속
# http://localhost:3000
```

### 개별 서비스 개발
```bash
# 서비스 디렉토리로 이동
cd services/[service-name]

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 테스트 실행
npm test

# 빌드
npm run build
```

## 🔧 기술 스택

### Backend Services
- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15 + Prisma ORM
- **Messaging**: NATS 2.x
- **Cache**: Redis 7.x
- **Authentication**: JWT + Passport

### Frontend Services
- **Framework**: React 19.x
- **Language**: TypeScript 5.x
- **State Management**: Redux Toolkit / Recoil
- **UI Library**: Tailwind CSS 4.x
- **Build Tool**: Vite 6.x

### Infrastructure
- **Container**: Docker & Docker Compose
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Cloud**: Google Cloud Platform
- **Monitoring**: Prometheus + Grafana

## 📋 서비스별 포트 매핑

| Service | Development Port | Description |
|---------|-----------------|-------------|
| admin-api | 3091 | Admin BFF API |
| admin-dashboard | 3000 | Admin React App |
| auth-service | 3011 | Authentication Service |
| course-service | 3012 | Course Management |
| booking-service | 3013 | Booking System |
| notify-service | 3014 | Notification Service |
| search-service | 3015 | Search Service |
| ml-service | 3016 | ML & Analytics |
| user-api | 3001 | User BFF API |
| user-webapp | 3002 | User React App |

## 🔐 환경 설정

각 서비스는 자체 `.env.development` 파일을 가지고 있으며, 
루트의 `.env.development`에서 공통 설정을 관리합니다.

주요 환경 변수:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `REDIS_URL`: Redis 연결 문자열
- `NATS_URL`: NATS 서버 URL
- `JWT_SECRET`: JWT 서명 키
- `NODE_ENV`: 실행 환경

## 📚 추가 문서

- [Claude 워크스페이스 가이드](./claude-workspace/README.md)
- [개발 가이드](./claude-workspace/docs/DEVELOPMENT_GUIDE.md)
- [API 문서](./claude-workspace/docs/API_DOCUMENTATION.md)
- [서비스 아키텍처](./claude-workspace/docs/SERVICES_OVERVIEW.md)

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Generated by Claude Assistant on 2024-07-06