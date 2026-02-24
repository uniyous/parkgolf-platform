# 파크골프메이트 — AI 기반 파크골프 통합 플랫폼 제안서

> **"말 한마디로 예약 완료"** — 대한민국 최초 AI 파크골프 예약 플랫폼

---

## 1. 파크골프 시장 현황과 기회

### 1.1 시장 성장

<p align="center">
  <img src="images/market-growth.png" width="700" alt="파크골프 시장 현황" />
</p>

### 1.2 현재의 문제

<p align="center">
  <img src="images/problem-current.png" width="700" alt="현재 예약 방식의 문제점" />
</p>

---

## 2. 파크골프메이트의 해법

### 2.1 한눈에 보는 비교

<p align="center">
  <img src="images/solution-comparison.png" width="700" alt="전화 vs 기존 앱 vs AI 예약 비교" />
</p>

### 2.2 실제 앱 화면으로 보는 예약 과정

**STEP 1. AI에게 말하기** — 원하는 조건을 자연어로 입력

<p align="center">
  <img src="images/step1-welcome.png" width="280" alt="Step 1: AI 대화 시작" />
</p>

> AI 예약 도우미가 인사하고, 사용자가 **"천안 골프장 2명 예약해 줘"** 라고 입력합니다.

**STEP 2. AI가 찾아준 결과** — 골프장 + 빈 타임슬롯 + 날씨 한눈에

<p align="center">
  <img src="images/step2-results.png" width="280" alt="Step 2: 검색 결과" />
</p>

> AI가 천안 근처 골프장과 **빈 타임슬롯**, **날씨 정보**를 한 화면에 보여줍니다.
> 원하는 시간대를 터치하면 바로 다음 단계로 진행됩니다.

**STEP 3. 예약 확인** — 한눈에 보는 예약 정보 + 결제 방법 선택

<p align="center">
  <img src="images/step3-confirm.png" width="280" alt="Step 3: 예약 확인" />
</p>

> 선택한 골프장, 날짜, 시간, 인원, 금액이 정리되어 표시됩니다.
> **현장결제** 또는 **카드결제**를 선택하고 [예약 확인]을 누르면 끝!

**STEP 4. 예약 완료!** — 예약번호와 상세 내역 즉시 확인

<p align="center">
  <img src="images/step4-complete.png" width="280" alt="Step 4: 예약 완료" />
</p>

> 예약번호, 골프장, 일시, 인원, 결제 금액이 확정됩니다.
> **총 소요시간: 약 15초.** 말 한마디에서 예약 완료까지.

---

### 2.3 자연어 예약 시나리오

<table>
<tr>
<td align="center">

**시나리오 1 — 간편 예약**

<img src="images/scenario1-simple.png" width="340" alt="시나리오 1: 간편 예약" />

> 한마디로 검색부터 예약 완료까지

</td>
<td align="center">

**시나리오 2 — 날씨 포함 추천**

<img src="images/scenario2-weather.png" width="340" alt="시나리오 2: 날씨 포함 추천" />

> 날씨를 확인하고 최적 일정 추천

</td>
</tr>
</table>

<p align="center">

**시나리오 3 — 채팅방 단체 예약**

<img src="images/scenario3-group.png" width="340" alt="시나리오 3: 채팅방 단체 예약" />

> 그룹 채팅방에서 @AI 호출로 단체 예약

</p>

---

## 3. 플랫폼 기능 구성

### 3.1 사용자 앱

<p align="center">
  <img src="images/feature-user.png" width="700" alt="사용자 앱 실제 화면 구성" />
</p>

### 3.2 가맹점(골프장) 관리 시스템

<p align="center">
  <img src="images/feature-admin.png" width="700" alt="가맹점 관리자 대시보드" />
</p>

### 3.3 협회 플랫폼 관리

<p align="center">
  <img src="images/feature-platform.png" width="700" alt="협회 플랫폼 대시보드" />
</p>

---

## 4. 계층형 정책 시스템

협회에서 설정한 기본 정책이 가맹점에 자동으로 적용되고, 가맹점은 필요 시 자체 정책으로 재정의할 수 있습니다.

### 4.1 3단계 계층 구조와 자동 상속

<p align="center">
  <img src="images/policy-hierarchy.png" width="700" alt="정책 계층 구조: PLATFORM → COMPANY → CLUB" />
</p>

> **PLATFORM**(협회) → **COMPANY**(가맹점) → **CLUB**(골프장) 순으로 정책이 상속됩니다.
> 골프장이 별도 설정하지 않으면 상위 정책이 자동 적용되고, 독립 설정 시 자체 정책으로 재정의됩니다.

### 4.2 4가지 정책 유형과 관리 UI

<p align="center">
  <img src="images/policy-types.png" width="700" alt="4가지 정책 유형: 취소, 환불, 노쇼, 운영" />
</p>

> **취소**(마감 시한), **환불**(시간대별 차등률), **노쇼**(단계별 패널티), **운영**(영업시간·요금률) — 각 정책은 독립적으로 관리되며, 관리자 대시보드에서 **"독립 설정"** / **"되돌리기"** 버튼으로 상속을 제어합니다.

---

## 5. 기술 경쟁력

### 5.1 AI 기술

![AI 기술 경쟁력](images/tech-ai.png)

### 5.2 시스템 아키텍처

![시스템 아키텍처](images/tech-arch.png)

---

## 6. 도입 효과

![도입 효과](images/adoption-effects.png)

---

## 7. 도입 로드맵

![도입 로드맵](images/roadmap.png)

---

## 8. 요약

![요약](images/summary.png)

---

**파크골프메이트** | AI 기반 파크골프 통합 플랫폼

**Last Updated**: 2026-02-24
