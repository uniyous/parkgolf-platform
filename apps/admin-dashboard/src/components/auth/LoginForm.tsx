import React, { useState } from 'react';
import { Check, X, Zap } from 'lucide-react';
import { Button, Input } from '@/components/ui';

// 서버 헬스 체크 설정
const BASE_URL = import.meta.env.VITE_API_URL || 'https://dev-api.goparkmate.com';

type StatusType = 'pending' | 'loading' | 'success' | 'error';

interface ServiceStatus {
  service: string;
  status: StatusType;
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

interface AdminAccountGroup {
  title: string;
  accounts: AdminAccount[];
}

const ADMIN_ACCOUNT_GROUPS: AdminAccountGroup[] = [
  {
    title: '플랫폼 관리 (본사)',
    accounts: [
      {
        email: 'admin@parkgolf.com',
        password: 'admin123!@#',
        name: '플랫폼관리자',
        role: 'PLATFORM_ADMIN',
        description: '본사 최고 관리자 (모든 권한)'
      },
      {
        email: 'support@parkgolf.com',
        password: 'admin123!@#',
        name: '고객지원담당',
        role: 'PLATFORM_SUPPORT',
        description: '전체 고객지원/조회'
      },
      {
        email: 'viewer@parkgolf.com',
        password: 'admin123!@#',
        name: '플랫폼조회자',
        role: 'PLATFORM_VIEWER',
        description: '전체 데이터 조회 전용'
      },
    ]
  },
  {
    title: '회사 관리 (가맹점)',
    accounts: [
      {
        email: 'admin@gangnam.com',
        password: 'admin123!@#',
        name: '강남대표',
        role: 'COMPANY_ADMIN',
        description: '강남 파크골프장 대표 관리자'
      },
      {
        email: 'manager@gangnam.com',
        password: 'admin123!@#',
        name: '강남매니저',
        role: 'COMPANY_MANAGER',
        description: '운영 매니저'
      },
      {
        email: 'staff@gangnam.com',
        password: 'admin123!@#',
        name: '강남직원',
        role: 'COMPANY_STAFF',
        description: '현장 직원'
      },
      {
        email: 'viewer@gangnam.com',
        password: 'admin123!@#',
        name: '강남조회자',
        role: 'COMPANY_VIEWER',
        description: '회사 데이터 조회 전용'
      },
    ]
  },
];

const ADMIN_ACCOUNTS: AdminAccount[] = ADMIN_ACCOUNT_GROUPS.flatMap(group => group.accounts);

const HEALTH_ENDPOINTS = [
  { name: 'admin-api', url: `${BASE_URL}/api/admin/iam/health` },
  { name: 'user-api', url: `${BASE_URL}/api/user/iam/health` },
];

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  error,
}) => {
  const [showCheckPanel, setShowCheckPanel] = useState(false);

  // 서버 헬스 체크 상태
  const [isChecking, setIsChecking] = useState(false);
  const [checkPhase, setCheckPhase] = useState<string>('');
  const [healthStatuses, setHealthStatuses] = useState<ServiceStatus[]>([]);
  const [checkTotalTime, setCheckTotalTime] = useState<number | null>(null);

  const handleAdminSelect = (admin: AdminAccount) => {
    onEmailChange(admin.email);
    onPasswordChange(admin.password);
  };

  // 서버 헬스 체크
  const handleHealthCheck = async () => {
    setIsChecking(true);
    setShowCheckPanel(true);
    setCheckPhase('서버 상태 확인중...');
    setCheckTotalTime(null);

    setHealthStatuses(HEALTH_ENDPOINTS.map(ep => ({
      service: ep.name,
      status: 'loading' as StatusType,
    })));

    const startTime = Date.now();

    const results = await Promise.all(
      HEALTH_ENDPOINTS.map(async (ep) => {
        const start = Date.now();
        try {
          const response = await fetch(ep.url, { method: 'GET' });
          return {
            service: ep.name,
            status: (response.status === 200 ? 'success' : 'error') as StatusType,
            time: Date.now() - start,
            message: response.status !== 200 ? `HTTP ${response.status}` : undefined,
          };
        } catch (err) {
          return {
            service: ep.name,
            status: 'error' as StatusType,
            time: Date.now() - start,
            message: err instanceof Error ? err.message : 'Connection failed',
          };
        }
      })
    );

    setHealthStatuses(results);
    setCheckTotalTime(Date.now() - startTime);

    const allHealthy = results.every(r => r.status === 'success');
    setCheckPhase(allHealthy ? '모든 서버 정상' : '일부 서버 오류 발생');
    setIsChecking(false);
  };

  const selectedAdmin = ADMIN_ACCOUNTS.find(admin => admin.email === email);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      // 플랫폼 역할
      case 'PLATFORM_ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PLATFORM_SUPPORT': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'PLATFORM_VIEWER': return 'bg-blue-100 text-blue-800 border-blue-200';
      // 회사 역할
      case 'COMPANY_ADMIN': return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPANY_MANAGER': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'COMPANY_STAFF': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPANY_VIEWER': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'pending': return <span className="text-gray-400">○</span>;
      case 'loading': return <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success': return <span className="text-green-600">✓</span>;
      case 'error': return <span className="text-red-600">✗</span>;
    }
  };

  const healthyCount = healthStatuses.filter(s => s.status === 'success').length;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* 로그인 폼 */}
          <div className="w-full lg:w-1/2">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  ParkMate 관리자
                </h2>
                <p className="text-gray-500">
                  관리자 계정으로 로그인하세요
                </p>
                {selectedAdmin && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>{selectedAdmin.name}</strong> ({selectedAdmin.role}) 선택됨
                    </p>
                  </div>
                )}
              </div>

              <form className="space-y-6" onSubmit={onSubmit}>
                {!email && !password && (
                  <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-500">
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
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
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
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                테스트 계정 선택
              </h3>
              <p className="text-xs text-gray-500 mb-4 text-center">
                클릭하면 자동으로 로그인 정보가 입력됩니다
              </p>

              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {ADMIN_ACCOUNT_GROUPS.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
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
                                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
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

      {/* 서버 헬스 체크 패널 (우측 하단 고정) */}
      <div className="fixed bottom-6 right-6 z-50">
        {showCheckPanel && (
          <div className="absolute bottom-14 right-0 w-[360px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mb-2">
            {/* 헤더 */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="font-medium text-sm text-gray-700">서버 상태 점검</span>
              <button
                onClick={() => setShowCheckPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-700">Health Check</span>
                  {healthStatuses.length > 0 && !isChecking && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                      healthyCount === HEALTH_ENDPOINTS.length
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {healthyCount}/{HEALTH_ENDPOINTS.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleHealthCheck}
                  disabled={isChecking}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    isChecking
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isChecking ? '확인중...' : '체크'}
                </button>
              </div>

              {/* 진행 상태 */}
              {checkPhase && (
                <div className="mb-3 flex items-center gap-2 text-xs text-blue-600">
                  {isChecking && (
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{checkPhase}</span>
                </div>
              )}

              {/* 서비스 목록 */}
              {healthStatuses.length > 0 && (
                <div className="space-y-1.5">
                  {healthStatuses.map((svc, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-xs">
                      <span className="text-gray-700">{svc.service}</span>
                      <div className="flex items-center gap-2">
                        {svc.time !== undefined && svc.status === 'success' && (
                          <span className="text-gray-400">{svc.time}ms</span>
                        )}
                        {svc.message && svc.status === 'error' && (
                          <span className="text-red-600 max-w-[100px] truncate" title={svc.message}>
                            {svc.message}
                          </span>
                        )}
                        {getStatusIcon(svc.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {checkTotalTime !== null && (
                <div className="mt-2 text-right text-[10px] text-gray-400">
                  소요시간: {checkTotalTime}ms
                </div>
              )}
            </div>
          </div>
        )}

        {/* 서버 체크 버튼 */}
        <button
          onClick={() => setShowCheckPanel(!showCheckPanel)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
            transition-all duration-200 font-medium text-sm
            ${showCheckPanel
              ? 'bg-gray-200 text-gray-700'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl active:scale-95'
            }
          `}
          title="서버 상태 점검"
        >
          <Zap className="w-4 h-4" />
          <span>서버 체크</span>
        </button>
      </div>
    </div>
  );
};
