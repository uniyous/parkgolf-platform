# Park Golf Platform - 인증 시스템 가이드

## 🔐 개요

Park Golf Platform은 JWT(JSON Web Token) 기반의 강력한 인증 시스템을 구현하고 있습니다. 마이크로서비스 아키텍처에서 NATS 메시징을 통한 중앙집중식 인증 관리를 제공합니다.

## 🏗️ 아키텍처

```
┌─────────────────── 인증 플로우 ──────────────────────┐
│                                                      │
│  ┌─────────────────┐                                 │
│  │ admin-dashboard │ ──── POST /login                │
│  │   (React 19)    │      (email, password)          │
│  └─────────────────┘                                 │
│           │                                          │
│           ▼                                          │
│  ┌─────────────────┐                                 │
│  │    admin-api    │ ──── NATS auth.login           │
│  │   (BFF Layer)   │      메시지 전송                │
│  └─────────────────┘                                 │
│           │                                          │
│           ▼                                          │
│  ┌─────────────────┐                                 │
│  │  auth-service   │ ──── JWT 토큰 생성              │
│  │ (Core Service)  │      사용자 검증                │
│  └─────────────────┘                                 │
│           │                                          │
│           ▼                                          │
│  ┌─────────────────┐                                 │
│  │   PostgreSQL    │ ──── 사용자/관리자 정보          │
│  │   (Database)    │      권한 및 역할               │
│  └─────────────────┘                                 │
└──────────────────────────────────────────────────────┘
```

## 🔑 주요 컴포넌트

### 1. auth-service (Core Authentication)
**위치**: `services/auth-service/`
**포트**: :3011
**역할**: 중앙 인증 서비스

#### 주요 엔드포인트
```typescript
// 관리자 로그인
POST /auth/admin/login
Body: { email: string, password: string }
Response: { accessToken, refreshToken, user }

// 현재 사용자 정보 조회 (NEW!)
GET /auth/me
Headers: { Authorization: Bearer <token> }
Response: { id, email, name, role, permissions, ... }

// 토큰 갱신
POST /auth/admin/refresh
Body: { refreshToken: string }
Response: { accessToken, refreshToken, user }
```

#### NATS 메시지 핸들러
```typescript
// 로그인 처리
@MessagePattern('auth.login')
async login(loginDto: LoginDto)

// 현재 사용자 정보 조회 (NEW!)
@MessagePattern('auth.getCurrentUser') 
async getCurrentUser(payload: { token: string })

// 토큰 검증
@MessagePattern('auth.validate')
async validateToken(payload: { token: string })

// 토큰 갱신
@MessagePattern('auth.refresh')
async refreshToken(payload: { refreshToken: string })
```

### 2. admin-api (BFF Layer)
**위치**: `services/admin-api/`
**포트**: :3091
**역할**: 관리자 대시보드용 Backend for Frontend

#### 주요 엔드포인트
```typescript
// 관리자 로그인
POST /api/admin/auth/login
→ NATS: auth.login

// 현재 관리자 정보 조회 (NEW!)
GET /api/admin/auth/me
→ NATS: auth.getCurrentUser
→ 관리자 권한 검증

// 토큰 갱신
POST /api/admin/auth/refresh
→ NATS: auth.refresh

// 토큰 검증
POST /api/admin/auth/validate
→ NATS: auth.validate
```

### 3. admin-dashboard (Frontend)
**위치**: `services/admin-dashboard/`
**포트**: :3000
**역할**: React 기반 관리자 대시보드

#### 인증 컨텍스트 (AdminAuthContext)
```typescript
// 실제 API 연동 (Mock 데이터 완전 제거)
const loadCurrentUser = async () => {
  const response = await authApi.getCurrentUser();
  if (response.success && response.data) {
    const admin = convertUserToAdmin(response.data);
    setCurrentAdmin(admin);
  } else {
    // 인증 실패 시 자동 로그아웃
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};
```

## 🔄 인증 플로우

### 1. 로그인 프로세스
```
1. 사용자가 이메일/비밀번호 입력
   ↓
2. admin-dashboard → POST /api/admin/auth/login
   ↓
3. admin-api → NATS auth.login 메시지
   ↓
4. auth-service → 사용자 검증 및 JWT 생성
   ↓
5. 토큰을 클라이언트로 반환
   ↓
6. localStorage에 토큰 저장
   ↓
7. AdminAuthContext에서 사용자 정보 로드
```

### 2. 인증 상태 확인 (/auth/me 엔드포인트)
```
1. 페이지 로드 시 또는 토큰 변경 감지
   ↓
2. admin-dashboard → GET /api/admin/auth/me (Bearer token)
   ↓
3. admin-api → 토큰 추출 및 검증
   ↓
4. admin-api → NATS auth.getCurrentUser 메시지
   ↓
5. auth-service → 토큰 검증 및 완전한 사용자 정보 조회
   ↓
6. 데이터베이스에서 관리자 정보, 권한, 부서 등 조회
   ↓
7. admin-api → 관리자 권한 재검증
   ↓
8. 완전한 관리자 프로필 반환
```

