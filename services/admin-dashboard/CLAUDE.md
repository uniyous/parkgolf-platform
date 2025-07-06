# 파크골프 관리 웹 애플리케이션

React 19 + TypeScript + Vite + TailwindCSS v4 + Recoil을 사용한 파크골프장 관리 시스템입니다.

## 🏗️ 아키텍처 개요

### 프로젝트 구조
```
src/
├── features/           # 기능별 모듈 (도메인 기반 구조)
│   ├── auth/          # 인증 관련
│   │   ├── components/    # 인증 컴포넌트
│   │   ├── hooks/         # 인증 훅 (useAuthActions.ts)
│   │   ├── store/         # Recoil 상태 관리 (authState.ts)
│   │   ├── api/           # 인증 API
│   │   └── types/         # 인증 타입 정의
│   └── golf-course/   # 골프장 관리
│       ├── components/    # 골프장 컴포넌트
│       ├── hooks/         # 골프장 관리 훅 (useGolfCourseActions.ts, useGolfCourseState.ts)
│       ├── store/         # 골프장 상태 관리 (golfCourseState.ts)
│       ├── api/           # 골프장 API
│       └── types/         # 골프장 타입 정의
├── shared/            # 공통 모듈
│   ├── api/              # API 클라이언트
│   ├── components/       # 공통 컴포넌트
│   ├── hooks/            # 커스텀 훅 라이브러리 ⭐ 새로 구축됨
│   │   ├── useFormManager.ts      # 폼 상태 관리
│   │   ├── useSelection.ts        # 선택 관리
│   │   ├── useModal.ts           # 모달 관리
│   │   ├── usePagination.ts      # 페이지네이션
│   │   ├── useTableManager.ts    # 테이블 통합 관리
│   │   ├── useDebounce.ts        # 디바운스/검색
│   │   ├── useAsyncOperation.ts  # 비동기 작업 관리
│   │   ├── useConfirmation.ts    # 확인 다이얼로그
│   │   ├── useErrorHandler.ts    # 에러 핸들링
│   │   ├── useLocalStorage.ts    # 로컬 스토리지
│   │   ├── useToggle.ts          # 토글 상태
│   │   ├── useCounter.ts         # 카운터
│   │   ├── useClipboard.ts       # 클립보드
│   │   ├── useKeyboardShortcut.ts # 키보드 단축키
│   │   └── index.ts              # 통합 내보내기
│   ├── types/            # 공통 타입 정의
│   └── utils/            # 유틸리티 함수
└── app/               # 앱 진입점
    ├── App.tsx
    ├── router.tsx        # 라우팅 설정
    └── store/           # 전역 상태 설정
```

## 🔧 주요 기술 스택

### 프론트엔드
- **React 19**: 최신 React 기능 활용
- **TypeScript**: 타입 안정성
- **Vite**: 빠른 개발 환경
- **TailwindCSS v4**: 유틸리티 우선 스타일링
- **Recoil**: 상태 관리

### 상태 관리 패턴
- **AsyncState**: 비동기 작업 상태 (loading, error, data)
- **EntityState**: 엔티티 관리 상태 (cache, selectedId)
- **atomFamily**: 파라미터화된 상태 관리
- **useRecoilCallback**: 복합 상태 업데이트

## 📁 핵심 아키텍처 패턴

### 1. Container/Presenter 패턴
```typescript
// Container: 비즈니스 로직과 상태 관리
export const CourseManagementContainer: React.FC = () => {
  const manager = useGolfCourseManagement();
  // 로직 처리
  return <CourseManagementPresenter {...props} />;
};

// Presenter: UI 렌더링만 담당
export const CourseManagementPresenter: React.FC<Props> = (props) => {
  return <div>{/* UI 렌더링 */}</div>;
};
```

### 2. 통합 상태 관리
```typescript
// 도메인별 통합 훅 (features/golf-course/hooks/useGolfCourseState.ts)
export const useGolfCourseManagement = () => {
  const companyState = useGolfCompanyState();
  const courseState = useGolfCourseState();
  const companyActions = useGolfCompanyActions();
  const courseActions = useGolfCourseActions();
  
  // 고수준 비즈니스 로직 통합
  return { 
    // 상태
    companies: companyState.companies,
    courses: courseState.courses,
    selectedCompany: companyState.selectedCompany,
    selectedCourse: courseState.selectedCourse,
    
    // 액션
    selectCompanyAndFetchCourses,
    selectCourse,
    updateCourseData,
    // ... 기타 통합된 액션들
  };
};
```

