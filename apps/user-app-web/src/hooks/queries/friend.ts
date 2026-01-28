import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendApi } from '@/lib/api/friendApi';

// ============================================
// Query Keys
// ============================================

export const friendKeys = {
  all: ['friends'] as const,
  list: () => [...friendKeys.all, 'list'] as const,
  requests: () => [...friendKeys.all, 'requests'] as const,
  sentRequests: () => [...friendKeys.all, 'sentRequests'] as const,
  search: (query: string) => [...friendKeys.all, 'search', query] as const,
};

// ============================================
// Queries
// ============================================

/**
 * 친구 목록 조회
 */
export const useFriendsQuery = () => {
  return useQuery({
    queryKey: friendKeys.list(),
    queryFn: () => friendApi.getFriends(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * 받은 친구 요청 목록 조회
 */
export const useFriendRequestsQuery = () => {
  return useQuery({
    queryKey: friendKeys.requests(),
    queryFn: () => friendApi.getFriendRequests(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * 보낸 친구 요청 목록 조회
 */
export const useSentFriendRequestsQuery = () => {
  return useQuery({
    queryKey: friendKeys.sentRequests(),
    queryFn: () => friendApi.getSentFriendRequests(),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/**
 * 사용자 검색
 */
export const useSearchUsersQuery = (query: string) => {
  return useQuery({
    queryKey: friendKeys.search(query),
    queryFn: () => friendApi.searchUsers(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ============================================
// Mutations
// ============================================

/**
 * 친구 요청 보내기
 */
export const useSendFriendRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ toUserId, message }: { toUserId: number; message?: string }) =>
      friendApi.sendFriendRequest(toUserId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.sentRequests() });
      queryClient.invalidateQueries({ queryKey: friendKeys.all });
    },
  });
};

/**
 * 친구 요청 수락
 */
export const useAcceptFriendRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => friendApi.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.all });
    },
  });
};

/**
 * 친구 요청 거절
 */
export const useRejectFriendRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => friendApi.rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.requests() });
    },
  });
};

/**
 * 친구 삭제
 */
export const useRemoveFriendMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId: number) => friendApi.removeFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.list() });
    },
  });
};
