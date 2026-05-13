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
 * 더치페이 시나리오 — 1명 명시적 취소(abandon) 즉시 처리
 *
 * 시퀀스
 *   1) 4명 더치페이 셋업 + splits 발급
 *   2) booker(1번), member1(2번) — 정상 confirm
 *   3) member2(3번) — POST /payments/:orderId/abandon (명시적 취소)
 *      → split.status=CANCELLED + outbox payment.failed
 *      → saga PAYMENT_FAILED 즉시 시작
 *         REFUND_PAID_SPLITS (PAID 2건 환불)
 *         MARK_BOOKING_FAILED (booking.status=FAILED)
 *         RELEASE_SLOT
 *   4) member3는 PENDING 그대로 → REFUND_PAID_SPLITS step에서 EXPIRED 처리
 *   5) booker 토큰으로 booking 폴링 → FAILED 확인
 *
 * @write @slow
 */
test.describe('Dutch Payment — Abort 즉시 처리 @write @slow', () => {
  test.setTimeout(180_000);

  test('1명 abandon → PAYMENT_FAILED saga → booking FAILED', async ({
    request,
    adminToken,
  }) => {
    // 1) 4명 더치페이 셋업
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
    console.log(`[splits] ${splits.length} orders`);

    // 2) 2명 confirm (booker + member1)
    const [m0, m1, m2, m3] = members;
    const paidUsers = [m0, m1];
    for (const u of paidUsers) {
      const s = splits.find((x) => x.userId === u.userId)!;
      const key = makeE2ePaymentKey(s.orderId, s.amount);
      const res = await request.post('/api/user/payments/split/confirm', {
        headers: authHeaders(u.accessToken),
        data: { orderId: s.orderId, paymentKey: key.paymentKey, amount: s.amount },
      });
      expect(res.ok(), `confirm user=${u.userId} [${res.status()}]`).toBeTruthy();
      console.log(`[paid] user=${u.userId} order=${s.orderId}`);
    }

    // 3) member2 abandon
    const abortSplit = splits.find((x) => x.userId === m2.userId)!;
    const abortRes = await request.post(
      `/api/user/payments/${abortSplit.orderId}/abandon`,
      {
        headers: authHeaders(m2.accessToken),
        data: { reason: 'cancelled' },
      },
    );
    const abortBody = await abortRes.json().catch(() => ({}));
    expect(
      abortRes.ok(),
      `abandon [${abortRes.status()}]: ${JSON.stringify(abortBody).slice(0, 300)}`,
    ).toBeTruthy();
    console.log(`[abort] user=${m2.userId} order=${abortSplit.orderId} status=${abortRes.status()}`);

    // m3는 미결제 (PENDING) — saga의 REFUND_PAID_SPLITS step에서 EXPIRED 처리

    // 4) booker 토큰으로 booking 상태 폴링 → FAILED
    const myRes = await request.get('/api/user/bookings', {
      headers: authHeaders(booker.accessToken),
    });
    expect(myRes.ok()).toBeTruthy();
    const items: any[] = ((await myRes.json())?.data ?? []) as any[];
    const dutch = items
      .filter((b) => b.paymentMethod === 'dutchpay')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    expect(dutch, 'dutch booking missing').toBeTruthy();
    const bookingId: number = dutch.id;
    console.log(`[booking] id=${bookingId} initialStatus=${dutch.status}`);

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
        { timeout: 30_000, intervals: [1000, 2000, 3000], message: 'expected FAILED' },
      )
      .toBe('FAILED');
    console.log(`[final] booking ${bookingId} status=${finalStatus}`);

    // member2가 다시 abandon 호출 → 멱등 (CANCELLED 그대로 반환)
    const idempRes = await request.post(
      `/api/user/payments/${abortSplit.orderId}/abandon`,
      { headers: authHeaders(m2.accessToken), data: { reason: 'cancelled' } },
    );
    expect(idempRes.ok(), `idempotent abandon [${idempRes.status()}]`).toBeTruthy();
  });
});
