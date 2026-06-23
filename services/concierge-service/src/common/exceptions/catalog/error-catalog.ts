export interface ErrorDef {
  readonly code: string;
  readonly message: string;
  readonly httpStatus: number;
}

function defineErrors<T extends Record<string, ErrorDef>>(errors: T): Readonly<T> {
  return Object.freeze(errors);
}

export const AgentErrors = defineErrors({
  CONVERSATION_NOT_FOUND: { code: 'AGENT_001', message: '대화를 찾을 수 없습니다', httpStatus: 404 },
  DEEPSEEK_ERROR: { code: 'AGENT_002', message: 'AI 서비스 오류가 발생했습니다', httpStatus: 502 },
  TOOL_EXECUTION_FAILED: { code: 'AGENT_003', message: '도구 실행에 실패했습니다', httpStatus: 500 },
  INVALID_REQUEST: { code: 'AGENT_004', message: '잘못된 요청입니다', httpStatus: 400 },
  SESSION_EXPIRED: { code: 'AGENT_005', message: '세션이 만료되었습니다', httpStatus: 401 },
});

export const SystemErrors = defineErrors({
  INTERNAL: { code: 'SYS_001', message: '내부 서버 오류', httpStatus: 500 },
  UNAVAILABLE: { code: 'SYS_002', message: '서비스를 일시적으로 사용할 수 없습니다', httpStatus: 503 },
});

export const Errors = {
  Agent: AgentErrors,
  System: SystemErrors,
} as const;
