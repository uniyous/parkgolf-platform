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
 * 더치페이 시나리오 — 참여자 본인 자리 취소 (빈자리 유지)
 *
 * AGENT_PAY.md §11.4 / BOOKING.md §7.7
 *
 * 검증 흐름
 *   1) seedDutchTeam(4) — booker + 3명
 *   2) admin이 슬롯 셋업
 *   3) 4명 더치페이 풀결제 → booking CONFIRMED
 *   4) 참여자 1명이 `DELETE /api/user/bookings/:id/participant`
 *      → refundedAmount > 0, bookingCancelled=false, remainingParticipants=3
 *   5) 검증:
 *      - 본인: myParticipantStatus=REFUNDED + canCancel 미노출(또는 isMyParticipantCancelled)
 *      - booker: booking.status=CONFIRMED 유지 (빈자리 1자리)
 *      - 다른 참여자: myParticipantStatus=PAID 유지 (영향 없음)
 *   6) 남은 3명도 순차 취소 → 마지막 1명 시점에 booking.status=CANCELLED 자동 전이
 *
 * @write @slow — 4명 user + 1 booking + 4 PaymentSplit 잔존
 */
test.describe('Dutch Payment — Participant Cancel (AGENT_PAY.md §11.4) @write @slow', () => {
  test.setTimeout(240_000);

  test('1명 본인 자리 취소 → 환불 + 슬롯 1자리 release / 다른 참여자 영향 없음 / 마지막 취소 시 booking CANCELLED', async ({ request, adminToken }) => {
    // 1~3) 4명 더치페이 풀결제 (dutch-happy-path와 동일 셋업)
    const { booker, members, roomId } = await seedDutchTeam(request, 4);
    console.log(`[team] booker=${booker.userId} members=[${members.map((m) => m.userId).join(',')}]`);

    const setup = await seedAvailableSlot(request, adminToken);
    console.log(`[setup] club=${setup.clubId} game=${setup.gameId} slot=${setup.slotId} ${setup.date} ${setup.startTime}`);

    await triggerDutchBookingViaAgent(request, booker, members, roomId, setup);

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

    const splitUserIds = splits.map((s) => s.userId);
    const membersInSplit = members.filter((m) => splitUserIds.includes(m.userId));
    await confirmAllDutchSplits(request, membersInSplit, splits);

    // booker가 booking id 조회
    const myRes = await request.get('/api/user/bookings', { headers: authHeaders(booker.accessToken) });
    expect(myRes.ok()).toBeTruthy();
    const myBody = await myRes.json();
    const myList = myBody?.data ?? myBody;
    const items: any[] = Array.isArray(myList) ? myList : myList?.items ?? [];
    const dutchBooking = items
      .filter((b) => b.paymentMethod === 'dutchpay')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    expect(dutchBooking, 'dutch booking not found').toBeTruthy();
    const bookingId: number = dutchBooking.id ?? dutchBooking.bookingId;

    // booking CONFIRMED 도달 대기 (전원 결제 완료)
    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/user/bookings/${bookingId}`, {
            headers: authHeaders(booker.accessToken),
          });
          if (!r.ok()) return r.status();
          const b = (await r.json())?.data;
          return b?.status ?? null;
        },
        { timeout: 30_000, intervals: [1000, 2000, 3000], message: 'booking did not reach CONFIRMED' },
      )
      .toBe('CONFIRMED');

    console.log(`[booking] id=${bookingId} status=CONFIRMED (4명 전원 결제)`);

    // 4) 참여자 1명 본인 자리 취소 — booker가 아닌 3번째 멤버 선택
    const canceller = membersInSplit.find((m) => m.userId !== booker.userId);
    expect(canceller, 'no non-booker participant for cancel test').toBeTruthy();

    const cancelRes = await request.delete(`/api/user/bookings/${bookingId}/participant`, {
      headers: authHeaders(canceller!.accessToken),
      data: { reason: 'e2e participant cancel' },
    });
    expect(cancelRes.ok(), `cancelParticipant [${cancelRes.status()}]: ${await cancelRes.text()}`).toBeTruthy();
    const cancelBody = await cancelRes.json();
    const cancelData = cancelBody?.data ?? cancelBody;
    console.log(`[cancel] user=${canceller!.userId} body=${JSON.stringify(cancelData)}`);

    expect(cancelData.previousStatus).toBe('PAID');
    expect(cancelData.newStatus).toBe('REFUNDED');
    expect(cancelData.refundedAmount).toBeGreaterThan(0);
    expect(cancelData.bookingCancelled).toBe(false);
    expect(cancelData.remainingParticipants).toBe(3);

    // 5-a) 본인 다시 조회 — 마이페이지에 노출되고 myParticipantStatus=REFUNDED
    const cancellerMyRes = await request.get('/api/user/bookings/search?page=1&limit=20', {
      headers: authHeaders(canceller!.accessToken),
    });
    expect(cancellerMyRes.ok()).toBeTruthy();
    const cancellerMyBody = (await cancellerMyRes.json())?.data;
    const cancellerBookings: any[] = cancellerMyBody?.bookings ?? [];
    const myCancelled = cancellerBookings.find((b) => b.id === bookingId);
    expect(myCancelled, 'cancelled booking not visible in canceller my list').toBeTruthy();
    expect(myCancelled.myParticipantStatus).toBe('REFUNDED');
    expect(myCancelled.myRole).toBe('MEMBER');
    console.log(`[canceller-view] booking ${bookingId} myParticipantStatus=${myCancelled.myParticipantStatus}`);

    // 5-b) booker 시점: booking.status=CONFIRMED 유지 (빈자리)
    const bookerCheckRes = await request.get(`/api/user/bookings/${bookingId}`, {
      headers: authHeaders(booker.accessToken),
    });
    const bookerCheckBody = (await bookerCheckRes.json())?.data;
    expect(bookerCheckBody.status).toBe('CONFIRMED');
    console.log(`[booker-view] booking ${bookingId} status=CONFIRMED (빈자리 유지)`);

    // 5-c) 다른 참여자(취소자 아님)는 PAID 유지
    const otherMember = membersInSplit.find((m) => m.userId !== canceller!.userId && m.userId !== booker.userId);
    if (otherMember) {
      const otherSearchRes = await request.get('/api/user/bookings/search?page=1&limit=20', {
        headers: authHeaders(otherMember.accessToken),
      });
      const otherBookings: any[] = ((await otherSearchRes.json())?.data?.bookings) ?? [];
      const otherView = otherBookings.find((b) => b.id === bookingId);
      expect(otherView, 'other member should still see booking').toBeTruthy();
      expect(otherView.myParticipantStatus).toBe('PAID');
      console.log(`[other-view] user=${otherMember.userId} myParticipantStatus=PAID 유지`);
    }

    // 6) 남은 3명(booker 포함) 순차 취소 → 마지막 시점 booking.status=CANCELLED
    const remaining = membersInSplit.filter((m) => m.userId !== canceller!.userId);
    for (let i = 0; i < remaining.length; i++) {
      const m = remaining[i];
      const isLast = i === remaining.length - 1;
      const r = await request.delete(`/api/user/bookings/${bookingId}/participant`, {
        headers: authHeaders(m.accessToken),
        data: { reason: `e2e cascade ${i + 1}` },
      });
      expect(r.ok(), `cascade cancel user=${m.userId} [${r.status()}]`).toBeTruthy();
      const body = (await r.json())?.data;
      console.log(`[cascade ${i + 1}/${remaining.length}] user=${m.userId} bookingCancelled=${body.bookingCancelled} remaining=${body.remainingParticipants}`);

      if (isLast) {
        expect(body.bookingCancelled).toBe(true);
        expect(body.remainingParticipants).toBe(0);
      } else {
        expect(body.bookingCancelled).toBe(false);
      }
    }

    // 최종 booking.status=CANCELLED
    const finalRes = await request.get(`/api/user/bookings/${bookingId}`, {
      headers: authHeaders(booker.accessToken),
    });
    const finalBody = (await finalRes.json())?.data;
    expect(finalBody.status).toBe('CANCELLED');
    console.log(`[final] booking ${bookingId} status=CANCELLED (모든 participant 취소)`);
  });
});
