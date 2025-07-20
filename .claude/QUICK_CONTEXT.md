# Park Golf Platform - Quick Context

## 🎯 5분 프로젝트 파악 (Claude용)

**Park Golf Platform**은 마이크로서비스 아키텍처 기반의 통합 골프장 관리 시스템입니다.

### 📊 현재 상태 (2025-01-11)
- **진행률**: 60% MVP 완료
- **아키텍처**: 10개 마이크로서비스 + BFF 패턴
- **기술스택**: NestJS, React 19, PostgreSQL, NATS, Redis

### 🏗️ 서비스 구조
```
Frontend (2) → BFF (2) → Microservices (6) → Infrastructure (4)
```

**Frontend Services:**
- admin-dashboard:3000 (React + Redux) - ✅ 완료
- user-webapp:3002 (React + Recoil) - ⚠️ 부분완료

**BFF Services:**
- admin-api:3091 (NestJS) - ✅ 완료
- user-api:3092 (NestJS) - ❌ 미완료

**Microservices:**
- auth-service:3011 (JWT 인증) - ✅ 완료
- course-service:3012 (코스 관리) - ✅ 완료
- booking-service:3013 (예약 시스템) - ⚠️ 부분완료
- notify-service:3014 (알림 발송) - ✅ 완료
- search-service:3015 (검색 엔진) - ❌ 미완료
- ml-service:3016 (ML 추천) - ❌ 미완료

### 🚀 개발 환경 빠른 시작
```bash
# 1. 인프라 시작
docker-compose -f claude-workspace/development/docker/docker-compose.yml up -d

# 2. 서비스 시작
cd services/auth-service && npm run start:dev

# 3. 접속
open http://localhost:3000  # Admin Dashboard
```

### 🔥 즉시 해결 필요사항
1. **Booking Service** NATS 이벤트 발행 구현
2. **User API** BFF 구현 시작
3. **TypeScript 오류** 해결 (admin-dashboard)
4. **서비스 Docker** 빌드 테스트

### 📁 핵심 워크스페이스
- **claude-workspace/quick-start/** - 빠른 시작 가이드
- **claude-workspace/docs/** - 기술 문서 통합
- **claude-workspace/development/** - 개발 도구
- **claude-workspace/shared/** - 공통 리소스

### 🧠 Claude 작업 팁
1. **프로젝트 파악**: `claude-workspace/quick-start/PROJECT_CONTEXT.md`
2. **자주 하는 작업**: `claude-workspace/quick-start/COMMON_TASKS.md`
3. **빠른 참조**: `claude-workspace/quick-start/QUICK_REFERENCE.md`
4. **API 문서**: `claude-workspace/docs/API_DOCUMENTATION.md`
5. **DB 스키마**: `claude-workspace/docs/DATABASE_SCHEMA.md`

---

**이 문서로 프로젝트 전체를 5분 내 파악 가능! 🎯**