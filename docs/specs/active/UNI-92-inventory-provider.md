---
issue: UNI-92
pr:
---

# UNI-92 — InventoryProvider 계약: 직접 결합 제거로 클라우드 분리선 확보

> Linear: https://linear.app/uniyous/issue/UNI-92
> 설계: [docs/architecture/erp-booking-split.md](../../architecture/erp-booking-split.md) (UNI-91)
> 서브: UNI-96(인터페이스) · UNI-97(club 1st-party) · UNI-98(partner 3rd-party)

booking-service가 구체 소스(club-service)가 아니라 **계약(InventoryProvider)에만 의존**하도록 전환. 이 계약 경계가 나중에 booking(마켓)/club(매니저)을 독립 클라우드로 쪼갤 분리선이 된다.

## 수용 기준 (검증 가능하게)

- [ ] booking-service에서 club-service NATS 패턴 **직접 호출 0** — `slot.reserve`/`slot.release`/`games.get`/`gameTimeSlots.get`/`club.findOne` 전부 `IInventoryProvider` 경유
- [ ] `reserve()` 응답에 **슬롯 스냅샷 포함** → 캐시미스 동기 호출(`games.get`/`gameTimeSlots.get`, timeout 5s) 제거 (크로스-클라우드 동기호출 0)
- [ ] saga `create-booking`의 `isPartnerClub` **조건 분기 제거** → clubId로 provider 선택(InternalClub vs ExternalPartner)으로 대체
- [ ] `iam.companyMembers.addByBooking` 직접 결합 제거 — provider 또는 saga step으로 이동
- [ ] **club-service 단독 부팅 유지**(회귀 0)
- [ ] 계약만으로 booking-service를 단일소스/집계 양쪽 기동 가능

## 계약 (변경되는 인터페이스)

### IInventoryProvider (booking-service, 신규 — UNI-96)

```ts
export interface IInventoryProvider {
  getAvailability(query: AvailabilityQuery): Promise<SlotAvailability>;
  reserve(req: ReserveRequest): Promise<ReserveResult>;   // 원자적 점유 + 스냅샷 반환
  cancel(ref: ReservationRef): Promise<void>;             // 점유 해제(보상)
  confirm(ref: ReservationRef): Promise<ConfirmResult>;
}

interface ReserveRequest {
  clubId: number;
  gameTimeSlotId: number;
  playerCount: number;
  bookingId: number;
  requestedAt: string;       // ISO
}

interface ReserveResult {
  reservationRef: string;
  // 스냅샷 — booking이 캐시미스 재조회(games.get/gameTimeSlots.get) 안 하도록 reserve가 동봉
  snapshot: { gameName: string; startTime: string; pricePerPerson: number; totalPrice: number };
}
```
- `any` 금지 → 위 타입은 `interface`로 정의. 제네릭/`unknown` 사용.

### 구현체 (어댑터)

| Provider | 래핑 대상 | NATS 패턴 |
|---|---|---|
| `InternalClubProvider` (UNI-97, 1st-party) | club-service + iam | `slot.reserve` / `slot.release` / (availability) / `iam.companyMembers.addByBooking` |
| `ExternalPartnerProvider` (UNI-98, 3rd-party, ACL) | partner-service | `partner.slot.verifyAvailability` / `partner.booking.notifyCreated` / `partner.booking.notifyCancelled` |

- provider 선택 = `clubs.BookingMode`(또는 partnerConfigs.companyId) 기준. 외부 ERP 미사용 골프장 = Internal, 파트너 연동 = External.

### provider 호출 위치 — 결정 B (단일 경계 횡단)

`slot.reserve`는 saga-service step이 club-service로 **직접** 호출(create-booking.saga `RESERVE_SLOT`). booking-service의 직접 결합은 캐시미스 조회·`club.findOne`·`iam`·outbox 보상뿐.

- **B 채택**: saga-service가 provider **선택**(InternalClub=`slot.*` / ExternalPartner=`partner.slot.*`)하여 대상 서비스를 **직접** 호출 → 경계 횡단 **1회**. (A=saga→booking→club은 2회 횡단이라 분리 목적과 충돌, 비채택)
- booking-service의 `IInventoryProvider`/`InternalClubProvider`는 booking 자체 결합(캐시미스 가용성 조회 등)에 사용. partner 어댑터(UNI-98)는 partner-service 계약 정렬 + saga 선택으로 구현(booking-service에 partner 클라 추가 안 함).

### saga-service 변경

- `create-booking.saga.ts`: `CHECK_PARTNER`/`VERIFY_EXTERNAL`/`NOTIFY_EXTERNAL` 조건 분기(`isPartnerClub`) → providerType 키 **선택**으로 대체(분기 제거). `RESERVE_SLOT`은 providerType별 subject 선택(`slot.reserve` vs `partner.slot.reserve`).
- saga 응답 shape `{success, data, saga}` **불변** (BFF 정규화 영향 없음).

## 범위 / 변경 파일

- `services/booking-service/src/` — `IInventoryProvider` 인터페이스 + DI 토큰, 호출부 전환
  - 제거 결합: `booking.service.ts:232-243,461` · `booking-saga-step.service.ts:910,978` · `booking-nats.controller.ts:159,186` · `outbox-processor.service.ts:204-228`
  - NATS 클라 주입: `common/nats/nats.config.ts`(CLUB_SERVICE/IAM_SERVICE/PARTNER_SERVICE) → provider 내부로 은닉
- `services/club-service/src/` — 1st-party 어댑터 정렬(slot.* / game 캐시 동기화를 계약 메서드 뒤로). 내부 패턴(club.* / games.*)은 유지
- `services/partner-service/src/` — 3rd-party 어댑터 표준화(외부 shape → 계약 shape 변환)
- `services/saga-service/src/saga/definitions/create-booking.saga.ts` — partner 분기 → provider 선택

## 배포 의존성

- saga 흐름(step 내부) 변경 → **saga-service · booking-service 동시 배포**. club-service·partner-service 어댑터 정렬도 같은 세트.
- saga **응답 shape 불변** → BFF(user-api/admin-api) 선배포 불요.
- **club-service 단독 부팅 유지**(회귀 가드).
- 공유 패키지화(계약 타입 추출)는 **UNI-112(모노레포 워크스페이스) 선결** → 이번엔 booking-service 내부에 인터페이스 두고, 패키지 추출은 112 이후.

## 미해결 / 결정 필요

- `getAvailability` 캐시 전략: reserve 스냅샷으로 동기호출은 제거하나, 목록 조회용 가용성은 SLOT_SNAPSHOT(booking_db) 캐시 vs 매 호출 — 구현 시 확정.
