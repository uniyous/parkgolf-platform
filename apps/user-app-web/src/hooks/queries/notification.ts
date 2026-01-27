import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationApi,
  type GetNotificationsParams,
  type AppNotification,
} from '@/lib/api/notificationApi';
import { notificationKeys } from './keys';

// ============================================
// Queries
// ============================================

/**
 * 알림 목록 조회
 */
export const useNotificationsQuery = (params?: GetNotificationsParams) => {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.getNotifications(params),
  });
};

/**
 * 읽지 않은 알림 수 조회
 */
export const useUnreadCountQuery = () => {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 30000, // 30초마다 자동 갱신
  });
};

// ============================================
// Mutations
// ============================================

/**
 * 알림 읽음 처리
 */
export const useMarkAsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      notificationApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

/**
 * 모든 알림 읽음 처리
 */
export const useMarkAllAsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

/**
 * 알림 삭제
 */
export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      notificationApi.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};
