import { ConfigService } from '@nestjs/config';
import { isCommandTool, guardLlmToolCall, COMMAND_TOOL_NAMES } from './tool-policy';
import { DeepSeekService } from './deepseek.service';

/**
 * UNI-33 (P2) — 부수효과 도구가 LLM 경계 밖으로 분리됐는지 검증.
 */
describe('tool-policy — command/query 분리 (UNI-33)', () => {
  describe('isCommandTool', () => {
    it('create_booking 은 command 도구', () => {
      expect(isCommandTool('create_booking')).toBe(true);
    });

    it('read-only 도구는 command 가 아님', () => {
      for (const q of ['search_clubs', 'get_available_slots', 'get_weather', 'get_booking_policy']) {
        expect(isCommandTool(q)).toBe(false);
      }
    });
  });

  describe('guardLlmToolCall', () => {
    it('command 도구 호출 시도 → 거부 결과 반환', () => {
      const rej = guardLlmToolCall({ name: 'create_booking', args: {} });
      expect(rej).not.toBeNull();
      expect(rej!.success).toBe(true);
      expect(rej!.result.success).toBe(false);
      expect(rej!.result.error).toBe('COMMAND_TOOL_NOT_ALLOWED');
    });

    it('query 도구는 통과 (null)', () => {
      expect(guardLlmToolCall({ name: 'search_clubs', args: {} })).toBeNull();
    });
  });

  describe('DeepSeek advertised tools', () => {
    it('LLM에 노출되는 tools[] 에 command 도구가 없다', () => {
      const stubConfig = { get: () => undefined } as unknown as ConfigService;
      const svc = new DeepSeekService(stubConfig);

      // private getter 접근 — 노출 목록 검증
      const tools = (svc as unknown as { tools: Array<{ function: { name: string } }> }).tools;
      const names = tools.map((t) => t.function.name);

      expect(names.length).toBeGreaterThan(0);
      for (const cmd of COMMAND_TOOL_NAMES) {
        expect(names).not.toContain(cmd);
      }
      // read-only 도구는 여전히 노출
      expect(names).toContain('search_clubs');
      expect(names).toContain('get_available_slots');
    });
  });
});
