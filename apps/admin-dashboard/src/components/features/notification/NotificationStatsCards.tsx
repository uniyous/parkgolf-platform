import React from 'react';
import type { NotificationStats } from '@/lib/api/notificationApi';

interface NotificationStatsCardsProps {
  stats: NotificationStats | undefined;
  isLoading: boolean;
}

const STATS_CONFIG = [
  {
    key: 'totalNotifications' as const,
    label: '전체 발송',
    icon: '📤',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
  },
  {
    key: 'deliveredNotifications' as const,
    label: '전달 성공',
    icon: '✅',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
  },
  {
    key: 'failedNotifications' as const,
    label: '전달 실패',
    icon: '❌',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
  },
  {
    key: 'readNotifications' as const,
    label: '읽음',
    icon: '👁',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
  },
];

export const NotificationStatsCards: React.FC<NotificationStatsCardsProps> = ({ stats, isLoading }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS_CONFIG.map((config) => {
          const value = stats?.[config.key] ?? 0;
          return (
            <div
              key={config.key}
              className={`p-4 rounded-lg ${config.bgColor} bg-white/10 backdrop-blur-xl border border-white/15`}
            >
              <div className="flex items-center justify-between">
                <div>
                  {isLoading ? (
                    <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
                  ) : (
                    <div className={`text-2xl font-bold ${config.textColor}`}>
                      {value.toLocaleString()}
                    </div>
                  )}
                  <div className="text-sm text-white/60 mt-1">{config.label}</div>
                </div>
                <div className="text-2xl">{config.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 전송률 / 읽음률 바 */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">전송률</span>
              <span className="text-sm font-bold text-green-400">
                {(stats.deliveryRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(stats.deliveryRate * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">읽음률</span>
              <span className="text-sm font-bold text-indigo-400">
                {(stats.readRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(stats.readRate * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
