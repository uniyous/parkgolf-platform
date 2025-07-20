# Park Golf Platform - Development Guide

## 🚀 개발 환경 설정

### 시스템 요구사항
- Node.js 20.x 이상
- npm 10.x 이상
- Docker Desktop
- Git
- PostgreSQL 클라이언트 (선택사항)
- Redis 클라이언트 (선택사항)

### 환경 변수 설정
프로젝트 루트에 `.env.development` 파일을 생성하고 다음 내용을 추가:

```env
# Database
DATABASE_URL_AUTH=postgresql://parkgolf:parkgolf123@localhost:5432/parkgolf_auth
DATABASE_URL_COURSE=postgresql://parkgolf:parkgolf123@localhost:5432/parkgolf_course
DATABASE_URL_BOOKING=postgresql://parkgolf:parkgolf123@localhost:5432/parkgolf_booking
DATABASE_URL_NOTIFY=postgresql://parkgolf:parkgolf123@localhost:5432/parkgolf_notify
DATABASE_URL_SEARCH=postgresql://parkgolf:parkgolf123@localhost:5432/parkgolf_search

# NATS
NATS_URL=nats://localhost:4222

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Admin Dashboard
VITE_API_URL=http://localhost:3091

# User Webapp
VITE_USER_API_URL=http://localhost:3001
```

## 🛠️ 프로젝트 설정

### 1. 저장소 클론
```bash
git clone https://github.com/your-org/parkgolf-platform.git
cd parkgolf-platform
```

### 2. 인프라 서비스 시작
```bash
# Docker Compose로 PostgreSQL, Redis, NATS 시작
docker-compose up -d

# 상태 확인
docker-compose ps
```

### 3. 데이터베이스 초기화
```bash
# 각 서비스 디렉토리에서 실행
cd services/auth-service
npm install
npx prisma migrate dev
npx prisma db seed

cd ../course-service
npm install
npx prisma migrate dev
npx prisma db seed

cd ../booking-service
npm install
npx prisma migrate dev

cd ../notify-service
npm install
npx prisma migrate dev
```

## 📦 서비스별 개발 가이드

### Backend Services (NestJS)

#### 새로운 기능 추가하기
1. **Controller 생성**
```typescript
// src/[feature]/controller/[feature].controller.ts
@Controller('api/[feature]')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  async findAll() {
    return this.featureService.findAll();
  }
}
```

2. **Service 생성**
```typescript
// src/[feature]/service/[feature].service.ts
@Injectable()
export class FeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.feature.findMany();
  }
}
```

3. **DTO 정의**
```typescript
// src/[feature]/dto/[feature].dto.ts
export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

4. **Module 등록**
```typescript
// src/[feature]/[feature].module.ts
@Module({
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

#### NATS 통신 구현
```typescript
// Microservice Controller
@Controller()
export class FeatureNatsController {
  @MessagePattern('feature.create')
  async create(@Payload() data: CreateFeatureDto) {
    return this.featureService.create(data);
  }

  @EventPattern('feature.created')
  async handleCreated(@Payload() data: any) {
    // 이벤트 처리
  }
}
```

### Frontend Services (React)

#### 컴포넌트 구조
```typescript
// src/components/[feature]/[Feature].tsx
import React from 'react';

interface FeatureProps {
  data: any;
}

export const Feature: React.FC<FeatureProps> = ({ data }) => {
  return (
    <div className="feature-container">
      {/* 컴포넌트 내용 */}
    </div>
  );
};
```

#### API 클라이언트
```typescript
// src/api/featureApi.ts
import { client } from './client';

export const featureApi = {
  getAll: () => client.get('/api/features'),
  getById: (id: number) => client.get(`/api/features/${id}`),
  create: (data: any) => client.post('/api/features', data),
  update: (id: number, data: any) => client.put(`/api/features/${id}`, data),
  delete: (id: number) => client.delete(`/api/features/${id}`),
};
```

#### Redux Slice
```typescript
// src/redux/slices/featureSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchFeatures = createAsyncThunk(
  'feature/fetchAll',
  async () => {
    const response = await featureApi.getAll();
    return response.data;
  }
);

const featureSlice = createSlice({
  name: 'feature',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeatures.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFeatures.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      });
  },
});
```

## 🧪 테스트

### Unit Tests
```bash
# 특정 서비스 테스트
cd services/[service-name]
npm test

# 커버리지 포함
npm run test:cov
```

### E2E Tests
```bash
# E2E 테스트 실행
npm run test:e2e
```

### 테스트 작성 예시
```typescript
// [feature].service.spec.ts
describe('FeatureService', () => {
  let service: FeatureService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FeatureService, PrismaService],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return all features', async () => {
    const mockFeatures = [{ id: 1, name: 'Test' }];
    jest.spyOn(prisma.feature, 'findMany').mockResolvedValue(mockFeatures);

    const result = await service.findAll();
    expect(result).toEqual(mockFeatures);
  });
});
```

## 🔧 개발 도구

### VS Code 확장 프로그램 추천
- ESLint
- Prettier
- Prisma
- Thunder Client (API 테스트)
- GitLens
- Docker
- Tailwind CSS IntelliSense

### 유용한 스크립트

#### 모든 서비스 시작
```bash
# 프로젝트 루트에서
./.devtools/scripts/start-all-services.sh
```

#### 특정 서비스만 시작
```bash
./.devtools/scripts/start-service.sh auth-service
```

#### 로그 확인
```bash
# Docker 로그
docker-compose logs -f [service-name]

# 서비스 로그
tail -f services/[service-name]/[service-name].log
```

## 📝 코딩 컨벤션

### TypeScript/JavaScript
- 2 스페이스 들여쓰기
- 세미콜론 사용
- Single quotes for strings
- Interface는 `I` 접두사 없이 사용

### 파일 명명 규칙
- 컴포넌트: PascalCase (예: `UserList.tsx`)
- 유틸리티: camelCase (예: `formatDate.ts`)
- 상수: UPPER_SNAKE_CASE (예: `API_CONSTANTS.ts`)

### Git 커밋 메시지
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅, 세미콜론 누락, 코드 변경이 없는 경우
refactor: 코드 리팩토링
test: 테스트 코드, 리팩토링 테스트 코드 추가
chore: 빌드 업무 수정, 패키지 매니저 수정
```

## 🐛 디버깅

### Backend 디버깅
```json
// VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug NestJS",
  "runtimeArgs": ["run", "start:debug"],
  "cwd": "${workspaceFolder}/services/[service-name]",
  "console": "integratedTerminal"
}
```

### Frontend 디버깅
- React Developer Tools 사용
- Redux DevTools Extension 사용
- 브라우저 개발자 도구 활용

## 📚 추가 리소스

### 공식 문서
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NATS Documentation](https://docs.nats.io/)

### 프로젝트 문서
- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](../../shared/docs/DATABASE_SCHEMA.md)
- [Service Communication](../../shared/docs/SERVICE_COMMUNICATION.md)

## 🆘 문제 해결

### 일반적인 문제들

1. **데이터베이스 연결 오류**
   - Docker 컨테이너 실행 확인
   - 환경 변수 확인
   - 포트 충돌 확인

2. **NATS 연결 오류**
   - NATS 서버 실행 확인
   - 포트 4222 사용 가능 확인

3. **Prisma 마이그레이션 오류**
   - 데이터베이스 초기화: `npx prisma migrate reset`
   - 스키마 동기화: `npx prisma generate`

---

*마지막 업데이트: 2025-07-13*