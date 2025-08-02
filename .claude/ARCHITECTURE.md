# Park Golf Platform - Architecture Overview

## 🏗️ 시스템 아키텍처 (2025-08-01 업데이트)

### 핵심 아키텍처 패턴
- **Microservices Architecture (MSA)**: 10개 서비스 (6개 완성, 4개 개발중)
- **Backend for Frontend (BFF)**: Admin/User 전용 API 게이트웨이
- **Event-Driven Architecture**: NATS 기반 비동기 메시징
- **Domain-Driven Design (DDD)**: 도메인별 서비스 분리
- **RBAC Security**: 계층적 역할 기반 접근 제어

### 통합 기술 스택
- **Backend**: NestJS 10.x + TypeScript 5.x
- **Frontend**: React 19 + TypeScript + Vite 6.x
- **Database**: PostgreSQL 15 + Prisma ORM
- **Messaging**: NATS 2.x JetStream
- **Cache**: Redis 7.x
- **Search**: Elasticsearch 8.x
- **Container**: Docker + Kubernetes
- **CI/CD**: GitHub Actions + GitOps

### 개발 환경 통합
- **claude-workspace**: Claude AI 최적화 통합 작업공간
- **통합 설정**: 환경변수, Docker, 스크립트 중앙화
- **공유 리소스**: 타입, 스키마, 유틸리티 통합 관리

## 📐 서비스 구조

### 1. Frontend Services

#### Admin Dashboard (Port: 3000) ✅ 완성
```
admin-dashboard/
├── src/
│   ├── api/          # API 클라이언트
│   ├── components/   # React 컴포넌트
│   ├── contexts/     # React Context (인증, 상태)
│   ├── hooks/        # Custom Hooks
│   ├── pages/        # 페이지 컴포넌트
│   ├── redux/        # Redux Store
│   └── utils/        # 유틸리티 함수
```

#### User Webapp (Port: 3001) ⚠️ 기초만 구현
```
user-webapp/
├── src/
│   ├── api/          # API 클라이언트
│   ├── components/   # React 컴포넌트
│   ├── contexts/     # React Context
│   └── pages/        # 페이지 컴포넌트
```

### 2. BFF Services (Backend for Frontend)

#### Admin API (Port: 3091) ✅ 완성
- **역할**: 관리자 대시보드를 위한 API Gateway
- **기능**:
  - 마이크로서비스 통합
  - 권한 검증
  - 데이터 집계
  - 응답 최적화

#### User API (Port: 3092) ⚠️ 부분 구현
- **역할**: 사용자 앱을 위한 API Gateway
- **기능**:
  - 사용자 중심 API
  - 데이터 캐싱
  - 성능 최적화

### 3. Core Services

#### Auth Service (Port: 3011) ✅ 완성
```
auth-service/
├── src/
│   ├── auth/         # 인증 로직
│   ├── admin/        # 관리자 관리
│   └── user/         # 사용자 관리
├── prisma/
│   └── schema.prisma # DB 스키마
```

**주요 기능**:
- JWT 토큰 발급/검증
- 사용자/관리자 인증
- RBAC 권한 관리
- 활동 로그 기록

#### Course Service (NATS only) ✅ 완성
```
course-service/
├── src/
│   ├── company/      # 회사 관리
│   └── course/       # 코스/타임슬롯 관리
├── prisma/
│   └── schema.prisma # DB 스키마
```

**주요 기능**:
- 골프장 회사 관리
- 코스 정보 관리
- 타임슬롯 관리
- 주간 스케줄 관리

#### Booking Service (Port: 3013) ✅ 완성
```
booking-service/
├── src/
│   └── booking/      # 예약 관리
├── prisma/
│   └── schema.prisma # DB 스키마
```

**주요 기능**:
- 예약 생성/취소
- 결제 정보 관리
- 타임슬롯 가용성 체크

#### Notify Service (Port: 3014) ✅ 완성
- 알림 템플릿 관리
- 이메일/SMS 발송
- 스케줄링

#### Search Service (Port: 3015) ❌ 미구현
- Elasticsearch 연동
- 전문 검색
- 자동완성

#### ML Service (Port: 4000) ⚠️ 기초만 구현
- 추천 시스템
- 예측 분석
- 데이터 분석

## 🔄 서비스 간 통신

### 1. 동기 통신 (HTTP/REST)
```
Frontend → BFF → Microservices
```
- Frontend는 BFF와만 통신
- BFF는 필요한 마이크로서비스와 통신
- JSON 기반 RESTful API

### 2. 비동기 통신 (NATS)
```
Service A → NATS → Service B
```
- 이벤트 기반 통신
- Pub/Sub 패턴
- Request/Reply 패턴

### 3. 통신 예시

#### 예약 생성 플로우
```
1. User Webapp → User API (HTTP)
   POST /api/bookings

2. User API → NATS
   - booking.create 이벤트 발행

3. Booking Service (NATS 구독)
   - 예약 생성 처리
   - booking.created 이벤트 발행

4. Notify Service (NATS 구독)
   - 예약 확인 이메일 발송

5. Course Service (NATS 구독)
   - 타임슬롯 가용성 업데이트
```

