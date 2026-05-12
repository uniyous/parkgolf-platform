import { test, expect } from '@playwright/test';
import { loginAdmin, authHeaders } from '../../fixtures/auth';

/**
 * 더치페이 (split payment) 결제 흐름
 *
 * 시나리오 (실 데이터 — @write)
 *   1. 예약 생성 (paymentMethod=dutchpay)
 *   2. payment.splitPrepare → 참여자별 orderId 발급
 *   3. 각 참여자별 splitConfirm (test 토스 paymentKey 시뮬레이션)
 *   4. 마지막 결제 후 PAYMENT_CONFIRMED saga 트리거 확인
 *   5. booking.status = CONFIRMED 검증
 *
 * 외부 토스 결제는 sandbox 키로 dev 환경 호출 필요.
 * dev에서 실 토스 호출이 부담스러우면 unit/integration 테스트에서 mock 사용 권장.
 */
test.describe('Dutch Payment @write @slow', () => {
  test.skip('더치페이 4인 — 전원 결제 완료 시 booking CONFIRMED', async ({ request }) => {
    const { accessToken } = await loginAdmin(request);
    const auth = authHeaders(accessToken);

    // TODO: 1) 예약 생성 (dutchpay)
    // TODO: 2) splitPrepare 호출 → orderId 4개
    // TODO: 3) 각 splitConfirm (병렬) — 토스 sandbox paymentKey
    // TODO: 4) 마지막 confirm 후 saga 트리거 + booking 상태 polling
    // TODO: 5) booking.status === CONFIRMED
  });

  test.skip('더치페이 타임아웃 — PAYMENT_TIMEOUT saga 자동 환불', async ({ request }) => {
    // TODO: 1) dutchpay 예약 생성
    // TODO: 2) 1명만 결제 후 5분 대기 (또는 즉시 trigger NATS pattern)
    // TODO: 3) saga PAYMENT_TIMEOUT 실행 확인
    // TODO: 4) 결제했던 1명에게 환불 처리 확인
  });
});
