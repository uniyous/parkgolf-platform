# Common Tasks - Park Golf Platform

## 🛠️ 자주 하는 개발 작업들

### 1. 개발 환경 설정

#### 전체 환경 시작
```bash
# 인프라 서비스 시작
docker-compose -f .claude/docker/docker-compose.yml up -d

# 서비스 상태 확인
docker-compose -f .claude/docker/docker-compose.yml ps

# 로그 확인
docker-compose -f .claude/docker/docker-compose.yml logs -f postgres
```

#### 개별 서비스 시작
```bash
# 서비스 시작 (예: auth-service)
cd services/auth-service
npm install
npm run start:dev

# 다른 터미널에서 다른 서비스 시작
cd services/course-service
npm run start:dev
```

### 2. 새로운 NestJS 서비스 추가

#### 템플릿 사용
```bash
# 템플릿 확인
cat .claude/development/templates/nestjs-service.template

# 새 서비스 디렉토리 생성
mkdir services/new-service
cd services/new-service

# 기본 NestJS 프로젝트 초기화
npm init -y
npm install @nestjs/core @nestjs/common @nestjs/platform-express
```

#### 설정 업데이트
```bash
# 서비스 목록에 추가
vim .claude/shared/configs/project/services.json

# 환경 변수 추가
vim .claude/development/environments/.env.development

# 포트 매핑 추가 (예: 3017)
```

### 3. 데이터베이스 작업

#### Prisma 마이그레이션
```bash
cd services/auth-service

# 스키마 변경 후 마이그레이션
npx prisma migrate dev --name add_new_field

# 데이터베이스 푸시 (개발용)
npx prisma db push

# Prisma Studio 실행
npx prisma studio
```

#### 데이터베이스 초기화
```bash
# 마이그레이션 초기화
npx prisma migrate reset

# 시드 데이터 실행
npx prisma db seed
```

### 4. API 개발 및 테스트

#### 새 API 엔드포인트 추가
```bash
# 컨트롤러 생성
nest generate controller users

# 서비스 생성
nest generate service users

# DTO 생성
nest generate class users/dto/create-user.dto --no-spec
```

#### API 테스트
```bash
# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e

# 특정 테스트 파일 실행
npm test -- users.service.spec.ts
```

### 5. NATS 이벤트 구현

#### 이벤트 발행
```typescript
// 이벤트 발행 예시
@Injectable()
export class BookingService {
  constructor(
    @Inject('NATS_CLIENT') private natsClient: ClientProxy,
  ) {}

  async createBooking(bookingData: CreateBookingDto) {
    const booking = await this.create(bookingData);
    
    // 이벤트 발행
    this.natsClient.emit('booking.created', {
      bookingId: booking.id,
      userId: booking.userId,
      timeSlotId: booking.timeSlotId,
    });
    
    return booking;
  }
}
```

#### 이벤트 구독
```typescript
// 이벤트 구독 예시
@Controller()
export class NotificationController {
  @EventPattern('booking.created')
  handleBookingCreated(@Payload() data: any) {
    // 예약 생성 알림 발송
    this.notificationService.sendBookingConfirmation(data);
  }
}
```

### 6. 프론트엔드 개발

#### 새 React 컴포넌트 추가
```bash
# 컴포넌트 생성 (admin-dashboard)
cd services/admin-dashboard/src/components

# 새 컴포넌트 폴더 생성
mkdir NewFeature
cd NewFeature

# 컴포넌트 파일 생성
touch NewFeature.tsx
touch NewFeature.module.css
touch index.ts
```

#### API 연동
```typescript
// API 클라이언트 설정
import { apiClient } from '@/api/client';

export const newFeatureApi = {
  getList: () => apiClient.get('/api/new-feature'),
  create: (data) => apiClient.post('/api/new-feature', data),
  update: (id, data) => apiClient.put(`/api/new-feature/${id}`, data),
  delete: (id) => apiClient.delete(`/api/new-feature/${id}`),
};
```

### 7. 코드 품질 관리

#### 린팅 및 포맷팅
```bash
# ESLint 실행
npm run lint

# 자동 수정
npm run lint:fix

# Prettier 실행
npm run format

# 타입 체크
npm run type-check
```

#### 빌드 테스트
```bash
# 개발 빌드
npm run build

# 프로덕션 빌드
npm run build:prod

# 빌드 파일 확인
ls -la dist/
```

### 8. 디버깅 및 모니터링

#### 로그 확인
```bash
# 서비스 로그 확인
tail -f services/auth-service/auth-service.log

# Docker 로그 확인
docker logs -f parkgolf-postgres
docker logs -f parkgolf-redis
```

#### 헬스체크
```bash
# 서비스 상태 확인
curl http://localhost:3011/health
curl http://localhost:3012/health

# 데이터베이스 연결 확인
curl http://localhost:3011/health/detailed
```

### 9. 배포 관련 작업

#### Docker 빌드
```bash
# 개별 서비스 빌드
cd services/auth-service
docker build -t parkgolf-auth-service .

# 모든 서비스 빌드
.claude/development/scripts/build-all-services.sh
```

#### 환경 설정 관리
```bash
# 개발 환경 설정
cp .claude/development/environments/.env.development .env

# 스테이징 환경 설정
cp .claude/development/environments/.env.staging .env

# 환경 변수 확인
echo $DATABASE_URL
echo $NATS_URL
```

### 10. 문제 해결

#### 포트 충돌 해결
```bash
# 포트 사용 프로세스 확인
lsof -i :3011
lsof -i :5432

# 프로세스 종료
kill -9 <PID>
```

#### 데이터베이스 연결 문제
```bash
# PostgreSQL 컨테이너 상태 확인
docker ps | grep postgres

# 데이터베이스 연결 테스트
docker exec -it parkgolf-postgres psql -U parkgolf -d parkgolf -c "SELECT version();"
```

#### 캐시 문제
```bash
# Node.js 캐시 초기화
rm -rf node_modules package-lock.json
npm install

# Redis 캐시 초기화
docker exec -it parkgolf-redis redis-cli FLUSHALL
```

### 11. 유용한 단축 명령어

#### 개발 환경 재시작
```bash
# 전체 환경 재시작
docker-compose -f .claude/docker/docker-compose.yml down
docker-compose -f .claude/docker/docker-compose.yml up -d
```

#### 빠른 테스트
```bash
# 모든 서비스 테스트
find services -name "package.json" -execdir npm test \;

# 빌드 테스트
find services -name "package.json" -execdir npm run build \;
```

---

**이 작업들로 일상적인 개발 업무를 효율적으로 처리할 수 있습니다! 🚀**