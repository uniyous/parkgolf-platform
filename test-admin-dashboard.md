# Park Golf Admin Dashboard 테스트 가이드

## 🏌️ 관리자 계정 목록

### ADMIN 권한 (전체 접근)
- **시스템 관리자**
  - ID: `admin@parkgolf.com`
  - PW: `admin123!@#`
  - 이름: 시스템 관리자
  
- **박정호 매니저**
  - ID: `manager@parkgolf.com`
  - PW: `manager123!@#`
  - 이름: 박정호
  
- **윤지민 재무팀장**
  - ID: `finance@parkgolf.com`
  - PW: `finance123!@#`
  - 이름: 윤지민

### MODERATOR 권한 (관리 접근)
- **김민수 수석관리자**
  - ID: `supervisor@parkgolf.com`
  - PW: `super123!@#`
  - 이름: 김민수
  
- **이영희 코스 관리자**
  - ID: `course.admin@parkgolf.com`
  - PW: `course123!@#`
  - 이름: 이영희
  
- **최성진 예약 관리자**
  - ID: `booking.admin@parkgolf.com`
  - PW: `booking123!@#`
  - 이름: 최성진
  
- **정수아 운영팀장**
  - ID: `operations@parkgolf.com`
  - PW: `ops123!@#`
  - 이름: 정수아

### VIEWER 권한 (읽기 전용)
- **한도윤 지원팀**
  - ID: `support@parkgolf.com`
  - PW: `support123!@#`
  - 이름: 한도윤
  
- **장서준 마케팅팀**
  - ID: `marketing@parkgolf.com`
  - PW: `market123!@#`
  - 이름: 장서준
  
- **송미래 고객서비스팀**
  - ID: `customer.service@parkgolf.com`
  - PW: `cs123!@#`
  - 이름: 송미래

## 🌐 접속 방법

1. **Admin Dashboard 접속**
   - URL: http://localhost:3000
   
2. **로그인**
   - 위의 계정 중 하나를 선택하여 로그인
   - 권한에 따라 접근 가능한 메뉴가 달라집니다

## 🔐 권한별 접근 가능 기능

### ADMIN (전체 권한)
- ✅ 대시보드 전체 접근
- ✅ 사용자 관리 (생성/수정/삭제)
- ✅ 코스 관리 (생성/수정/삭제)
- ✅ 예약 관리 (생성/수정/취소)
- ✅ 재무 데이터 접근
- ✅ 시스템 설정 변경
- ✅ 권한 관리

### MODERATOR (관리 권한)
- ✅ 대시보드 접근
- ✅ 사용자 조회/수정
- ✅ 코스 관리 (생성/수정)
- ✅ 예약 관리 (생성/수정/취소)
- ❌ 재무 데이터 접근 제한
- ❌ 시스템 설정 변경 불가
- ❌ 권한 관리 불가

### VIEWER (읽기 전용)
- ✅ 대시보드 조회
- ✅ 사용자 목록 조회
- ✅ 코스 정보 조회
- ✅ 예약 현황 조회
- ❌ 모든 생성/수정/삭제 불가
- ❌ 재무 데이터 접근 불가
- ❌ 시스템 설정 접근 불가

## 📱 테스트 시나리오

### 1. 로그인 테스트
- 각 권한별로 로그인 테스트
- 잘못된 비밀번호로 로그인 실패 테스트

### 2. 권한 테스트
- ADMIN 계정으로 로그인 → 모든 메뉴 접근 가능 확인
- MODERATOR 계정으로 로그인 → 일부 메뉴 제한 확인
- VIEWER 계정으로 로그인 → 읽기 전용 확인

### 3. 기능 테스트
- 사용자 관리: 새 사용자 추가, 권한 변경
- 코스 관리: 새 코스 추가, 타임슬롯 설정
- 예약 관리: 예약 생성, 수정, 취소