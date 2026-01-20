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
    return unwrapResponse(response.data);
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
    return unwrapResponse(response.data);
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
    return unwrapResponse(response.data);
  },

  /**
   * 메시지 목록 조회
   */
  getMessages: async (roomId: string, page = 1, limit = 50): Promise<PaginatedResult<ChatMessage>> => {
    const response = await apiClient.get<BffResponse<ChatMessage[]>>(
      `/api/user/chat/rooms/${roomId}/messages`,
      { page, limit }
    );
    return extractPaginatedList<ChatMessage>(response.data);
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
