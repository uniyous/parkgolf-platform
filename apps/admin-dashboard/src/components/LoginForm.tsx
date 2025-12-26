import React, { useState } from 'react';
import { Button } from './common/Button';
import { Input } from './common/Input';

// 서버 웜업 API 설정
const ADMIN_API_URL = import.meta.env.VITE_API_URL || 'https://admin-api-162921969782.asia-northeast3.run.app';

interface ServiceHealth {
  name: string;
  url: string;
  status: 'ok' | 'error';
  responseTime: number;
  message?: string;
}

interface WarmupResponse {
  success: boolean;
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    totalTime: number;
  };
}

interface WarmupStatus {
  service: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  time?: number;
  message?: string;
}

interface AdminAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  description: string;
}

interface LoginFormProps {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error: string | null;
}

// 테스트용 관리자 계정 (seed 데이터와 일치)
interface AdminAccountGroup {
  title: string;
  accounts: AdminAccount[];
}

const ADMIN_ACCOUNT_GROUPS: AdminAccountGroup[] = [
  {
    title: '시스템 관리',
    accounts: [
      {
        email: 'admin@parkgolf.com',
        password: 'admin123!@#',
        name: '시스템관리자',
        role: 'ADMIN',
        description: '전체 시스템 관리 (모든 권한)'
      },
      {
        email: 'support@parkgolf.com',
        password: 'admin123!@#',
        name: '고객지원담당',
        role: 'SUPPORT',
        description: '고객 문의 및 분석 담당'
      },
    ]
  },
  {
    title: '운영 관리',
    accounts: [
      {
        email: 'manager@gangnam-golf.com',
        password: 'admin123!@#',
        name: '운영매니저',
        role: 'MANAGER',
        description: '코스/예약/사용자 관리'
      },
      {
        email: 'staff@gangnam-golf.com',
        password: 'admin123!@#',
        name: '현장직원',
        role: 'STAFF',
        description: '예약 접수 및 고객 응대'
      },
      {
        email: 'viewer@parkgolf.com',
        password: 'admin123!@#',
        name: '조회담당',
        role: 'VIEWER',
        description: '데이터 조회만 가능'
      },
    ]
  },
];

