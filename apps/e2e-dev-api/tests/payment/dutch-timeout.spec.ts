import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import {
  seedDutchTeam,
  seedAvailableSlot,
  triggerDutchBookingViaAgent,
  extractDutchSplits,
} from '../../fixtures/dutch';
import { makeE2ePaymentKey } from '../../fixtures/toss';

/**
 * 더치페이 시나리오 — 잠수 (PAYMENT_TIMEOUT 자동 발화)
 *
 * 시퀀스
 *   1) 4명 더치페이 셋업 + splits 발급
 *   2) booker 1명만 confirm (PAID 1건)
 *   3) 나머지 3명은 무응답 (잠수)
 *   4) 3분 + 버퍼 대기
 *      → saga-engine이 CREATE_BOOKING 종료 시 등록한 payment-timeout job 발화
 *      → saga-pgboss-worker.handlePaymentTimeout
 *      → booking.status === SLOT_RESERVED 확인 → PAYMENT_TIMEOUT saga 시작
 *      → REFUND_PAID_SPLITS (booker 환불 + PENDING 3건 EXPIRED)
 *      → MARK_BOOKING_FAILED → booking.status = FAILED
 *   5) booker 토큰으로 booking 폴링 → FAILED 확인
 *
 * @write @slow (~4~5분)
 *
 * 비용 고려: 실 3분 대기 + 폴링 버퍼. jobs.startAfter는 운영 정책이라 단축 불가.
 *   본 spec은 실시간으로 실행. 자주 돌릴 spec 아님.
 */
test.describe('Dutch Payment — Timeout 잠수 자동 정리 @write @slow @longwait', () => {
  test.setTimeout(6 * 60_000); // 6분

  test('1명 결제 + 3명 잠수 → 3분 후 PAYMENT_TIMEOUT → booking FAILED', async ({
    request,
    adminToken,
  }) => {
    // 1) 셋업
    const { booker, members, roomId } = await seedDutchTeam(request, 4);
    const setup = await seedAvailableSlot(request, adminToken);
    await triggerDutchBookingViaAgent(request, booker, members, roomId, setup);

    // splits 추출
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
    console.log(`[splits] ${splits.length} orders, bookingId in metadata`);

    // 2) booker 1명만 confirm
    const bookerSplit = splits.find((s) => s.userId === booker.userId)!;
    const key = makeE2ePaymentKey(bookerSplit.orderId, bookerSplit.amount);
    const cfRes = await request.post('/api/user/payments/split/confirm', {
      headers: authHeaders(booker.accessToken),
      data: { orderId: bookerSplit.orderId, paymentKey: key.paymentKey, amount: bookerSplit.amount },
    });
    expect(cfRes.ok(), `booker confirm [${cfRes.status()}]`).toBeTruthy();
    console.log(`[paid] booker user=${booker.userId} order=${bookerSplit.orderId}`);

    // booking 정보 찾기 (booker my list)
    const myRes = await request.get('/api/user/bookings', {
      headers: authHeaders(booker.accessToken),
    });
    expect(myRes.ok()).toBeTruthy();
    const items: any[] = ((await myRes.json())?.data ?? []) as any[];
    const dutch = items
      .filter((b) => b.paymentMethod === 'dutchpay')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const bookingId: number = dutch.id;
    console.log(`[booking] id=${bookingId} status=${dutch.status} (SLOT_RESERVED 유지 예상)`);

    // 3) 3분 + 버퍼 대기 — 30초 간격 폴링
    console.log(`[wait] PAYMENT_TIMEOUT 발화 대기 (최대 ~4분)`);
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
          console.log(`[poll] booking=${bookingId} status=${finalStatus}`);
          return finalStatus;
        },
        {
          timeout: 5 * 60_000,                  // 5분 폴링 (3분 timeout + 2분 버퍼)
          intervals: [30_000, 30_000, 30_000],  // 30초 간격
          message: 'expected PAYMENT_TIMEOUT → booking FAILED',
        },
      )
      .toBe('FAILED');

    console.log(`[final] booking ${bookingId} status=${finalStatus}`);
  });

  test('3명 booking — 전원 잠수 → 3분 후 PAYMENT_TIMEOUT → booking FAILED + splits 전체 EXPIRED', async ({
    request,
    adminToken,
  }) => {
    test.setTimeout(6 * 60_000); // 6분

    // 1) 3명 셋업 (booker + 멤버 2명)
    const { booker, members, roomId } = await seedDutchTeam(request, 3);
    const setup = await seedAvailableSlot(request, adminToken);
    await triggerDutchBookingViaAgent(request, booker, members, roomId, setup);

    // splits 추출 (3건 발급 대기)
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
      .toBeGreaterThanOrEqual(3);
    console.log(`[splits] ${splits.length} orders prepared (전원 잠수 — confirm 호출 없음)`);

    // 2) booking 찾기
    const myRes = await request.get('/api/user/bookings', {
      headers: authHeaders(booker.accessToken),
    });
    expect(myRes.ok()).toBeTruthy();
    const items: any[] = ((await myRes.json())?.data ?? []) as any[];
    const dutch = items
      .filter((b) => b.paymentMethod === 'dutchpay')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const bookingId: number = dutch.id;
    console.log(`[booking] id=${bookingId} status=${dutch.status} playerCount=${dutch.playerCount} (paid=0)`);
    expect(dutch.playerCount, 'playerCount=3 확인').toBe(3);

    // 3) 3분 + 버퍼 대기 — 전원 미결제 상태에서 PAYMENT_TIMEOUT 자동 발화
    console.log(`[wait] 전원 잠수 → PAYMENT_TIMEOUT 발화 대기 (~3.5분)`);
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
          console.log(`[poll] booking=${bookingId} status=${finalStatus}`);
          return finalStatus;
        },
        {
          timeout: 5 * 60_000,
          intervals: [30_000, 30_000, 30_000],
          message: 'expected PAYMENT_TIMEOUT(전원 잠수) → booking FAILED',
        },
      )
      .toBe('FAILED');

    // 4) splits 최종 상태 검증 — 모두 EXPIRED여야 함
    const finalSplits = await extractDutchSplits(request, booker, roomId);
    const expired = finalSplits.filter((s: any) => s.status === 'EXPIRED').length;
    const paid = finalSplits.filter((s: any) => s.status === 'PAID').length;
    console.log(
      `[final] booking ${bookingId} status=${finalStatus}, splits total=${finalSplits.length} EXPIRED=${expired} PAID=${paid}`,
    );
    expect(paid, '결제자 없어야 함').toBe(0);
    expect(expired, '모든 split이 EXPIRED여야 함').toBe(finalSplits.length);
    expect(finalSplits.length, '3명 split').toBe(3);
  });
});
