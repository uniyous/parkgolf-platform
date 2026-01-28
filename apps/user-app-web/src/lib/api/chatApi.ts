import { apiClient } from './client';
import { unwrapResponse, extractPaginatedList, type BffResponse, type PaginatedResult } from './bffParser';

// ============================================
// 타입 정의
// ============================================

export type ChatRoomType = 'DIRECT' | 'GROUP' | 'BOOKING';
export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM' | 'BOOKING_INVITE';

export interface ChatParticipant {
  id: string;
  userId: string;
  userName: string;
  profileImageUrl: string | null;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: MessageType;
  createdAt: string;
  readBy: string[] | null;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  participants: ChatParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatRoomRequest {
  name: string;
  type: ChatRoomType;
  participantIds: string[];
}

export interface SendMessageRequest {
  content: string;
  messageType?: MessageType;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

// ============================================
// Helper Functions
// ============================================

interface ApiRoomMember {
  id: string;
  roomId: string;
  userId: number;
  userName: string;
  joinedAt: string;
  leftAt: string | null;
  isAdmin: boolean;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
}

interface ApiRoomResponse {
  id: string;
  name: string;
  type: ChatRoomType;
  members?: ApiRoomMember[];
  participants?: ChatParticipant[];
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * API 응답의 members를 participants로 변환
 */
function transformRoomResponse(room: ApiRoomResponse): ChatRoom {
  const members = room.members ?? [];
  const participants: ChatParticipant[] = members.map((m) => ({
    id: m.id,
    userId: String(m.userId),
    userName: m.userName,
    profileImageUrl: null,
    joinedAt: m.joinedAt,
  }));

  return {
    id: room.id,
    name: room.name,
    type: room.type,
    participants,
    lastMessage: room.lastMessage ?? null,
    unreadCount: room.unreadCount ?? 0,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

// ============================================
// Chat API
// ============================================

export const chatApi = {
  /**
   * 채팅방 목록 조회
   */
  getChatRooms: async (page = 1, limit = 20): Promise<PaginatedResult<ChatRoom>> => {
    const response = await apiClient.get<BffResponse<ChatRoom[]>>(
      '/api/user/chat/rooms',
      { page, limit }
    );
    return extractPaginatedList<ChatRoom>(response.data);
  },

  /**
   * 채팅방 상세 조회
   */
  getChatRoom: async (roomId: string): Promise<ChatRoom> => {
    const response = await apiClient.get<BffResponse<ChatRoom>>(
      `/api/user/chat/rooms/${roomId}`
    );
    const room = unwrapResponse(response.data);
    // API returns 'members' but frontend expects 'participants'
    return transformRoomResponse(room);
  },

  /**
   * 채팅방 생성
   */
  createChatRoom: async (request: CreateChatRoomRequest): Promise<ChatRoom> => {
    const response = await apiClient.post<BffResponse<ChatRoom>>(
      '/api/user/chat/rooms',
      {
        name: request.name,
        type: request.type,
        participant_ids: request.participantIds,
      }
    );
    const room = unwrapResponse(response.data);
    return transformRoomResponse(room);
  },

  /**
   * 1:1 채팅방 생성 또는 기존 채팅방 조회
   */
  getOrCreateDirectChat: async (userId: string, userName: string): Promise<ChatRoom> => {
    const response = await apiClient.post<BffResponse<ChatRoom>>(
      '/api/user/chat/rooms',
      {
        name: userName,
        type: 'DIRECT',
        participant_ids: [userId],
      }
    );
    const room = unwrapResponse(response.data);
    return transformRoomResponse(room);
  },

  /**
   * 메시지 목록 조회 (cursor 기반)
   * API 응답: { success: true, data: { messages: [...], hasMore, nextCursor } }
   */
  getMessages: async (roomId: string, cursor?: string, limit = 50): Promise<MessagesResponse> => {
    const params: Record<string, string | number> = { limit };
    if (cursor) {
      params.cursor = cursor;
    }
    const response = await apiClient.get<BffResponse<MessagesResponse>>(
      `/api/user/chat/rooms/${roomId}/messages`,
      params
    );
    return unwrapResponse(response.data);
  },

  /**
   * 메시지 전송 (REST API)
   */
  sendMessage: async (roomId: string, content: string, messageType: MessageType = 'TEXT'): Promise<ChatMessage> => {
    const response = await apiClient.post<BffResponse<ChatMessage>>(
      `/api/user/chat/rooms/${roomId}/messages`,
      {
        content,
        message_type: messageType,
      }
    );
    return unwrapResponse(response.data);
  },

  /**
   * 채팅방 나가기
   */
  leaveChatRoom: async (roomId: string): Promise<void> => {
    await apiClient.delete<BffResponse<void>>(`/api/user/chat/rooms/${roomId}/leave`);
  },
};
