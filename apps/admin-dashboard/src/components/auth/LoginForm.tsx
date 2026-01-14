import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';

// 서버 웜업 API 설정
const ADMIN_API_URL = import.meta.env.VITE_API_URL || 'https://admin-api-dev-iihuzmuufa-du.a.run.app';

type StatusType = 'pending' | 'loading' | 'success' | 'error' | 'skipped';

interface ServiceStatus {
  service: string;
  status: StatusType;
  time?: number;
  message?: string;
}

interface NatsTestResult {
  attempt: number;
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
    ]
  },
];

const ADMIN_ACCOUNTS: AdminAccount[] = ADMIN_ACCOUNT_GROUPS.flatMap(group => group.accounts);

const SERVICES = [
  { name: 'admin-api', isNats: false },
  { name: 'iam-service', isNats: true },
  { name: 'course-service', isNats: true },
  { name: 'booking-service', isNats: true },
];

const NATS_SERVICES = SERVICES.filter(s => s.isNats);

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

  // 서버 웜업 상태
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupPhase, setWarmupPhase] = useState<string>('');
  const [httpStatuses, setHttpStatuses] = useState<ServiceStatus[]>([]);
  const [warmupTotalTime, setWarmupTotalTime] = useState<number | null>(null);

  // NATS 테스트 상태
  const [isTestingNats, setIsTestingNats] = useState(false);
  const [natsTestPhase, setNatsTestPhase] = useState<string>('');
  const [natsResults, setNatsResults] = useState<NatsTestResult[]>([]);
  const [natsConnected, setNatsConnected] = useState<boolean | null>(null);

  const handleAdminSelect = (admin: AdminAccount) => {
    onEmailChange(admin.email);
    onPasswordChange(admin.password);
  };

  // 서버 웜업 (HTTP만)
  const handleWarmup = async () => {
    setIsWarmingUp(true);
    setShowWarmupPanel(true);
    setWarmupPhase('서버 웜업 시작중...');
    setWarmupTotalTime(null);

    // 초기 상태
    setHttpStatuses(SERVICES.map(s => ({
      service: s.name,
      status: 'pending' as StatusType
    })));

    const startTime = Date.now();

    try {
      // admin-api 먼저 호출 (다른 서비스 웜업 트리거)
      setWarmupPhase('admin-api 연결중...');
      setHttpStatuses(prev => prev.map(s =>
        s.service === 'admin-api' ? { ...s, status: 'loading' as StatusType } : s
      ));

      const adminStart = Date.now();
      const response = await fetch(`${ADMIN_API_URL}/system/warmup/http`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const adminTime = Date.now() - adminStart;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // admin-api 성공
      setHttpStatuses(prev => prev.map(s =>
        s.service === 'admin-api'
          ? { ...s, status: 'success' as StatusType, time: adminTime }
          : s
      ));

      // 다른 서비스 결과 업데이트
      setWarmupPhase('서비스 상태 확인중...');

      for (const svc of data.services || []) {
        setHttpStatuses(prev => prev.map(s =>
          s.service === svc.name
            ? {
                ...s,
                status: svc.httpStatus === 'ok' ? 'success' as StatusType : 'error' as StatusType,
                time: svc.httpResponseTime,
                message: svc.httpMessage
              }
            : s
        ));
        // 각 서비스마다 약간의 딜레이로 시각적 효과
        await new Promise(r => setTimeout(r, 100));
      }

      setWarmupTotalTime(Date.now() - startTime);
      setWarmupPhase('서버 웜업 완료');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setHttpStatuses(prev => prev.map(s =>
        s.service === 'admin-api'
          ? { ...s, status: 'error' as StatusType, message }
          : s
      ));
      setWarmupPhase('서버 웜업 실패');
    }

    setIsWarmingUp(false);
  };

  // NATS 통신 테스트 (3회)
  const handleNatsTest = async () => {
    setIsTestingNats(true);
    setNatsResults([]);
    setNatsConnected(null);

    const allResults: NatsTestResult[] = [];
    let successCount = 0;
    const totalTests = 3;

    for (let attempt = 1; attempt <= totalTests; attempt++) {
      setNatsTestPhase(`NATS 테스트 ${attempt}/${totalTests} 진행중...`);

      // 현재 시도에 대해 loading 상태 추가
      const loadingResults = NATS_SERVICES.map(s => ({
        attempt,
        service: s.name,
        status: 'loading' as StatusType,
      }));
      setNatsResults(prev => [...prev.filter(r => r.attempt !== attempt), ...loadingResults]);

      try {
        const response = await fetch(`${ADMIN_API_URL}/system/warmup/nats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // 결과 업데이트
        const attemptResults: NatsTestResult[] = (data.services || [])
          .filter((s: any) => s.natsStatus !== 'skipped')
          .map((s: any) => ({
            attempt,
            service: s.name,
            status: s.natsStatus === 'ok' ? 'success' as StatusType : 'error' as StatusType,
            time: s.natsResponseTime,
            message: s.natsMessage,
          }));

        allResults.push(...attemptResults);
        setNatsResults(prev => [
          ...prev.filter(r => r.attempt !== attempt),
          ...attemptResults
        ]);

        // 이번 시도에서 모든 서비스가 성공했는지 확인
        const attemptSuccess = attemptResults.every(r => r.status === 'success');
        if (attemptSuccess) successCount++;

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Connection failed';
        const errorResults: NatsTestResult[] = NATS_SERVICES.map(s => ({
          attempt,
          service: s.name,
          status: 'error' as StatusType,
          message,
        }));
        allResults.push(...errorResults);
        setNatsResults(prev => [
          ...prev.filter(r => r.attempt !== attempt),
          ...errorResults
        ]);
      }

      // 다음 시도 전 1초 대기 (마지막 시도 제외)
      if (attempt < totalTests) {
        setNatsTestPhase(`다음 테스트 대기중... (${attempt}/${totalTests} 완료)`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // 최종 결과 판정 (3회 중 2회 이상 성공시 연결됨으로 판정)
    setNatsConnected(successCount >= 2);
    setNatsTestPhase(`NATS 테스트 완료 (${successCount}/${totalTests} 성공)`);
    setIsTestingNats(false);
  };

  const selectedAdmin = ADMIN_ACCOUNTS.find(admin => admin.email === email);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      // 플랫폼 역할
      case 'PLATFORM_ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PLATFORM_SUPPORT': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'PLATFORM_VIEWER': return 'bg-violet-100 text-violet-800 border-violet-200';
      // 회사 역할
      case 'COMPANY_ADMIN': return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPANY_MANAGER': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'COMPANY_STAFF': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPANY_VIEWER': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'pending': return <span className="text-gray-300">○</span>;
      case 'loading': return <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success': return <span className="text-green-500">✓</span>;
      case 'error': return <span className="text-red-500">✗</span>;
      case 'skipped': return <span className="text-gray-300">-</span>;
    }
  };

  const httpSuccessCount = httpStatuses.filter(s => s.status === 'success').length;

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

      {/* 서버 웜업 패널 (우측 하단 고정) */}
      <div className="fixed bottom-6 right-6 z-50">
        {showWarmupPanel && (
          <div className="absolute bottom-14 right-0 w-[420px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden mb-2">
            {/* 헤더 */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="font-medium text-sm text-gray-700">시스템 상태 점검</span>
              <button
                onClick={() => setShowWarmupPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {/* 섹션 1: 서버 웜업 */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800">1. 서버 웜업</span>
                    {httpStatuses.length > 0 && !isWarmingUp && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        httpSuccessCount === SERVICES.length
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {httpSuccessCount}/{SERVICES.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleWarmup}
                    disabled={isWarmingUp}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      isWarmingUp
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isWarmingUp ? '진행중...' : '시작'}
                  </button>
                </div>

                {/* 진행 상태 */}
                {warmupPhase && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-blue-600">
                    {isWarmingUp && (
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{warmupPhase}</span>
                  </div>
                )}

                {/* 서비스 목록 */}
                {httpStatuses.length > 0 && (
                  <div className="space-y-1.5">
                    {httpStatuses.map((svc, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-xs">
                        <span className="text-gray-700">{svc.service}</span>
                        <div className="flex items-center gap-2">
                          {svc.time !== undefined && svc.status === 'success' && (
                            <span className="text-gray-400">{svc.time}ms</span>
                          )}
                          {svc.message && svc.status === 'error' && (
                            <span className="text-red-400 max-w-[100px] truncate" title={svc.message}>
                              {svc.message}
                            </span>
                          )}
                          {getStatusIcon(svc.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {warmupTotalTime !== null && (
                  <div className="mt-2 text-right text-[10px] text-gray-400">
                    총 소요시간: {warmupTotalTime}ms
                  </div>
                )}
              </div>

              {/* 섹션 2: NATS 통신 테스트 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800">2. NATS 통신 테스트</span>
                    {natsConnected !== null && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        natsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {natsConnected ? '연결됨' : '오류'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleNatsTest}
                    disabled={isTestingNats || isWarmingUp}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      isTestingNats || isWarmingUp
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isTestingNats ? '테스트중...' : '3회 테스트'}
                  </button>
                </div>

                {/* 진행 상태 */}
                {natsTestPhase && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-purple-600">
                    {isTestingNats && (
                      <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{natsTestPhase}</span>
                  </div>
                )}

                {/* NATS 테스트 결과 테이블 */}
                {natsResults.length > 0 && (
                  <div className="border border-gray-200 rounded overflow-hidden">
                    {/* 테이블 헤더 */}
                    <div className="grid grid-cols-4 gap-1 bg-gray-100 px-2 py-1.5 text-[10px] font-medium text-gray-500">
                      <div>서비스</div>
                      <div className="text-center">1차</div>
                      <div className="text-center">2차</div>
                      <div className="text-center">3차</div>
                    </div>
                    {/* 테이블 바디 */}
                    {NATS_SERVICES.map((svc) => (
                      <div key={svc.name} className="grid grid-cols-4 gap-1 px-2 py-1.5 text-xs border-t border-gray-100">
                        <div className="text-gray-700 truncate">{svc.name}</div>
                        {[1, 2, 3].map((attempt) => {
                          const result = natsResults.find(r => r.service === svc.name && r.attempt === attempt);
                          return (
                            <div key={attempt} className="flex items-center justify-center gap-1">
                              {result ? (
                                <>
                                  {result.time !== undefined && result.status === 'success' && (
                                    <span className="text-[10px] text-gray-400">{result.time}ms</span>
                                  )}
                                  {getStatusIcon(result.status)}
                                </>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {natsResults.length === 0 && !isTestingNats && (
                  <p className="text-xs text-gray-400 text-center py-3">
                    서버 웜업 후 NATS 테스트를 진행하세요
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 웜업 버튼 */}
        <button
          onClick={() => setShowWarmupPanel(!showWarmupPanel)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
            transition-all duration-200 font-medium text-sm
            ${showWarmupPanel
              ? 'bg-gray-600 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl active:scale-95'
            }
          `}
          title="시스템 상태 점검"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>시스템 점검</span>
        </button>
      </div>
    </div>
  );
};
