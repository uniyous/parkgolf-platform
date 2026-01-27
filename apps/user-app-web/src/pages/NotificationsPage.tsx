import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  CreditCard,
  AlertTriangle,
  UserPlus,
  Users,
  MessageCircle,
  Trash2,
  Check,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingView } from '@/components/ui/LoadingView';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} from '@/hooks/queries/notification';
import {
  type AppNotification,
  type NotificationType,
  isNotificationRead,
  getNotificationTypeDisplayName,
} from '@/lib/api/notificationApi';
import { cn } from '@/lib/utils';

export function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useNotificationsQuery({ page, limit: 20 });
  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();
  const deleteMutation = useDeleteNotificationMutation();

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !isNotificationRead(n)).length;

  const handleNotificationClick = async (notification: AppNotification) => {
    // Mark as read
    if (!isNotificationRead(notification)) {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // Navigate based on type
    handleNotificationNavigation(notification);
  };

  const handleNotificationNavigation = (notification: AppNotification) => {
    switch (notification.type) {
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_CANCELLED':
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
        if (notification.data?.bookingId) {
          navigate(`/bookings/${notification.data.bookingId}`);
        }
        break;
      case 'FRIEND_REQUEST':
      case 'FRIEND_ACCEPTED':
        navigate('/social');
        break;
      case 'CHAT_MESSAGE':
        if (notification.data?.chatRoomId) {
          navigate(`/chat/${notification.data.chatRoomId}`);
        }
        break;
      case 'SYSTEM_ALERT':
        // Stay on page
        break;
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    await deleteMutation.mutateAsync(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  if (isLoading) {
    return <LoadingView />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-white/70">알림을 불러오는데 실패했습니다.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="알림"
          onBack={() => navigate(-1)}
          rightContent={
            unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="text-emerald-400 hover:text-emerald-300"
              >
                <Check className="w-4 h-4 mr-1" />
                모두 읽음
              </Button>
            ) : undefined
          }
        />

        {notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff className="w-16 h-16" />}
            title="알림이 없습니다"
            description="새로운 알림이 도착하면 여기에 표시됩니다."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onDelete={(e) => handleDelete(e, notification.id)}
                isDeleting={deleteMutation.isPending}
              />
            ))}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  이전
                </Button>
                <span className="flex items-center px-4 text-white/70">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Notification Row Component
// ============================================

interface NotificationRowProps {
  notification: AppNotification;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}

function NotificationRow({
  notification,
  onClick,
  onDelete,
  isDeleting,
}: NotificationRowProps) {
  const isRead = isNotificationRead(notification);
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationIconColor(notification.type);

  return (
    <GlassCard
      className={cn(
        'cursor-pointer transition-all hover:bg-white/10',
        isRead && 'opacity-70'
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center',
            `bg-${iconColor}/20`
          )}
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-white truncate">
              {notification.title}
            </h3>
            <span className="flex-shrink-0 text-xs text-white/50">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>

          <p className="mt-1 text-sm text-white/70 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs"
              style={{
                backgroundColor: `${iconColor}20`,
                color: iconColor,
              }}
            >
              {getNotificationTypeDisplayName(notification.type)}
            </span>

            <div className="flex items-center gap-2">
              {!isRead && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="p-1 text-white/40 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================
// Helper Functions
// ============================================

function getNotificationIcon(type: NotificationType) {
  const icons: Record<NotificationType, typeof Bell> = {
    BOOKING_CONFIRMED: CheckCircle,
    BOOKING_CANCELLED: XCircle,
    PAYMENT_SUCCESS: CreditCard,
    PAYMENT_FAILED: AlertTriangle,
    FRIEND_REQUEST: UserPlus,
    FRIEND_ACCEPTED: Users,
    CHAT_MESSAGE: MessageCircle,
    SYSTEM_ALERT: Bell,
  };
  return icons[type];
}

function getNotificationIconColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    BOOKING_CONFIRMED: '#10b981', // emerald
    BOOKING_CANCELLED: '#ef4444', // red
    PAYMENT_SUCCESS: '#10b981', // emerald
    PAYMENT_FAILED: '#ef4444', // red
    FRIEND_REQUEST: '#f59e0b', // amber
    FRIEND_ACCEPTED: '#10b981', // emerald
    CHAT_MESSAGE: '#3b82f6', // blue
    SYSTEM_ALERT: '#f59e0b', // amber
  };
  return colors[type];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '방금';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default NotificationsPage;
