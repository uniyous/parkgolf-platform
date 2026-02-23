import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekService, DeepSeekResponse, ToolCall } from './deepseek.service';
import { ToolExecutorService, ToolResult } from './tool-executor.service';
import { ConversationService } from './conversation.service';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatAction,
  ConversationContext,
  ConversationState,
} from '../dto/chat.dto';
import { AppException, Errors } from '../../common/exceptions';

/**
 * 예약 에이전트 서비스
 * DeepSeek + 도구 실행 + 대화 관리 통합
 */
@Injectable()
export class BookingAgentService {
  private readonly logger = new Logger(BookingAgentService.name);
  private readonly MAX_TOOL_ITERATIONS = 5;

  constructor(
    private readonly deepseekService: DeepSeekService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * 채팅 처리
   */
  async chat(request: ChatRequestDto): Promise<ChatResponseDto> {
    const { userId, message, conversationId, latitude, longitude } = request;

    // 대화 컨텍스트 조회/생성
    const context = this.conversationService.getOrCreate(userId, conversationId);

    // 위치 정보 저장 (첫 메시지에서만)
    if (latitude && longitude && !context.slots.latitude) {
      this.conversationService.updateSlots(context, { latitude, longitude });
    }

    // 사용자 메시지 추가
    this.conversationService.addUserMessage(context, message);

    try {
      // DeepSeek 대화 처리 (도구 호출 포함)
      const response = await this.processWithLLM(context);

      return {
        conversationId: context.conversationId,
        message: response.text || '',
        state: context.state,
        actions: response.actions,
      };
    } catch (error) {
      this.logger.error('Chat processing failed', error);

      // 에러 응답
      const errorMessage = '죄송해요, 잠시 문제가 발생했어요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, errorMessage);

      return {
        conversationId: context.conversationId,
        message: errorMessage,
        state: context.state,
      };
    }
  }

  /**
   * 대화 리셋
   */
  resetConversation(userId: number): ChatResponseDto {
    const context = this.conversationService.create(userId);

    const welcomeMessage =
      '안녕하세요! 파크골프장 예약을 도와드릴게요. 🏌️\n' +
      '어느 지역에서 골프를 치고 싶으세요?';

    this.conversationService.addAssistantMessage(context, welcomeMessage);

    return {
      conversationId: context.conversationId,
      message: welcomeMessage,
      state: 'IDLE',
    };
  }

  /**
   * DeepSeek 대화 처리 (도구 호출 루프)
   */
  private async processWithLLM(
    context: ConversationContext,
  ): Promise<{ text: string; actions?: ChatAction[] }> {
    const messages = this.conversationService.getRecentMessages(context);

    // 위치 정보를 시스템 메시지로 주입
    if (context.slots.latitude && context.slots.longitude) {
      messages.unshift({
        role: 'user',
        content: `[시스템 정보] 사용자의 현재 위치: 위도 ${context.slots.latitude}, 경도 ${context.slots.longitude}. "내 근처", "가까운 곳" 요청 시 get_nearby_clubs 도구에 이 좌표를 사용하세요. 이 메시지에 대해 직접 응답하지 마세요.`,
      });
    }

    let llmResponse: DeepSeekResponse;
    let iterations = 0;
    let allActions: ChatAction[] = [];

    // 초기 DeepSeek 호출
    llmResponse = await this.deepseekService.chat(messages);

    // 도구 호출 루프
    while (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      if (iterations >= this.MAX_TOOL_ITERATIONS) {
        this.logger.warn('Max tool iterations reached');
        break;
      }

      // 도구 실행
      const toolResults = await this.executeTools(llmResponse.toolCalls);

      // UI 액션 생성
      const actions = this.createActionsFromToolResults(llmResponse.toolCalls, toolResults);
      allActions = [...allActions, ...actions];

      // 슬롯 업데이트
      this.updateSlotsFromToolResults(context, llmResponse.toolCalls, toolResults);

      // DeepSeek 계속 호출
      llmResponse = await this.deepseekService.continueWithToolResults(
        messages,
        llmResponse.toolCalls,
        toolResults.map((tr) => ({ name: tr.name, result: tr.result })),
      );

      iterations++;
    }

    // 최종 텍스트 응답 저장
    if (llmResponse.text) {
      this.conversationService.addAssistantMessage(context, llmResponse.text);
    }

    // 상태 업데이트
    this.updateStateFromResponse(context, llmResponse, allActions);

    return {
      text: llmResponse.text || '',
      actions: allActions.length > 0 ? allActions : undefined,
    };
  }

  /**
   * 도구 실행
   */
  private async executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    this.logger.debug(`Executing ${toolCalls.length} tools`);
    return this.toolExecutor.executeAll(toolCalls);
  }

