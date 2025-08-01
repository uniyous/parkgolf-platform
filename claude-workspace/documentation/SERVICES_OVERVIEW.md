# Park Golf Platform - 서비스 개요

## 🏗️ 전체 아키텍처

```
┌─────────────────── Frontend Layer ───────────────────┐
│                                                       │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │ admin-dashboard │    │   user-webapp   │          │
│  │   (React 19)    │    │   (React 19)    │          │
│  │   :3000         │    │    :3002        │          │
│  └─────────────────┘    └─────────────────┘          │
│           │                       │                  │
└───────────┼───────────────────────┼──────────────────┘
            │                       │
┌───────────┼───────────────────────┼──────────────────┐
│           │         BFF Layer     │                  │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │    admin-api    │    │    user-api     │          │
│  │   (NestJS)      │    │   (NestJS)      │          │
│  │   :3091         │    │   :3001         │          │
│  └─────────────────┘    └─────────────────┘          │
└───────────┼───────────────────────┼──────────────────┘
            │                       │
            └───────────┬───────────┘
                        │ NATS Messages
┌───────────────────────┼──────────────────────────────┐
│                 Microservices Layer                  │
│                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│ │auth-service  │ │booking-service│ │course-service│   │
│ │   :3011      │ │    :3013      │ │    :3012     │   │
│ │ JWT + Prisma │ │   Prisma      │ │   Prisma     │   │
│ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│ │notify-service│ │search-service│ │  ml-service  │   │
│ │   :3014      │ │    :3015     │ │    :3016     │   │
│ │   Prisma     │ │ Elasticsearch│ │ Python+Node  │   │
│ └──────────────┘ └──────────────┘ └──────────────┘   │
└──────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────┐
│                Infrastructure                        │
│                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│ │ PostgreSQL   │ │    Redis     │ │     NATS     │   │
│ │   :5432      │ │    :6379     │ │    :4222     │   │
│ │  (Multi-DB)  │ │   (Cache)    │ │ (Messaging)  │   │
│ └──────────────┘ └──────────────┘ └──────────────┘   │
└──────────────────────────────────────────────────────┘
```

## 📋 서비스별 상세 정보

### 🎨 Frontend Services

#### admin-dashboard (Port: 3000)
**상태**: ✅ 95% 완료
**기술스택**: React 18, TypeScript, Tailwind CSS, Redux Toolkit
**주요기능**:
- 타임슬롯 벌크 관리 (생성, 수정, 삭제)
- 스마트 타임슬롯 패턴 생성 (09:00-18:00 자동 생성)
- Enhanced GNB (사용자 드롭다운, 알림센터, 검색)
- 사용자/예약/코스 통합 관리
- 실시간 통계 대시보드
- RBAC 기반 권한 관리 UI

**완료된 페이지**:
- 로그인/로그아웃
- 타임슬롯 관리 (벌크 작업, 필터링, 분석)
- 사용자 관리 (목록, 상세, 수정)
- 예약 관리 (목록, 상세, 취소)
- 코스 관리 (목록, 추가, 수정)
- 관리자 계정 관리

#### user-webapp (Port: 3001)
**상태**: 🚧 70% 완료
**기술스택**: React 18, TypeScript, React Context API
**주요기능**:
- 골프장 검색 및 필터링 (키워드, 날짜, 시간대)
- 타임슬롯 예약 플로우 (검색 → 상세 → 결제 → 완료)
- JWT 기반 사용자 인증 (로그인/회원가입)
- 예약 내역 조회
- 결제 UI (PG 연동 대기)

**완료된 페이지**:
- 로그인/회원가입
- 검색 페이지 (실시간 API 연동)
- 예약 상세 페이지 (플레이어 수, 특별요청)
- 결제 페이지 (UI만, PG 연동 필요)
- 예약 완료 페이지

### 🌐 BFF (Backend for Frontend) Services

