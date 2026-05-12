import { test, expect } from '@playwright/test';

/**
 * Toss webhook 멱등성 검증
 *
 * payment-service의 webhook handler 3종:
 *   - PAYMENT_STATUS_CHANGED  → 동일 status면 skip
 *   - DEPOSIT_CALLBACK         → 이미 DONE이면 skip
 *   - CANCEL_STATUS_CHANGED    → refund unique 제약
 *
 * 동일 webhook 2회 전송 시 두 번째는 idempotent skip 되어야 함.
 */
test.describe('Toss Webhook Idempotency @write', () => {
  test.skip('동일 PAYMENT_STATUS_CHANGED webhook 2회 — 두 번째 skip', async ({ request }) => {
    // 사전조건: 진행 중인 payment (status=IN_PROGRESS) 1건
    const orderId = 'TEST-ORDER-' + Date.now();
    const paymentKey = 'tviva' + Date.now();

    const payload = {
      eventType: 'PAYMENT_STATUS_CHANGED',
      createdAt: new Date().toISOString(),
      data: { orderId, paymentKey, status: 'DONE', approvedAt: new Date().toISOString() },
    };

    // 1) 첫 번째 webhook
    const first = await request.post('/webhook/toss', { data: payload });
    expect(first.ok()).toBeTruthy();

    // 2) 같은 webhook 즉시 재전송
    const second = await request.post('/webhook/toss', { data: payload });
    expect(second.ok()).toBeTruthy();
    // 두 번째는 200 OK로 응답하지만 idempotent skip되어야 함
    // → 로그/Cloud Logging에서 "already DONE" 메시지 확인 가능
  });

  test.skip('종결 상태(ABORTED)에서 DONE webhook 도착 → 무시', async ({ request }) => {
    // 사전조건: status=ABORTED인 payment
    // TODO: 환경 준비 + 역행 webhook 전송 → 클러스터 상태 변화 없음 검증
  });
});
