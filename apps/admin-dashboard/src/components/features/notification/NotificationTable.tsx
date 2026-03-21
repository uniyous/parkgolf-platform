import React from 'react';
import type { Notification } from '@/lib/api/notificationApi';
import type { Pagination } from '@/types/common';
import { Pagination as PaginationUI } from '@/components/common';

interface NotificationTableProps {
  notifications: Notification[];
  pagination: Pagination;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onNotificationClick: (notification: Notification) => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  PUSH: { label: '푸시', color: 'bg-blue-500/20 text-blue-300' },
  EMAIL: { label: '이메일', color: 'bg-green-500/20 text-green-300' },
  SMS: { label: 'SMS', color: 'bg-orange-500/20 text-orange-300' },
  IN_APP: { label: '인앱', color: 'bg-purple-500/20 text-purple-300' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'bg-yellow-500/20 text-yellow-300' },
  SENT: { label: '발송', color: 'bg-blue-500/20 text-blue-300' },
  DELIVERED: { label: '전달', color: 'bg-green-500/20 text-green-300' },
  FAILED: { label: '실패', color: 'bg-red-500/20 text-red-300' },
  READ: { label: '읽음', color: 'bg-indigo-500/20 text-indigo-300' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: '낮음', color: 'text-white/40' },
  MEDIUM: { label: '보통', color: 'text-white/60' },
  HIGH: { label: '높음', color: 'text-orange-400' },
  URGENT: { label: '긴급', color: 'text-red-400' },
};

const formatDateTime = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const NotificationTable: React.FC<NotificationTableProps> = ({
  notifications,
  pagination,
  isLoading,
  onPageChange,
  onNotificationClick,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8">
        <div className="flex items-center justify-center text-white/60">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mr-3" />
          알림 내역을 불러오는 중...
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8 text-center text-white/40">
        조건에 맞는 알림 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">유형</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">제목</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">수신자</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-white/50 uppercase">우선순위</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-white/50 uppercase">상태</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">발송일시</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">읽음일시</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => {
              const typeConfig = TYPE_CONFIG[notification.type] || { label: notification.type, color: 'bg-gray-500/20 text-gray-300' };
              const statusConfig = STATUS_CONFIG[notification.status] || { label: notification.status, color: 'bg-gray-500/20 text-gray-300' };
              const priorityConfig = PRIORITY_CONFIG[notification.priority] || { label: notification.priority, color: 'text-white/60' };

              return (
                <tr
                  key={notification.id}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => onNotificationClick(notification)}
                >
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeConfig.color)}>
                      {typeConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80 max-w-[300px] truncate">
                    {notification.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {notification.user?.email || notification.user?.username || (notification.userId ? `#${notification.userId}` : '전체')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('text-xs font-medium', priorityConfig.color)}>
                      {priorityConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {formatDateTime(notification.sentAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {formatDateTime(notification.readAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationUI pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
};