#### admin-api (Port: 3091)
**상태**: ✅ 95% 완료
**기술스택**: NestJS, TypeScript, JWT, NATS
**주요기능**:
- 관리자 전용 API 게이트웨이
- RBAC 기반 권한 검증
- 실시간 통계 집계
- 마이크로서비스 오케스트레이션

**API 엔드포인트**:
```
POST   /admin/auth/login          # 관리자 로그인
GET    /admin/users               # 사용자 목록 조회
GET    /admin/bookings            # 예약 관리
GET    /admin/courses             # 코스 관리
GET    /admin/timeslots           # 타임슬롯 벌크 관리
POST   /admin/timeslots/bulk      # 벌크 생성
GET    /admin/analytics/stats     # 통계 데이터
```

#### user-api (Port: 3092)
**상태**: ✅ 100% 완료
**기술스택**: NestJS, TypeScript, JWT, NATS
**주요기능**:
- 사용자 앱 전용 API 게이트웨이
- JWT 토큰 기반 인증
- 예약 플로우 오케스트레이션
- CORS 설정 (포트 3001 허용)

**API 엔드포인트**:
```
POST   /auth/register             # 사용자 회원가입
POST   /auth/login                # 사용자 로그인
GET    /auth/profile              # 프로필 조회
POST   /auth/refresh              # 토큰 갱신

GET    /bookings                  # 내 예약 목록
POST   /bookings                  # 예약 생성
GET    /bookings/:id              # 예약 상세
PUT    /bookings/:id              # 예약 수정
DELETE /bookings/:id              # 예약 취소

GET    /bookings/courses/:id/time-slots  # 타임슬롯 조회
```

### 🔧 Core Microservices

#### auth-service (Port: 3011)
**상태**: ✅ 95% 완료
**기술스택**: NestJS, Prisma, PostgreSQL, JWT, bcrypt
**데이터베이스**: `parkgolf_auth`
**주요기능**:
- 사용자/관리자 통합 인증 관리
- JWT 토큰 발급 및 검증
- RBAC 권한 관리
- 비밀번호 암호화 (bcrypt)

**데이터 모델**:
```prisma
model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  password    String
  name        String
  phoneNumber String?
  birthDate   DateTime?
  role        UserRole  @default(USER)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Admin {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  password    String
  name        String
  role        AdminRole @default(STAFF)
  permissions String[]  # JSON array
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

#### booking-service (Port: 3013)
**상태**: ✅ 100% 완료
**기술스택**: NestJS, Prisma, PostgreSQL, NATS
**데이터베이스**: `parkgolf_booking`
**주요기능**:
- 예약 생성/수정/취소 (트랜잭션 기반)
- 타임슬롯 가용성 실시간 관리
- 예약 히스토리 추적
- 코스 정보 캐싱 (CourseCache)
- 자동 타임슬롯 생성 (09:00-18:00)

**핵심 데이터 모델**:
```prisma
model Booking {
  id            Int           @id @default(autoincrement())
  bookingNumber String        @unique
  userId        Int
  courseId      Int
  courseName    String
  bookingDate   DateTime
  timeSlot      String        # "09:00", "10:00" 형식
  playerCount   Int
  pricePerPerson Decimal      @db.Decimal(10, 2)
  serviceFee    Decimal       @db.Decimal(10, 2)
  totalPrice    Decimal       @db.Decimal(10, 2)
  status        BookingStatus @default(CONFIRMED)
  paymentMethod String?
  specialRequests String?
  // ... 기타 필드
}

