# Park Golf Platform - Migration History

## 🔄 Project Structure Migration (2025-01-06)

### Previous Structure (parkgolf-* pattern)
```
parkgolf/
├── parkgolf-admin/          # Admin 웹 (React+Redux+Tailwind)
├── parkgolf-admin-api/      # Admin BFF (NestJS)
├── parkgolf-user/           # User 웹 (React+Recoil)
├── parkgolf-user-api/       # User BFF (NestJS) - 미구현
├── parkgolf-auth-service/   # 인증 서비스 (NestJS)
├── parkgolf-course-service/ # 코스 서비스 (NestJS)
├── parkgolf-booking-service/# 예약 서비스 (NestJS) - NATS 미구현
├── parkgolf-notify-service/ # 알림 서비스 (NestJS)
├── parkgolf-search-service/ # 검색 서비스 (NestJS) - 미구현
└── parkgolf-ml-mcp/         # ML/MCP 서비스 - 미구현
```

### New Structure (services/ pattern)
```
parkgolf-platform/
├── .claude/                 # Claude Code settings
├── .devtools/              # Development tools and scripts
├── services/               # All microservices
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
└── shared/                 # Infrastructure configurations
```

## 🚦 Service Status Before Migration

### ✅ Completed Services
1. **parkgolf-auth-service** (port: 3011)
   - JWT 인증, 사용자 관리
   - NATS 큐: `auth-service`
   - 주요 API: login, validate, refresh, users CRUD

2. **parkgolf-course-service** (port: 3012)
   - 골프장, 코스, 홀, 티박스 관리
   - NATS 큐: `course-service`
   - 주요 API: companies, courses, holes, teeboxes, timeslots

3. **parkgolf-notify-service** (port: 3014)
   - 알림 발송, 템플릿 관리
   - NATS 큐: `notify-service`
   - 이벤트: booking.confirmed, booking.cancelled, payment.success

4. **parkgolf-admin-api** (port: 3091)
   - Admin BFF, 모든 서비스와 NATS 통신
   - 인증, 코스, 예약, 알림, 대시보드 컨트롤러

5. **parkgolf-admin** (port: 5173)
   - 관리자 대시보드 웹
   - 로그인, 사용자/코스/예약 관리

### ⚠️ Partially Implemented
1. **parkgolf-booking-service** (port: 3013)
   - 기본 예약 API만 구현
   - ❌ NATS 통합 없음
   - ❌ 이벤트 발행 없음

2. **parkgolf-user** 
   - 로그인 UI만 구현
   - 나머지 기능 미구현

### ❌ Not Implemented
1. **parkgolf-ml-mcp** (port: 4000/4001)
   - 디렉토리 구조만 있음
   - 소스 코드 없음

2. **parkgolf-user-api**
   - 기본 scaffold만 있음
   - BFF 기능 미구현

3. **parkgolf-search-service** (port: 3015)
   - 기본 구조만 있음
   - 검색 로직 미구현

## 🔧 Known Issues Before Migration

### Admin Frontend TypeScript Errors
```bash
# 주요 오류들
- Cannot find name 'Modal' (CourseManagementContainer.tsx:179)
- Cannot find name 'Button' (CourseManagementContainer.tsx:187)
- Property 'data' does not exist on type Table (GolfCompanyCourseList.tsx:195)

# 해결 방법
- Modal, Button 컴포넌트 import 추가 필요
- Table 컴포넌트 props 타입 수정 필요
```

### Service Status (2025-07-04 기준)
```bash
# ✅ 정상 실행 중인 서비스
- parkgolf-postgres (5432) ✅ Docker 컨테이너 실행 중
- parkgolf_nats_streaming (4222, 8222) ✅ Docker 컨테이너 실행 중
- parkgolf-auth-service (3011) ✅ 실행 중, NATS 연결됨
- parkgolf-course-service (3012) ✅ 실행 중, NATS 연결됨  
- parkgolf-booking-service (3013) ✅ 실행 중, NATS 연결됨
- parkgolf-notify-service (3014) ✅ 실행 중, NATS 연결됨
- parkgolf-admin-api (3091) ✅ BFF 서비스 실행 중
- parkgolf-user (3000) ✅ React 앱 실행 중 (로그인 페이지만)

# ⚠️ 문제 있는 서비스
- parkgolf-admin (5173) ⚠️ 빌드 오류 있음 (TypeScript import 누락)

# ❌ 미실행 서비스
- parkgolf-search-service (3015) # 미구현
- parkgolf-user-api (3092) # 미구현  
- parkgolf-ml-mcp (4000/4001) # 기본 구조만 구현됨
```

## 🎯 Migration Benefits

### 1. Unified Structure
- 모든 서비스가 `services/` 하위로 통일
- 명확한 역할 분리 (frontend, backend, infrastructure)

### 2. GitOps Implementation
- 각 서비스에 `cloudbuild.yaml` 추가
- Docker 기반 배포 파이프라인
- 환경별 배포 설정

### 3. Development Tools
- `.devtools/` 폴더로 개발 도구 통합
- 공통 타입 정의 및 스키마 관리
- 자동화된 스크립트

### 4. Infrastructure as Code
- Terraform 모듈로 GCP 인프라 관리
- 환경별 설정 분리
- 확장 가능한 아키텍처

## 📋 Post-Migration TODO

### High Priority
- [ ] Admin Frontend TypeScript 오류 수정
- [ ] 서비스별 Docker 이미지 빌드 테스트
- [ ] 개발 환경 스크립트 검증

### Medium Priority
- [ ] ML Service 구조 변경 (Python FastAPI로 전환)
- [ ] Search Service 구조 변경 (Golang으로 전환)
- [ ] User API 구현

### Low Priority
- [ ] 통합 테스트 시나리오 작성
- [ ] 모니터링 및 로깅 설정
- [ ] CI/CD 파이프라인 구축

## 🔗 Related Documents
- [Project README](.devtools/docs/README.md)
- [API Schemas](.devtools/schemas/api/)
- [Deployment Scripts](.devtools/scripts/deployment/)
- [Development Scripts](.devtools/scripts/development/)