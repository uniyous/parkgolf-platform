# Park Golf Platform - 개발 규칙

## 프로젝트 구조

```
apps/
├── admin-dashboard/    # 관리자 웹 (React + Vite + Tailwind)
├── user-webapp/        # 사용자 웹 (React + Vite + Tailwind)
services/
├── admin-api/          # BFF (NestJS) - REST → NATS
├── user-api/           # BFF (NestJS) - REST → NATS
├── iam-service/        # 인증/사용자/회사/역할 (Prisma)
├── course-service/     # 골프장/코스/게임 (Prisma)
├── booking-service/    # 예약/결제/정책 (Prisma)
└── notify-service/     # 알림 (Prisma)
```

---

## Frontend 규칙

### 상태 관리

| 상태 유형 | 도구 | 용도 |
|----------|------|------|
| 서버 데이터 | React Query | API 호출, 캐싱 |
| 전역 상태 | Zustand | 인증 정보만 (`auth.store.ts`) |
| 로컬 상태 | useState | 모달, 폼, UI 상태 |

### 금지 패턴

```typescript
// ❌ useEffect에서 API 호출
useEffect(() => { fetchData().then(setData); }, []);

// ✅ React Query 사용
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
```

### 폴더 구조

```
src/
├── pages/                    # 페이지 컴포넌트
├── components/
│   ├── features/{domain}/    # 도메인별 (Table, FormModal, Filters)
│   ├── common/               # 공통 (DataContainer, PageHeader)
│   ├── ui/                   # 기본 UI (Button, Input, Modal)
│   └── layout/               # 레이아웃
├── hooks/
│   ├── queries/              # React Query 훅
│   └── use{Feature}.ts       # 커스텀 훅
└── lib/api/                  # API 클라이언트
```

### API 호출

```typescript
// lib/api/{domain}Api.ts
export const clubApi = {
  getClubs: () => apiClient.get('/clubs').then(extractPaginatedList),
  getClub: (id: string) => apiClient.get(`/clubs/${id}`).then(extractSingle),
  createClub: (data) => apiClient.post('/clubs', data),
};

// hooks/queries/{domain}.ts
export const useClubsQuery = () => useQuery({
  queryKey: clubKeys.list(),
  queryFn: () => clubApi.getClubs(),
});
```

### 스타일 규칙

- Tailwind CSS + `class-variance-authority` (cva)
- `rounded-lg` 통일, `cn()` 유틸리티로 클래스 병합
- admin: blue-600 (primary), user-webapp: green-600 (primary)

---

## Backend 규칙

### 아키텍처

```
Frontend → BFF (REST) → NATS → Microservice (Prisma)
```

### BFF 패턴 (admin-api, user-api)

```typescript
// Controller: REST 엔드포인트
@Controller('api/admin/games')
export class GamesController {
  @Get()
  async getGames(@Query() filters: GameFilterDto) {
    return this.gamesService.getGames(filters);
  }
}

// Service: NATS 요청 전송
@Injectable()
export class GamesService {
  async getGames(filters: any) {
    return this.natsClient.send('games.list', filters);
  }
}
```

### Microservice 패턴 (*-service)

```typescript
// NATS Controller: 메시지 핸들러
@Controller()
export class GameNatsController {
  @MessagePattern('games.list')
  async getGames(@Payload() data: any) {
    const result = await this.gameService.findAll(data);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
  }
}
```

### NATS 메시지 패턴

```
{domain}.list    # 목록 조회
{domain}.get     # 단일 조회
{domain}.create  # 생성
{domain}.update  # 수정
{domain}.delete  # 삭제
```

### API 응답 형식 (필수 준수)

**모든 API 응답은 반드시 아래 형식을 따라야 합니다.**

```typescript
// 단일 데이터 응답
{ success: true, data: T }

// 목록 응답 (페이지네이션)
{
  success: true,
  data: T[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}

// 에러 응답
{ success: false, error: { code: string, message: string } }
```

### BFF 응답 처리 규칙

```typescript
// ✅ 올바른 패턴: Microservice 응답을 그대로 반환
@Injectable()
export class ExampleService {
  async getData(params: any) {
    return this.natsClient.send('domain.get', params);  // 그대로 반환
  }
}

// ❌ 금지 패턴: 응답을 언래핑하거나 변환
async getData(params: any) {
  const response = await this.natsClient.send('domain.get', params);
  return response.data;  // ❌ 절대 금지
}
```

**규칙:**
- BFF(admin-api, user-api)는 Microservice 응답을 그대로 전달 (변환/언래핑 금지)
- Microservice에서 `NatsResponse.success()`, `NatsResponse.paginated()` 사용
- ResponseTransformInterceptor 사용 금지

---

## CI/CD 규칙

### 워크플로우

| 파일 | 용도 |
|------|------|
| `ci.yml` | Lint, Test, Build, Security Scan |
| `cd-apps.yml` | Frontend 배포 (Firebase) |
| `cd-services.yml` | Backend 배포 (Cloud Run) |

### 배포 전략

- `develop` → dev 환경
- `main` → prod 환경
- 선택적 서비스 배포 가능 (쉼표 구분)

### 로컬 개발

```bash
# Backend
cd services/{service-name} && npm run start:dev

# Frontend
cd apps/{app-name} && npm run dev
```
