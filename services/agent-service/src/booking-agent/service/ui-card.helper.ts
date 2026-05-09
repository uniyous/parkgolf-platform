import { Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { ChatResponseDto, ConversationContext } from '../dto/chat.dto';

/**
 * UI 카드/날짜 헬퍼
 * - SELECT_MEMBERS 카드 빌더 (직접/슬롯/다음팀 등 여러 핸들러에서 공유)
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
   */
  async showSelectMembers(
    context: ConversationContext,
    messageText: string,
  ): Promise<ChatResponseDto | null> {
    const chatRoomId = context.slots.chatRoomId;
    if (!chatRoomId) return null;

    const allMembers = await this.toolExecutor.getChatRoomMembers(chatRoomId);
    if (!allMembers || allMembers.length === 0) return null;

    const teamNumber = context.slots.currentTeamNumber || 1;
    const completedTeams = context.slots.completedTeams || [];

    const assignedUserIds = new Set<number>();
    for (const team of completedTeams) {
      for (const m of team.members) {
        assignedUserIds.add(m.userId);
      }
    }
    const availableMembers = allMembers.filter((m) => !assignedUserIds.has(m.userId));

    const selectData = {
      teamNumber,
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.getTomorrowDate(),
      maxPlayers: 4,
      assignedTeams: completedTeams.map((t) => ({
        teamNumber: t.teamNumber,
        slotTime: t.slotTime,
        gameName: t.gameName,
        members: t.members,
      })),
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
