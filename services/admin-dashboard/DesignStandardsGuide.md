# 파크골프 관리 시스템 디자인 표준 가이드

## 📋 개요

파크골프 관리 시스템의 일관된 사용자 경험을 위한 디자인 표준 가이드입니다. TailwindCSS v4 기반으로 작성되었습니다.

---

## 🎨 컬러 시스템

### Primary Colors (메인 컬러)
```css
/* Blue - 메인 브랜드 컬러 */
bg-blue-50     /* 연한 배경 (#eff6ff) */
bg-blue-100    /* 호버 배경 (#dbeafe) */
bg-blue-600    /* 메인 버튼 (#2563eb) */
bg-blue-700    /* 호버 버튼 (#1d4ed8) */
text-blue-600  /* 메인 텍스트 (#2563eb) */
border-blue-200 /* 테두리 (#c3ddfd) */
```

### Status Colors (상태 컬러)
```css
/* Success - 성공/활성 */
bg-green-100   /* 배경 (#dcfce7) */
text-green-800 /* 텍스트 (#166534) */

/* Warning - 경고 */
bg-yellow-100  /* 배경 (#fef3c7) */
text-yellow-800 /* 텍스트 (#92400e) */

/* Error - 오류/삭제 */
bg-red-50      /* 연한 배경 (#fef2f2) */
bg-red-100     /* 배경 (#fee2e2) */
text-red-600   /* 텍스트 (#dc2626) */
text-red-700   /* 진한 텍스트 (#b91c1c) */
border-red-200 /* 테두리 (#fecaca) */
```

### Neutral Colors (중성 컬러)
```css
/* Gray Scale */
bg-gray-50     /* 매우 연한 배경 (#f9fafb) */
bg-gray-100    /* 연한 배경 (#f3f4f6) */
bg-gray-200    /* 이미지 플레이스홀더 (#e5e7eb) */
text-gray-400  /* 플레이스홀더 텍스트 (#9ca3af) */
text-gray-500  /* 보조 텍스트 (#6b7280) */
text-gray-600  /* 일반 텍스트 (#4b5563) */
text-gray-700  /* 레이블 텍스트 (#374151) */
text-gray-900  /* 제목 텍스트 (#111827) */
border-gray-200 /* 일반 테두리 (#e5e7eb) */
border-gray-300 /* 입력 테두리 (#d1d5db) */
```

---

## 🔤 타이포그래피

### 제목 스타일
```css
/* Page Title */
.page-title {
  @apply text-2xl font-bold text-gray-900;
}

/* Section Title */
.section-title {
  @apply text-lg font-medium text-gray-900;
}

/* Card Title */
.card-title {
  @apply text-xl font-semibold text-gray-900;
}

/* Table Header */
.table-header {
  @apply text-sm font-medium text-gray-700;
}
```

### 본문 텍스트
```css
/* Body Text */
.body-text {
  @apply text-sm text-gray-900;
}

/* Caption Text */
.caption-text {
  @apply text-sm text-gray-600;
}

/* Small Text */
.small-text {
  @apply text-xs text-gray-500;
}

/* Helper Text */
.helper-text {
  @apply text-xs text-gray-400;
}
```

---

## 📦 컴포넌트 표준

### 1. 버튼 (Button)

#### Primary Button
```css
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md 
         hover:bg-blue-700 disabled:opacity-50 
         disabled:cursor-not-allowed transition-colors;
}
```

#### Secondary Button
```css
.btn-secondary {
  @apply px-4 py-2 text-gray-700 bg-gray-100 
         hover:bg-gray-200 rounded-md transition-colors;
}
```

#### Outline Button
```css
.btn-outline {
  @apply px-4 py-2 text-blue-600 border border-blue-200 
         bg-blue-50 hover:bg-blue-100 rounded-md transition-colors;
}
```

#### Danger Button
```css
.btn-danger {
  @apply px-4 py-2 text-red-600 border border-red-200 
         bg-red-50 hover:bg-red-100 rounded-md transition-colors;
}
```

#### Button Sizes
```css
.btn-sm { @apply px-3 py-2 text-sm; }
.btn-md { @apply px-4 py-2 text-sm; }  /* Default */
.btn-lg { @apply px-6 py-3 text-base; }
```

### 2. 입력 필드 (Input)