  /**
   * 도구 결과에서 UI 액션 생성
   */
  private createActionsFromToolResults(
    toolCalls: ToolCall[],
    results: ToolResult[],
  ): ChatAction[] {
    const actions: ChatAction[] = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const result = results[i];

      if (!result.success) continue;

      switch (call.name) {
        case 'search_clubs':
        case 'search_clubs_with_slots':
          if (result.result && (result.result as any).found > 0) {
            actions.push({
              type: 'SHOW_CLUBS',
              data: result.result,
            });
          }
          break;

        case 'get_available_slots':
          if (result.result && (result.result as any).availableCount > 0) {
            actions.push({
              type: 'SHOW_SLOTS',
              data: result.result,
            });
          }
          break;

        case 'get_weather':
          actions.push({
            type: 'SHOW_WEATHER',
            data: result.result,
          });
          break;

        case 'create_booking':
          if ((result.result as any)?.success) {
            actions.push({
              type: 'BOOKING_COMPLETE',
              data: result.result,
            });
          }
          break;
      }
    }

    return actions;
  }

  /**
   * 도구 결과에서 슬롯 업데이트
   */
  private updateSlotsFromToolResults(
    context: ConversationContext,
    toolCalls: ToolCall[],
    results: ToolResult[],
  ): void {
    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const result = results[i];

      if (!result.success) continue;

      switch (call.name) {
        case 'search_clubs':
          if (call.args.location) {
            this.conversationService.updateSlots(context, {
              location: call.args.location as string,
            });
          }
          break;

        case 'search_clubs_with_slots':
          if (call.args.location) {
            this.conversationService.updateSlots(context, {
              location: call.args.location as string,
            });
          }
          if (call.args.date) {
            this.conversationService.updateSlots(context, {
              date: call.args.date as string,
            });
          }
          break;

        case 'get_club_info':
          if (call.args.clubId) {
            this.conversationService.updateSlots(context, {
              clubId: call.args.clubId as string,
            });
          }
          break;

        case 'get_available_slots':
          if (call.args.date) {
            this.conversationService.updateSlots(context, {
              date: call.args.date as string,
            });
          }
          break;

        case 'create_booking':
          if ((result.result as any)?.success) {
            this.conversationService.updateSlots(context, {
              confirmed: true,
            });
          }
          break;
      }
    }
  }

  /**
   * 응답에 따른 상태 업데이트
   */
  private updateStateFromResponse(
    context: ConversationContext,
    response: DeepSeekResponse,
    actions: ChatAction[],
  ): void {
    // 예약 완료 확인
    const bookingComplete = actions.some((a) => a.type === 'BOOKING_COMPLETE');
    if (bookingComplete) {
      this.conversationService.setState(context, 'COMPLETED');
      return;
    }

    // 슬롯 표시 = 확인 대기
    const showingSlots = actions.some((a) => a.type === 'SHOW_SLOTS');
    if (showingSlots) {
      this.conversationService.setState(context, 'CONFIRMING');
      return;
    }

    // 골프장 표시 = 정보 수집 중
    const showingClubs = actions.some((a) => a.type === 'SHOW_CLUBS');
    if (showingClubs) {
      this.conversationService.setState(context, 'COLLECTING');
      return;
    }

    // 기본 상태
    if (context.state === 'IDLE') {
      this.conversationService.setState(context, 'COLLECTING');
    }
  }
}
