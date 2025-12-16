import React, { useState, useEffect } from 'react';

interface Notification {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // 실제로는 API에서 알림 데이터를 가져옴
    const mockNotifications: Notification[] = [
      {
        id: 1,
        type: 'info',
        title: '새로운 예약',
        message: '김철수님이 챔피언십 코스를 예약했습니다.',
        time: '5분 전',
        read: false,
        actionUrl: '/bookings'
      },
      {
        id: 2,
        type: 'warning',
        title: '시스템 점검 안내',
        message: '오늘 밤 23:00-02:00 시스템 점검이 예정되어 있습니다.',
        time: '1시간 전',
        read: false
      },
      {
        id: 3,
        type: 'success',
        title: '백업 완료',
        message: '데이터 백업이 성공적으로 완료되었습니다.',
        time: '3시간 전',
        read: true
      },
      {
        id: 4,
        type: 'error',
        title: '결제 실패',
        message: '박영희님의 결제가 실패했습니다. 확인이 필요합니다.',
        time: '5시간 전',
        read: false,
        actionUrl: '/bookings'
      }
    ];
    
    setNotifications(mockNotifications);
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return '💡';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return 'border-blue-400 bg-blue-50';
      case 'warning':
        return 'border-yellow-400 bg-yellow-50';
      case 'error':
        return 'border-red-400 bg-red-50';
      case 'success':
        return 'border-green-400 bg-green-50';
      default:
        return 'border-gray-400 bg-gray-50';
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">
          알림 {unreadCount > 0 && <span className="text-red-500">({unreadCount})</span>}
        </h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              모두 읽음
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a4 4 0 01-4-4V7a7 7 0 1114 0v6a4 4 0 01-4 4z" />
            </svg>
            <p>알림이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors ${
                  notification.read ? 'bg-white' : 'bg-blue-50'
                } ${getNotificationColor(notification.type)} hover:bg-gray-50`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <span className="text-xs text-gray-500">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    {notification.actionUrl && (
                      <button className="text-xs text-blue-600 hover:text-blue-800 mt-2">
                        자세히 보기 →
                      </button>
                    )}
                  </div>
                  {!notification.read && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
          모든 알림 보기
        </button>
      </div>
    </div>
  );
};