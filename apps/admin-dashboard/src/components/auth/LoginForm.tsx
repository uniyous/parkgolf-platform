import React, { useState } from 'react';
import { Check, X, Zap } from 'lucide-react';
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
  { name: 'chat-gateway', isNats: false },
  { name: 'chat-service', isNats: true },
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
      case 'PLATFORM_ADMIN': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'PLATFORM_SUPPORT': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'PLATFORM_VIEWER': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      // 회사 역할
      case 'COMPANY_ADMIN': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'COMPANY_MANAGER': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'COMPANY_STAFF': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'COMPANY_VIEWER': return 'bg-zinc-700 text-zinc-400 border-zinc-600';
      default: return 'bg-zinc-700 text-zinc-400 border-zinc-600';
    }
  };

  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'pending': return <span className="text-zinc-500">○</span>;
      case 'loading': return <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />;
      case 'success': return <span className="text-green-400">✓</span>;
      case 'error': return <span className="text-red-400">✗</span>;
      case 'skipped': return <span className="text-zinc-500">-</span>;
    }
  };

  const httpSuccessCount = httpStatuses.filter(s => s.status === 'success').length;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* 로그인 폼 */}
          <div className="w-full lg:w-1/2">
            <div className="glass-card p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  ParkMate 관리자
                </h2>
                <p className="text-zinc-400">
                  관리자 계정으로 로그인하세요
                </p>
                {selectedAdmin && (
                  <div className="mt-4 p-3 bg-violet-500/20 border border-violet-500/30 rounded-lg">
                    <p className="text-sm text-violet-300">
                      <strong>{selectedAdmin.name}</strong> ({selectedAdmin.role}) 선택됨
                    </p>
                  </div>
                )}
              </div>

              <form className="space-y-6" onSubmit={onSubmit}>
                {!email && !password && (
                  <div className="text-center p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                    <p className="text-sm text-zinc-400">
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
                  <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
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
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-2 text-center">
                테스트 계정 선택
              </h3>
              <p className="text-xs text-zinc-400 mb-4 text-center">
                클릭하면 자동으로 로그인 정보가 입력됩니다
              </p>

              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {ADMIN_ACCOUNT_GROUPS.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 px-1">
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
                                ? 'border-violet-500 bg-violet-500/20 ring-1 ring-violet-500'
                                : 'border-zinc-700 hover:border-violet-400 hover:bg-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium text-sm ${isSelected ? 'text-violet-300' : 'text-zinc-200'}`}>
                                    {admin.name}
                                  </span>
                                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getRoleBadgeColor(admin.role)}`}>
                                    {admin.role}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-0.5 truncate">{admin.description}</p>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                <p className="text-xs text-amber-400">
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
          <div className="absolute bottom-14 right-0 w-[420px] glass-card overflow-hidden mb-2">
            {/* 헤더 */}
            <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
              <span className="font-medium text-sm text-zinc-200">시스템 상태 점검</span>
              <button
                onClick={() => setShowWarmupPanel(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {/* 섹션 1: 서버 웜업 */}
              <div className="p-4 border-b border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-200">1. 서버 웜업</span>
                    {httpStatuses.length > 0 && !isWarmingUp && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        httpSuccessCount === SERVICES.length
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
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
                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-violet-600 text-white hover:bg-violet-500'
                    }`}
                  >
                    {isWarmingUp ? '진행중...' : '시작'}
                  </button>
                </div>

                {/* 진행 상태 */}
                {warmupPhase && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-violet-400">
                    {isWarmingUp && (
                      <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{warmupPhase}</span>
                  </div>
                )}

                {/* 서비스 목록 */}
                {httpStatuses.length > 0 && (
                  <div className="space-y-1.5">
                    {httpStatuses.map((svc, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2 bg-zinc-800 rounded text-xs">
                        <span className="text-zinc-300">{svc.service}</span>
                        <div className="flex items-center gap-2">
                          {svc.time !== undefined && svc.status === 'success' && (
                            <span className="text-zinc-500">{svc.time}ms</span>
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
                  <div className="mt-2 text-right text-[10px] text-zinc-500">
                    총 소요시간: {warmupTotalTime}ms
                  </div>
                )}
              </div>

              {/* 섹션 2: NATS 통신 테스트 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-200">2. NATS 통신 테스트</span>
                    {natsConnected !== null && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        natsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
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
                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                  >
                    {isTestingNats ? '테스트중...' : '3회 테스트'}
                  </button>
                </div>

                {/* 진행 상태 */}
                {natsTestPhase && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-purple-400">
                    {isTestingNats && (
                      <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{natsTestPhase}</span>
                  </div>
                )}

                {/* NATS 테스트 결과 테이블 */}
                {natsResults.length > 0 && (
                  <div className="border border-zinc-700 rounded overflow-hidden">
                    {/* 테이블 헤더 */}
                    <div className="grid grid-cols-4 gap-1 bg-zinc-800 px-2 py-1.5 text-[10px] font-medium text-zinc-400">
                      <div>서비스</div>
                      <div className="text-center">1차</div>
                      <div className="text-center">2차</div>
                      <div className="text-center">3차</div>
                    </div>
                    {/* 테이블 바디 */}
                    {NATS_SERVICES.map((svc) => (
                      <div key={svc.name} className="grid grid-cols-4 gap-1 px-2 py-1.5 text-xs border-t border-zinc-700">
                        <div className="text-zinc-300 truncate">{svc.name}</div>
                        {[1, 2, 3].map((attempt) => {
                          const result = natsResults.find(r => r.service === svc.name && r.attempt === attempt);
                          return (
                            <div key={attempt} className="flex items-center justify-center gap-1">
                              {result ? (
                                <>
                                  {result.time !== undefined && result.status === 'success' && (
                                    <span className="text-[10px] text-zinc-500">{result.time}ms</span>
                                  )}
                                  {getStatusIcon(result.status)}
                                </>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {natsResults.length === 0 && !isTestingNats && (
                  <p className="text-xs text-zinc-500 text-center py-3">
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
              ? 'bg-zinc-700 text-zinc-200'
              : 'bg-violet-600 text-white hover:bg-violet-500 hover:shadow-xl active:scale-95'
            }
          `}
          title="시스템 상태 점검"
        >
          <Zap className="w-4 h-4" />
          <span>시스템 점검</span>
        </button>
      </div>
    </div>
  );
};
