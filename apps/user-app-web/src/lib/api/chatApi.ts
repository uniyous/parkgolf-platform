import { apiClient } from './client';
import { unwrapResponse, extractPaginatedList, type BffResponse, type PaginatedResult } from './bffParser';

// ============================================
// 타입 정의
// ============================================

export type ChatRoomType = 'DIRECT' | 'GROUP' | 'BOOKING';
export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM' | 'BOOKING_INVITE' | 'AI_USER' | 'AI_ASSISTANT';

export interface ChatParticipant {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: MessageType;
  metadata?: string;
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
// AI Chat Types
// ============================================

export type ConversationState = 'IDLE' | 'COLLECTING' | 'SELECTING_MEMBERS' | 'CONFIRMING' | 'BOOKING' | 'SETTLING' | 'TEAM_COMPLETE' | 'COMPLETED' | 'CANCELLED';
export type ActionType = 'SHOW_CLUBS' | 'SHOW_SLOTS' | 'SHOW_WEATHER' | 'CONFIRM_BOOKING' | 'SELECT_MEMBERS' | 'SHOW_PAYMENT' | 'SPLIT_PAYMENT' | 'SETTLEMENT_STATUS' | 'TEAM_COMPLETE' | 'BOOKING_COMPLETE';

export interface ChatAction {
  type: ActionType;
  data: unknown;
}

export interface AiChatResponse {
  conversationId: string;
  message: string;
  state: ConversationState;
  actions?: ChatAction[];
}

export interface ClubCardData {
  found: number;
  clubs: Array<{
    id: string;
    name: string;
    address: string;
    region: string;
  }>;
}

export interface SlotCardData {
  clubId?: string;
  clubName?: string;
  clubAddress?: string;
  date: string;
  availableCount: number;
  rounds?: Array<{
    gameId: number;
    name: string;
    price: number;
    slots: Array<{
      id: string;
      time: string;
      endTime?: string;
      availableSpots?: number;
      price: number;
    }>;
  }>;
  slots: Array<{
    id: string;
    time: string;
    endTime: string;
    availableSpots: number;
    price: number;
    gameName: string;
  }>;
}

export interface WeatherCardData {
  date: string;
  clubName?: string;
  location?: string;
  temperature: number;
  minTemperature?: number;
  maxTemperature?: number;
  sky: string;
  precipitation: number;
  recommendation: string;
}

export interface BookingCompleteData {
  success: boolean;
  bookingId: string;
  confirmationNumber: string;
  details: {
    date: string;
    time: string;
    playerCount: number;
    totalPrice: number;
  };
}

export interface ConfirmBookingData {
  clubName: string;
  date: string;
  time: string;
  playerCount: number;
  price: number;
  gameName?: string;
  // 그룹 예약 시
  teamNumber?: number;
  members?: Array<{ userId: number; userName: string }>;
  pricePerPerson?: number;
  groupMode?: boolean;
}

export interface PaymentCardData {
  bookingId: number;
  orderId?: string | null;
  amount: number;
  orderName: string;
  clubName: string;
  date: string;
  time: string;
  playerCount: number;
}

export interface TeamMember {
  userId: number;
  userName: string;
  userEmail: string;
}

export interface SelectMembersData {
  teamNumber: number;
  clubName: string;
  date: string;
  maxPlayers: number;
  assignedTeams: Array<{
    teamNumber: number;
    slotTime: string;
    gameName: string;
    members: Array<{ userId: number; userName: string }>;
  }>;
  availableMembers: Array<{
    userId: number;
    userName: string;
    userEmail: string;
  }>;
}

export interface TeamCompleteData {
  teamNumber: number;
  bookingId: number;
  bookingNumber: string;
  clubName: string;
  date: string;
  slotTime: string;
  gameName: string;
  participants: Array<{ userId: number; userName: string }>;
  totalPrice: number;
  paymentMethod: string;
  hasMoreTeams: boolean;
}

export interface SettlementStatusData {
  groupNumber?: string;
  bookingGroupId?: number;
  bookingId?: number;
  bookerId?: number;
  teamNumber?: number;
  clubName?: string;
  gameName?: string;
  date?: string;
  slotTime?: string;
  totalParticipants: number;
  pricePerPerson: number;
  totalPrice: number;
  paidCount: number;
  expiredAt?: string;
  participants: Array<{
    userId: number;
    userName: string;
    orderId?: string;
    amount?: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    expiredAt?: string;
  }>;
}

export interface AiChatRequest {
  message: string;
  conversationId?: string;
  latitude?: number | null;
  longitude?: number | null;
  selectedClubId?: string;
  selectedClubName?: string;
  selectedSlotId?: string;
  selectedSlotTime?: string;
  selectedSlotPrice?: number;
  selectedGameName?: string;
  confirmBooking?: boolean;
  cancelBooking?: boolean;
  paymentMethod?: string;
  paymentComplete?: boolean;
  paymentSuccess?: boolean;
  // 그룹 예약 (팀 단위)
  teamMembers?: Array<{ userId: number; userName: string; userEmail: string }>;
  nextTeam?: boolean;
  finishGroup?: boolean;
  sendReminder?: boolean;
  // 분할결제 완료
  splitPaymentComplete?: boolean;
  splitOrderId?: string;
}

// ============================================
// Helper Functions
// ============================================

interface ApiRoomMember {
  id: string;
  roomId: string;
  userId: number;
  userName: string;
  userEmail: string | null;
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
    userEmail: m.userEmail || null,
    profileImageUrl: null,
    isAdmin: m.isAdmin,
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
// Display Name Utility
// ============================================

/**
 * 채팅방 표시 이름 생성
 * - DIRECT: 상대방 이름
 * - GROUP/BOOKING: 방 이름 우선, 없으면 참여자 이름 폴백
 */
export function getChatRoomDisplayName(room: ChatRoom, currentUserId: string): string {
  const others = (room.participants ?? []).filter((p) => p.userId !== currentUserId);

  // DIRECT: 상대방 이름
  if (room.type === 'DIRECT') {
    return others.length > 0 ? others[0].userName : (room.name || '채팅');
  }

  // GROUP/BOOKING: 방 이름이 있으면 우선 사용
  if (room.name) {
    return room.name;
  }

  // 방 이름이 없을 때 참여자 이름 폴백 (생성자 우선)
  if (others.length === 0) return '채팅방';
  const sorted = [...others].sort((a, b) => (a.isAdmin === b.isAdmin ? 0 : a.isAdmin ? -1 : 1));
  if (sorted.length <= 2) {
    return sorted.map((p) => p.userName).join(', ');
  }
  const first = sorted.slice(0, 2).map((p) => p.userName).join(', ');
  return `${first} 외 ${sorted.length - 2}명`;
}

// ============================================
// Chat API
// ============================================

export const chatApi = {
  /**
   * 채팅방 목록 조회
   */
  getChatRooms: async (page = 1, limit = 20): Promise<PaginatedResult<ChatRoom>> => {
    const response = await apiClient.get<BffResponse<ApiRoomResponse[]>>(
      '/api/user/chat/rooms',
      { page, limit }
    );
    const result = extractPaginatedList<ApiRoomResponse>(response.data);
    return {
      data: result.data.map(transformRoomResponse),
      pagination: result.pagination,
    };
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
    const result = unwrapResponse(response.data);
    // DB 응답의 'type' 필드를 프론트엔드 'messageType'으로 정규화
    result.messages = result.messages.map((msg) => {
      const raw = msg as unknown as Record<string, unknown>;
      return {
        ...msg,
        senderId: String(raw.senderId ?? msg.senderId),
        messageType: msg.messageType || (raw.type as MessageType) || 'TEXT',
      };
    });
    return result;
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
   * 채팅방 멤버 초대
   */
  inviteMembers: async (roomId: string, userIds: string[]): Promise<void> => {
    await apiClient.post<BffResponse<void>>(
      `/api/user/chat/rooms/${roomId}/members`,
      { user_ids: userIds },
    );
  },

  /**
   * 채팅방 나가기
   */
  leaveChatRoom: async (roomId: string): Promise<void> => {
    await apiClient.delete<BffResponse<void>>(`/api/user/chat/rooms/${roomId}/leave`);
  },

  /**
   * 채팅방 메시지 읽음 처리
   */
  markAsRead: async (roomId: string): Promise<void> => {
    await apiClient.post<BffResponse<void>>(`/api/user/chat/rooms/${roomId}/read`);
  },

  /**
   * AI 예약 도우미에게 메시지 전송
   */
  sendAiMessage: async (
    roomId: string,
    request: AiChatRequest,
  ): Promise<AiChatResponse> => {
    const response = await apiClient.post<BffResponse<AiChatResponse>>(
      `/api/user/chat/rooms/${roomId}/agent`,
      request,
    );
    return unwrapResponse(response.data);
  },
};
