/**
 * InventoryProvider 계약 (UNI-92 / UNI-96)
 *
 * booking-service가 구체 소스(club-service)가 아니라 이 계약에만 의존하도록 하는 추상화.
 * 이 계약 경계가 나중에 booking(마켓)/club(매니저)을 독립 클라우드로 쪼갤 분리선이 된다.
 *
 * 구현체(어댑터):
 *   - InternalClubProvider (UNI-97, 1st-party) — club-service + iam 래핑
 *   - ExternalPartnerProvider (UNI-98, 3rd-party ACL) — partner-service 래핑
 *
 * 설계: docs/specs/active/UNI-92-inventory-provider.md
 */

/** 슬롯 스냅샷 — reserve/getAvailability가 동봉해 booking이 캐시미스 재조회(games.get/gameTimeSlots.get)를 하지 않게 한다. */
export interface SlotSnapshot {
  gameTimeSlotId: number;
  gameId: number;
  gameName: string;
  gameCode: string;
  clubId: number;
  clubName: string;
  date: string; // ISO
  startTime: string;
  endTime: string;
  pricePerPerson: number;
  maxPlayers: number;
  bookedPlayers: number;
  availablePlayers: number;
  isPremium: boolean;
}

export interface AvailabilityQuery {
  clubId: number;
  gameTimeSlotId: number;
  playerCount: number;
  bookingDate?: string;
  startTime?: string;
}

export interface SlotAvailability {
  gameTimeSlotId: number;
  available: boolean;
  snapshot: SlotSnapshot;
}

export interface ReserveRequest {
  bookingId: number;
  clubId: number;
  gameTimeSlotId: number;
  playerCount: number;
  requestedAt: string; // ISO
}

export interface ReserveResult {
  reservationRef: string;
  reserved: boolean;
  /** 캐시미스 동기호출 제거용 — reserve 성공 시 슬롯 스냅샷 동봉 */
  snapshot: SlotSnapshot;
}

export interface ReservationRef {
  bookingId: number;
  gameTimeSlotId: number;
  playerCount: number;
  reservationRef?: string;
  reason?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
}

/**
 * 인벤토리 소스-무관 계약.
 * 단일소스(1st-party club) / 집계(3rd-party partner) 어느 쪽이든 동일 시그니처로 기동.
 */
export interface IInventoryProvider {
  getAvailability(query: AvailabilityQuery): Promise<SlotAvailability>;
  reserve(req: ReserveRequest): Promise<ReserveResult>;
  cancel(ref: ReservationRef): Promise<void>;
  confirm(ref: ReservationRef): Promise<ConfirmResult>;
}

/** DI 토큰 — clubId/BookingMode 기준으로 Internal/External 구현체를 바인딩. */
export const INVENTORY_PROVIDER = Symbol('INVENTORY_PROVIDER');
