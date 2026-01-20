import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { chatApi, type CreateChatRoomRequest, type MessageType } from '@/lib/api/chatApi';

// ============================================
// Query Keys
// ============================================

export const chatKeys = {
  all: ['chat'] as const,
  rooms: () => [...chatKeys.all, 'rooms'] as const,
  roomList: (page: number, limit: number) => [...chatKeys.rooms(), page, limit] as const,
  room: (roomId: string) => [...chatKeys.rooms(), roomId] as const,
  messages: (roomId: string) => [...chatKeys.all, 'messages', roomId] as const,
  messageList: (roomId: string, page: number, limit: number) =>
    [...chatKeys.messages(roomId), page, limit] as const,
};

// ============================================
// Queries
// ============================================

/**
 * 채팅방 목록 조회
 */
export const useChatRoomsQuery = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: chatKeys.roomList(page, limit),
    queryFn: () => chatApi.getChatRooms(page, limit),
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: keepPreviousData,
  });
};

/**
 * 채팅방 상세 조회
 */
export const useChatRoomQuery = (roomId: string) => {
  return useQuery({
    queryKey: chatKeys.room(roomId),
    queryFn: () => chatApi.getChatRoom(roomId),
    enabled: !!roomId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * 메시지 목록 조회
 */
export const useMessagesQuery = (roomId: string, page = 1, limit = 50) => {
  return useQuery({
    queryKey: chatKeys.messageList(roomId, page, limit),
    queryFn: () => chatApi.getMessages(roomId, page, limit),
    enabled: !!roomId,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: keepPreviousData,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * 채팅방 생성
 */
export const useCreateChatRoomMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateChatRoomRequest) => chatApi.createChatRoom(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
};

/**
 * 1:1 채팅방 생성 또는 기존 채팅방 조회
 */
export const useGetOrCreateDirectChatMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, userName }: { userId: string; userName: string }) =>
      chatApi.getOrCreateDirectChat(userId, userName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
};

/**
 * 메시지 전송 (REST API fallback)
 */
export const useSendMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roomId,
      content,
      messageType = 'TEXT',
    }: {
      roomId: string;
      content: string;
      messageType?: MessageType;
    }) => chatApi.sendMessage(roomId, content, messageType),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(roomId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
};

/**
 * 채팅방 나가기
 */
export const useLeaveChatRoomMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => chatApi.leaveChatRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
};