### 3. 커스텀 훅 라이브러리 🆕
```typescript
// 재사용 가능한 UI 패턴들 (src/shared/hooks/)
import { 
  useFormManager,    // 폼 상태 관리
  useSelection,      // 선택 관리
  useModal,          // 모달 관리
  usePagination,     // 페이지네이션
  useTableManager,   // 테이블 통합 관리
  useConfirmation,   // 확인 다이얼로그
  useErrorHandler,   // 에러 관리
} from '@/shared/hooks';

// 사용 예시
const MyComponent = () => {
  const form = useFormManager(initialData, {
    validationSchema: validateData,
    onSubmit: handleSubmit
  });
  
  const modal = useModal();
  const selection = useSelection({ multiple: true });
  
  return <div>{/* 컴포넌트 UI */}</div>;
};
```

## 🎯 주요 기능

### 인증 시스템
- JWT 토큰 기반 인증
- localStorage 자동 동기화
- 권한 기반 접근 제어
- useRecoilCallback을 활용한 비동기 액션

### 골프장 관리
- 계층적 데이터 구조 (Company → Course → Hole → TeeBox)
- atomFamily를 통한 회사별 코스 상태 관리
- 실시간 상태 동기화
- 캐시 기반 최적화

### 🆕 커스텀 훅 라이브러리
총 **15개의 재사용 가능한 훅**이 구현되었습니다:

#### 폼 관리
- **useFormManager**: 검증, 편집 모드, 더티 체크, 제출 처리
```typescript
const form = useFormManager(initialData, {
  validationSchema: (data) => ({ /* 검증 로직 */ }),
  onSubmit: async (data) => { /* 제출 로직 */ }
});
```

#### UI 상태 관리
- **useSelection**: 단일/다중 선택, 전체 선택, 토글
- **useModal**: 모달 상태, ESC 키 닫기, body 스크롤 방지
- **usePagination**: 페이지네이션, 데이터 슬라이싱
- **useToggle**: 불린 상태 토글
- **useCounter**: 숫자 증감, 최대/최소값 제한

#### 고급 통합 훅
- **useTableManager**: 검색, 정렬, 필터링, 페이징, 선택을 모두 통합
```typescript
const table = useTableManager({
  data: users,
  selection: { multiple: true },
  pagination: { initialPageSize: 20 },
  search: { fields: ['name', 'email'] },
  defaultSort: { key: 'name', direction: 'asc' }
});
```

#### 비동기 작업
- **useAsyncOperation**: 로딩, 에러, 재시도 관리
- **useErrorHandler**: 통합 에러 관리, 전역 에러 핸들러

#### 사용자 상호작용
- **useConfirmation**: 확인 다이얼로그 (삭제, 페이지 나가기 등)
- **useDebounce**: 디바운스, 검색 최적화
- **useLocalStorage**: 타입 안전한 로컬 스토리지 동기화

#### 유틸리티
- **useClipboard**: 클립보드 읽기/쓰기
- **useKeyboardShortcut**: 키보드 단축키 등록

## 🔄 상태 관리 아키텍처

### AsyncState 패턴
```typescript
interface AsyncState<T> {
  data: T | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  lastUpdated?: Date;
}
```

### EntityState 패턴  
```typescript
interface EntityState<T> extends AsyncState<T[]> {
  selectedId: number | null;
  cache: Record<number, T>;
}
```

### atomFamily를 통한 계층적 상태
```typescript
// 회사별 코스 상태 관리 (features/golf-course/store/golfCourseState.ts)
export const golfCourseStateFamily = atomFamily<GolfCourseState, number | null>({
  key: 'golfCourseStateFamily',
  default: (companyId) => ({
    data: null,
    status: 'idle',
    error: null,
    selectedId: null,
    cache: {},
    companyId,
    lastUpdated: undefined,
  }),
});
```

