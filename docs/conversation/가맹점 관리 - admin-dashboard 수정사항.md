# admin-dashboard 수정사항 (bookingMode 추가)

> 작성일: 2026-03-18

---

## 1. 변경 범위 요약

```mermaid
flowchart LR
  subgraph BACKEND["course-service (백엔드)"]
    B1["Prisma Schema<br/>BookingMode enum 추가"]
    B2["Club DTO<br/>bookingMode 필드 추가"]
    B3["Club Service<br/>필터 지원"]
  end

  subgraph ADMIN["admin-dashboard (프론트엔드)"]
    A1["club.ts 타입<br/>bookingMode 추가"]
    A2["courses.ts API<br/>DTO에 필드 추가"]
    A3["ClubCreatePage<br/>bookingMode 선택 UI"]
    A4["BasicInfoTab<br/>bookingMode 표시/수정"]
    A5["ClubListPage<br/>bookingMode 뱃지"]
  end

  B1 --> B2 --> B3
  B3 -.->|NATS| A1
  A1 --> A2 --> A3
  A1 --> A4
  A1 --> A5

  style BACKEND fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#333
  style ADMIN fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#333
  style B1 fill:#81c784,stroke:#2e7d32,color:#fff
  style B2 fill:#81c784,stroke:#2e7d32,color:#fff
  style B3 fill:#81c784,stroke:#2e7d32,color:#fff
  style A1 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style A2 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style A3 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style A4 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style A5 fill:#ffb74d,stroke:#ef6c00,color:#fff
```

---

## 2. 백엔드 변경 (course-service)

### 2-1. Prisma Schema

```prisma
// services/course-service/prisma/schema.prisma

// 신규 enum
enum BookingMode {
  PLATFORM    // 파크골프메이트 직접 사용
  PARTNER     // 외부 ERP 파트너 연동
}

model Club {
  // ... 기존 필드 유지
  clubType       ClubType     @default(PAID)
  bookingMode    BookingMode  @default(PLATFORM)  // ← 추가
  // ...
}
```

### 2-2. Club DTO

```typescript
// services/course-service/src/club/dto/create-club.dto.ts

// 추가 필드
bookingMode?: 'PLATFORM' | 'PARTNER';  // 기본값: PLATFORM
```

### 2-3. Migration

```bash
npx prisma migrate dev --name add-club-booking-mode
```

---

## 3. admin-dashboard 프론트엔드 변경

### 3-1. 타입 (club.ts)

```typescript
// 현재
export type ClubType = 'PAID' | 'FREE';

// 추가
export type BookingMode = 'PLATFORM' | 'PARTNER';

// Club 인터페이스에 추가
export interface Club {
  // ... 기존 필드
  clubType: ClubType;
  bookingMode: BookingMode;  // ← 추가
}

// CreateClubDto에 추가
export interface CreateClubDto {
  // ... 기존 필드
  bookingMode?: BookingMode;  // ← 추가
}

// UpdateClubDto에 추가
export interface UpdateClubDto {
  // ... 기존 필드
  bookingMode?: BookingMode;  // ← 추가
}
```

### 3-2. API (courses.ts)

DTO 타입 변경만으로 자동 반영 (API 함수 수정 불필요)

### 3-3. ClubCreatePage — bookingMode 선택 UI 추가

현재 `clubType` 선택 UI와 동일한 패턴으로 추가:

```mermaid
flowchart TB
  subgraph FORM["골프장 등록 폼"]
    F1["골프장명 *"]
    F2["지역 *"]
    F3["주소 *"]
    F4["연락처 *"]
    F5["이메일"]
    F6["웹사이트"]
    F7["상태: ACTIVE ▼"]
    F8["유형: 유료/무료 ▼"]
    F9["예약 방식: 플랫폼/파트너 ▼"]
    F10["운영시간: 06:00 ~ 18:00"]
    F11["부대시설: □카트도로 □연습장 ..."]
  end

  style FORM fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#333
  style F9 fill:#42a5f5,stroke:#1565c0,color:#fff
  style F1 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style F2 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style F3 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style F4 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style F5 fill:#ffcc80,stroke:#ef6c00,color:#fff
  style F6 fill:#ffcc80,stroke:#ef6c00,color:#fff
  style F7 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style F8 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style F10 fill:#ffb74d,stroke:#ef6c00,color:#fff
  style F11 fill:#ffb74d,stroke:#ef6c00,color:#fff
```

**추가 코드 위치**: `clubType` 선택 바로 아래

```typescript
// bookingMode 옵션
const bookingModeOptions = [
  { value: 'PLATFORM', label: '플랫폼 (파크골프메이트 직접 사용)' },
  { value: 'PARTNER', label: '파트너 연동 (외부 ERP 연동)' },
];
```

### 3-4. BasicInfoTab — bookingMode 표시/수정

**읽기 모드**: 배지로 표시 (clubType과 동일 패턴)

```typescript
const bookingModeMap = {
  PLATFORM: { label: '플랫폼', className: 'bg-blue-500/20 text-blue-400', icon: '🟢' },
  PARTNER:  { label: '파트너 연동', className: 'bg-amber-500/20 text-amber-400', icon: '🔗' },
};
```

**수정 모드**: Dropdown select

