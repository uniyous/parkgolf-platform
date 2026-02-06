import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  FunctionDeclaration,
  FunctionCallingMode,
  SchemaType,
} from '@google/generative-ai';
import { AppException, Errors } from '../../common/exceptions';

/**
 * 도구 호출 결과
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Gemini 응답
 */
export interface GeminiResponse {
  text?: string;
  toolCalls?: ToolCall[];
  finishReason: string;
}

/**
 * Gemini 1.5 Flash 서비스
 */
@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  private readonly systemPrompt = `당신은 파크골프장 예약을 도와주는 친절한 AI 어시스턴트입니다.

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

날짜 해석:
- "내일" → 오늘 날짜 + 1일
- "모레" → 오늘 날짜 + 2일
- "이번 주말" → 가장 가까운 토요일/일요일
- "다음 주" → 다음 주 월요일부터

오늘 날짜: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}`;

  private readonly tools: FunctionDeclaration[] = [
    {
      name: 'search_clubs',
      description: '지역명이나 골프장 이름으로 파크골프장을 검색합니다',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          location: {
            type: SchemaType.STRING,
            description: '지역명 (예: 천안, 서울, 대전)',
          },
          name: {
            type: SchemaType.STRING,
            description: '골프장 이름 일부 (선택사항)',
          },
        },
        required: ['location'],
      },
    },
    {
      name: 'get_club_info',
      description: '특정 골프장의 상세 정보를 조회합니다',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          clubId: {
            type: SchemaType.STRING,
            description: '골프장 ID',
          },
        },
        required: ['clubId'],
      },
    },
    {
      name: 'get_weather',
      description: '특정 골프장의 날씨 정보를 조회합니다',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          clubId: {
            type: SchemaType.STRING,
            description: '골프장 ID',
          },
          date: {
            type: SchemaType.STRING,
            description: '조회할 날짜 (YYYY-MM-DD 형식)',
          },
        },
        required: ['clubId', 'date'],
      },
    },
    {
      name: 'get_available_slots',
      description: '특정 골프장의 예약 가능한 시간대를 조회합니다',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          clubId: {
            type: SchemaType.STRING,
            description: '골프장 ID',
          },
          date: {
            type: SchemaType.STRING,
            description: '조회할 날짜 (YYYY-MM-DD 형식)',
          },
          timePreference: {
            type: SchemaType.STRING,
            description: '선호 시간대 (morning, afternoon, evening)',
            enum: ['morning', 'afternoon', 'evening'],
          },
        },
        required: ['clubId', 'date'],
      },
    },
    {
      name: 'create_booking',
      description: '예약을 생성합니다. 반드시 사용자 확인 후에만 호출하세요.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          clubId: {
            type: SchemaType.STRING,
            description: '골프장 ID',
          },
          slotId: {
            type: SchemaType.STRING,
            description: '타임슬롯 ID',
          },
          playerCount: {
            type: SchemaType.NUMBER,
            description: '예약 인원 수',
          },
          userId: {
            type: SchemaType.NUMBER,
            description: '사용자 ID',
          },
        },
        required: ['clubId', 'slotId', 'playerCount', 'userId'],
      },
    },
  ];

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not configured');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: this.systemPrompt,
      tools: [{ functionDeclarations: this.tools }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO,
        },
      },
    });

    this.logger.log(`Gemini service initialized with model: ${modelName}`);
  }

  /**
   * 대화 생성
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    toolResults?: Array<{ name: string; result: unknown }>,
  ): Promise<GeminiResponse> {
    try {
      // 대화 히스토리를 Gemini 형식으로 변환
      const contents: Content[] = messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }] as Part[],
      }));

      // 도구 결과가 있으면 추가
      if (toolResults && toolResults.length > 0) {
        const functionResponseParts: Part[] = toolResults.map((tr) => ({
          functionResponse: {
            name: tr.name,
            response: tr.result as object,
          },
        }));

        contents.push({
          role: 'model',
          parts: functionResponseParts,
        });
      }

      const result = await this.model.generateContent({ contents });
      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate) {
        throw new AppException(Errors.Agent.GEMINI_ERROR, 'No response from Gemini');
      }

      // Function Call 확인
      const functionCalls = candidate.content.parts
        .filter((part) => 'functionCall' in part)
        .map((part) => {
          const fc = (part as { functionCall: { name: string; args: Record<string, unknown> } }).functionCall;
          return {
            name: fc.name,
            args: fc.args,
          };
        });

      // 텍스트 응답 확인
      const textParts = candidate.content.parts
        .filter((part) => 'text' in part)
        .map((part) => (part as { text: string }).text);

      return {
        text: textParts.join('') || undefined,
        toolCalls: functionCalls.length > 0 ? functionCalls : undefined,
        finishReason: candidate.finishReason || 'STOP',
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error('Gemini API error', error);
      throw new AppException(Errors.Agent.GEMINI_ERROR);
    }
  }

  /**
   * 도구 결과와 함께 대화 계속
   */
  async continueWithToolResults(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    toolCalls: ToolCall[],
    toolResults: Array<{ name: string; result: unknown }>,
  ): Promise<GeminiResponse> {
    try {
      const contents: Content[] = messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }] as Part[],
      }));

      // 도구 호출 추가
      contents.push({
        role: 'model',
        parts: toolCalls.map((tc) => ({
          functionCall: {
            name: tc.name,
            args: tc.args,
          },
        })),
      });

      // 도구 결과 추가
      contents.push({
        role: 'user',
        parts: toolResults.map((tr) => ({
          functionResponse: {
            name: tr.name,
            response: tr.result as object,
          },
        })),
      });

      const result = await this.model.generateContent({ contents });
      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate) {
        throw new AppException(Errors.Agent.GEMINI_ERROR);
      }

      const textParts = candidate.content.parts
        .filter((part) => 'text' in part)
        .map((part) => (part as { text: string }).text);

      const functionCalls = candidate.content.parts
        .filter((part) => 'functionCall' in part)
        .map((part) => {
          const fc = (part as { functionCall: { name: string; args: Record<string, unknown> } }).functionCall;
          return { name: fc.name, args: fc.args };
        });

      return {
        text: textParts.join('') || undefined,
        toolCalls: functionCalls.length > 0 ? functionCalls : undefined,
        finishReason: candidate.finishReason || 'STOP',
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error('Gemini continue error', error);
      throw new AppException(Errors.Agent.GEMINI_ERROR);
    }
  }
}
