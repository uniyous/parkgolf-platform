# Admin Dashboard

## 📋 개요

Admin Dashboard는 Park Golf Platform의 관리자용 웹 인터페이스입니다.
코스 관리, 예약 관리, 사용자 관리 등 플랫폼 운영에 필요한 모든 기능을 제공합니다.

## 🏗️ 아키텍처

- **Framework**: React 18.x with TypeScript
- **Build Tool**: Vite 5.x
- **State Management**: Zustand
- **Styling**: CSS Modules + Tailwind CSS
- **UI Components**: Ant Design 5.x
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Calendar**: React Big Calendar

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18.x 이상
- npm 또는 yarn

### 개발 환경 설정
```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.development

# 개발 서버 시작
npm run dev
```

### 테스트 실행
```bash
# 유닛 테스트
npm test

# 테스트 감시 모드
npm run test:watch

# 테스트 커버리지
npm run test:coverage
```

### 빌드
```bash
# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📁 프로젝트 구조

```
src/
├── api/                    # API 클라이언트
│   ├── authApi.ts         # 인증 API
│   ├── courseApi.ts       # 코스 관리 API
│   ├── bookingApi.ts      # 예약 관리 API
│   └── apiClient.ts       # Axios 인스턴스
├── components/            # React 컴포넌트
│   ├── common/           # 공통 컴포넌트
│   │   ├── Breadcrumb.tsx
│   │   ├── PageLayout.tsx
│   │   └── LoadingSpinner.tsx
│   ├── courses/          # 코스 관리 컴포넌트
│   │   ├── CourseForm.tsx
│   │   ├── TimeSlotForm.tsx
│   │   └── TimeSlotManagement.tsx
│   ├── bookings/         # 예약 관리 컴포넌트
│   │   ├── BookingForm.tsx
│   │   ├── BookingCalendar.tsx
│   │   └── BookingList.tsx
│   └── layout/           # 레이아웃 컴포넌트
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── AppLayout.tsx
├── pages/                # 페이지 컴포넌트
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── CompanyManagement.tsx
│   ├── CourseManagement.tsx
│   └── BookingManagement.tsx
├── store/                # 상태 관리
│   ├── authStore.ts
│   └── types.ts
├── styles/               # 스타일 파일
│   ├── global.css
│   └── variables.css
├── types/                # TypeScript 타입 정의
│   ├── api.types.ts
│   └── component.types.ts
├── utils/                # 유틸리티 함수
│   ├── dateUtils.ts
│   └── formatters.ts
├── App.tsx              # 루트 컴포넌트
└── main.tsx            # 애플리케이션 진입점
```

## 🎨 주요 기능

### 1. 인증 & 권한 관리
- JWT 기반 인증
- 역할 기반 접근 제어 (RBAC)
- 자동 토큰 갱신
- 세션 관리

### 2. 코스 관리
- 코스 CRUD 작업
- 타임슬롯 관리
- 가격 정책 설정
- 코스 이미지 업로드
- 실시간 가용성 확인

### 3. 예약 관리
- 예약 목록 조회 (테이블/캘린더 뷰)
- 예약 상태 관리
- 예약 수정/취소
- 고급 필터링 및 검색
- 예약 통계 대시보드

### 4. 사용자 관리
- 회원 목록 조회
- 회원 정보 수정
- 회원 통계
- 블랙리스트 관리

### 5. 통계 & 리포트
- 실시간 대시보드
- 매출 통계
- 예약 분석
- 사용자 행동 분석

## 🔐 환경 변수

```env
# API 서버
VITE_API_BASE_URL=http://localhost:3091/api

# 환경
VITE_NODE_ENV=development

# 기능 플래그
VITE_ENABLE_MOCK_DATA=true
VITE_ENABLE_ANALYTICS=false

# 외부 서비스
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
VITE_SENTRY_DSN=your-sentry-dsn
```

## 🧪 테스트

### 테스트 구조
```
src/
├── __tests__/           # 통합 테스트
├── components/
│   └── __tests__/      # 컴포넌트 테스트
└── utils/
    └── __tests__/      # 유틸리티 테스트
```

### 테스트 예제
```typescript
// 컴포넌트 테스트
describe('CourseForm', () => {
  it('should render form fields correctly', () => {
    render(<CourseForm />);
    expect(screen.getByLabelText('코스명')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const onSubmit = jest.fn();
    render(<CourseForm onSubmit={onSubmit} />);
    
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
```

## 📊 성능 최적화

### 1. 코드 분할
- React.lazy를 사용한 라우트 기반 분할
- 동적 임포트로 번들 크기 최적화

### 2. 캐싱 전략
- API 응답 캐싱
- 이미지 lazy loading
- Service Worker 활용

### 3. 최적화 기법
- React.memo로 불필요한 리렌더링 방지
- useMemo/useCallback 활용
- Virtual scrolling for large lists

## 🚀 배포

### 프로덕션 빌드
```bash
# 빌드
npm run build

# 빌드 결과물 확인
ls -la dist/
```

### Docker 배포
```bash
# Docker 이미지 빌드
docker build -t admin-dashboard .

# 컨테이너 실행
docker run -p 8080:80 admin-dashboard
```

### CDN 배포
빌드된 파일들은 GitHub Actions를 통해 자동으로 Google Cloud Storage에 업로드되고 Cloud CDN을 통해 제공됩니다.

## 🐛 문제 해결

### 일반적인 문제

1. **API 연결 실패**
   - .env 파일의 VITE_API_BASE_URL 확인
   - CORS 설정 확인
   - 네트워크 프록시 설정

2. **빌드 오류**
   ```bash
   # 캐시 정리
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **타입 오류**
   ```bash
   # TypeScript 타입 재생성
   npm run type-check
   ```

## 📚 추가 문서

- [컴포넌트 가이드](./docs/COMPONENTS.md)
- [상태 관리 가이드](./docs/STATE.md)
- [스타일 가이드](./docs/STYLE.md)
- [API 통합 가이드](./docs/API.md)

## 🤝 기여하기

1. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
2. 변경사항 커밋 (`git commit -m 'feat: Add amazing feature'`)
3. 브랜치 푸시 (`git push origin feature/amazing-feature`)
4. Pull Request 생성

### 코딩 컨벤션
- ESLint 규칙 준수
- Prettier 포맷팅
- 컴포넌트는 함수형으로 작성
- TypeScript strict mode 사용

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

Last updated: 2025-07-06