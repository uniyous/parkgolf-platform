# Auth Service

인증 및 권한 관리를 담당하는 마이크로서비스

## 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | auth-service |
| 포트 | 3000 (HTTP), NATS |
| 프레임워크 | NestJS |
| 데이터베이스 | PostgreSQL (Cloud SQL) |
| ORM | Prisma |

## 주요 기능

- 사용자(User) 인증 및 관리
- 관리자(Admin) 인증 및 관리
- JWT 토큰 발급 및 검증
- 역할(Role) 기반 권한 관리
- 리프레시 토큰 관리
- 관리자 활동 로그

---

## 데이터베이스 스키마

### ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    %% 사용자 관련
    User ||--o{ RefreshToken : has
    User }o--|| RoleMaster : has

    User {
        int id PK
        string email UK
        string password
        string name
        string roleCode FK
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    RefreshToken {
        int id PK
        string token UK
        int userId FK
        datetime expiresAt
        datetime createdAt
    }

    %% 관리자 관련
    Admin ||--o{ AdminRefreshToken : has
    Admin ||--o{ AdminActivityLog : has
    Admin }o--|| RoleMaster : has

    Admin {
        int id PK
        string email UK
        string password
        string name
        string roleCode FK
        string phone
        string department
        string description
        boolean isActive
        datetime lastLoginAt
        datetime createdAt
        datetime updatedAt
    }

    AdminRefreshToken {
        int id PK
        string token UK
        int adminId FK
        datetime expiresAt
        datetime createdAt
    }

    AdminActivityLog {
        int id PK
        int adminId FK
        string action
        string resource
        json details
        string ipAddress
        string userAgent
        datetime createdAt
    }

    %% 역할/권한 관련
    RoleMaster ||--o{ RolePermission : has
    PermissionMaster ||--o{ RolePermission : has

    RoleMaster {
        string code PK
        string name
        string description
        string userType
        int level
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    PermissionMaster {
        string code PK
        string name
        string description
        string category
        string level
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    RolePermission {
        string roleCode PK_FK
        string permissionCode PK_FK
        datetime createdAt
    }
```

### 테이블 목록 (9개)

| 테이블명 | 설명 | 주요 컬럼 |
|----------|------|-----------|
| `users` | 앱 사용자 | id, email, password, name, roleCode |
| `admins` | 관리자 | id, email, password, name, roleCode, phone, department |
| `role_masters` | 역할 정의 | code, name, userType, level |
| `permission_masters` | 권한 정의 | code, name, category, level |
| `role_permissions` | 역할-권한 매핑 | roleCode, permissionCode |
| `refresh_tokens` | User 리프레시 토큰 | id, token, userId, expiresAt |
| `admin_refresh_tokens` | Admin 리프레시 토큰 | id, token, adminId, expiresAt |
| `admin_activity_logs` | 관리자 활동 로그 | id, adminId, action, resource, details |

---

## 역할 및 권한 구조

### 역할 (Roles) - 8개

#### 관리자 역할 (5개)

| 코드 | 이름 | 레벨 | 설명 |
|------|------|------|------|
| `ADMIN` | 시스템 관리자 | 100 | 전체 시스템 관리 권한 |
| `SUPPORT` | 고객지원 | 80 | 고객지원 및 분석 담당 |
| `MANAGER` | 운영 관리자 | 60 | 회사/코스 운영 관리 |
| `STAFF` | 현장 직원 | 40 | 현장 운영 담당 |
| `VIEWER` | 조회 전용 | 20 | 데이터 조회만 가능 |

#### 사용자 역할 (3개)

| 코드 | 이름 | 레벨 | 설명 |
|------|------|------|------|
| `PREMIUM` | 프리미엄 회원 | 30 | 프리미엄 기능 이용 가능 |
| `USER` | 일반 회원 | 20 | 일반 사용자 |
| `GUEST` | 게스트 | 10 | 조회만 가능한 게스트 |

### 권한 (Permissions) - 18개

#### 관리자 권한 (10개)

| 코드 | 이름 | 카테고리 | 레벨 | 설명 |
|------|------|----------|------|------|
| `ALL` | 전체 권한 | ADMIN | high | 모든 기능 접근 가능 |
| `COMPANIES` | 회사 관리 | ADMIN | high | 회사 생성/수정/삭제 |
| `COURSES` | 코스 관리 | ADMIN | medium | 코스 생성/수정/삭제 |
| `TIMESLOTS` | 타임슬롯 관리 | ADMIN | medium | 타임슬롯 생성/수정/삭제 |
| `BOOKINGS` | 예약 관리 | ADMIN | medium | 예약 생성/수정/취소 |
| `USERS` | 사용자 관리 | ADMIN | medium | 사용자 계정 관리 |
| `ADMINS` | 관리자 관리 | ADMIN | high | 관리자 계정 관리 |
| `ANALYTICS` | 분석/리포트 | ADMIN | low | 통계 및 리포트 조회 |
| `SUPPORT` | 고객 지원 | ADMIN | low | 고객 응대 및 지원 |
| `VIEW` | 조회 | ADMIN | low | 데이터 조회만 가능 |

#### 사용자 권한 (8개)

| 코드 | 이름 | 카테고리 | 레벨 | 설명 |
|------|------|----------|------|------|
| `PROFILE` | 프로필 관리 | USER | low | 프로필 조회 및 수정 |
| `COURSE_VIEW` | 코스 조회 | USER | low | 골프장/코스/타임슬롯 조회 |
| `BOOKING_VIEW` | 예약 조회 | USER | low | 내 예약 조회 및 이력 |
| `BOOKING_MANAGE` | 예약 관리 | USER | low | 예약 생성/수정/취소 |
| `PAYMENT` | 결제/환불 | USER | low | 결제 조회 및 환불 요청 |
| `PREMIUM_BOOKING` | 프리미엄 예약 | USER | medium | 프리미엄 타임슬롯 예약 |
| `PRIORITY_BOOKING` | 우선 예약 | USER | medium | 우선 예약권 |
| `ADVANCED_SEARCH` | 고급 검색 | USER | medium | 고급 검색 필터 |

### 역할별 권한 매핑

#### 관리자 역할

```
ADMIN   → [ALL]
SUPPORT → [BOOKINGS, USERS, ANALYTICS, SUPPORT, VIEW]
MANAGER → [COMPANIES, COURSES, TIMESLOTS, BOOKINGS, USERS, ADMINS, ANALYTICS, VIEW]
STAFF   → [TIMESLOTS, BOOKINGS, SUPPORT, VIEW]
VIEWER  → [VIEW]
```

#### 사용자 역할

```
PREMIUM → [PROFILE, COURSE_VIEW, BOOKING_VIEW, BOOKING_MANAGE, PAYMENT,
           PREMIUM_BOOKING, PRIORITY_BOOKING, ADVANCED_SEARCH]
USER    → [PROFILE, COURSE_VIEW, BOOKING_VIEW, BOOKING_MANAGE, PAYMENT]
GUEST   → [COURSE_VIEW]
```

---

## API 엔드포인트

### HTTP API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/admin/login` | 관리자 로그인 |
| POST | `/auth/user/login` | 사용자 로그인 |
| POST | `/auth/refresh` | 토큰 갱신 |
| GET | `/auth/profile` | 내 프로필 조회 |
| GET | `/health` | 헬스체크 |

### NATS Message Patterns

#### 관리자 (Admin)

| Pattern | 설명 |
|---------|------|
| `admins.list` | 관리자 목록 조회 |
| `admins.get` | 관리자 상세 조회 |
| `admins.create` | 관리자 생성 |
| `admins.update` | 관리자 수정 |
| `admins.delete` | 관리자 삭제 |
| `admins.stats` | 관리자 통계 |
| `admins.updatePermissions` | 권한 수정 (deprecated) |
| `permissions.list` | 권한 목록 조회 |
| `roles.list` | 역할 목록 조회 |
| `roles.permissions` | 역할별 권한 조회 |

#### 사용자 (User)

| Pattern | 설명 |
|---------|------|
| `users.list` | 사용자 목록 조회 |
| `users.get` | 사용자 상세 조회 |
| `users.create` | 사용자 생성 |
| `users.update` | 사용자 수정 |
| `users.delete` | 사용자 삭제 |
| `users.updateRole` | 역할 변경 |
| `users.updatePermissions` | 권한 수정 (deprecated) |

---

## 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 URL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT 서명 키 | `your-secret-key` |
| `JWT_EXPIRES_IN` | Access Token 만료 시간 | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 만료 시간 | `7d` |
| `NATS_URL` | NATS 서버 URL | `nats://localhost:4222` |

---

## 테스트 계정

### 관리자 계정

| 이메일 | 비밀번호 | 역할 | 설명 |
|--------|----------|------|------|
| admin@parkgolf.com | admin123!@# | ADMIN | 시스템 관리자 |
| support@parkgolf.com | admin123!@# | SUPPORT | 고객지원 담당 |
| manager@gangnam-golf.com | admin123!@# | MANAGER | 강남 운영 관리자 |
| staff@gangnam-golf.com | admin123!@# | STAFF | 강남 현장 직원 |
| manager@busan-golf.com | admin123!@# | MANAGER | 부산 운영 관리자 |
| viewer@parkgolf.com | admin123!@# | VIEWER | 조회 전용 |

### 사용자 계정

| 이메일 | 비밀번호 | 역할 | 설명 |
|--------|----------|------|------|
| premium@test.com | user123!@# | PREMIUM | 프리미엄 회원 |
| user1@test.com | user123!@# | USER | 일반 회원 |
| user2@test.com | user123!@# | USER | 일반 회원 |
| guest@test.com | user123!@# | GUEST | 게스트 |

---

## 디렉토리 구조

```
services/auth-service/
├── prisma/
│   ├── schema.prisma      # 데이터베이스 스키마
│   └── seed.ts            # 시드 데이터
├── src/
│   ├── admin/             # 관리자 모듈
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── admin-nats.controller.ts
│   │   └── dto/
│   ├── auth/              # 인증 모듈
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── guards/
│   ├── user/              # 사용자 모듈
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user-nats.controller.ts
│   │   └── dto/
│   ├── prisma/            # Prisma 모듈
│   │   └── prisma.service.ts
│   ├── common/            # 공통 모듈
│   │   └── constants/
│   ├── app.module.ts
│   └── main.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 배포

### Cloud Run 배포

```bash
# 빌드 및 배포
gcloud builds submit --config cloudbuild.yaml

# 또는 직접 배포
docker build -t gcr.io/PROJECT_ID/auth-service .
docker push gcr.io/PROJECT_ID/auth-service
gcloud run deploy auth-service --image gcr.io/PROJECT_ID/auth-service
```

### 데이터베이스 마이그레이션

```bash
cd services/auth-service

# 스키마 동기화
npx prisma db push

# 시드 데이터 생성
npm run db:seed

# Prisma Client 재생성
npx prisma generate
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v3.0 | 2024-12-26 | 권한 구조 단순화 (26개 → 18개), admin_permissions/user_permissions 테이블 제거 |
| v2.0 | 2024-12-24 | 역할 단순화 (9개 → 8개), RoleMaster/PermissionMaster 도입 |
| v1.0 | 2024-12-16 | 초기 버전 |