#### Text Input
```css
.input-base {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md 
         focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.input-error {
  @apply border-red-500 focus:ring-red-500;
}
```

#### Label
```css
.input-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.input-label-required::after {
  content: " *";
  @apply text-red-500;
}
```

#### Error Message
```css
.input-error-message {
  @apply mt-1 text-sm text-red-600;
}
```

### 3. 카드 (Card)

#### Base Card
```css
.card-base {
  @apply bg-white rounded-lg border border-gray-200;
}

.card-with-shadow {
  @apply bg-white rounded-lg shadow-xl;
}
```

#### Card Content
```css
.card-header {
  @apply p-6 border-b border-gray-200;
}

.card-body {
  @apply p-6;
}

.card-footer {
  @apply p-6 border-t border-gray-200;
}
```

### 4. 테이블 (Table)

#### Table Container
```css
.table-container {
  @apply bg-white rounded-lg border border-gray-200;
}

.table-scrollable {
  @apply overflow-x-auto;
}
```

#### Table Elements
```css
.table-base {
  @apply min-w-full;
}

.table-header {
  @apply border-b border-gray-200;
}

.table-row {
  @apply border-b border-gray-200 hover:bg-gray-50;
}

.table-cell {
  @apply px-4 py-4 text-sm text-gray-900;
}

.table-cell-header {
  @apply px-4 py-3 text-left text-sm font-medium text-gray-700;
}
```

### 5. 모달 (Modal)

#### Modal Overlay
```css
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}
```

#### Modal Container
```css
.modal-sm { @apply w-full max-w-md mx-4; }
.modal-md { @apply w-full max-w-2xl mx-4; }
.modal-lg { @apply w-full max-w-4xl mx-4; }

.modal-scrollable {
  @apply max-h-[90vh] overflow-y-auto;
}
```

#### Modal Content
```css
.modal-content {
  @apply bg-white rounded-lg shadow-xl;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b;
}

.modal-body {
  @apply p-6;
}

.modal-footer {
  @apply flex justify-end space-x-3 p-6 border-t;
}
```

### 6. 배지 (Badge)

#### Status Badges
```css
.badge-success {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full 
         text-xs font-medium bg-green-100 text-green-800;
}

.badge-danger {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full 
         text-xs font-medium bg-red-100 text-red-800;
}

.badge-warning {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full 
         text-xs font-medium bg-yellow-100 text-yellow-800;
}
```

### 7. 이미지 영역

#### Image Container
```css
.image-container {
  @apply rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50;
}

.image-preview {
  @apply aspect-video; /* 16:9 비율 */
}

.image-thumbnail {
  @apply w-16 h-12 rounded-lg overflow-hidden bg-gray-200;
}
```

#### Image Placeholder
```css
.image-placeholder {
  @apply w-full h-full flex flex-col items-center justify-center text-gray-400;
}

.image-placeholder-icon {
  @apply w-12 h-12 mb-2;
}

.image-placeholder-text {
  @apply text-sm font-medium;
}

.image-placeholder-caption {
  @apply text-xs text-center mt-1;
}
```

---

## 📐 간격 시스템 (Spacing)

### 컴포넌트 간격
```css
/* Section Spacing */
.section-spacing { @apply space-y-6; }

/* Card Spacing */
.card-spacing { @apply space-y-4; }

/* Form Spacing */
.form-spacing { @apply space-y-4; }

/* Button Group Spacing */
.button-group { @apply flex space-x-3; }
.button-group-sm { @apply flex space-x-2; }
```

### 패딩/마진 표준
```css
/* Padding */
p-3  /* 12px - 작은 패딩 */
p-4  /* 16px - 기본 패딩 */
p-6  /* 24px - 큰 패딩 */

/* Margin */
mb-1 /* 4px - 작은 마진 */
mb-2 /* 8px - 기본 마진 */
mb-3 /* 12px - 중간 마진 */
mb-4 /* 16px - 큰 마진 */
mb-6 /* 24px - 섹션 마진 */
```

---

## 🎯 상태 표시

### 로딩 상태
```css
.loading-spinner {
  @apply animate-spin rounded-full border-b-2;
}

.loading-spinner-sm { @apply h-4 w-4 border-white; }
.loading-spinner-md { @apply h-6 w-6 border-blue-600; }
.loading-spinner-lg { @apply h-8 w-8 border-blue-600; }
```

