# Quick Reference - Park Golf Platform

## 🔍 Claude 빠른 참조 가이드

### 서비스 포트 매핑
| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| admin-dashboard | 3000 | Admin UI | ✅ 완료 |
| user-webapp | 3002 | User UI | ⚠️ 부분 |
| admin-api | 3091 | Admin BFF | ✅ 완료 |
| user-api | 3092 | User BFF | ❌ 미완료 |
| auth-service | 3011 | JWT 인증 | ✅ 완료 |
| course-service | 3012 | 코스 관리 | ✅ 완료 |
| booking-service | 3013 | 예약 시스템 | ⚠️ 부분 |
| notify-service | 3014 | 알림 발송 | ✅ 완료 |
| search-service | 3015 | 검색 엔진 | ❌ 미완료 |
| ml-service | 3016 | ML 추천 | ❌ 미완료 |

### 인프라 서비스
| Service | Port | Connection |
|---------|------|------------|
| PostgreSQL | 5432 | postgresql://parkgolf:parkgolf123@localhost:5432/parkgolf |
| Redis | 6379 | redis://:redis123@localhost:6379 |
| NATS | 4222 | nats://localhost:4222 |
| Elasticsearch | 9200 | http://localhost:9200 |

### 중요 파일 위치

#### 설정 파일
```bash
# 환경 변수
claude-workspace/development/environments/.env.development

# 서비스 설정
claude-workspace/shared/configs/project/services.json

# Docker 구성
claude-workspace/development/docker/docker-compose.yml

# 데이터베이스 설정
claude-workspace/shared/configs/database/postgresql.conf
```

#### 스키마 & 타입
```bash
# API 스키마
claude-workspace/shared/schemas/api/common.yaml

# 데이터베이스 스키마
claude-workspace/shared/schemas/database/common.prisma

# TypeScript 타입
claude-workspace/shared/types/typescript/common.types.ts
```

#### 개발 도구
```bash
# 스크립트
claude-workspace/development/scripts/

# 템플릿
claude-workspace/development/templates/

# 테스트 설정
claude-workspace/testing/jest.config.shared.js
```

### 자주 사용하는 명령어

#### 개발 환경
```bash
# 인프라 시작
docker-compose -f claude-workspace/development/docker/docker-compose.yml up -d

# 서비스 시작
cd services/auth-service && npm run start:dev

# 테스트 실행
npm test

# 빌드
npm run build
```

#### 데이터베이스
```bash
# Prisma 마이그레이션
npx prisma migrate dev

# Prisma 스튜디오
npx prisma studio

# DB 초기화
npx prisma migrate reset
```

#### 모니터링
```bash
# 헬스체크
curl http://localhost:3011/health

# 로그 확인
tail -f services/auth-service/auth-service.log

# Docker 로그
docker-compose logs -f postgres
```

### 환경 변수 (주요)

#### 데이터베이스
```bash
DATABASE_URL=postgresql://parkgolf:parkgolf123@localhost:5432/parkgolf
AUTH_DATABASE_URL=postgresql://parkgolf:parkgolf123@localhost:5432/auth_db
COURSE_DATABASE_URL=postgresql://parkgolf:parkgolf123@localhost:5432/course_db
```

#### 메시징 & 캐시
```bash
NATS_URL=nats://localhost:4222
REDIS_URL=redis://:redis123@localhost:6379
```

#### 보안
```bash
JWT_SECRET=dev-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

### 디렉토리 구조 (핵심)

```
claude-workspace/
├── quick-start/           # 🎯 Claude 빠른 시작 (이 폴더)
├── development/           # 🛠️ 개발 도구
│   ├── scripts/          # 자동화 스크립트
│   ├── templates/        # 코드 템플릿
│   ├── environments/     # 환경 설정
│   └── docker/           # Docker 구성
├── shared/               # 🔗 공유 리소스
│   ├── configs/          # 설정 파일
│   ├── schemas/          # 스키마 정의
│   ├── types/            # TypeScript 타입
│   └── utils/            # 유틸리티
├── testing/              # 🧪 테스트 도구
└── operations/           # 📊 운영 도구
    └── monitoring/       # 모니터링
```

### 코딩 표준 (빠른 참조)

#### NestJS 서비스
- **Framework**: NestJS 10.x + TypeScript
- **Database**: Prisma ORM + PostgreSQL
- **Auth**: JWT + Passport
- **Messaging**: NATS
- **Validation**: class-validator + DTO

#### React 프론트엔드
- **Framework**: React 19 + TypeScript
- **State**: Redux Toolkit (Admin) / Recoil (User)
- **Styling**: Tailwind CSS
- **Build**: Vite

#### 공통 규칙
- **Linting**: ESLint + Prettier
- **Testing**: Jest + Supertest
- **Commit**: Conventional Commits
- **API**: OpenAPI 3.0 문서화

### 문제 해결 체크리스트

#### 서비스 시작 안됨
- [ ] 포트 충돌 확인 (`lsof -i :3011`)
- [ ] 환경 변수 확인 (`.env.development`)
- [ ] 데이터베이스 연결 확인
- [ ] 의존성 설치 확인 (`npm install`)

#### 데이터베이스 오류
- [ ] PostgreSQL 컨테이너 실행 상태
- [ ] 마이그레이션 상태 (`npx prisma migrate status`)
- [ ] 연결 문자열 확인
- [ ] 권한 확인

#### 빌드 오류
- [ ] TypeScript 오류 (`npm run build`)
- [ ] 린트 오류 (`npm run lint`)
- [ ] 의존성 버전 충돌
- [ ] 환경 변수 누락

### 유용한 링크

#### 로컬 접속
- Admin Dashboard: http://localhost:3000
- User WebApp: http://localhost:3002
- Admin API Docs: http://localhost:3091/api/docs
- User API Docs: http://localhost:3092/api/docs

#### 문서
- 프로젝트 메인: `/CLAUDE.md`
- API 문서: `claude-workspace/docs/API_DOCUMENTATION.md`
- 개발 가이드: `claude-workspace/docs/DEVELOPMENT_GUIDE.md`
- 서비스 아키텍처: `claude-workspace/docs/SERVICES_OVERVIEW.md`
- DB 스키마: `claude-workspace/docs/DATABASE_SCHEMA.md`

---

**이 참조 가이드로 빠른 개발이 가능합니다! ⚡**