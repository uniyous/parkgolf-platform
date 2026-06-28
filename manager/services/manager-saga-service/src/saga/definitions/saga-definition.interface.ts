/**
 * Saga 정의 인터페이스 — 제네릭 엔진 계약(@uniyous/saga-engine)에 manager 대상 서비스
 * 집합(ManagerTarget)을 바인딩한 것. 정의 파일은 이 좁힌 타입을 import 한다.
 */
import type {
  StepDefinition as EngineStepDefinition,
  SagaDefinition as EngineSagaDefinition,
} from '@uniyous/saga-engine';

/** manager-saga-service가 호출하는 대상 서비스 (NATS 클라이언트 선택용) */
export type ManagerTarget =
  | 'FRONTDESK_SERVICE'
  | 'CLUB_SERVICE'
  | 'PAYMENT_SERVICE'
  | 'NOTIFICATION_SERVICE'
  | 'IAM_SERVICE';

export type StepDefinition = EngineStepDefinition<ManagerTarget>;
export type SagaDefinition = EngineSagaDefinition<ManagerTarget>;