model TimeSlotAvailability {
  id          Int      @id @default(autoincrement())
  courseId    Int
  date        DateTime
  timeSlot    String   # "09:00", "10:00"
  maxCapacity Int      @default(4)
  booked      Int      @default(0)
  isAvailable Boolean  @default(true)
  isPremium   Boolean  @default(false)
  price       Decimal  @db.Decimal(10, 2)
  
  @@unique([courseId, date, timeSlot])
}
```

#### course-service (Port: 3012)
**상태**: 🚧 60% 완료
**기술스택**: NestJS, Prisma, PostgreSQL
**데이터베이스**: `parkgolf_course`
**주요기능**:
- 골프장 코스 관리
- 코스 정보 CRUD
- ❗ **미완성**: CourseCache 자동 동기화 (NATS 이벤트)

**데이터 모델**:
```prisma
model Course {
  id          Int      @id @default(autoincrement())
  name        String
  location    String
  description String?
  rating      Float    @default(4.0)
  pricePerHour Int
  imageUrl    String?
  amenities   String[] # 편의시설 배열
  openTime    String   # "09:00"
  closeTime   String   # "18:00"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### notify-service (Port: 3014)
**상태**: 🚧 40% 완료
**기술스택**: NestJS, NATS, 이메일/SMS 연동
**주요기능**:
- 예약 확정/취소 알림 처리
- 이메일/SMS 발송
- 푸시 알림 관리
- ❗ **미완성**: 실제 알림 발송 구현

**이벤트 처리**:
```typescript
@EventPattern('booking.confirmed')
async handleBookingConfirmed(data: BookingConfirmedEvent) {
  // 예약 확정 이메일 발송
}

@EventPattern('booking.cancelled')
async handleBookingCancelled(data: BookingCancelledEvent) {
  // 예약 취소 알림 발송
}
```

#### search-service (Port: 3015)
**상태**: 🚧 30% 완료
**기술스택**: NestJS, Elasticsearch
**주요기능**:
- 골프장 검색 및 필터링
- 검색 결과 랭킹
- ❗ **미완성**: Elasticsearch 인덱싱 자동화

#### ml-service (Port: 3016)
**상태**: ❌ 0% 완료
**기술스택**: NestJS, Python, TensorFlow
**예정기능**:
- 예약 패턴 분석
- 동적 가격 책정
- 사용자 추천 시스템

## 🔄 서비스 간 통신

### NATS 이벤트 메시징
```typescript
// 예약 확정 이벤트
'booking.confirmed' -> notify-service, search-service

// 예약 취소 이벤트  
'booking.cancelled' -> notify-service, course-service

// 코스 정보 변경 이벤트 (구현 예정)
'course.updated' -> booking-service (CourseCache 동기화)
```

### HTTP 통신 (BFF → Microservices)
```typescript
// admin-api → auth-service
POST /auth/admin/login

// user-api → booking-service  
GET /booking/:id

// admin-api → booking-service
GET /booking/analytics
```

## 📊 데이터베이스 구조

### 서비스별 독립 데이터베이스
- `parkgolf_auth`: 사용자/관리자 인증 정보
- `parkgolf_booking`: 예약 및 타임슬롯 데이터
- `parkgolf_course`: 골프장 코스 정보
- `parkgolf_notification`: 알림 로그 및 템플릿

### 데이터 동기화 전략
1. **이벤트 기반**: NATS를 통한 비동기 동기화
2. **캐싱**: CourseCache를 통한 코스 정보 복제
3. **API 호출**: 실시간 데이터 조회 시 직접 호출

## 🚀 배포 환경

### 개발환경 (현재)
- **로컬 개발**: Docker Compose 기반
- **서비스 격리**: 포트 기반 분리
- **데이터베이스**: PostgreSQL 컨테이너

### 프로덕션 환경 (계획)
- **컨테이너화**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **모니터링**: Prometheus + Grafana
- **로깅**: ELK Stack

## 📈 성능 및 확장성

### 현재 성능 특징
- **동시 접속**: 100-500명 (예상)
- **응답시간**: 평균 200ms 이하
- **데이터베이스**: Read/Write 분리 준비됨

### 확장 계획
- **수평 확장**: 서비스별 독립 스케일링
- **캐싱**: Redis 기반 응답 캐싱
- **CDN**: 정적 자원 배포 최적화

---
*업데이트: 2025-07-13*
*버전: v1.0.0*