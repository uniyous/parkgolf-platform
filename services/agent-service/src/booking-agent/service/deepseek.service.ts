import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { AppException, Errors } from '../../common/exceptions';

/**
 * 도구 호출 결과
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * DeepSeek 응답
 */
export interface DeepSeekResponse {
  text?: string;
  toolCalls?: ToolCall[];
  finishReason: string;
}

/**
 * DeepSeek V3.2 서비스 (OpenAI 호환 API)
 */
@Injectable()
export class DeepSeekService implements OnModuleInit {
  private readonly logger = new Logger(DeepSeekService.name);
  private client: OpenAI;
  private model: string;
  private readonly REQUEST_TIMEOUT = 25000; // 25초 (NATS 60초 타임아웃 내 2회 호출 + 도구 실행 가능)

  private readonly systemPromptTemplate = `당신은 파크골프장 예약을 도와주는 친절한 AI 어시스턴트입니다.

역할:
- 사용자의 자연어 요청을 이해하고 예약을 도와줍니다
- 필요한 정보(날짜, 장소, 시간, 인원)를 자연스럽게 수집합니다
- 날씨 정보를 확인하여 적절한 시간대를 추천합니다
- 예약 전 항상 사용자에게 확인을 받습니다

응답 규칙:
- 항상 친근하고 자연스러운 한국어로 응답하세요
- 이모지를 적절히 사용하여 친근감을 더하세요
- 한 번에 너무 많은 정보를 요청하지 마세요
- 날씨 정보가 있으면 골프 치기 좋은지 알려주세요
- 예약 확인 시 모든 정보를 명확하게 요약해주세요

도구 사용 규칙:
- 사용자가 날짜를 언급한 경우 search_clubs 대신 search_clubs_with_slots를 사용하세요
- 날짜 없이 지역만 물어보면 기존 search_clubs를 사용하세요
- 사용자가 인원수를 언급하면 search_clubs_with_slots의 playerCount 파라미터에 포함하세요
- 사용자가 날씨만 물어볼 때(예약 의도 없이)는 get_weather_by_location을 사용하세요
- 특정 골프장의 날씨를 물어보면 get_weather(clubId 필요)를 사용하세요

날짜 해석:
- "내일" → 오늘 날짜 + 1일
- "모레" → 오늘 날짜 + 2일
- "이번 주말" → 가장 가까운 토요일/일요일
- "다음 주" → 다음 주 월요일부터

오늘 날짜: {{TODAY_DATE}}

원샷 예약:
- 사용자가 날짜+지역+인원을 한 번에 제공하면 search_clubs_with_slots 호출 후 가장 적합한 1개를 자동 선택하여 "추천합니다" 형태로 확인 요청
- 선택 기준: 여유 슬롯 > 가격 > 시간대
- 사용자가 다른 옵션 원하면 전체 목록 표시

예약 안내:
- 골프장 검색 후 사용자가 골프장을 선택하면, 자동으로 팀 멤버 선택 → 슬롯 선택 → 결제 순서로 진행됩니다
- 그룹 예약/더치페이는 별도 판단 없이 통합 플로우에서 자동 처리됩니다`;

  /**
   * 매 요청마다 오늘 날짜를 주입한 시스템 프롬프트 생성
   */
  private getSystemPrompt(): string {
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    return this.systemPromptTemplate.replace('{{TODAY_DATE}}', today);
  }

