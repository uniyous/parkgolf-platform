import { apiClient } from './client';

// ============================================
// 타입 정의
// ============================================

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'CHAT_MESSAGE'
  | 'SYSTEM_ALERT';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ';

export interface NotificationData {
  bookingId?: string;
  courseId?: string;
  courseName?: string;
  bookingDate?: string;
  bookingTime?: string;
  paymentId?: string;
  amount?: number;
  failureReason?: string;
  friendId?: string;
  friendName?: string;
  chatRoomId?: string;
}

export interface AppNotification {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData | null;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 표준 페이지네이션 응답 형식
export interface NotificationsResponse {
  success: boolean;
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

export interface MarkAsReadResponse {
  success: boolean;
  data: AppNotification;
}

export interface MarkAllAsReadResponse {
  success: boolean;
  data: { count: number };
}

export interface DeleteResponse {
  success: boolean;
  data: { deleted: boolean };
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
}

// 프론트엔드에서 사용하는 알림 목록 결과 형식
export interface NotificationListResult {
  notifications: AppNotification[];
  total: number;
  page: number;
  totalPages: number;
}

// ============================================
// Notification API
// ============================================

export const notificationApi = {
  /**
   * 알림 목록 조회
   */
  getNotifications: async (params?: GetNotificationsParams): Promise<NotificationListResult> => {
    const response = await apiClient.get<NotificationsResponse>(
      '/api/user/notifications',
      params
    );
    // 표준 페이지네이션 응답을 프론트엔드 형식으로 변환
    return {
      notifications: response.data.data,
      total: response.data.total,
      page: response.data.page,
      totalPages: response.data.totalPages,
    };
  },

  /**
   * 읽지 않은 알림 수 조회
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<UnreadCountResponse>(
      '/api/user/notifications/unread-count'
    );
    return response.data.count;
  },

  /**
   * 특정 알림 읽음 처리
   */
  markAsRead: async (notificationId: number): Promise<AppNotification> => {
    const response = await apiClient.post<MarkAsReadResponse>(
      `/api/user/notifications/${notificationId}/read`
    );
    return response.data.data;
  },

  /**
   * 모든 알림 읽음 처리
   */
  markAllAsRead: async (): Promise<number> => {
    const response = await apiClient.post<MarkAllAsReadResponse>(
      '/api/user/notifications/read-all'
    );
    return response.data.data?.count ?? 0;
  },

  /**
   * 알림 삭제
   */
  deleteNotification: async (notificationId: number): Promise<void> => {
    await apiClient.delete<DeleteResponse>(`/api/user/notifications/${notificationId}`);
  },
};

// ============================================
// Helper Functions
// ============================================

export const getNotificationTypeDisplayName = (type: NotificationType): string => {
  const displayNames: Record<NotificationType, string> = {
    BOOKING_CONFIRMED: '예약 확정',
    BOOKING_CANCELLED: '예약 취소',
    PAYMENT_SUCCESS: '결제 완료',
    PAYMENT_FAILED: '결제 실패',
    FRIEND_REQUEST: '친구 요청',
    FRIEND_ACCEPTED: '친구 수락',
    CHAT_MESSAGE: '새 메시지',
    SYSTEM_ALERT: '시스템 알림',
  };
  return displayNames[type];
};

export const getNotificationTypeIcon = (type: NotificationType): string => {
  const icons: Record<NotificationType, string> = {
    BOOKING_CONFIRMED: 'check-circle',
    BOOKING_CANCELLED: 'x-circle',
    PAYMENT_SUCCESS: 'credit-card',
    PAYMENT_FAILED: 'alert-triangle',
    FRIEND_REQUEST: 'user-plus',
    FRIEND_ACCEPTED: 'users',
    CHAT_MESSAGE: 'message-circle',
    SYSTEM_ALERT: 'bell',
  };
  return icons[type];
};

export const isNotificationRead = (notification: AppNotification): boolean => {
  return notification.readAt !== null || notification.status === 'READ';
};