**표시 위치**: `clubType` 배지 옆에 나란히 표시

```
┌──────────────────────────────────────┐
│ 기본정보                              │
│                                      │
│ 골프장명: ○○파크골프장                │
│ 상태: ✅ 운영중   유형: 유료          │
│ 예약방식: 🟢 플랫폼                   │  ← 추가
│ 주소: 서울시 강남구 ...               │
│ 연락처: 02-1234-5678                 │
└──────────────────────────────────────┘
```

### 3-5. ClubListPage — 골프장 카드에 bookingMode 뱃지 추가

현재 카드에 `clubType` 배지가 표시됨. 그 옆에 `bookingMode` 배지 추가:

```
┌──────────────────┐
│ ○○파크골프장       │
│ 유료 🟢 플랫폼    │  ← bookingMode 뱃지 추가
│ 36홀 · 4코스      │
│ 06:00 ~ 18:00    │
│ ✅ 운영 중        │
└──────────────────┘

┌──────────────────┐
│ △△파크골프장       │
│ 유료 🔗 파트너    │  ← PARTNER 표시
│ 18홀 · 2코스      │
│ 06:00 ~ 18:00    │
│ 🔄 동기화 중      │
└──────────────────┘
```

---

## 4. 수정 파일 목록

### 백엔드 (course-service)

| 파일 | 변경 | 내용 |
|------|------|------|
| `prisma/schema.prisma` | 수정 | BookingMode enum + Club.bookingMode 필드 추가 |
| `src/club/dto/create-club.dto.ts` | 수정 | bookingMode 필드 추가 |
| `src/club/dto/update-club.dto.ts` | 수정 | bookingMode 필드 추가 |
| `src/club/club.service.ts` | 수정 | bookingMode 필터 지원 (선택) |

### 프론트엔드 (admin-dashboard)

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/types/club.ts` | 수정 | BookingMode 타입, Club/DTO 인터페이스에 필드 추가 |
| `src/lib/api/courses.ts` | 수정 | CreateClubDto, UpdateClubDto에 bookingMode 추가 |
| `src/pages/club/ClubCreatePage.tsx` | 수정 | bookingMode 선택 Dropdown 추가 |
| `src/pages/club/ClubListPage.tsx` | 수정 | 카드에 bookingMode 뱃지 추가 |
| `src/components/features/club/BasicInfoTab.tsx` | 수정 | 읽기/수정 모드에 bookingMode 표시 |

### BFF (admin-api)

| 파일 | 변경 | 내용 |
|------|------|------|
| Club 관련 DTO | 수정 | bookingMode 필드 전달 (있으면 pass-through) |

> **총 수정 파일: ~9개** (신규 파일 없음, 기존 파일에 필드 추가만)

---

## 5. 변경 영향 분석

```mermaid
flowchart TB
  SCHEMA["Prisma Schema<br/>BookingMode enum 추가"] --> MIGRATE["DB Migration"]
  MIGRATE --> SERVICE["club.service.ts<br/>bookingMode 처리"]
  SERVICE --> DTO["club.dto.ts<br/>필드 추가"]
  DTO --> BFF["admin-api BFF<br/>pass-through"]
  BFF --> TYPE["club.ts 타입<br/>BookingMode 추가"]

  TYPE --> CREATE["ClubCreatePage<br/>Dropdown 추가"]
  TYPE --> LIST["ClubListPage<br/>뱃지 추가"]
  TYPE --> DETAIL["BasicInfoTab<br/>배지/수정 추가"]

  subgraph IMPACT["영향 없음 (변경 불필요)"]
    NO1["코스 관리 탭"]
    NO2["게임/타임슬롯"]
    NO3["예약/결제"]
    NO4["파트너 현황 조회"]
  end

  style SCHEMA fill:#81c784,stroke:#2e7d32,color:#fff
  style MIGRATE fill:#81c784,stroke:#2e7d32,color:#fff
  style SERVICE fill:#81c784,stroke:#2e7d32,color:#fff
  style DTO fill:#81c784,stroke:#2e7d32,color:#fff
  style BFF fill:#4db6ac,stroke:#00796b,color:#fff
  style TYPE fill:#ffb74d,stroke:#ef6c00,color:#fff
  style CREATE fill:#ffb74d,stroke:#ef6c00,color:#fff
  style LIST fill:#ffb74d,stroke:#ef6c00,color:#fff
  style DETAIL fill:#ffb74d,stroke:#ef6c00,color:#fff
  style IMPACT fill:#eceff1,stroke:#78909c,color:#333
  style NO1 fill:#90a4ae,stroke:#455a64,color:#fff
  style NO2 fill:#90a4ae,stroke:#455a64,color:#fff
  style NO3 fill:#90a4ae,stroke:#455a64,color:#fff
  style NO4 fill:#90a4ae,stroke:#455a64,color:#fff

  linkStyle 0,1,2,3,4,5,6,7 stroke:#333,stroke-width:2px
```

> **기존 기능에 영향 없음**: 코스 관리, 게임/타임슬롯, 예약/결제, 파트너 현황 조회는 변경 불필요.
> bookingMode는 **선택 필드(기본값 PLATFORM)**이므로 기존 데이터 호환성 보장.
