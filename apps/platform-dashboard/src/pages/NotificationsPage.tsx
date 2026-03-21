import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import {
  useNotificationsQuery,
  useNotificationStatsQuery,
} from '@/hooks/queries/notification';
import type { NotificationFilters as NotificationFilterType } from '@/lib/api/notificationApi';
import type { Notification } from '@/lib/api/notificationApi';

import { NotificationStatsCards } from '@/components/features/notification/NotificationStatsCards';
import { NotificationFilters } from '@/components/features/notification/NotificationFilters';
import { NotificationTable } from '@/components/features/notification/NotificationTable';
import { NotificationDetailModal } from '@/components/features/notification/NotificationDetailModal';
import { TemplateTab } from '@/components/features/notification/TemplateTab';
import { PageLayout } from '@/components/layout';

type TabKey = 'templates' | 'history' | 'stats';

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'templates', label: '템플릿 관리', icon: '📝' },
  { key: 'history', label: '발송 이력', icon: '📋' },
  { key: 'stats', label: '발송 통계', icon: '📊' },
];

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

export const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('templates');

  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  // 필터 상태
  const [startDate, setStartDate] = useState(formatDate(monthAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // 모달
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filters: NotificationFilterType = useMemo(
    () => ({
      startDate,
      endDate,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      search: searchKeyword || undefined,
    }),
    [startDate, endDate, typeFilter, statusFilter, searchKeyword],
  );

  // Queries
  const { data: notificationsData, isLoading: isListLoading } = useNotificationsQuery(
    activeTab === 'history' ? filters : undefined,
    page,
    limit,
  );
  const { data: stats, isLoading: isStatsLoading } = useNotificationStatsQuery({ startDate, endDate });

  const notifications = notificationsData?.data ?? [];
  const pagination = notificationsData?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailOpen(true);
  };

  return (
    <PageLayout>
      {/* 헤더 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🔔</span> 알림 설정
        </h1>
        <p className="text-white/50 mt-1">
          알림 템플릿을 관리하고 발송 현황을 확인합니다
        </p>
      </div>

      <div className="space-y-6">
        {/* 탭 */}
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white/10 text-white/60 hover:bg-white/15',
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 템플릿 관리 탭 */}
        {activeTab === 'templates' && <TemplateTab />}

        {/* 발송 이력 탭 */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <NotificationFilters
              startDate={startDate}
              endDate={endDate}
              typeFilter={typeFilter}
              statusFilter={statusFilter}
              searchKeyword={searchKeyword}
              onStartDateChange={(d) => { setStartDate(d); setPage(1); }}
              onEndDateChange={(d) => { setEndDate(d); setPage(1); }}
              onTypeChange={(t) => { setTypeFilter(t); setPage(1); }}
              onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
              onSearchChange={(k) => { setSearchKeyword(k); setPage(1); }}
            />
            <NotificationTable
              notifications={notifications}
              pagination={pagination}
              isLoading={isListLoading}
              onPageChange={setPage}
              onNotificationClick={handleNotificationClick}
            />
          </div>
        )}

        {/* 발송 통계 탭 */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4">
              <div className="flex items-center gap-4">
                <label className="text-sm text-white/60">통계 기간</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-white/40">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <NotificationStatsCards stats={stats} isLoading={isStatsLoading} />

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4">
                  <h3 className="text-sm font-medium text-white/70 mb-3">유형별 분포</h3>
                  <div className="space-y-2">
                    {stats.notificationsByType.map((item) => {
                      const total = stats.totalNotifications || 1;
                      const pct = ((item.count / total) * 100).toFixed(1);
                      return (
                        <div key={item.type} className="flex items-center gap-3">
                          <span className="text-xs text-white/50 w-16">{item.type}</span>
                          <div className="flex-1 bg-white/10 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-white/60 w-20 text-right">
                            {item.count.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4">
                  <h3 className="text-sm font-medium text-white/70 mb-3">상태별 분포</h3>
                  <div className="space-y-2">
                    {stats.notificationsByStatus.map((item) => {
                      const total = stats.totalNotifications || 1;
                      const pct = ((item.count / total) * 100).toFixed(1);
                      const colors: Record<string, string> = {
                        PENDING: 'bg-yellow-500', SENT: 'bg-blue-500', DELIVERED: 'bg-green-500',
                        FAILED: 'bg-red-500', READ: 'bg-indigo-500',
                      };
                      return (
                        <div key={item.status} className="flex items-center gap-3">
                          <span className="text-xs text-white/50 w-16">{item.status}</span>
                          <div className="flex-1 bg-white/10 rounded-full h-2">
                            <div className={cn('h-2 rounded-full', colors[item.status] || 'bg-gray-500')} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-white/60 w-20 text-right">
                            {item.count.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedNotification(null); }}
      />
    </PageLayout>
  );
};

export default NotificationsPage;
