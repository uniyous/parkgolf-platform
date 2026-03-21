import React from 'react';
import { cn } from '@/utils';
import type { Notification } from '@/lib/api/notificationApi';

interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
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

const PRIORITY_CONFIG: Record<string, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
};

const formatDateTime = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-white/5">
    <span className="text-sm text-white/50">{label}</span>
    <span className="text-sm text-white/90">{value}</span>
  </div>
);

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !notification) return null;

  const typeConfig = TYPE_CONFIG[notification.type] || { label: notification.type, color: 'bg-gray-500/20 text-gray-300' };
  const statusConfig = STATUS_CONFIG[notification.status] || { label: notification.status, color: 'bg-gray-500/20 text-gray-300' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/15 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">알림 상세</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-3">기본 정보</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <InfoRow label="ID" value={<span className="font-mono text-xs">{notification.id}</span>} />
              <InfoRow
                label="유형"
                value={
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeConfig.color)}>
                    {typeConfig.label}
                  </span>
                }
              />
              <InfoRow
                label="상태"
                value={
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                    {statusConfig.label}
                  </span>
                }
              />
              <InfoRow label="우선순위" value={PRIORITY_CONFIG[notification.priority] || notification.priority} />
            </div>
          </div>

          {/* 내용 */}
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-3">내용</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-sm text-white font-medium mb-2">{notification.title}</div>
              <div className="text-sm text-white/70 whitespace-pre-wrap">{notification.message}</div>
            </div>
          </div>

          {/* 수신자 */}
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-3">수신자</h3>
            <div className="bg-white/5 rounded-lg p-4">
              {notification.user ? (
                <>
                  <InfoRow label="이메일" value={notification.user.email} />
                  <InfoRow label="사용자명" value={notification.user.username} />
                </>
              ) : (
                <InfoRow label="사용자 ID" value={notification.userId ? `#${notification.userId}` : '전체 발송'} />
              )}
            </div>
          </div>

          {/* 일시 */}
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-3">발송 일시</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <InfoRow label="생성일시" value={formatDateTime(notification.createdAt)} />
              {notification.scheduledAt && <InfoRow label="예약일시" value={formatDateTime(notification.scheduledAt)} />}
              <InfoRow label="발송일시" value={formatDateTime(notification.sentAt)} />
              <InfoRow label="읽음일시" value={formatDateTime(notification.readAt)} />
            </div>
          </div>

          {/* 메타데이터 */}
          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-3">메타데이터</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <pre className="text-xs text-white/60 overflow-x-auto">
                  {JSON.stringify(notification.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
