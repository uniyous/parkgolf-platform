import { APIRequestContext } from '@playwright/test';

/**
 * 토스 sandbox paymentKey 발급 헬퍼
 *
 * 토스 결제 위젯은 사용자 인증을 거쳐야 paymentKey를 발급한다.
 * Playwright의 브라우저 모드로 위젯 페이지를 열어 카드 입력을 자동화한다.
 *
 * 사전조건
 *   ─ 토스 sandbox SECRET KEY (test_sk_*) 가 dev에 등록되어 있어야 함
 *   ─ 위젯 페이지(우리 프론트엔드의 결제 페이지) 또는 토스 공식 sandbox 위젯
 *
 * 현재 dev 토스 키 = test_sk_ma60RZblrqNv... (sandbox)
 *
 * 한계
 *   ─ 위젯 페이지 자동화는 UI 흐름이라 Playwright browser context 필요
 *   ─ 첫 단계에서는 helper interface만 정의 + skip
 *   ─ 실제 자동화는 user-app-web의 결제 페이지 + Playwright UI mode로 진행 권장
 */

export interface TossSandboxResult {
  paymentKey: string;
  orderId: string;
  amount: number;
}

/**
 * TODO: 토스 위젯 자동화 또는 토스 sandbox dev tool 호출.
 *
 * 현재는 placeholder — 실제 paymentKey 발급은 다음 옵션 중 선택:
 *   A. Playwright browser context로 토스 위젯 페이지 진입 후 카드 자동 입력
 *      (테스트 카드: 4330-0000-0000-0001, 만료 12/30, CVC 123)
 *   B. user-app-web의 결제 페이지를 baseURL로 사용
 *   C. 토스 sandbox 가상계좌 결제로 우회 (입금 webhook 시뮬레이션)
 */
export async function obtainSandboxPaymentKey(
  _request: APIRequestContext,
  _orderId: string,
  _amount: number,
): Promise<TossSandboxResult> {
  throw new Error(
    'obtainSandboxPaymentKey: not implemented. ' +
      'Use Playwright UI mode against user-app-web payment page, ' +
      'or migrate to virtual account flow.',
  );
}
