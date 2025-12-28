# 프로젝트 구조 가이드

이 문서는 parkgolf 프로젝트의 전체 구조와 각 컴포넌트의 역할을 정의합니다.

## 목차
1. [전체 아키텍처](#전체-아키텍처)
2. [디렉토리 구조](#디렉토리-구조)
3. [서비스 개요](#서비스-개요)
4. [BFF 서비스](#bff-서비스)
5. [Microservices](#microservices)
6. [공통 구성요소](#공통-구성요소)
7. [인프라 구성](#인프라-구성)

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│     ┌──────────────┐                    ┌──────────────┐        │
│     │  Admin Web   │                    │  User Mobile │        │
│     │   (React)    │                    │   (React)    │        │
│     └──────┬───────┘                    └──────┬───────┘        │
└────────────┼────────────────────────────────────┼───────────────┘
             │                                    │
             ▼                                    ▼
┌────────────────────────────────────────────────────────────────┐
│                    GCP Cloud Run (BFF Layer)                    │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │     admin-api       │      │      user-api       │          │
│  │   (NestJS BFF)      │      │   (NestJS BFF)      │          │
│  └──────────┬──────────┘      └──────────┬──────────┘          │
└─────────────┼────────────────────────────┼─────────────────────┘
              │                            │
              └────────────┬───────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GCP Compute Engine                            │
│                    ┌─────────────┐                               │
│                    │ NATS Server │                               │
│                    │   (4222)    │                               │
│                    └──────┬──────┘                               │
│                           │                                      │
│    ┌──────────────────────┼───────────────────────┐              │
│    │                      │                       │              │
│    ▼                      ▼                       ▼              │
│ ┌───────────┐      ┌─────────────┐       ┌──────────────┐       │
│ │auth-service│      │course-service│      │booking-service│      │
│ └───────────┘      └─────────────┘       └──────────────┘       │
│                                                                  │
│                    ┌───────────────┐                             │
│                    │   PostgreSQL  │                             │
│                    │   (Docker)    │                             │
│                    └───────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 디렉토리 구조

```
parkgolf/
├── .claude/                    # Claude Code 설정
│   ├── settings.json           # 프로젝트 설정
│   └── skills/                 # Skills 정의
│       ├── development/        # 개발 관련 Skills
│       ├── testing/            # 테스팅 Skills
│       ├── deployment/         # 배포 Skills
│       └── operations/         # 운영 Skills
│
├── services/                   # 모든 서비스
│   ├── admin-api/              # 관리자 BFF API
│   ├── user-api/               # 사용자 BFF API
│   ├── auth-service/           # 인증 Microservice
│   ├── course-service/         # 코스/게임 Microservice
│   └── booking-service/        # 예약 Microservice
│
├── web/                        # 웹 클라이언트
│   ├── admin/                  # 관리자 웹 (React)
│   └── user/                   # 사용자 웹 (React)
│
├── deploy/                     # 배포 설정 및 가이드
│   ├── DEPLOYMENT_GUIDE.md
│   ├── ENVIRONMENT_SETUP.md
│   └── GCP_INFRASTRUCTURE.md
│
├── docs/                       # 프로젝트 문서
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
│
├── docker/                     # Docker 설정 (선택적)
├── scripts/                    # 유틸리티 스크립트
└── package.json                # 루트 패키지 (워크스페이스)
```

---

## 서비스 개요

### 서비스 목록

| 서비스 | 타입 | 포트 | 역할 |
|--------|------|------|------|
| admin-api | BFF | 3001 | 관리자 HTTP API |
| user-api | BFF | 3002 | 사용자 HTTP API |
| auth-service | Microservice | - | 인증/권한 관리 |
| course-service | Microservice | - | 클럽/코스/게임 관리 |
| booking-service | Microservice | - | 예약 관리 |

### 서비스 간 통신

```
HTTP Request → BFF API → NATS Message → Microservice → Database
                ↓
            Response ← NATS Response ←
```

---

## BFF 서비스

### 공통 구조

```
services/{bff-name}/
├── src/
│   ├── main.ts                 # 앱 진입점
│   ├── app.module.ts           # 루트 모듈
│   │
│   ├── common/                 # 공통 모듈
│   │   ├── nats/               # NATS 클라이언트
│   │   │   ├── nats-client.module.ts
│   │   │   ├── nats-client.service.ts
│   │   │   ├── nats-config.service.ts
│   │   │   └── index.ts
│   │   ├── middleware/         # 미들웨어
│   │   │   └── auth.middleware.ts
│   │   └── guards/             # 가드
│   │       └── auth.guard.ts
│   │
│   ├── {domain}/               # 도메인별 모듈
│   │   ├── {domain}.module.ts
│   │   ├── {domain}.controller.ts
│   │   └── {domain}.service.ts
│   │
│   └── health/                 # 헬스체크
│       ├── health.module.ts
│       └── health.controller.ts
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### admin-api 구조

```
services/admin-api/src/
├── auth/                       # 관리자 인증
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   └── auth.service.ts
├── clubs/                      # 클럽 관리
├── courses/                    # 코스 관리
├── games/                      # 게임 관리
│   ├── games.module.ts
│   ├── games.controller.ts
│   └── games.service.ts
├── bookings/                   # 예약 관리 (관리자용)
└── users/                      # 사용자 관리
```

### user-api 구조

```
services/user-api/src/
├── auth/                       # 사용자 인증
├── games/                      # 게임 조회 (사용자용)
├── bookings/                   # 예약 (사용자용)
├── profile/                    # 프로필 관리
└── timeslots/                  # 타임슬롯 조회
```

---

## Microservices

### 공통 구조

```
services/{service-name}/
├── src/
│   ├── main.ts                 # 마이크로서비스 진입점
│   ├── app.module.ts           # 루트 모듈
│   │
│   ├── {domain}/               # 도메인별 모듈
│   │   ├── {domain}.module.ts
│   │   ├── controller/
│   │   │   └── {domain}.controller.ts
│   │   ├── service/
│   │   │   └── {domain}.service.ts
│   │   └── dto/
│   │       └── {domain}.dto.ts
│   │
│   └── prisma/                 # Prisma 설정
│       ├── prisma.module.ts
│       └── prisma.service.ts
│
├── prisma/
│   └── schema.prisma           # DB 스키마
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

### auth-service 구조

```
services/auth-service/
├── src/
│   ├── admin/                  # 관리자 인증
│   │   ├── admin.module.ts
│   │   ├── controller/admin.controller.ts
│   │   ├── service/admin.service.ts
│   │   └── dto/admin.dto.ts
│   │
│   └── user/                   # 사용자 인증
│       ├── user.module.ts
│       ├── controller/user.controller.ts
│       ├── service/user.service.ts
│       └── dto/user.dto.ts
│
└── prisma/
    └── schema.prisma           # Admin, User 테이블
```

### course-service 구조

```
services/course-service/
├── src/
│   ├── club/                   # 클럽 도메인
│   │   ├── club.module.ts
│   │   ├── controller/club.controller.ts
│   │   ├── service/club.service.ts
│   │   └── dto/club.dto.ts
│   │
│   ├── course/                 # 코스 도메인
│   │   ├── course.module.ts
│   │   ├── controller/course.controller.ts
│   │   ├── service/course.service.ts
│   │   └── dto/course.dto.ts
│   │
│   └── game/                   # 게임 도메인
│       ├── game.module.ts
│       ├── controller/
│       │   ├── game.controller.ts
│       │   ├── game-weekly-schedule.controller.ts
│       │   └── game-time-slot.controller.ts
│       ├── service/
│       │   ├── game.service.ts
│       │   ├── game-weekly-schedule.service.ts
│       │   └── game-time-slot.service.ts
│       └── dto/
│           ├── game.dto.ts
│           ├── game-weekly-schedule.dto.ts
│           └── game-time-slot.dto.ts
│
└── prisma/
    └── schema.prisma           # Club, Course, Game, GameWeeklySchedule, GameTimeSlot
```

### booking-service 구조

```
services/booking-service/
├── src/
│   ├── booking/                # 예약 도메인
│   │   ├── booking.module.ts
│   │   ├── controller/booking.controller.ts
│   │   ├── service/booking.service.ts
│   │   └── dto/booking.dto.ts
│   │
│   └── timeslot/               # 타임슬롯 캐시 (읽기 전용)
│       ├── timeslot.module.ts
│       └── service/timeslot-cache.service.ts
│
└── prisma/
    └── schema.prisma           # Booking, GameCache, GameTimeSlotCache
```

---

## 공통 구성요소

### Prisma 서비스

모든 Microservice에서 동일한 패턴 사용:

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### NATS 클라이언트 (BFF용)

```typescript
// common/nats/index.ts
export * from './nats-client.module';
export * from './nats-client.service';
export * from './nats-config.service';
export * from './nats-timeouts';
```

### 헬스체크

```typescript
// health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
```

---

## 인프라 구성

### 환경별 배포

| 환경 | BFF 배포 | Microservice 배포 | 데이터베이스 |
|------|----------|-------------------|-------------|
| Local | localhost | localhost | Docker PostgreSQL |
| Dev | Cloud Run | GCE Docker | GCE PostgreSQL |
| Staging | Cloud Run | GKE | Cloud SQL |
| Prod | Cloud Run | GKE | Cloud SQL |

### GCP 리소스

```
parkgolf-uniyous (Project)
├── Cloud Run
│   ├── admin-api
│   └── user-api
│
├── Compute Engine
│   └── parkgolf-nats-dev
│       ├── NATS Server (Docker)
│       ├── PostgreSQL (Docker)
│       ├── auth-service (Docker)
│       ├── course-service (Docker)
│       └── booking-service (Docker)
│
├── Container Registry / Artifact Registry
│   └── Docker Images
│
└── Secret Manager
    └── 환경변수, 인증 정보
```

### 데이터베이스 구조

```
parkgolf-postgres (Docker Container)
├── parkgolf_auth       # auth-service DB
│   ├── admins
│   └── users
│
├── parkgolf_course     # course-service DB
│   ├── clubs
│   ├── courses
│   ├── games
│   ├── game_weekly_schedules
│   └── game_time_slots
│
└── parkgolf_booking    # booking-service DB
    ├── bookings
    ├── game_cache          # 읽기 전용 캐시
    └── game_time_slot_cache # 읽기 전용 캐시
```

---

## 새 서비스 추가 가이드

### 1. Microservice 추가

```bash
# 1. 서비스 디렉토리 생성
mkdir -p services/new-service/src

# 2. NestJS 프로젝트 초기화
cd services/new-service
npm init -y
npm install @nestjs/core @nestjs/common @nestjs/microservices nats

# 3. Prisma 설정 (필요시)
npm install @prisma/client
npx prisma init
```

### 2. BFF에 새 도메인 추가

```bash
# services/admin-api/src/new-domain/
mkdir -p services/admin-api/src/new-domain

# 필요한 파일 생성
# - new-domain.module.ts
# - new-domain.controller.ts
# - new-domain.service.ts
```

### 3. NATS 패턴 등록

```typescript
// Microservice: controller에서 @MessagePattern 추가
@MessagePattern('newDomain.list')
async findAll(@Payload() data: any) { ... }

// BFF: service에서 natsClient.send 호출
await this.natsClient.send('newDomain.list', params);
```

---

## 참고 문서

- [NestJS 코딩 컨벤션](./../nestjs-conventions/SKILL.md)
- [NATS 메시징 패턴](./../nats-patterns/SKILL.md)
- [배포 가이드](../../../../deploy/DEPLOYMENT_GUIDE.md)
- [아키텍처 문서](../../../../docs/ARCHITECTURE.md)