  private readonly tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'search_clubs',
        description: '지역명이나 골프장 이름으로 파크골프장을 검색합니다',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: '지역명 (예: 천안, 서울, 대전)' },
            name: { type: 'string', description: '골프장 이름 일부 (선택사항)' },
          },
          required: ['location'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_clubs_with_slots',
        description: '지역명으로 파크골프장을 검색하되, 특정 날짜에 예약 가능한 타임슬롯이 있는 골프장만 반환합니다. 사용자가 날짜를 언급한 경우 이 도구를 우선 사용하세요.',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: '지역명 (예: 천안, 서울, 대전)' },
            date: { type: 'string', description: '예약 날짜 (YYYY-MM-DD 형식)' },
            name: { type: 'string', description: '골프장 이름 일부 (선택사항)' },
            timePreference: {
              type: 'string',
              description: '선호 시간대 (morning, afternoon, evening)',
              enum: ['morning', 'afternoon', 'evening'],
            },
            playerCount: {
              type: 'number',
              description: '예약 인원 수 (사용자가 언급한 경우)',
            },
          },
          required: ['location', 'date'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_club_info',
        description: '특정 골프장의 상세 정보를 조회합니다',
        parameters: {
          type: 'object',
          properties: {
            clubId: { type: 'string', description: '골프장 ID' },
          },
          required: ['clubId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: '특정 골프장의 날씨 정보를 조회합니다. clubId를 알고 있을 때 사용합니다.',
        parameters: {
          type: 'object',
          properties: {
            clubId: { type: 'string', description: '골프장 ID' },
            date: { type: 'string', description: '조회할 날짜 (YYYY-MM-DD 형식)' },
          },
          required: ['clubId', 'date'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_weather_by_location',
        description: '지역명 또는 좌표로 날씨 정보를 조회합니다. 사용자가 날씨를 물어볼 때 사용합니다. 좌표(latitude/longitude)를 알고 있으면 함께 전달하세요.',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: '지역명 (예: 천안, 서울, 대전)' },
            date: { type: 'string', description: '조회할 날짜 (YYYY-MM-DD 형식)' },
            latitude: { type: 'number', description: '위도 (있으면 주소 검색 없이 바로 날씨 조회)' },
            longitude: { type: 'number', description: '경도 (있으면 주소 검색 없이 바로 날씨 조회)' },
          },
          required: ['location', 'date'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_available_slots',
        description: '특정 골프장의 예약 가능한 시간대를 조회합니다',
        parameters: {
          type: 'object',
          properties: {
            clubId: { type: 'string', description: '골프장 ID' },
            date: { type: 'string', description: '조회할 날짜 (YYYY-MM-DD 형식)' },
            timePreference: {
              type: 'string',
              description: '선호 시간대 (morning, afternoon, evening)',
              enum: ['morning', 'afternoon', 'evening'],
            },
          },
          required: ['clubId', 'date'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_booking',
        description: '예약을 생성합니다. 반드시 사용자 확인 후에만 호출하세요.',
        parameters: {
          type: 'object',
          properties: {
            gameTimeSlotId: { type: 'number', description: '게임 타임슬롯 ID' },
            playerCount: { type: 'number', description: '예약 인원 수' },
          },
          required: ['gameTimeSlotId', 'playerCount'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_booking_policy',
        description: '골프장의 예약 정책(운영시간, 취소/환불 규정, 노쇼 패널티)을 조회합니다.',
        parameters: {
          type: 'object',
          properties: {
            clubId: { type: 'string', description: '골프장 ID' },
            policyType: {
              type: 'string',
              enum: ['operating', 'cancellation', 'refund', 'noshow', 'all'],
              description: '조회할 정책 유형 (all: 전체)',
            },
          },
          required: ['clubId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_address',
        description: '주소를 검색하여 위경도 좌표를 얻습니다. 사용자가 "우리 집 근처", "OO동" 등 주소를 말할 때 사용합니다.',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: '검색할 주소 (예: 서울시 강남구 역삼동, 천안시 서북구)' },
          },
          required: ['address'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_nearby_clubs',
        description: '현재 위치 또는 지정한 좌표 근처의 파크골프장을 검색합니다. "내 근처", "가까운 곳" 요청 시 사용합니다.',
        parameters: {
          type: 'object',
          properties: {
            latitude: { type: 'number', description: '위도 (예: 37.5665)' },
            longitude: { type: 'number', description: '경도 (예: 126.9780)' },
            radius: { type: 'number', description: '검색 반경 (미터, 기본값 10000)' },
          },
          required: ['latitude', 'longitude'],
        },
      },
    },
  ];

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const baseURL = this.configService.get<string>('DEEPSEEK_API_URL') || 'https://api.deepseek.com';
    this.model = this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat';

    if (!apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY is not configured');
      return;
    }

    this.client = new OpenAI({ apiKey, baseURL });
    this.logger.log(`DeepSeek service initialized with model: ${this.model}`);
  }

  /**
   * 대화 생성
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<DeepSeekResponse> {
    try {
      const chatMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: this.getSystemPrompt() },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: chatMessages,
        tools: this.tools,
        tool_choice: 'auto',
      }, { timeout: this.REQUEST_TIMEOUT });

      const choice = response.choices[0];
      if (!choice) {
        throw new AppException(Errors.Agent.DEEPSEEK_ERROR, 'No response from DeepSeek');
      }

      return this.parseChoice(choice);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error('DeepSeek API error', error);
      throw new AppException(Errors.Agent.DEEPSEEK_ERROR);
    }
  }

  /**
   * 도구 결과와 함께 대화 계속
   * toolHistory: 모든 이전 반복의 도구 호출/결과를 누적하여 전달
   */
  async continueWithToolResults(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    toolHistory: Array<{
      toolCalls: ToolCall[];
      results: Array<{ name: string; result: unknown }>;
    }>,
  ): Promise<DeepSeekResponse> {
    try {
      const chatMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: this.getSystemPrompt() },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      // 모든 반복의 도구 호출/결과를 순서대로 추가
      let callIndex = 0;
      for (const { toolCalls, results } of toolHistory) {
        chatMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: toolCalls.map((tc, i) => ({
            id: `call_${callIndex + i}`,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          })),
        });

        results.forEach((tr, i) => {
          chatMessages.push({
            role: 'tool',
            tool_call_id: `call_${callIndex + i}`,
            content: JSON.stringify(tr.result),
          });
        });

        callIndex += toolCalls.length;
      }

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: chatMessages,
        tools: this.tools,
        tool_choice: 'auto',
      }, { timeout: this.REQUEST_TIMEOUT });

      const choice = response.choices[0];
      if (!choice) {
        throw new AppException(Errors.Agent.DEEPSEEK_ERROR);
      }

      return this.parseChoice(choice);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error('DeepSeek continue error', error);
      throw new AppException(Errors.Agent.DEEPSEEK_ERROR);
    }
  }

  /**
   * 응답 파싱
   */
  private parseChoice(choice: OpenAI.Chat.Completions.ChatCompletion.Choice): DeepSeekResponse {
    const message = choice.message;

    const parsedToolCalls: ToolCall[] | undefined = message.tool_calls?.map((tc) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments),
    }));

    return {
      text: message.content || undefined,
      toolCalls: parsedToolCalls && parsedToolCalls.length > 0 ? parsedToolCalls : undefined,
      finishReason: choice.finish_reason || 'stop',
    };
  }
}
