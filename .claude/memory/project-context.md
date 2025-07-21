# Park Golf Platform - 프로젝트 전체 컨텍스트

## 📊 프로젝트 개요

**Park Golf Platform**은 마이크로서비스 아키텍처 기반의 통합 골프장 관리 시스템입니다.

### 핵심 특징
- **통합 모노레포**: 모든 MSA 서비스를 단일 저장소에서 관리
- **BFF 패턴**: Frontend별 최적화된 API 제공
- **NATS 통신**: 마이크로서비스 간 메시징
- **TypeScript 기반**: 전체 스택 타입 안전성
- **Claude 최적화**: AI 친화적 개발 환경

## 🏗️ 아키텍처 구조

### 서비스 레이어
```
Frontend (2개)          BFF (2개)           Microservices (6개)
├── admin-dashboard  →  ├── admin-api   →   ├── auth-service
└── user-webapp     →  └── user-api    →   ├── course-service
                                           ├── booking-service
                                           ├── notify-service
                                           ├── search-service
                                           └── ml-service
```

### 통신 패턴
- **Frontend ↔ BFF**: HTTP REST API
- **BFF ↔ Microservices**: NATS Request-Reply
- **Microservices ↔ Microservices**: NATS Events

### 데이터 저장소
- **PostgreSQL**: 주요 데이터 (멀티 데이터베이스)
- **Redis**: 캐시 및 세션
- **ElasticSearch**: 검색 인덱스

## 🎯 핵심 도메인

### 1. 인증/권한 (auth-service)
- 사용자/관리자 인증
- JWT 토큰 관리
- 데이터베이스 기반 역할/권한 시스템
- 세밀한 권한 제어

### 2. 골프장 관리 (course-service)
- 골프장 회사 관리
- 코스 및 홀 관리
- 타임슬롯 생성 및 관리
- 주간 스케줄 관리

### 3. 예약 시스템 (booking-service)
- 예약 생성 및 관리
- 결제 연동
- 가용성 관리
- 예약 이력 추적

### 4. 알림 시스템 (notify-service)
- 이메일/SMS 알림
- 템플릿 관리
- 예약 관련 자동 알림

## 🔧 기술 스택

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15 + Prisma ORM
- **Messaging**: NATS 2.x
- **Cache**: Redis 7.x
- **Search**: ElasticSearch 8.x

### Frontend
- **Framework**: React 19.x
- **Language**: TypeScript 5.x
- **State Management**: Redux Toolkit / Recoil
- **UI**: Tailwind CSS 4.x
- **Build**: Vite 6.x

### Infrastructure
- **Container**: Docker & Docker Compose
- **Orchestration**: Kubernetes
- **Cloud**: Google Cloud Platform
- **CI/CD**: GitHub Actions

## 📋 포트 매핑

| Service | Port | Type | Description |
|---------|------|------|-------------|
| admin-dashboard | 3000 | Frontend | 관리자 대시보드 |
| user-webapp | 3001 | Frontend | 사용자 웹앱 |
| admin-api | 3091 | BFF | 관리자 API |
| user-api | 3092 | BFF | 사용자 API |
| auth-service | 3011 | Microservice | 인증 서비스 |
| course-service | 3012 | Microservice | 골프장 서비스 |
| booking-service | 3013 | Microservice | 예약 서비스 |
| notify-service | 3014 | Microservice | 알림 서비스 |
| search-service | 3015 | Microservice | 검색 서비스 |
| ml-service | 3016 | Microservice | ML 서비스 |

## 🗂️ 프로젝트 구조

```
parkgolf-platform/
├── .claude/                   # Claude AI 메모리/설정
├── claude-workspace/          # 통합 관리 허브
│   ├── management/           # 프로젝트 관리
│   ├── standards/            # 표준/가이드라인
│   ├── development/          # 개발 도구
│   ├── documentation/        # 통합 문서
│   ├── operations/           # 운영 관리
│   └── integrations/         # 외부 연동
└── services/                  # 실제 서비스들
    ├── admin-dashboard/       # React 관리자 앱
    ├── user-webapp/          # React 사용자 앱
    ├── admin-api/            # 관리자 BFF
    ├── user-api/             # 사용자 BFF
    ├── auth-service/         # 인증 마이크로서비스
    ├── course-service/       # 골프장 마이크로서비스
    ├── booking-service/      # 예약 마이크로서비스
    ├── notify-service/       # 알림 마이크로서비스
    ├── search-service/       # 검색 마이크로서비스
    └── ml-service/           # ML 마이크로서비스
```

## ✅ 완료된 주요 기능

### 인증 시스템
- JWT 기반 인증
- 데이터베이스 기반 역할/권한
- 관리자/사용자 분리

### 골프장 관리
- 계층적 데이터 구조 (Company → Course → Hole)
- 타임슬롯 생성 및 관리
- 주간 스케줄 패턴

### 예약 시스템
- 트랜잭션 기반 예약
- 가용성 실시간 체크
- 결제 상태 관리

### 통합 관리
- 서비스 통합 실행/종료 스크립트
- Docker 기반 인프라
- NATS 기반 서비스 통신

## 🎯 개발 워크플로우

### 일반적인 개발 흐름
1. **환경 설정**: Docker 인프라 실행
2. **서비스 시작**: `./start-services.sh`
3. **개발 작업**: 기능 구현/수정
4. **테스트**: 단위/통합 테스트
5. **서비스 종료**: `./stop-services.sh`

### 새 기능 개발
1. **설계**: 아키텍처 패턴 확인
2. **API 설계**: BFF → Microservice 통신
3. **구현**: Backend → Frontend 순서
4. **통합**: NATS 이벤트 연동
5. **테스트**: E2E 테스트

## 🔄 최근 주요 변경사항

### 2025-01-21: 폴더 구조 대규모 개편
- claude-workspace 새로운 구조로 재편성
- 통합 관리 허브로 중앙집중화
- 중복 파일 제거 및 단일 진실 공급원 확립

### 이전 완성 기능
- 타임슬롯 관리 시스템 (2024-07-08)
- Enhanced GNB & Navigation (2024-07-08) 
- 통합 모노레포 구조 (2024-07-06)
- BFF 패턴 구현

## 🎯 향후 계획

### 단기 목표
- 통합 문서 체계 완성
- 개발 자동화 도구 구축
- 배포 파이프라인 완성

### 중장기 목표
- 성능 최적화
- 모니터링 대시보드
- 멀티 테넌트 지원

---

**Last Updated**: 2025-01-21
**Version**: 1.0.0
**Status**: Active Development