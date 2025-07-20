# Park Golf Platform - Project Context

## 🎯 Quick Overview (5-minute Claude briefing)

**Park Golf Platform**은 마이크로서비스 아키텍처 기반의 통합 골프장 관리 시스템입니다.

### 핵심 정보
- **아키텍처**: 10개 마이크로서비스 + BFF 패턴
- **기술 스택**: NestJS, React 19, PostgreSQL, NATS, Redis
- **개발 상태**: 60% MVP 완료 (2025-01-11 기준)

### 서비스 구조
```
Frontend (2) → BFF (2) → Microservices (6) → Infrastructure (4)
```

**Frontend:**
- admin-dashboard:3000 (React + Redux)
- user-webapp:3002 (React + Recoil)

**BFF (Backend for Frontend):**
- admin-api:3091 (NestJS)
- user-api:3092 (NestJS)

**Microservices:**
- auth-service:3011 (JWT 인증)
- course-service:3012 (코스 관리)
- booking-service:3013 (예약 시스템)
- notify-service:3014 (알림 발송)
- search-service:3015 (검색 엔진)
- ml-service:3016 (ML 추천)

**Infrastructure:**
- PostgreSQL:5432 (각 서비스별 독립 DB)
- Redis:6379 (캐시)
- NATS:4222 (메시징)
- Elasticsearch:9200 (검색)

## 🏗️ 프로젝트 구조

```
parkgolf/
├── 📄 CLAUDE.md                    # 메인 프로젝트 문서
├── 📁 .claude/                     # Claude 설정
├── 📁 claude-workspace/            # 통합 작업공간 ⭐
│   ├── 📁 quick-start/            # 이 폴더 - 빠른 시작
│   ├── 📁 development/            # 개발 도구
│   ├── 📁 shared/                 # 공유 리소스
│   ├── 📁 testing/                # 테스트 도구
│   └── 📁 operations/             # 운영 도구
├── 📁 services/                   # 10개 마이크로서비스
├── 📁 docs/                       # 통합 문서
└── 📁 infrastructure/             # 인프라 코드
```

## 🚀 개발 환경 빠른 시작

### 1. 인프라 시작
```bash
docker-compose -f claude-workspace/development/docker/docker-compose.yml up -d
```

### 2. 서비스 시작
```bash
# 모든 서비스
claude-workspace/development/scripts/start-all-services.sh

# 개별 서비스
cd services/auth-service && npm run start:dev
```

### 3. 접속
- Admin Dashboard: http://localhost:3000
- User WebApp: http://localhost:3002
- API Docs: http://localhost:3091/api/docs

## 🎯 완료된 주요 기능

### ✅ 완료 (2025-01-11)
- **인증 시스템**: JWT + RBAC (40+ 권한)
- **코스 관리**: 골프장, 코스, 홀 관리
- **타임슬롯**: 완전한 CRUD + 벌크 작업
- **알림 시스템**: 이메일/SMS 발송
- **Admin Dashboard**: 관리자 UI (일부 TS 오류)

### ⚠️ 부분 완료
- **예약 시스템**: 기본 API (NATS 연동 필요)
- **User WebApp**: 로그인만 구현

### ❌ 미완료
- **검색 서비스**: Golang 전환 예정
- **ML 서비스**: Python FastAPI 전환 예정
- **User API**: BFF 구현 필요

## 🔥 즉시 해결 필요 (우선순위)

1. **Booking Service** NATS 이벤트 발행
2. **User API** BFF 구현
3. **TypeScript 오류** 해결
4. **서비스 Docker** 빌드 테스트

## 🧠 Claude 작업 팁

### 빠른 분석을 위한 핵심 파일
1. `claude-workspace/quick-start/` - 이 폴더의 모든 파일
2. `claude-workspace/shared/configs/project/services.json` - 서비스 설정
3. `claude-workspace/development/environments/.env.development` - 환경 변수
4. `docs/PROJECT_INDEX.md` - 전체 네비게이션

### 자주 하는 작업
- 새 서비스 추가: `claude-workspace/development/templates/`
- 설정 변경: `claude-workspace/shared/configs/`
- 스키마 확인: `claude-workspace/shared/schemas/`
- 테스트 실행: `claude-workspace/testing/`

### 문제 해결
- Docker 이슈: `claude-workspace/development/docker/`
- 환경 변수: `claude-workspace/development/environments/`
- 모니터링: `claude-workspace/operations/monitoring/`

---

**이 문서만으로도 프로젝트 전체를 파악할 수 있습니다! 🎉**