## 🗄️ 데이터베이스 아키텍처

### 1. 서비스별 독립 DB
각 마이크로서비스는 독립적인 PostgreSQL 데이터베이스 사용:
- `parkgolf_auth`: 인증 서비스
- `parkgolf_course`: 코스 서비스
- `parkgolf_booking`: 예약 서비스
- `parkgolf_notify`: 알림 서비스

### 2. 데이터 동기화
- **Event Sourcing**: 이벤트 기반 데이터 동기화
- **CQRS**: 명령과 조회 분리
- **캐시**: Redis를 통한 자주 조회되는 데이터 캐싱

## 🔐 보안 아키텍처

### 1. 인증 (Authentication)
- JWT 기반 토큰 인증
- Access Token (15분) + Refresh Token (7일)
- Token Rotation 정책

### 2. 인가 (Authorization)
- Role-Based Access Control (RBAC)
- 세분화된 권한 시스템
- API 레벨 권한 검증

### 3. 보안 계층
```
1. Frontend: 토큰 저장 (localStorage/Cookie)
2. BFF: 토큰 검증, Rate Limiting
3. Microservices: 서비스 간 인증
4. Database: 연결 암호화, 접근 제어
```

## 🚀 배포 아키텍처

### 1. 컨테이너화
- 각 서비스별 Dockerfile
- Multi-stage 빌드
- Alpine Linux 기반 경량 이미지

### 2. 오케스트레이션
```yaml
Kubernetes 구조:
├── Namespace: parkgolf-prod
├── Deployments (각 서비스별)
├── Services (내부 통신)
├── Ingress (외부 노출)
└── ConfigMaps/Secrets
```

### 3. CI/CD Pipeline
```
1. GitHub Push
2. GitHub Actions 트리거
3. 서비스별 빌드/테스트
4. Docker Image 빌드
5. Google Container Registry 푸시
6. Kubernetes 배포
```

## 📊 모니터링 및 로깅

### 1. 모니터링 (계획)
- Prometheus: 메트릭 수집
- Grafana: 시각화 대시보드
- Alert Manager: 알림

### 2. 로깅 (계획)
- ELK Stack (Elasticsearch, Logstash, Kibana)
- 중앙화된 로그 수집
- 서비스별 로그 분리

### 3. 추적 (계획)
- Jaeger: 분산 추적
- 요청 흐름 추적
- 성능 병목 분석

## 🔧 개발 환경

### 1. 로컬 개발
```bash
# 인프라 시작
docker-compose up -d

# 서비스 시작
npm run dev (각 서비스 디렉토리에서)
```

### 2. 환경 분리
- `local`: 로컬 개발
- `development`: 개발 서버
- `staging`: 스테이징 서버
- `production`: 프로덕션

### 3. 공통 설정
```
shared/
├── configs/      # 공통 설정
├── types/        # TypeScript 타입
└── schemas/      # 공통 스키마
```

## 🎯 아키텍처 원칙

1. **Single Responsibility**: 각 서비스는 하나의 도메인만 담당
2. **Loose Coupling**: 서비스 간 느슨한 결합
3. **High Cohesion**: 관련 기능의 높은 응집도
4. **Fault Tolerance**: 장애 격리 및 복구
5. **Scalability**: 수평적 확장 가능
6. **Observability**: 모니터링 및 추적 가능

## 📋 주요 기술 결정사항

### DEC-001: 마이크로서비스 아키텍처 (2024-05-15)
- **결정**: 모놀리식 대신 MSA 구조 채택
- **이유**: 서비스별 독립적 확장, 팀별 독립 개발/배포
- **결과**: 10개 마이크로서비스 + 2 BFF 구조

### DEC-002: 모노레포 구조 (2024-06-20)
- **결정**: 멀티레포 대신 모노레포 채택
- **이유**: 코드 공유 용이, 의존성 관리 단순화
- **도구**: GitHub Actions workflows

### DEC-003: TypeScript 전체 적용 (2024-05-20)
- **결정**: TypeScript 100% 사용
- **설정**: Strict mode 활성화
- **이유**: 타입 안정성, 개발 생산성 향상

### DEC-004: NATS 메시징 (2024-06-01)
- **선택**: RabbitMQ/Kafka 대신 NATS
- **이유**: 가벼운 footprint, 클라우드 네이티브 친화적
- **패턴**: Event-driven architecture

### DEC-005: React 19 + Vite (2024-07-01)
- **선택**: Next.js 대신 React + Vite
- **이유**: 빠른 개발 서버, 유연한 라우팅
- **상태관리**: Redux Toolkit

### 향후 검토사항
- GraphQL vs REST API (현재 REST)
- Elasticsearch 도입 범위 확대
- 모니터링: Prometheus + Grafana vs Datadog

---

*마지막 업데이트: 2025-08-01*