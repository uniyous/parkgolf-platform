---
name: react-app
description: React 웹 앱 개발 가이드. React Query, Tailwind, bffParser, 상태 관리, 컴포넌트 패턴. admin-dashboard, platform-dashboard, user-app-web 공통 규칙. 트리거 키워드 - React, 프론트엔드, frontend, 웹, dashboard, Tailwind, React Query
---

# React Web App Guide

admin-dashboard, platform-dashboard, user-app-web 공통 개발 가이드

---

## 1. 폴더 구조

```
src/
├── pages/                    # 페이지 컴포넌트
├── components/
│   ├── features/{domain}/    # 도메인별 (Table, FormModal, Filters)
│   ├── common/               # 공통 (DataContainer, PageHeader)
│   ├── ui/                   # 기본 UI (Button, Input, Modal)
│   └── layout/               # 레이아웃
├── hooks/
│   ├── queries/              # React Query 훅 + key factory
│   └── use{Feature}.ts       # 커스텀 훅
├── lib/
│   ├── api/                  # API 클라이언트 ({domain}Api 객체)
│   └── utils/                # bffParser, cn() 등
├── types/                    # TypeScript 타입 정의
└── stores/                   # Zustand 스토어
```

---

## 2. 상태 관리

| 상태 유형 | 도구 | 용도 |
|----------|------|------|
| 서버 데이터 | React Query | API 호출, 캐싱, 자동 갱신 |
| 전역 상태 | Zustand | 인증 정보만 (`auth.store.ts`) |
| 로컬 상태 | useState | 모달, 폼, UI 상태 |

---

## 3. API 레이어

### API 클라이언트

```typescript
// lib/api/{domain}Api.ts
export const clubApi = {
  getClubs: (params?) => apiClient.get('/clubs', { params }).then(extractPaginatedList),
  getClub: (id: string) => apiClient.get(`/clubs/${id}`).then(extractSingle),
  createClub: (data: CreateClubDto) => apiClient.post('/clubs', data),
  updateClub: (id: string, data: UpdateClubDto) => apiClient.put(`/clubs/${id}`, data),
  deleteClub: (id: string) => apiClient.delete(`/clubs/${id}`),
};
```

### bffParser 유틸리티

BFF 응답 (`{ success, data, total, ... }`)을 프론트엔드 타입으로 파싱.

```typescript
// admin-dashboard: lib/utils/bffParser.ts
extractPaginatedList(response)  // → { data: T[], total, page, limit, totalPages }
extractSingle(response)         // → T (data 필드만 추출)
extractList(response)           // → T[] (비페이지네이션 목록)
```

> **user-app-web**도 동일한 패턴 사용: `apiClient.get()` + `extractList/extractSingle`

---

## 4. React Query 훅

### Key Factory

```typescript
// hooks/queries/keys.ts
export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters?: any) => [...clubKeys.lists(), filters] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: string) => [...clubKeys.details(), id] as const,
};
```

### Query 훅

```typescript
// hooks/queries/useClubs.ts
export const useClubsQuery = (filters?: ClubFilter) =>
  useQuery({
    queryKey: clubKeys.list(filters),
    queryFn: () => clubApi.getClubs(filters),
  });

export const useClubQuery = (id: string) =>
  useQuery({
    queryKey: clubKeys.detail(id),
    queryFn: () => clubApi.getClub(id),
    enabled: !!id,
  });
```

### Mutation 훅

```typescript
export const useCreateClubMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClubDto) => clubApi.createClub(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() });
    },
  });
};
```

---

## 5. 컴포넌트 패턴

### 페이지 구조

```tsx
export default function ClubsPage() {
  const { data, isLoading, error } = useClubsQuery(filters);

  return (
    <>
      <PageHeader title="골프장 관리" />
      <FilterContainer>
        <ClubFilters filters={filters} onChange={setFilters} />
      </FilterContainer>
      <DataContainer isLoading={isLoading} error={error} isEmpty={!data?.data.length}>
        <ClubTable data={data.data} />
        <Pagination total={data.total} page={data.page} limit={data.limit} />
      </DataContainer>
    </>
  );
}
```

### 공통 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 페이지 제목 + 액션 버튼 |
| `DataContainer` | loading/error/empty 상태 래퍼 |
| `FilterContainer` | 필터 UI 래퍼 |
| `FormModal` | 생성/수정 모달 폼 |
| `ConfirmDialog` | 삭제 확인 다이얼로그 |

---

## 6. 스타일

### 기본 규칙

- Tailwind CSS + `class-variance-authority` (cva)
- `rounded-lg` 통일
- `cn()` 유틸리티로 클래스 병합 (clsx + tailwind-merge)

### 앱별 Primary Color

| 앱 | Primary |
|----|---------|
| admin-dashboard | blue-600 |
| platform-dashboard | indigo-600 |
| user-app-web | green-600 |

---

## 7. 타입 정의

```typescript
// types/club.ts
export interface Club {
  id: string;
  name: string;
  address: string;
  // ...
}

export interface CreateClubDto {
  name: string;
  address: string;
}

// 페이지네이션 응답 (bffParser가 파싱한 결과)
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## 8. 금지 패턴

```typescript
// ❌ useEffect에서 API 호출
useEffect(() => { fetchData().then(setData); }, []);

// ✅ React Query 사용
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });

// ❌ lib/api 외에서 직접 API 호출
const res = await axios.get('/api/clubs');

// ✅ API 레이어를 통해 호출
const clubs = await clubApi.getClubs();

// ❌ 서버 상태를 useState로 관리
const [clubs, setClubs] = useState([]);

// ✅ React Query로 서버 상태 관리
const { data: clubs } = useClubsQuery();

// ❌ 전역 상태에 서버 데이터 저장 (Zustand에 API 데이터 넣기)
// Zustand는 인증 정보(토큰, 사용자)만 관리
```
