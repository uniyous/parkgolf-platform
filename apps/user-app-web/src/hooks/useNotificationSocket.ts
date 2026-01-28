import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notificationSocket, type NotificationEvent } from '@/lib/socket/notificationSocket';
import { notificationKeys } from './queries/keys';
import { useAuthStore } from '@/stores/authStore';

interface UseNotificationSocketOptions {
  onNotification?: (notification: NotificationEvent) => void;
  enabled?: boolean;
}

/**
 * 실시간 알림 수신을 위한 WebSocket 훅
 *
 * 기능:
 * - 인증된 사용자일 때 자동 연결
 * - 새 알림 수신 시 React Query 캐시 자동 갱신
 * - 알림 수신 시 콜백 호출 (토스트 표시 등)
 * - 컴포넌트 언마운트 시 자동 정리
 */
export function useNotificationSocket(options: UseNotificationSocketOptions = {}) {
  const { onNotification, enabled = true } = options;
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuthStore();
  const isConnectedRef = useRef(false);

  // Handle incoming notifications
  const handleNotification = useCallback(
    (notification: NotificationEvent) => {
      // Invalidate notification queries to refresh the list
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });

      // Call custom handler if provided
      onNotification?.(notification);
    },
    [queryClient, onNotification]
  );

  // Connect when authenticated
  useEffect(() => {
    if (!enabled || !isAuthenticated || !token) {
      return;
    }

    // Connect to notification socket
    notificationSocket.connect(token);
    isConnectedRef.current = true;

    // Subscribe to notifications
    const unsubscribeNotification = notificationSocket.onNotification(handleNotification);

    // Cleanup on unmount or auth change
    return () => {
      unsubscribeNotification();
      if (isConnectedRef.current) {
        notificationSocket.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [enabled, isAuthenticated, token, handleNotification]);

  // Force reconnect function
  const reconnect = useCallback(() => {
    if (token) {
      notificationSocket.forceReconnect(token);
    }
  }, [token]);

  return {
    isConnected: notificationSocket.isConnected,
    canReconnect: notificationSocket.canReconnect,
    reconnect,
  };
}

/**
 * 앱 전체에서 한 번만 호출하여 알림 소켓을 초기화하는 훅
 * App.tsx 또는 최상위 레이아웃에서 사용
 */
export function useNotificationSocketInitializer() {
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // 로그아웃 시 소켓 연결 해제
      notificationSocket.disconnect();
      return;
    }

    // 소켓 연결
    notificationSocket.connect(token);

    // 알림 수신 시 캐시 갱신
    const unsubscribe = notificationSocket.onNotification(() => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, token, queryClient]);
}
