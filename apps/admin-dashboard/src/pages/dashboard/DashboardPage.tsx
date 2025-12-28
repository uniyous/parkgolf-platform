import React from 'react';
import { DashboardContainer } from '@/components/features/dashboard';
import { useAuth } from '@/hooks';

export const DashboardPage: React.FC = () => {
  const { currentAdmin, isAuthenticated } = useAuth();

  return (
    <div>
      {/* 인증 상태 디버그 정보 (개발용) */}
      {import.meta.env.DEV && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs">
          <span className="font-medium text-blue-900">
            {isAuthenticated ? '✅' : '❌'} {currentAdmin?.name || '미로그인'}
            {currentAdmin?.roles?.[0] && ` (${currentAdmin.roles[0]})`}
          </span>
        </div>
      )}
      <DashboardContainer />
    </div>
  );
};