import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekService, DeepSeekResponse, ToolCall } from './deepseek.service';
import { ToolExecutorService, ToolResult } from './tool-executor.service';
import { ConversationService } from './conversation.service';
import {
  ChatRequestDto,
  ChatAction,
  ConversationContext,
} from '../dto/chat.dto';

const MAX_TOOL_ITERATIONS = 5;

/**
 * DeepSeek LLM 도구 호출 루프 + 결과 → UI 액션 / context 동기화.
 */
@Injectable()
export class LlmOrchestratorService {
  private readonly logger = new Logger(LlmOrchestratorService.name);

  constructor(
    private readonly deepseekService: DeepSeekService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * DeepSeek 대화 처리 (도구 호출 루프). 최종 텍스트 + UI 액션 반환.
   */
  async processWithLLM(
    context: ConversationContext,
    request?: ChatRequestDto,
  ): Promise<{ text: string; actions?: ChatAction[] }> {
    const messages = this.conversationService.getRecentMessages(context);

    // 위치 정보를 시스템 메시지로 주입
    if (context.slots.latitude && context.slots.longitude) {
      if (!context.slots.regionName) {
        const regionName = await this.toolExecutor.resolveRegionName(
          context.slots.latitude,
          context.slots.longitude,
        );
        if (regionName) {
          this.conversationService.updateSlots(context, { regionName });
        }
      }

      const locationInfo = context.slots.regionName
        ? `사용자의 현재 위치: ${context.slots.regionName} (위도 ${context.slots.latitude}, 경도 ${context.slots.longitude}). "내 근처" 요청 시 get_nearby_clubs에 이 좌표를 사용하세요. 날씨 질문 시 get_weather_by_location에 location="${context.slots.regionName}", latitude=${context.slots.latitude}, longitude=${context.slots.longitude}를 모두 전달하세요.`
        : `사용자의 현재 위치: 위도 ${context.slots.latitude}, 경도 ${context.slots.longitude}. "내 근처" 요청 시 get_nearby_clubs에 이 좌표를 사용하세요. 날씨 질문 시 get_weather_by_location에 latitude=${context.slots.latitude}, longitude=${context.slots.longitude}를 전달하세요.`;

      messages.unshift({
        role: 'user',
        content: `[시스템 정보] ${locationInfo} 이 메시지에 대해 직접 응답하지 마세요.`,
      });
    }

    // [Phase 2 — Episodic Memory] 사용자 첫 메시지 시점에 한 번 최근 부킹 이력 prefill
    // (이미 prefill된 경우 skip — slots.episodicPrefilled 플래그)
    if (request?.userId && !context.slots.episodicPrefilled) {
      try {
        const recent = await this.toolExecutor.getUserRecentBookings(request.userId, 5);
        if (recent.length > 0) {
          const summary = recent
            .map(
              (b, i) =>
                `${i + 1}) ${b.clubName ?? `클럽${b.clubId}`} · ${b.date ?? '-'} ${b.startTime ?? ''} · ${b.playerCount}명 · ${b.paymentMethod ?? '-'} · ${b.status}`,
            )
            .join('\n');
          messages.unshift({
            role: 'user',
            content:
              `[시스템 정보 — 최근 부킹 이력 ${recent.length}건]\n${summary}\n\n"지난번처럼", "자주 가는" 같은 표현 시 위 이력을 참고하세요. 이 메시지엔 직접 응답하지 마세요.`,
          });
        }
        // 동일 conversation 내 중복 prefill 방지
        this.conversationService.updateSlots(context, { episodicPrefilled: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown';
        this.logger.warn(`Episodic prefill skipped: ${msg}`);
      }
    }

    let llmResponse: DeepSeekResponse;
    let iterations = 0;
    let allActions: ChatAction[] = [];
    const toolHistory: Array<{
      toolCalls: ToolCall[];
      results: Array<{ name: string; result: unknown }>;
    }> = [];

    llmResponse = await this.deepseekService.chat(messages);

    while (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      if (iterations >= MAX_TOOL_ITERATIONS) {
        this.logger.warn('Max tool iterations reached');
        break;
      }

      const toolResults = await this.executeTools(llmResponse.toolCalls, request);
      const actions = this.createActionsFromToolResults(llmResponse.toolCalls, toolResults);
      allActions = [...allActions, ...actions];

      this.updateSlotsFromToolResults(context, llmResponse.toolCalls, toolResults);

      toolHistory.push({
        toolCalls: llmResponse.toolCalls,
        results: toolResults.map((tr) => ({ name: tr.name, result: tr.result })),
      });

      llmResponse = await this.deepseekService.continueWithToolResults(
        messages,
        toolHistory,
      );

      iterations++;
    }

    if (llmResponse.text) {
      this.conversationService.addAssistantMessage(context, llmResponse.text);
    }

    this.updateStateFromResponse(context, llmResponse, allActions);

    return {
      text: llmResponse.text || '',
      actions: allActions.length > 0 ? allActions : undefined,
    };
  }

  /**
   * 도구 실행 (create_booking에 사용자 정보 서버사이드 주입)
   */
  private async executeTools(toolCalls: ToolCall[], request?: ChatRequestDto): Promise<ToolResult[]> {
    this.logger.debug(`Executing ${toolCalls.length} tools`);

    if (request?.userId) {
      toolCalls = toolCalls.map((tc) => {
        if (tc.name === 'create_booking') {
          return {
            ...tc,
            args: {
              ...tc.args,
              userId: request.userId,
              userName: request.userName,
              userEmail: request.userEmail,
            },
          };
        }
        // get_chat_room_members: chatRoomId가 LLM이 안 채웠으면 request에서 자동 주입
        if (tc.name === 'get_chat_room_members' && !tc.args.chatRoomId && request.chatRoomId) {
          return {
            ...tc,
            args: { ...tc.args, chatRoomId: request.chatRoomId },
          };
        }
        // get_user_recent_bookings: userId 자동 주입 (Phase 2 Episodic)
        if (tc.name === 'get_user_recent_bookings' && !tc.args.userId) {
          return {
            ...tc,
            args: { ...tc.args, userId: request.userId },
          };
        }
        return tc;
      });
    }

    return this.toolExecutor.executeAll(toolCalls);
  }

  /**
   * 도구 결과 → UI 액션 변환
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
          if (result.result && (result.result as any).found > 0) {
            actions.push({ type: 'SHOW_CLUBS', data: result.result });
          }
          break;

        case 'search_clubs_with_slots': {
          const searchData = result.result as any;
          if (searchData?.found > 0 && searchData.clubs) {
            for (const club of searchData.clubs) {
              if (club.rounds?.length > 0) {
                actions.push({
                  type: 'SHOW_SLOTS',
                  data: {
                    clubId: club.id,
                    clubName: club.name,
                    clubAddress: club.address,
                    date: searchData.date,
                    availableCount: club.availableSlotCount,
                    rounds: club.rounds,
                    slots: club.rounds
                      .flatMap((r: any) => r.slots.map((s: any) => ({ ...s, gameName: r.name })))
                      .slice(0, 10),
                  },
                });
              }
            }
          }
          break;
        }

        case 'get_available_slots':
          if (result.result && (result.result as any).availableCount > 0) {
            actions.push({ type: 'SHOW_SLOTS', data: result.result });
          }
          break;

        case 'get_weather':
        case 'get_weather_by_location':
          actions.push({ type: 'SHOW_WEATHER', data: result.result });
          break;

        case 'create_booking':
          if ((result.result as any)?.success) {
            const status = (result.result as any)?.status;
            if (status === 'SLOT_RESERVED') {
              actions.push({ type: 'SHOW_PAYMENT', data: result.result });
            } else {
              actions.push({ type: 'TEAM_COMPLETE', data: result.result });
            }
          }
          break;
      }
    }

    return actions;
  }

  /**
   * 도구 결과 → context.slots 동기화
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

        case 'search_clubs_with_slots': {
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
          if (call.args.playerCount) {
            this.conversationService.updateSlots(context, {
              playerCount: call.args.playerCount as number,
            });
          }
          const searchResult = result.result as any;
          if (searchResult?.found === 1 && searchResult.clubs?.[0]) {
            const club = searchResult.clubs[0];
            this.conversationService.updateSlots(context, {
              clubId: String(club.id),
              clubName: club.name,
            });
          }
          break;
        }

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
            this.conversationService.updateSlots(context, { confirmed: true });
          }
          break;
      }
    }
  }

  /**
   * LLM 응답 / 액션에 따라 context.state 업데이트
   */
  private updateStateFromResponse(
    context: ConversationContext,
    _response: DeepSeekResponse,
    actions: ChatAction[],
  ): void {
    const bookingComplete = actions.some((a) => a.type === 'TEAM_COMPLETE');
    if (bookingComplete) {
      this.conversationService.setState(context, 'COMPLETED');
      return;
    }

    const selectingMembers = actions.some((a) => a.type === 'SELECT_MEMBERS');
    if (selectingMembers) {
      this.conversationService.setState(context, 'SELECTING_MEMBERS');
      return;
    }

    const showingSlots = actions.some((a) => a.type === 'SHOW_SLOTS');
    if (showingSlots) {
      this.conversationService.setState(context, 'CONFIRMING');
      return;
    }

    const showingClubs = actions.some((a) => a.type === 'SHOW_CLUBS');
    if (showingClubs) {
      this.conversationService.setState(context, 'COLLECTING');
      return;
    }

    if (context.state === 'IDLE') {
      this.conversationService.setState(context, 'COLLECTING');
    }
  }
}
