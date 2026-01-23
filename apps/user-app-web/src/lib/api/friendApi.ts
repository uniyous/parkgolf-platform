import { apiClient } from './client';
import { unwrapResponse, type BffResponse } from './bffParser';

// ============================================
// 타입 정의
// ============================================

export interface Friend {
  id: number;
  friendId: number;
  friendName: string;
  friendEmail: string;
  friendProfileImageUrl: string | null;
  createdAt: string;
}

export interface FriendRequest {
  id: number;
  fromUserId: number;
  fromUserName: string;
  fromUserEmail: string;
  fromUserProfileImageUrl: string | null;
  status: string;
  message: string | null;
  createdAt: string;
}

export interface SentFriendRequest {
  id: number;
  toUserId: number;
  toUserName: string;
  toUserEmail: string;
  toUserProfileImageUrl: string | null;
  status: string;
  message: string | null;
  createdAt: string;
}

export interface UserSearchResult {
  id: number;
  email: string;
  name: string;
  profileImageUrl: string | null;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

// ============================================
// Friend API
// ============================================

export const friendApi = {
  /**
   * 친구 목록 조회
   */
  getFriends: async (): Promise<Friend[]> => {
    const response = await apiClient.get<BffResponse<Friend[]>>('/api/user/friends');
    return unwrapResponse(response.data);
  },

  /**
   * 받은 친구 요청 목록 조회
   */
  getFriendRequests: async (): Promise<FriendRequest[]> => {
    const response = await apiClient.get<BffResponse<FriendRequest[]>>('/api/user/friends/requests');
    return unwrapResponse(response.data);
  },

  /**
   * 보낸 친구 요청 목록 조회
   */
  getSentFriendRequests: async (): Promise<SentFriendRequest[]> => {
    const response = await apiClient.get<BffResponse<SentFriendRequest[]>>('/api/user/friends/requests/sent');
    return unwrapResponse(response.data);
  },

  /**
   * 사용자 검색
   */
  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    const response = await apiClient.get<BffResponse<UserSearchResult[]>>(
      '/api/user/friends/search',
      { query }
    );
    return unwrapResponse(response.data);
  },

  /**
   * 친구 요청 보내기
   */
  sendFriendRequest: async (toUserId: number, message?: string): Promise<void> => {
    await apiClient.post<BffResponse<void>>('/api/user/friends/requests', {
      toUserId,
      message,
    });
  },

  /**
   * 친구 요청 수락
   */
  acceptFriendRequest: async (requestId: number): Promise<void> => {
    await apiClient.post<BffResponse<void>>(`/api/user/friends/requests/${requestId}/accept`);
  },

  /**
   * 친구 요청 거절
   */
  rejectFriendRequest: async (requestId: number): Promise<void> => {
    await apiClient.post<BffResponse<void>>(`/api/user/friends/requests/${requestId}/reject`);
  },

  /**
   * 친구 삭제
   */
  removeFriend: async (friendId: number): Promise<void> => {
    await apiClient.delete<BffResponse<void>>(`/api/user/friends/${friendId}`);
  },
};
