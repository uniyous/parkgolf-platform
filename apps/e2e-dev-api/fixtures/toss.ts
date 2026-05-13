/**
 * 토스 sandbox paymentKey — E2E 우회 헬퍼
 *
 * payment-service에 TOSS_TEST_BYPASS=true 가 설정된 dev 환경에서만 동작.
 * paymentKey가 "e2e_test_*" 패턴이면 payment-service가 토스 API 호출을 건너뛰고
 * 합성 응답을 즉시 반환한다 (NODE_ENV=production에서는 자동 비활성).
 *
 * 운영 안전장치
 *   ─ payment-service: TossApiService 생성자에서 NODE_ENV=production이면 무력화
 *   ─ values-prod.yaml: TOSS_TEST_BYPASS=false 명시
 *
 * paymentKey는 위젯이 실제 발급하는 길이(~50자)와 무관하게 임의 길이여도 무방.
 */

export interface TossSandboxKey {
  paymentKey: string;
  orderId: string;
  amount: number;
}

/**
 * E2E 전용 paymentKey 생성. payment-service의 우회 분기를 발화시킨다.
 *
 * @param orderId   prepare 응답에서 받은 orderId
 * @param amount    payment row와 일치해야 함 (mismatch면 AMOUNT_MISMATCH)
 */
export function makeE2ePaymentKey(orderId: string, amount: number): TossSandboxKey {
  const rand = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    paymentKey: `e2e_test_${rand}`,
    orderId,
    amount,
  };
}
