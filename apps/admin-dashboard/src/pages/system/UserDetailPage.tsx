import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserQuery } from '@/hooks/queries';
import { DataContainer } from '@/components/common';
import { PageLayout } from '@/components/layout';
import { UserBasicInfoTab } from '@/components/features/user/UserBasicInfoTab';
import { UserBookingHistoryTab } from '@/components/features/user/UserBookingHistoryTab';
import { UserNotificationSettingsTab } from '@/components/features/user/UserNotificationSettingsTab';
import { UserFormModal } from '@/components/features/user/UserFormModal';
import type { UserMembershipTier, UserStatus } from '@/types';

type TabType = 'basic' | 'bookings' | 'notifications';

const MEMBERSHIP_LABELS: Record<UserMembershipTier, string> = {
  REGULAR: '일반',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  VIP: 'VIP',
  PREMIUM: '프리미엄',
  GUEST: '게스트',
};

const TIER_STYLES: Record<UserMembershipTier, string> = {
  VIP: 'bg-purple-500/20 text-purple-400',
  PLATINUM: 'bg-slate-100 text-slate-800',
  GOLD: 'bg-yellow-500/20 text-yellow-400',
  SILVER: 'bg-white/10 text-white',
  REGULAR: 'bg-emerald-500/20 text-emerald-300',
  PREMIUM: 'bg-amber-100 text-amber-800',
  GUEST: 'bg-green-500/20 text-green-400',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  SUSPENDED: '정지',
  PENDING: '대기',
};

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  INACTIVE: 'bg-white/10 text-white',
  SUSPENDED: 'bg-red-500/20 text-red-400',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
};

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formModal, setFormModal] = useState(false);

  const { data: user, isLoading, error, refetch } = useUserQuery(userId ? Number(userId) : 0);

  const breadcrumbs = useMemo(() => [
    { label: '회원 관리', path: '/user-management' },
    { label: user?.name || '사용자 상세' },
  ], [user?.name]);

  const handleEdit = () => {
    setFormModal(true);
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <DataContainer
        isLoading={isLoading}
        isEmpty={!user && !isLoading}
        emptyIcon={
          <svg className="h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 3 1.732 3z" />
          </svg>
        }
        emptyMessage="사용자 정보를 찾을 수 없습니다"
        emptyDescription={typeof error === 'string' ? error : '사용자 정보를 불러오는 중 문제가 발생했습니다.'}
        emptyAction={
          <button
            onClick={() => navigate('/user-management')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
          >
            목록으로 돌아가기
          </button>
        }
        loadingMessage="사용자 정보를 불러오는 중..."
        className="min-h-[16rem]"
      >
        {user && (
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate('/user-management')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{user.name || '이름 없음'}</h1>
                    <div className="flex items-center space-x-3 mt-1">
                      <p className="text-white/60 text-sm">{user.email}</p>
                      {user.phone && (
                        <p className="text-white/50 text-sm">{user.phone}</p>
                      )}
                      {user.membershipTier && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TIER_STYLES[user.membershipTier]}`}>
                          {MEMBERSHIP_LABELS[user.membershipTier]}
                        </span>
                      )}
                      {user.status && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[user.status]}`}>
                          {STATUS_LABELS[user.status]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>수정</span>
                  </button>
                </div>
              </div>

              {/* 탭 네비게이션 */}
              <div className="flex space-x-1 border-b border-white/15">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
                    activeTab === 'basic'
                      ? 'bg-emerald-500/10 text-emerald-300 border-b-2 border-emerald-500'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>기본 정보</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
                    activeTab === 'bookings'
                      ? 'bg-emerald-500/10 text-emerald-300 border-b-2 border-emerald-500'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>예약 이력</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
                    activeTab === 'notifications'
                      ? 'bg-emerald-500/10 text-emerald-300 border-b-2 border-emerald-500'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>알림 설정</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15">
              {activeTab === 'basic' && (
                <UserBasicInfoTab user={user} onUpdate={() => refetch()} />
              )}
              {activeTab === 'bookings' && (
                <UserBookingHistoryTab userId={user.id} />
              )}
              {activeTab === 'notifications' && (
                <UserNotificationSettingsTab userId={user.id} />
              )}
            </div>
          </div>
        )}
      </DataContainer>

      {/* Edit Modal */}
      <UserFormModal
        open={formModal}
        user={user || undefined}
        onClose={() => setFormModal(false)}
      />
    </PageLayout>
  );
};
