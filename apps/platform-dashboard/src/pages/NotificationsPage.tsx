import React from 'react';
import { PageLayout } from '@/components/layout';

export const NotificationsPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🔔</span> 알림 설정
        </h1>
        <p className="text-white/50 mt-1">
          알림 채널 및 템플릿을 관리합니다
        </p>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🔔</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">알림 설정</h3>
          <p className="text-white/50 mb-4 max-w-md">
            예약 확인, 리마인더, 취소/환불 알림 등<br />
            다양한 알림 채널과 템플릿을 설정할 수 있습니다.
          </p>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-300">
            준비 중
          </span>
        </div>
      </div>
    </PageLayout>
  );
};

export default NotificationsPage;
