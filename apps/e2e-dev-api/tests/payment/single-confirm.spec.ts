import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';
import { makeE2ePaymentKey } from '../../fixtures/toss';

/**
 * 단건 카드 결제 confirm — 토스 API 우회 (TOSS_TEST_BYPASS) 검증
 *
 * 흐름
 *   1. user 생성
 *   2. POST /api/user/payments/prepare { amount, orderName } → orderId
 *   3. POST /api/user/payments/confirm { paymentKey:"e2e_test_*", orderId, amount }
 *      → payment-service에서 토스 API 호출 건너뛰고 합성 응답
 *   4. GET /api/user/payments/order/:orderId → status가 READY 이상으로 진행됨
 *
 * 사전조건
 *   ─ payment-service에 TOSS_TEST_BYPASS=true 적용 및 새 이미지 배포 완료
 *
 * @write — payment row 1건 생성
 */
test.describe('Payment > Single confirm via bypass @write', () => {
  test('prepare → confirm(e2e_test_*) → status 전이', async ({ request }) => {
    const user = await createE2EUser(request, 'pay');
    const auth = authHeaders(user.accessToken);

    // 1) prepare
    const amount = 30_000;
    const prepRes = await request.post('/api/user/payments/prepare', {
      headers: auth,
      data: {
        amount,
        orderName: 'E2E test card payment',
      },
    });
    const prepBody = await prepRes.json().catch(() => ({}));
    expect(
      prepRes.ok() || prepRes.status() === 201,
      `prepare [${prepRes.status()}]: ${JSON.stringify(prepBody).slice(0, 200)}`,
    ).toBeTruthy();
    const prepared = prepBody?.data ?? prepBody;
    const orderId: string = prepared?.orderId;
    expect(orderId, 'orderId missing').toBeTruthy();
    console.log(`[prepare] orderId=${orderId}`);

    // 2) confirm with bypass paymentKey
    const key = makeE2ePaymentKey(orderId, amount);
    const confRes = await request.post('/api/user/payments/confirm', {
      headers: auth,
      data: key,
    });
    const confBody = await confRes.json().catch(() => ({}));
    expect(
      confRes.ok(),
      `confirm [${confRes.status()}]: ${JSON.stringify(confBody).slice(0, 300)}`,
    ).toBeTruthy();
    console.log(`[confirm] paymentKey=${key.paymentKey} status=${confRes.status()}`);

    // 3) status 확인 — DONE 또는 IN_PROGRESS (saga 진행 중일 수 있음)
    const getRes = await request.get(`/api/user/payments/order/${orderId}`, {
      headers: auth,
    });
    expect(getRes.ok(), `get order [${getRes.status()}]`).toBeTruthy();
    const got = ((await getRes.json())?.data ?? (await getRes.json())) as any;
    const status = got?.status ?? got?.payment?.status;
    expect(['DONE', 'IN_PROGRESS', 'CONFIRMED']).toContain(status);
    console.log(`[get] status=${status}`);
  });

  test('잘못된 paymentKey (실 토스 호출) → 실패', async ({ request }) => {
    const user = await createE2EUser(request, 'paybad');
    const auth = authHeaders(user.accessToken);

    const amount = 10_000;
    const prep = await request.post('/api/user/payments/prepare', {
      headers: auth,
      data: { amount, orderName: 'E2E bad key' },
    });
    const orderId = (await prep.json())?.data?.orderId;
    expect(orderId).toBeTruthy();

    // e2e_test_*가 아닌 paymentKey → 실 토스 호출 → 4xx/5xx
    const conf = await request.post('/api/user/payments/confirm', {
      headers: auth,
      data: { paymentKey: 'tviva_invalid_key', orderId, amount },
    });
    expect(conf.ok()).toBeFalsy();
  });
});