### 빈 상태 (Empty State)
```css
.empty-state {
  @apply text-center py-12 text-gray-500;
}

.empty-state-icon {
  @apply text-6xl mb-4;
}

.empty-state-title {
  @apply text-lg font-medium text-gray-900 mb-2;
}

.empty-state-description {
  @apply text-gray-500 mb-4;
}
```

### 알림 상태
```css
.alert-success {
  @apply bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded;
}

.alert-error {
  @apply bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded;
}

.alert-warning {
  @apply bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded;
}

.alert-info {
  @apply bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded;
}
```

---

## 📱 반응형 디자인

### 브레이크포인트
```css
/* Mobile First */
sm: 640px   /* 태블릿 세로 */
md: 768px   /* 태블릿 가로 */
lg: 1024px  /* 데스크톱 */
xl: 1280px  /* 큰 데스크톱 */
```

### 그리드 시스템
```css
/* Mobile */
.grid-mobile { @apply grid grid-cols-1 gap-4; }

/* Tablet */
.grid-tablet { @apply grid grid-cols-1 md:grid-cols-2 gap-4; }

/* Desktop */
.grid-desktop { @apply grid grid-cols-1 lg:grid-cols-3 gap-6; }
```

---

## 🔧 유틸리티 클래스

### 커스텀 유틸리티
```css
/* Truncate Text */
.truncate-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* Aspect Ratios */
.aspect-square { @apply aspect-[1/1]; }
.aspect-video { @apply aspect-[16/9]; }
.aspect-photo { @apply aspect-[4/3]; }

/* Focus Ring */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}
```

---

## 📋 컴포넌트 사용 가이드라인

### 1. 페이지 레이아웃
```jsx
<div className="space-y-6">
  {/* 페이지 헤더 */}
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold text-gray-900">페이지 제목</h1>
    <button className="btn-primary">액션 버튼</button>
  </div>
  
  {/* 메인 컨텐츠 */}
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    {/* 컨텐츠 */}
  </div>
</div>
```

### 2. 폼 레이아웃
```jsx
<form className="space-y-4">
  <div>
    <label className="input-label input-label-required">필드명</label>
    <input className="input-base" />
    <p className="input-error-message">에러 메시지</p>
  </div>
</form>
```

### 3. 테이블 레이아웃
```jsx
<div className="table-container">
  <div className="table-scrollable">
    <table className="table-base">
      <thead className="table-header">
        <tr>
          <th className="table-cell-header">헤더</th>
        </tr>
      </thead>
      <tbody>
        <tr className="table-row">
          <td className="table-cell">데이터</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## 🎨 이미지 가이드라인

### 이미지 규격
- **코스 이미지**: 16:9 비율, 1920x1080px 권장
- **홀 이미지**: 16:9 비율, 1920x1080px 권장
- **썸네일**: 적응형 크기, object-cover 적용
- **최대 파일 크기**: 5MB
- **지원 형식**: JPG, PNG, WebP

### 이미지 상태
- **로딩**: 회색 배경 + 로딩 스피너
- **에러**: 회색 배경 + "이미지 없음" 텍스트
- **플레이스홀더**: 회색 배경 + 아이콘 + 안내 텍스트

---

## ✅ 접근성 (Accessibility)

### 필수 준수사항
- **색상 대비**: WCAG 2.1 AA 레벨 준수
- **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능
- **스크린 리더**: 의미있는 alt 텍스트 제공
- **포커스 표시**: 명확한 포커스 링 제공

### ARIA 라벨 사용
```jsx
// 버튼
<button aria-label="홀 삭제">삭제</button>

// 이미지
<img alt="코스 전경 이미지" src="..." />

// 입력 필드
<input aria-describedby="error-message" />
<p id="error-message">에러 설명</p>
```

---

## 🔄 애니메이션

### 표준 트랜지션
```css
.transition-standard { @apply transition-colors duration-200; }
.transition-fast { @apply transition-all duration-150; }
.transition-slow { @apply transition-all duration-300; }
```

### 호버 효과
```css
.hover-lift { @apply hover:-translate-y-1 hover:shadow-lg; }
.hover-scale { @apply hover:scale-105; }
.hover-fade { @apply hover:opacity-80; }
```

---

이 가이드를 따라 일관된 디자인 시스템을 구축하여 사용자 경험을 향상시키고 개발 효율성을 높일 수 있습니다.