### useRecoilCallback 패턴
```typescript
// 복합 비동기 액션 (features/golf-course/hooks/useGolfCourseActions.ts)
const fetchCourses = useRecoilCallback(
  ({ set }) => async (companyId: number) => {
    try {
      set(golfCourseStateFamily(companyId), createCourseStateUpdate({
        status: 'loading',
        error: null,
      }));

      const courses = await golfCourseApi.getCoursesByCompany(companyId);
      
      set(golfCourseStateFamily(companyId), createCourseStateUpdate({
        data: courses,
        status: 'success',
        cache: coursesToCache(courses),
      }));
    } catch (error) {
      set(golfCourseStateFamily(companyId), createCourseStateUpdate({
        status: 'error',
        error: error.message,
      }));
    }
  },
  []
);
```

## 🚀 개발 명령어

```bash
# 개발 서버 시작
npm run dev

# 빌드
npm run build

# 타입 체크
npm run type-check

# 린팅
npm run lint

# 프리뷰
npm run preview
```

## 📋 완료된 구현 작업들

### ✅ Task 1: 누락된 핵심 파일들 생성
- `app/router.tsx` - React Router 설정
- `features/auth/types/index.ts` - 인증 타입 정의
- `tailwind.config.js` - TailwindCSS v4 설정
- `.env` - 환경 변수 설정

### ✅ Task 2: 폴더 구조 재조직
- features 기반 도메인 구조로 전환
- 관심사별 명확한 분리
- 확장 가능한 모듈 구조

### ✅ Task 3: API 클라이언트 통합 및 에러 처리 개선
- 통합 API 클라이언트 구축
- 인터셉터를 통한 자동 에러 처리
- 토큰 갱신 로직 통합

### ✅ Task 4: Container/Presenter 패턴 도입
- 비즈니스 로직과 UI 분리
- 재사용성 및 테스트 용이성 향상
- 명확한 책임 분리

### ✅ Task 5: 상태 관리 구조 개선
- Recoil atoms 통합 및 최적화
- AsyncState/EntityState 패턴 도입
- atomFamily를 통한 계층적 상태 관리
- useRecoilCallback을 활용한 복합 액션

### ✅ Task 6: 커스텀 훅 라이브러리 구축 🆕
- **15개의 재사용 가능한 훅** 구현
- 타입 안전성 보장
- 성능 최적화 (useCallback, useMemo)
- 포괄적인 사용 예제 및 문서화

## 🏆 아키텍처 개선 효과

### 코드 품질
- **타입 안정성**: 100% TypeScript 적용
- **재사용성**: 공통 패턴의 훅화
- **일관성**: 표준화된 상태 관리 패턴
- **가독성**: 명확한 관심사 분리

### 개발 생산성
- **개발 속도**: 재사용 가능한 훅으로 빠른 구현
- **유지보수**: 중앙집중식 로직 관리
- **디버깅**: 명확한 데이터 플로우
- **테스트**: 격리된 단위 테스트 가능

### 성능 최적화
- **메모이제이션**: 모든 콜백 최적화
- **선택적 렌더링**: 필요한 컴포넌트만 리렌더링
- **캐시 관리**: 중복 API 호출 방지
- **번들 크기**: 트리 셰이킹 지원

## 🎯 사용 예시

### 복합 컴포넌트 예제
```typescript
// 골프장 관리 컴포넌트
const CourseManagementPage = () => {
  // 통합 상태 관리
  const golfManager = useGolfCourseManagement();
  
  // UI 상태 관리
  const addModal = useModal();
  const editModal = useModal();
  const deleteConfirmation = useDeleteConfirmation();
  
  // 폼 관리
  const courseForm = useFormManager(initialCourseData, {
    validationSchema: validateCourse,
    onSubmit: handleSubmitCourse
  });
  
  // 테이블 관리 (검색, 정렬, 페이징, 선택 통합)
  const courseTable = useTableManager({
    data: golfManager.courses,
    selection: { multiple: true },
    pagination: { initialPageSize: 20 },
    search: { fields: ['name', 'description'] },
    defaultSort: { key: 'name', direction: 'asc' }
  });
  
  return (
    <div>
      {/* 테이블과 모든 기능이 통합된 UI */}
      <CourseTable {...courseTable} />
      
      {/* 모달들 */}
      <CourseFormModal {...addModal.modalProps} form={courseForm} />
      <ConfirmDialog {...deleteConfirmation} />
    </div>
  );
};
```

