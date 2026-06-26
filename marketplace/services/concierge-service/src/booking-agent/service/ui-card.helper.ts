import { Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { ChatResponseDto, ConversationContext } from '../dto/chat.dto';

/**
 * UI 카드/날짜 헬퍼
 * - SELECT_MEMBERS 카드 빌더 (클럽 선택/슬롯 핸들러에서 공유)
 * - 단순 날짜 유틸
 */
@Injectable()
export class UiCardHelper {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly toolExecutor: ToolExecutorService,
  ) {}

  /**
   * SELECT_MEMBERS 카드 응답 생성. chatRoomId 없거나 멤버 조회 실패 시 null.
   *
   * 1예약 = 최대 4명 (UNI-36). 카드 데이터 (클라이언트는 단순 렌더만):
   * - currentTeam: 지금 선택 중인 멤버 (자연어로 사전 추출된 멤버 미리 채움 가능)
   * - availableMembers: 채팅방 전체 멤버 중 이미 선택된 멤버 제외한 후보
   */
  async showSelectMembers(
    context: ConversationContext,
    messageText: string,
  ): Promise<ChatResponseDto | null> {
    const chatRoomId = context.slots.chatRoomId;
    if (!chatRoomId) return null;

    const allMembers = await this.toolExecutor.getChatRoomMembers(chatRoomId);
    if (!allMembers || allMembers.length === 0) return null;

    const currentTeamMembers = context.slots.currentTeamMembers || [];

    const selectedUserIds = new Set<number>(currentTeamMembers.map((m) => m.userId));
    const availableMembers = allMembers.filter((m) => !selectedUserIds.has(m.userId));

    const currentTeam = {
      slotId: context.slots.slotId || '',
      slotTime: context.slots.time || '',
      gameName: context.slots.gameName || '',
      maxPlayers: 4,
      members: currentTeamMembers.map((m) => ({
        userId: m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
      })),
    };

    const selectData = {
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.getTomorrowDate(),
      maxPlayers: 4,
      currentTeam,
      availableMembers,
    };

    this.conversationService.addAssistantMessage(context, messageText);
    this.conversationService.setState(context, 'SELECTING_MEMBERS');

    return {
      conversationId: context.conversationId,
      message: messageText,
      state: context.state,
      actions: [{ type: 'SELECT_MEMBERS', data: selectData }],
    };
  }

  /**
   * 내일 날짜 반환 (YYYY-MM-DD)
   */
  getTomorrowDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
}