// 전체 계정 목록 (flat)
const ADMIN_ACCOUNTS: AdminAccount[] = ADMIN_ACCOUNT_GROUPS.flatMap(group => group.accounts);

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  error,
}) => {
  const [showWarmupPanel, setShowWarmupPanel] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupStatuses, setWarmupStatuses] = useState<WarmupStatus[]>([]);

  const handleAdminSelect = (admin: AdminAccount) => {
    onEmailChange(admin.email);
    onPasswordChange(admin.password);
  };

  const handleWarmup = async () => {
    setIsWarmingUp(true);
    setShowWarmupPanel(true);

    // admin-api 포함하여 초기 로딩 상태 설정
    setWarmupStatuses([
      { service: 'admin-api', status: 'loading' },
      { service: 'auth-service', status: 'pending' },
      { service: 'user-api', status: 'pending' },
      { service: 'course-service', status: 'pending' },
      { service: 'booking-service', status: 'pending' },
      { service: 'payment-service', status: 'pending' },
    ]);

    try {
      const startTime = Date.now();

      // admin-api의 warmup 엔드포인트 호출 (다른 서비스들도 함께 웜업)
      const response = await fetch(`${ADMIN_API_URL}/health/warmup`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const adminApiTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: WarmupResponse = await response.json();

      // admin-api 성공 상태 업데이트
      const statuses: WarmupStatus[] = [
        { service: 'admin-api', status: 'success', time: adminApiTime },
      ];

      // 다른 서비스들 상태 추가
      data.services.forEach((svc) => {
        statuses.push({
          service: svc.name,
          status: svc.status === 'ok' ? 'success' : 'error',
          time: svc.responseTime,
          message: svc.message,
        });
      });

      setWarmupStatuses(statuses);
    } catch (err) {
      // admin-api 자체 호출 실패
      setWarmupStatuses([
        {
          service: 'admin-api',
          status: 'error',
          message: err instanceof Error ? err.message : 'Connection failed'
        },
        { service: 'auth-service', status: 'pending' },
        { service: 'user-api', status: 'pending' },
        { service: 'course-service', status: 'pending' },
        { service: 'booking-service', status: 'pending' },
        { service: 'payment-service', status: 'pending' },
      ]);
    }

    setIsWarmingUp(false);
  };

  // 현재 선택된 관리자 찾기
  const selectedAdmin = ADMIN_ACCOUNTS.find(admin => admin.email === email);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SUPPORT': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MANAGER': return 'bg-green-100 text-green-800 border-green-200';
      case 'STAFF': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'VIEWER': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* 로그인 폼 */}
          <div className="w-full lg:w-1/2">
            <div className="bg-white shadow-xl rounded-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  🏌️ 파크골프 관리자 시스템
                </h2>
                <p className="text-gray-600">
                  관리자 계정으로 로그인하세요
                </p>
                {selectedAdmin && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedAdmin.name}</strong> ({selectedAdmin.role}) 선택됨
                    </p>
                  </div>
                )}
              </div>

              <form className="space-y-6" onSubmit={onSubmit}>
                {!email && !password && (
                  <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      우측에서 관리자를 선택하거나 직접 입력하세요
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <Input
                    label="관리자 ID"
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="관리자 이메일을 입력하세요"
                    required
                    className="text-sm"
                  />
                  <Input
                    label="PASSWORD"
                    type="password"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    required
                    className="text-sm"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                    <strong>로그인 실패:</strong> {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full py-3 text-lg font-semibold"
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      로그인 중...
                    </div>
                  ) : '로그인'}
                </Button>
              </form>
            </div>
          </div>

          {/* 관리자 계정 선택 */}
          <div className="w-full lg:w-1/2">
            <div className="bg-white shadow-xl rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                테스트 계정 선택
              </h3>
              <p className="text-xs text-gray-500 mb-4 text-center">
                클릭하면 자동으로 로그인 정보가 입력됩니다
              </p>

              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {ADMIN_ACCOUNT_GROUPS.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                      {group.title}
                    </h4>
                    <div className="space-y-2">
                      {group.accounts.map((admin, index) => {
                        const isSelected = selectedAdmin?.email === admin.email;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleAdminSelect(admin)}
                            className={`w-full text-left p-3 border rounded-lg transition-all duration-150 group ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                    {admin.name}
                                  </span>
                                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getRoleBadgeColor(admin.role)}`}>
                                    {admin.role}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{admin.description}</p>
                              </div>
                              {isSelected && (
                                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  <strong>개발 환경 전용</strong> - 운영 환경에서는 비활성화됩니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 서버 웜업 버튼 (우측 하단 고정) */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* 웜업 상태 패널 */}
        {showWarmupPanel && (
          <div className="absolute bottom-14 right-0 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden mb-2">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="font-medium text-sm text-gray-700">서버 웜업 상태</span>
              <button
                onClick={() => setShowWarmupPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {warmupStatuses.map((ws, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-600">{ws.service}</span>
                    {ws.message && ws.status === 'error' && (
                      <p className="text-xs text-red-400 truncate">{ws.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {ws.time && (
                      <span className="text-xs text-gray-400">{ws.time}ms</span>
                    )}
                    {ws.status === 'pending' && (
                      <span className="text-gray-300">○</span>
                    )}
                    {ws.status === 'loading' && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {ws.status === 'success' && (
                      <span className="text-green-500">✓</span>
                    )}
                    {ws.status === 'error' && (
                      <span className="text-red-500">✗</span>
                    )}
                  </div>
                </div>
              ))}
              {warmupStatuses.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  버튼을 클릭하여 서버를 웜업하세요
                </p>
              )}
              {warmupStatuses.length > 0 && !isWarmingUp && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      완료: {warmupStatuses.filter(s => s.status === 'success').length}/{warmupStatuses.length}
                    </span>
                    <span className="text-gray-500">
                      총 시간: {Math.max(...warmupStatuses.map(s => s.time || 0))}ms
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 웜업 버튼 */}
        <button
          onClick={handleWarmup}
          disabled={isWarmingUp}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
            transition-all duration-200 font-medium text-sm
            ${isWarmingUp
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl active:scale-95'
            }
          `}
          title="Cloud Run 서버 웜업"
        >
          {isWarmingUp ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>웜업 중...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>서버 웜업</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};