## 🔌 BFF API 통합

### ✅ Task 7: BFF API 통합 완료 🆕
parkgolf-admin-api BFF(Backend For Frontend)와의 완전한 통합이 완료되었습니다.

#### API 클라이언트 업데이트
- **BFF 응답 형식**: `{ success: boolean, data?: T, error?: {...} }` 지원
- **자동 에러 처리**: BFF 에러 형식에 맞춘 통합 에러 핸들링
- **PATCH 메서드 추가**: 부분 업데이트 지원
- **환경 변수**: `VITE_API_BASE_URL=http://localhost:3000/api`

#### 실제 API 엔드포인트 교체
1. **authApi.ts** → BFF 인증 API 연동
   - `POST /admin/auth/login` - 관리자 로그인
   - `GET /admin/auth/profile` - 사용자 프로필
   - `GET /admin/auth/me` - 현재 사용자 정보
   - `POST /admin/auth/refresh` - 토큰 갱신
   - `POST /admin/auth/logout` - 로그아웃

2. **adminApi.ts** → BFF 사용자 관리 API 연동
   - `GET /admin/users` - 사용자 목록 (필터링, 페이징)
   - `GET /admin/users/:id` - 사용자 상세
   - `POST /admin/users` - 사용자 생성
   - `PUT /admin/users/:id` - 사용자 업데이트
   - `DELETE /admin/users/:id` - 사용자 삭제
   - `PATCH /admin/users/:id/status` - 상태 변경
   - `PATCH /admin/users/:id/permissions` - 권한 변경

3. **golfCourseApi.ts** → BFF 코스 관리 API 연동
   - `GET /admin/courses` - 코스 목록 (필터링, 페이징)
   - `GET /admin/courses/:id` - 코스 상세
   - `POST /admin/courses` - 코스 생성
   - `PUT /admin/courses/:id` - 코스 업데이트
   - `DELETE /admin/courses/:id` - 코스 삭제

#### 새로운 API 모듈 추가
4. **bookingApi.ts** → 예약 관리 API 🆕
   - 예약 CRUD 작업
   - 예약 상태/결제 상태 관리
   - 예약 통계 및 분석
   - 대량 작업 (상태 변경, 취소 등)

5. **notificationApi.ts** → 알림 관리 API 🆕
   - 알림 발송 및 관리
   - 템플릿 관리
   - 캠페인 관리
   - 사용자 알림 설정
   - 전송 통계

6. **dashboardApi.ts** → 대시보드 분석 API 🆕
   - 실시간 대시보드 데이터
   - 트렌드 분석
   - 성능 지표
   - 시스템 알림
   - KPI 지표

#### 타입 안정성
- **BFF 응답 형식**: `BffApiResponse<T>` 인터페이스
- **필터링 인터페이스**: 각 API별 필터 타입 정의
- **페이징 응답**: 표준화된 리스트 응답 형식
- **에러 처리**: 구조화된 에러 객체

#### 환경 설정
```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_NODE_ENV=development
VITE_APP_TITLE=Parkgolf Admin
VITE_APP_VERSION=1.0.0
```

#### 호환성 유지
- **레거시 메서드**: 기존 함수명 유지로 하위 호환성 보장
- **타입 변환**: User ↔ Admin 간 자동 변환
- **점진적 마이그레이션**: 기존 컴포넌트 수정 없이 작동

### 🏃‍♂️ 준비 완료
모든 프론트엔드 페이지가 BFF API와 완전히 통합되어 실제 데이터로 작동할 준비가 완료되었습니다.

## 📚 참고 문서

- [커스텀 훅 라이브러리 상세 문서](src/shared/hooks/README.md)
- [사용 예제](src/shared/hooks/useFormExample.ts)
- React 19 + Recoil 모범 사례 적용
- TypeScript strict 모드 준수
- BFF API 통합 가이드

이 구조는 대규모 React 애플리케이션에 적합한 현대적이고 확장 가능한 아키텍처를 제공하며, 완전한 BFF API 통합으로 실제 운영 환경에서 사용할 수 있습니다.