### 3. 자동 로그아웃 처리
```
토큰 만료 또는 인증 실패 시:
1. API 에러 응답 감지
   ↓
2. localStorage에서 토큰 제거
   ↓
3. AdminAuthContext 상태 초기화
   ↓
4. 로그인 페이지로 리디렉션
```

## 🛡️ 보안 기능

### JWT 토큰 구조
```typescript
interface JwtPayload {
  sub: number;        // 사용자 ID
  email: string;      // 이메일
  roles: string[];    // 역할 목록
  type?: 'admin';     // 관리자 토큰 구분
  iat: number;        // 발급 시간
  exp: number;        // 만료 시간
}
```

### 관리자 권한 검증
```typescript
// admin-api에서 관리자 권한 확인
const isAdminRole = (role: string): boolean => {
  const adminRoles = ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'];
  return adminRoles.includes(role.toLowerCase()) || 
         adminRoles.includes(role.toUpperCase());
};
```

### 비밀번호 암호화
```typescript
// bcrypt를 사용한 안전한 비밀번호 해싱
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, user.password);
```

## 📊 데이터베이스 스키마

### Admin 테이블
```sql
model Admin {
  id            Int                 @id @default(autoincrement())
  email         String              @unique
  password      String
  name          String
  roleCode      String              @default("READONLY_STAFF")
  phone         String?
  department    String?
  description   String?
  isActive      Boolean             @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  
  // 관계
  role          RoleMaster          @relation(fields: [roleCode], references: [code])
  permissions   AdminPermission[]
  activityLogs  AdminActivityLog[]
  refreshTokens AdminRefreshToken[]
}
```

### 역할 및 권한 시스템
```sql
model RoleMaster {
  code        String   @id  // 'PLATFORM_OWNER', 'COMPANY_MANAGER' 등
  name        String
  description String?
  userType    String   // 'USER' 또는 'ADMIN'
  level       Int      @default(1)
  isActive    Boolean  @default(true)
}

model AdminPermission {
  id          Int      @id @default(autoincrement())
  adminId     Int
  permission  String   // 권한 코드
  admin       Admin    @relation(fields: [adminId], references: [id])
}
```

## 🔧 설정 및 환경변수

### auth-service 환경변수
```env
DATABASE_URL=postgresql://username:password@localhost:5432/parkgolf_auth
JWT_SECRET=your-super-secret-jwt-key
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379
```

### admin-api 환경변수
```env
NATS_URL=nats://localhost:4222
AUTH_SERVICE_NATS_QUEUE=auth_service
JWT_SECRET=your-super-secret-jwt-key
```

### admin-dashboard 환경변수
```env
VITE_API_BASE_URL=http://localhost:3091/api
VITE_NODE_ENV=development
```

## 🚀 개발 및 테스트

### 인증 테스트
```bash
# 로그인 테스트
curl -X POST http://localhost:3091/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@parkgolf.com","password":"password123"}'

# 현재 사용자 정보 조회
curl -X GET http://localhost:3091/api/admin/auth/me \
  -H "Authorization: Bearer <your-jwt-token>"

# 토큰 갱신
curl -X POST http://localhost:3091/api/admin/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<your-refresh-token>"}'
```

### 로컬 개발 환경
```bash
# 인프라 서비스 시작
docker-compose up -d postgres redis nats

# auth-service 시작
cd services/auth-service
npm run dev

# admin-api 시작  
cd services/admin-api
npm run dev

# admin-dashboard 시작
cd services/admin-dashboard
npm run dev
```

## 🔍 디버깅 및 모니터링

### 로그 확인
```bash
# auth-service 로그
tail -f services/auth-service/auth.log

# admin-api 로그
tail -f services/admin-api/admin-api.log

# 브라우저 네트워크 탭에서 API 호출 확인
```

### 일반적인 문제 해결

#### 1. "Cannot GET /api/admin/auth/me" 오류
- admin-api 서비스 실행 상태 확인
- NATS 연결 상태 확인
- JWT 토큰 유효성 확인

#### 2. 로그인 후 관리자 정보가 빈값
- /auth/me 엔드포인트 응답 확인
- AdminAuthContext 상태 로딩 확인
- 데이터베이스 admin 테이블 데이터 확인

#### 3. 토큰 만료 처리
- 자동 refresh 로직 동작 확인
- localStorage 토큰 상태 확인

## 📋 최근 업데이트 (2025-01-25)

### ✅ 완료된 기능
1. **GET /auth/me 엔드포인트 구현**: 완전한 관리자 프로필 조회
2. **NATS 메시지 핸들러**: auth.getCurrentUser 패턴 구현
3. **BFF 통합**: admin-api에서 관리자 권한 검증
4. **Mock 데이터 제거**: AdminAuthContext에서 실제 API만 사용
5. **자동 에러 처리**: 인증 실패 시 토큰 정리 및 로그아웃

### 🔄 인증 플로우 최적화
- 토큰 기반 상태 관리 개선
- 실시간 인증 상태 동기화
- 마이크로서비스 간 안전한 통신

---

**마지막 업데이트**: 2025-01-25
**문서 버전**: 1.0.0