import { useState, useMemo } from 'react';
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
  Calendar,
  Shield,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, LoadingView, EmptyState, Button } from '@/components/ui';
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

// ============================================
// Filter Types
// ============================================

type NotificationFilter = 'all' | 'booking' | 'social' | 'system';

const FILTER_CONFIG: Record<NotificationFilter, {
  label: string;
  icon: typeof Bell;
  types: NotificationType[] | null;
}> = {
  all: {
    label: '전체',
    icon: Bell,
    types: null, // all types
  },
  booking: {
    label: '예약',
    icon: Calendar,
    types: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED'],
  },
  social: {
    label: '소셜',
    icon: Users,
    types: ['FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'CHAT_MESSAGE'],
  },
  system: {
    label: '시스템',
    icon: Shield,
    types: ['SYSTEM_ALERT'],
  },
};

// ============================================
// Main Component
// ============================================

export function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const { data, isLoading, isError } = useNotificationsQuery({ page, limit: 50 });
  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();
  const deleteMutation = useDeleteNotificationMutation();

  const notifications = data?.notifications ?? [];

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    const types = FILTER_CONFIG[filter].types;
    if (!types) return notifications;
    return notifications.filter((n) => types.includes(n.type));
  }, [notifications, filter]);

  // Count unread per filter
  const unreadCounts = useMemo(() => {
    const counts: Record<NotificationFilter, number> = {
      all: 0,
      booking: 0,
      social: 0,
      system: 0,
    };

    notifications.forEach((n) => {
      if (isNotificationRead(n)) return;
      counts.all++;

      if (FILTER_CONFIG.booking.types?.includes(n.type)) counts.booking++;
      if (FILTER_CONFIG.social.types?.includes(n.type)) counts.social++;
      if (FILTER_CONFIG.system.types?.includes(n.type)) counts.system++;
    });

    return counts;
  }, [notifications]);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!isNotificationRead(notification)) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
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

  // Header right content
  const headerRight = unreadCounts.all > 0 ? (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleMarkAllAsRead}
      disabled={markAllAsReadMutation.isPending}
      className="text-[var(--color-primary)] hover:text-[var(--color-primary-light)]"
    >
      <Check className="w-4 h-4" />
      <span className="hidden sm:inline ml-1">모두 읽음</span>
    </Button>
  ) : undefined;

  // Get empty state message based on filter
  const getEmptyMessage = () => {
    switch (filter) {
      case 'booking':
        return { title: '예약 알림이 없습니다', description: '예약 관련 알림이 도착하면 여기에 표시됩니다.' };
      case 'social':
        return { title: '소셜 알림이 없습니다', description: '친구 요청이나 채팅 알림이 도착하면 여기에 표시됩니다.' };
      case 'system':
        return { title: '시스템 알림이 없습니다', description: '시스템 공지사항이 도착하면 여기에 표시됩니다.' };
      default:
        return { title: '알림이 없습니다', description: '새로운 알림이 도착하면 여기에 표시됩니다.' };
    }
  };

  if (isError) {
    return (
      <AppLayout title="알림">
        <Container className="py-4">
          <GlassCard>
            <EmptyState
              icon={BellOff}
              title="알림을 불러오는데 실패했습니다"
              description="잠시 후 다시 시도해주세요."
              actionLabel="다시 시도"
              onAction={() => window.location.reload()}
            />
          </GlassCard>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="알림" headerRight={headerRight}>
      <Container className="py-4 md:py-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {(Object.keys(FILTER_CONFIG) as NotificationFilter[]).map((key) => {
            const config = FILTER_CONFIG[key];
            const Icon = config.icon;
            const isActive = filter === key;
            const unread = unreadCounts[key];

            return (
              <button
                key={key}
                onClick={() => {
                  setFilter(key);
                  setPage(1);
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                {config.label}
                {unread > 0 && (
                  <span
                    className={cn(
                      'min-w-[18px] h-[18px] px-1 text-xs font-bold rounded-full flex items-center justify-center',
                      isActive
                        ? 'bg-white text-[var(--color-primary)]'
                        : 'bg-[var(--color-error)] text-white'
                    )}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {isLoading && <LoadingView />}

        {/* Empty State */}
        {!isLoading && filteredNotifications.length === 0 && (
          <GlassCard>
            <EmptyState
              icon={BellOff}
              title={getEmptyMessage().title}
              description={getEmptyMessage().description}
            />
          </GlassCard>
        )}

        {/* Notification List */}
        {!isLoading && filteredNotifications.length > 0 && (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationCard
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
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  이전
                </Button>
                <span className="flex items-center px-4 text-[var(--color-text-secondary)]">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="secondary"
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
      </Container>
    </AppLayout>
  );
}

// ============================================
// Notification Card Component
// ============================================

interface NotificationCardProps {
  notification: AppNotification;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}

function NotificationCard({
  notification,
  onClick,
  onDelete,
  isDeleting,
}: NotificationCardProps) {
  const isRead = isNotificationRead(notification);
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationIconColor(notification.type);

  return (
    <GlassCard
      hoverable
      className={cn(
        'cursor-pointer',
        isRead && 'opacity-60'
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
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
            <span className="flex-shrink-0 text-xs text-[var(--color-text-muted)]">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>

          <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: `${iconColor}20`,
                color: iconColor,
              }}
            >
              {getNotificationTypeDisplayName(notification.type)}
            </span>

            <div className="flex items-center gap-2">
              {!isRead && (
                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              )}
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
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
