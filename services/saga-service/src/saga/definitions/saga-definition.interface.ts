/**
 * Saga 정의 인터페이스
 * 각 Saga 유형은 이 인터페이스를 구현하여 Step 목록을 선언합니다.
 */
export interface StepDefinition {
  /** Step 이름 (예: RESERVE_SLOT) */
  name: string;
  /** NATS Request 패턴 (예: slot.reserve) */
  action: string;
  /** 보상 NATS 패턴 (null이면 보상 불필요) */
  compensate: string | null;
  /** Step 타임아웃 (ms) */
  timeout: number;
  /** 실패해도 Saga를 계속 진행할지 여부 (알림 등) */
  optional?: boolean;
  /** 대상 서비스 이름 (NATS 클라이언트 선택용) */
  targetService: 'BOOKING_SERVICE' | 'COURSE_SERVICE' | 'PAYMENT_SERVICE' | 'NOTIFICATION_SERVICE' | 'IAM_SERVICE';
  /** 조건부 실행 함수 — false 반환 시 SKIPPED */
  condition?: (payload: Record<string, unknown>) => boolean;
  /** payload에서 Step용 요청 데이터를 추출하는 함수 */
  buildRequest: (payload: Record<string, unknown>) => Record<string, unknown>;
  /** Step 성공 시 payload에 결과를 병합하는 함수 */
  mergeResponse?: (payload: Record<string, unknown>, response: Record<string, unknown>) => Record<string, unknown>;
}

export interface SagaDefinition {
  /** Saga 유형 이름 (예: CREATE_BOOKING) */
  name: string;
  /** Step 목록 (실행 순서대로) */
  steps: StepDefinition[];
}
