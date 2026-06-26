import React from 'react';
import { useUserPreferencesQuery, useUpdateUserPreferencesMutation } from '@/hooks/queries';
import { DataContainer } from '@/components/common';
import type { UserPreferences } from '@/lib/api/notificationApi';

interface UserNotificationSettingsTabProps {
  userId: number;
}

interface ToggleItem {
  key: keyof Omit<UserPreferences, 'userId'>;
  label: string;
  description: string;
}

const NOTIFICATION_TOGGLES: ToggleItem[] = [
  { key: 'emailNotifications', label: '이메일 알림', description: '이메일을 통한 알림 수신' },
  { key: 'smsNotifications', label: 'SMS 알림', description: 'SMS를 통한 알림 수신' },
  { key: 'pushNotifications', label: '푸시 알림', description: '모바일 푸시 알림 수신' },
  { key: 'inAppNotifications', label: '인앱 알림', description: '앱 내 알림 수신' },
  { key: 'bookingReminders', label: '예약 리마인더', description: '예약 전 알림 수신' },
  { key: 'promotionalEmails', label: '프로모션 이메일', description: '할인/이벤트 정보 수신' },
  { key: 'systemUpdates', label: '시스템 업데이트', description: '서비스 업데이트 및 공지 수신' },
];

export const UserNotificationSettingsTab: React.FC<UserNotificationSettingsTabProps> = ({ userId }) => {
  const { data: preferences, isLoading, isError } = useUserPreferencesQuery(userId);
  const updatePreferences = useUpdateUserPreferencesMutation();

  const handleToggle = (key: keyof Omit<UserPreferences, 'userId'>) => {
    if (!preferences) return;
    updatePreferences.mutate({
      userId,
      preferences: { [key]: !preferences[key] },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          알림 설정
        </h3>
      </div>

      <DataContainer
        isLoading={isLoading && !isError}
        isEmpty={(!preferences && !isLoading) || isError}
        emptyIcon="🔔"
        emptyMessage={isError ? '알림 설정을 불러올 수 없습니다' : '알림 설정을 찾을 수 없습니다'}
        emptyDescription={isError ? '알림 설정 API 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' : '이 사용자의 알림 설정이 아직 초기화되지 않았습니다.'}
        loadingMessage="알림 설정을 불러오는 중..."
      >
        {preferences && (
          <div className="divide-y divide-white/15">
            {NOTIFICATION_TOGGLES.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-sm text-white/50">{item.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  disabled={updatePreferences.isPending}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 ${
                    preferences[item.key] ? 'bg-emerald-600' : 'bg-white/15'
                  }`}
                  role="switch"
                  aria-checked={!!preferences[item.key]}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences[item.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </DataContainer>
    </div>
  );
};
