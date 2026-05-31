import { ToolCall } from './deepseek.service';

/**
 * 도구 정책 — query / command 분류의 단일 출처 (UNI-33).
 *
 * - query  : read-only 도구. LLM에 노출되어 자유롭게 호출 가능.
 * - command: 부수효과(side-effect) 도구. **LLM에 노출하지 않으며**, LLM이 호출을
 *            시도해도 guardLlmToolCall 로 차단된다. saga 시작 등 비가역 작업은
 *            결정적 경로(direct-action-handler / effect-executor)만 담당.
 *
 * 설계: docs/architecture/agent-orchestration.md, UNI-29
 */
export const COMMAND_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
  'create_booking',
]);

export function isCommandTool(name: string): boolean {
  return COMMAND_TOOL_NAMES.has(name);
}

export interface ToolGuardRejection {
  name: string;
  success: true; // tool-loop 관점에선 "처리됨" — 단 result.success=false 로 LLM에 거부 피드백
  result: {
    success: false;
    error: string;
    message: string;
  };
}

/**
 * LLM이 emit 한 tool call 의 정책 위반 여부 검사.
 * 위반(부수효과 도구 호출 시도) 시 거부 결과, 허용 시 null.
 *
 * command 도구는 애초에 LLM tools[] 에 노출되지 않으므로 정상 동작에서는 발생하지 않는다.
 * 이 함수는 모델이 환각으로 command 도구명을 만들어내는 경우의 이중 방어(defense-in-depth).
 */
export function guardLlmToolCall(tc: ToolCall): ToolGuardRejection | null {
  if (isCommandTool(tc.name)) {
    return {
      name: tc.name,
      success: true,
      result: {
        success: false,
        error: 'COMMAND_TOOL_NOT_ALLOWED',
        message:
          '예약/결제 같은 작업은 직접 실행할 수 없습니다. 슬롯 카드(SHOW_SLOTS)로 안내하고, 사용자가 슬롯 카드에서 결제수단을 고르고 시간을 누르면 시스템이 처리합니다.',
      },
    };
  }
  return null;
}
