import React, { useState } from 'react';
import { Check, X, Zap, AlertTriangle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { AuthErrorType } from '@/stores/auth.store';

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
  errorType?: AuthErrorType;
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

// Health Check 설정
const BFF_ENDPOINTS = [
  { name: 'admin-api', url: `${BASE_URL}/api/admin/health` },
  { name: 'user-api', url: `${BASE_URL}/api/user/health` },
];
const WARMUP_HTTP_URL = `${BASE_URL}/api/admin/system/warmup/http`;
const WARMUP_NATS_URL = `${BASE_URL}/api/admin/system/warmup/nats`;
const NATS_ROUNDS = 3;
const NATS_SERVICES = ['iam-service', 'course-service', 'booking-service', 'chat-service', 'notify-service'];
const ALL_SERVICES = ['admin-api', 'user-api', 'iam-service', 'course-service', 'booking-service', 'chat-gateway', 'chat-service', 'notify-service'];

interface NatsRoundResult {
  round: number;
  services: ServiceStatus[];
  totalTime: number;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  error,
  errorType,
}) => {
  const [showCheckPanel, setShowCheckPanel] = useState(false);

  // 서버 헬스 체크 상태
  const [isChecking, setIsChecking] = useState(false);
  const [checkPhase, setCheckPhase] = useState<string>('');
  const [httpStatuses, setHttpStatuses] = useState<ServiceStatus[]>([]);
  const [natsRounds, setNatsRounds] = useState<NatsRoundResult[]>([]);
  const [checkTotalTime, setCheckTotalTime] = useState<number | null>(null);

  const handleAdminSelect = (admin: AdminAccount) => {
    onEmailChange(admin.email);
    onPasswordChange(admin.password);
  };

  // 서버 헬스 체크 (Phase 1: HTTP + Phase 2: NATS 3회)
  const handleHealthCheck = async () => {
    setIsChecking(true);
    setShowCheckPanel(true);
    setCheckTotalTime(null);
    setNatsRounds([]);

    const startTime = Date.now();

    // === Phase 1: HTTP Health Check ===
    setCheckPhase('Phase 1: HTTP Health Check...');
    setHttpStatuses(ALL_SERVICES.map(name => ({ service: name, status: 'loading' as StatusType })));

    // BFF 직접 체크 + warmup/http 병렬 호출
    const [bffResults, warmupResult] = await Promise.all([
      Promise.all(
        BFF_ENDPOINTS.map(async (ep) => {
          const start = Date.now();
          try {
            const res = await fetch(ep.url, { method: 'GET' });
            return {
              service: ep.name,
              status: (res.ok ? 'success' : 'error') as StatusType,
              time: Date.now() - start,
              message: res.ok ? undefined : `HTTP ${res.status}`,
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
      ),
      (async () => {
        try {
          const res = await fetch(WARMUP_HTTP_URL);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      })(),
    ]);

    // warmup/http 결과를 ServiceStatus[]로 변환
    const internalServices = ['iam-service', 'course-service', 'booking-service', 'chat-gateway', 'chat-service', 'notify-service'];
    const internalResults: ServiceStatus[] = internalServices.map((name) => {
      const svc = warmupResult?.services?.find((s: { name: string }) => s.name === name);
      if (!svc) return { service: name, status: 'error' as StatusType, message: 'No response' };
      return {
        service: name,
        status: (svc.httpStatus === 'ok' ? 'success' : 'error') as StatusType,
        time: svc.httpResponseTime,
        message: svc.httpStatus !== 'ok' ? (svc.httpMessage || 'Error') : undefined,
      };
    });

    const allHttpStatuses = [...bffResults, ...internalResults];
    setHttpStatuses(allHttpStatuses);

    const httpHealthy = allHttpStatuses.filter(s => s.status === 'success').length;
    setCheckPhase(`Phase 1 완료: ${httpHealthy}/${ALL_SERVICES.length} 정상 | Phase 2: NATS 통신 체크...`);

    // === Phase 2: NATS 통신 체크 (3회 반복) ===
    const rounds: NatsRoundResult[] = [];
    for (let i = 0; i < NATS_ROUNDS; i++) {
      setCheckPhase(`Phase 2: NATS 통신 체크 (${i + 1}/${NATS_ROUNDS})...`);

      const roundStart = Date.now();
      let roundServices: ServiceStatus[];

      try {
        const res = await fetch(WARMUP_NATS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        roundServices = NATS_SERVICES.map((name) => {
          const svc = data?.services?.find((s: { name: string }) => s.name === name);
          if (!svc || svc.natsStatus === 'skipped') {
            return { service: name, status: 'error' as StatusType, message: 'Skipped' };
          }
          return {
            service: name,
            status: (svc.natsStatus === 'ok' ? 'success' : 'error') as StatusType,
            time: svc.natsResponseTime,
            message: svc.natsStatus !== 'ok' ? (svc.natsMessage || 'Error') : undefined,
          };
        });
      } catch (err) {
        roundServices = NATS_SERVICES.map((name) => ({
          service: name,
          status: 'error' as StatusType,
          message: err instanceof Error ? err.message : 'Failed',
        }));
      }

      const round: NatsRoundResult = {
        round: i + 1,
        services: roundServices,
        totalTime: Date.now() - roundStart,
      };
      rounds.push(round);
      setNatsRounds([...rounds]);
    }

    const totalTime = Date.now() - startTime;
    setCheckTotalTime(totalTime);

    const natsAllOk = rounds.every(r => r.services.every(s => s.status === 'success'));
    const allOk = httpHealthy === ALL_SERVICES.length && natsAllOk;
    setCheckPhase(allOk ? '모든 서비스 정상' : '일부 서비스 오류 발생');
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

  const httpHealthyCount = httpStatuses.filter(s => s.status === 'success').length;
  const natsHealthyCount = natsRounds.length > 0
    ? natsRounds[natsRounds.length - 1].services.filter(s => s.status === 'success').length
    : 0;

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

                {error && errorType === 'server' && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>서버 연결 오류</strong>
                      <p className="mt-1 text-xs text-amber-600">{error}</p>
                    </div>
                  </div>
                )}
                {error && errorType !== 'server' && (
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
          <div className="absolute bottom-14 right-0 w-[480px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mb-2 max-h-[80vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
              <span className="font-medium text-sm text-gray-700">서버 상태 점검</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHealthCheck}
                  disabled={isChecking}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    isChecking
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isChecking ? '확인중...' : '전체 체크'}
                </button>
                <button
                  onClick={() => setShowCheckPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* 진행 상태 */}
              {checkPhase && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  {isChecking && (
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{checkPhase}</span>
                </div>
              )}

              {/* Phase 1: HTTP Health Check */}
              {httpStatuses.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-xs text-gray-700">HTTP Health Check</span>
                    {!isChecking && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        httpHealthyCount === ALL_SERVICES.length
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {httpHealthyCount}/{ALL_SERVICES.length}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {httpStatuses.map((svc, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-xs">
                        <span className="text-gray-700 truncate mr-1">{svc.service}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {svc.time !== undefined && svc.status === 'success' && (
                            <span className="text-gray-400">{svc.time}ms</span>
                          )}
                          {svc.message && svc.status === 'error' && (
                            <span className="text-red-500 max-w-[60px] truncate" title={svc.message}>!</span>
                          )}
                          {getStatusIcon(svc.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phase 2: NATS 통신 체크 */}
              {natsRounds.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-xs text-gray-700">NATS 통신 체크</span>
                    {!isChecking && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        natsHealthyCount === NATS_SERVICES.length
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {natsRounds.filter(r => r.services.every(s => s.status === 'success')).length}/{NATS_ROUNDS} rounds OK
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {natsRounds.map((round) => (
                      <div key={round.round} className="border border-gray-100 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-gray-500">
                            Round {round.round}
                          </span>
                          <span className="text-[10px] text-gray-400">{round.totalTime}ms</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {round.services.map((svc, idx) => (
                            <div key={idx} className="flex items-center justify-between py-0.5 px-2 bg-gray-50 rounded text-xs">
                              <span className="text-gray-700 truncate mr-1">{svc.service.replace('-service', '')}</span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {svc.time !== undefined && svc.status === 'success' && (
                                  <span className="text-gray-400">{svc.time}ms</span>
                                )}
                                {getStatusIcon(svc.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {checkTotalTime !== null && (
                <div className="text-right text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                  총 소요시간: {(checkTotalTime / 1000).toFixed(1)}s
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
