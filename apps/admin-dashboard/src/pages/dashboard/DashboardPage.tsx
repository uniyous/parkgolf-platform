import React from 'react';
import { DashboardContainer } from '../../components/dashboard';
import { useAuth } from '../../redux/hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, token } = useAuth();
  
  // Redux 상태 확인용 콘솔 출력
  console.log('Redux Auth State:', {
    isAuthenticated,
    user,
    token: token ? '토큰 있음' : '토큰 없음'
  });
  
  return (
    <div>
      {/* Redux 상태 디버그 정보 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Redux Store 상태 (디버깅용)</h3>
        <div className="text-xs text-blue-800 space-y-1">
          <p>인증 상태: {isAuthenticated ? '✅ 로그인됨' : '❌ 로그아웃'}</p>
          <p>사용자: {user?.name || user?.username || '없음'} ({user?.email || '이메일 없음'})</p>
          <p>역할: {user?.role || '역할 없음'}</p>
          <p>토큰: {token ? '✅ 있음' : '❌ 없음'}</p>
        </div>
      </div>
      <DashboardContainer />
    </div>
  );
};