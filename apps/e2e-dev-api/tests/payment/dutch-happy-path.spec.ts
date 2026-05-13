import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import {
  seedDutchTeam,
  seedAvailableSlot,
  triggerDutchBookingViaAgent,
  extractDutchSplits,
  confirmAllDutchSplits,
} from '../../fixtures/dutch';

/**
 * 더치페이 시나리오 ① Happy Path
 *
 * 검증 흐름
 *   1) 4명 user 동시 생성 + booker가 채팅방 + 3명 초대
 *   2) admin이 club + game + 슬롯 셋업
 *   3) booker가 agent 3단계 호출
 *      ─ selectedClubId
 *      ─ selectedSlotId + teamMembers
 *      ─ confirmBooking + paymentMethod=dutchpay
 *   4) CREATE_BOOKING saga의 PREPARE_SPLIT step이
 *      payment.splitPrepare → 4 PaymentSplit row 생성
 *      → broadcastSettlementCard 메시지 채팅방 발행
 *   5) 채팅방 메시지에서 settlement 카드 metadata → splits[] 추출
 *   6) 각 user가 split/confirm (paymentKey=e2e_test_*)
 *      ─ TOSS_TEST_BYPASS 분기로 토스 API 호출 회피
 *   7) 4번째 confirm 후 booking-service: markParticipantPaid(send) → allPaid
 *      → payment-service: payment.confirmed outbox → PAYMENT_CONFIRMED saga
 *      → booking.status = CONFIRMED
 *   8) booker가 booking 상태 폴링 → CONFIRMED
 *
 * @write @slow — 4명 user + 1 booking + 4 PaymentSplit row 잔존
 */
test.describe('Dutch Payment — Happy Path @write @slow', () => {
  test.setTimeout(180_000);

  test('4명 더치페이 → 모두 결제 → booking CONFIRMED', async ({ request, adminToken }) => {
    // 1) 4명 user + 채팅방
    const { booker, members, roomId } = await seedDutchTeam(request, 4);
    console.log(`[team] booker=${booker.userId} members=[${members.map((m) => m.userId).join(',')}] room=${roomId}`);

    // 2) admin 슬롯 셋업
    const setup = await seedAvailableSlot(request, adminToken);
    console.log(`[setup] club=${setup.clubId}(${setup.clubName}) game=${setup.gameId}(${setup.gameName}) slot=${setup.slotId} date=${setup.date} ${setup.startTime}`);

    // 3) agent 3단계 호출
    await triggerDutchBookingViaAgent(request, booker, members, roomId, setup);

    // 4~5) splits 추출 — broadcast 메시지가 발행될 때까지 잠시 폴링
    let splits = await extractDutchSplits(request, booker, roomId);
    await expect
      .poll(
        async () => {
          if (splits.length > 0) return splits.length;
          splits = await extractDutchSplits(request, booker, roomId);
          return splits.length;
        },
        { timeout: 20_000, intervals: [500, 1000, 2000] },
      )
      .toBeGreaterThanOrEqual(4);
    console.log(`[splits] count=${splits.length} ${JSON.stringify(splits).slice(0, 300)}`);

    // booker는 settlement card target에 포함 안 될 수 있음 — booker용 split은 PaymentSplit에는 존재
    // splits에 booker가 포함되지 않은 경우 booker만 별도 처리 필요. 우선 splits만큼 confirm 시도.
    const splitUserIds = splits.map((s) => s.userId);
    const membersInSplit = members.filter((m) => splitUserIds.includes(m.userId));
    console.log(`[confirm] target user count=${membersInSplit.length}`);

    // 6) 각자 split/confirm
    await confirmAllDutchSplits(request, membersInSplit, splits);

    // 7~8) booker 토큰으로 booking 상태 폴링
    // booking id는 splits에 없으니 booker의 my bookings에서 가장 최근 dutch booking 찾기
    const myRes = await request.get('/api/user/bookings', { headers: authHeaders(booker.accessToken) });
    expect(myRes.ok()).toBeTruthy();
    const myBody = await myRes.json();
    const myList = myBody?.data ?? myBody;
    const items: any[] = Array.isArray(myList) ? myList : myList?.items ?? [];
    const dutchBooking = items
      .filter((b) => b.paymentMethod === 'dutchpay')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    expect(dutchBooking, 'dutch booking not found in booker my list').toBeTruthy();
    const bookingId: number = dutchBooking.id ?? dutchBooking.bookingId;
    console.log(`[booking] id=${bookingId} initialStatus=${dutchBooking.status}`);

    let finalStatus: string | null = null;
    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/user/bookings/${bookingId}`, {
            headers: authHeaders(booker.accessToken),
          });
          if (!r.ok()) return r.status();
          const b = (await r.json())?.data ?? (await r.json());
          finalStatus = b?.status ?? null;
          return finalStatus;
        },
        {
          timeout: 30_000,
          intervals: [1000, 2000, 3000, 5000],
          message: 'booking did not reach CONFIRMED',
        },
      )
      .toBe('CONFIRMED');

    console.log(`[final] booking ${bookingId} status=${finalStatus}`);

    // cleanup: booking 취소
    await request.delete(`/api/user/bookings/${bookingId}`, {
      headers: authHeaders(booker.accessToken),
      data: { reason: 'e2e cleanup' },
    });
  });
});
