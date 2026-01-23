import React, { useState } from 'react';

const USER_API_URL = import.meta.env.VITE_API_URL || 'https://user-api-dev-iihuzmuufa-du.a.run.app';

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

const SERVICES = [
  { name: 'user-api', isNats: false },
  { name: 'iam-service', isNats: true },
  { name: 'course-service', isNats: true },
  { name: 'booking-service', isNats: true },
  { name: 'chat-gateway', isNats: false },
  { name: 'chat-service', isNats: true },
];

const NATS_SERVICES = SERVICES.filter(s => s.isNats);

interface SystemWarmupPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const SystemWarmupPanel: React.FC<SystemWarmupPanelProps> = ({ isOpen, onToggle }) => {
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupPhase, setWarmupPhase] = useState<string>('');
  const [httpStatuses, setHttpStatuses] = useState<ServiceStatus[]>([]);
  const [warmupTotalTime, setWarmupTotalTime] = useState<number | null>(null);

  const [isTestingNats, setIsTestingNats] = useState(false);
  const [natsTestPhase, setNatsTestPhase] = useState<string>('');
  const [natsResults, setNatsResults] = useState<NatsTestResult[]>([]);
  const [natsConnected, setNatsConnected] = useState<boolean | null>(null);

  const handleWarmup = async () => {
    setIsWarmingUp(true);
    setWarmupPhase('서버 웜업 시작중...');
    setWarmupTotalTime(null);

    setHttpStatuses(SERVICES.map(s => ({
      service: s.name,
      status: 'pending' as StatusType
    })));

    const startTime = Date.now();

    try {
      setWarmupPhase('user-api 연결중...');

      // user-api 상태를 loading으로 변경
      setHttpStatuses(prev => prev.map(s =>
        s.service === 'user-api' ? { ...s, status: 'loading' as StatusType } : s
      ));

      const userApiStartTime = Date.now();
      const response = await fetch(`${USER_API_URL}/system/warmup/http`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const userApiTime = Date.now() - userApiStartTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // user-api 응답 성공 - 상태 업데이트
      setHttpStatuses(prev => prev.map(s =>
        s.service === 'user-api'
          ? { ...s, status: 'success' as StatusType, time: userApiTime }
          : s
      ));

      const data = await response.json();
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
        await new Promise(r => setTimeout(r, 100));
      }

      setWarmupTotalTime(Date.now() - startTime);
      setWarmupPhase('서버 웜업 완료');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setHttpStatuses(prev => prev.map(s =>
        s.status === 'pending' || s.status === 'loading'
          ? { ...s, status: 'error' as StatusType, message }
          : s
      ));
      setWarmupPhase('서버 웜업 실패');
    }

    setIsWarmingUp(false);
  };

  const handleNatsTest = async () => {
    setIsTestingNats(true);
    setNatsResults([]);
    setNatsConnected(null);

    let successCount = 0;
    const totalTests = 3;

    for (let attempt = 1; attempt <= totalTests; attempt++) {
      setNatsTestPhase(`NATS 테스트 ${attempt}/${totalTests} 진행중...`);

      const loadingResults = NATS_SERVICES.map(s => ({
        attempt,
        service: s.name,
        status: 'loading' as StatusType,
      }));
      setNatsResults(prev => [...prev.filter(r => r.attempt !== attempt), ...loadingResults]);

      try {
        const response = await fetch(`${USER_API_URL}/system/warmup/nats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const attemptResults: NatsTestResult[] = (data.services || [])
          .filter((s: any) => s.natsStatus !== 'skipped')
          .map((s: any) => ({
            attempt,
            service: s.name,
            status: s.natsStatus === 'ok' ? 'success' as StatusType : 'error' as StatusType,
            time: s.natsResponseTime,
            message: s.natsMessage,
          }));

        setNatsResults(prev => [
          ...prev.filter(r => r.attempt !== attempt),
          ...attemptResults
        ]);

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
        setNatsResults(prev => [
          ...prev.filter(r => r.attempt !== attempt),
          ...errorResults
        ]);
      }

      if (attempt < totalTests) {
        setNatsTestPhase(`다음 테스트 대기중... (${attempt}/${totalTests} 완료)`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setNatsConnected(successCount >= 2);
    setNatsTestPhase(`NATS 테스트 완료 (${successCount}/${totalTests} 성공)`);
    setIsTestingNats(false);
  };

  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'pending': return <span className="text-white/30">○</span>;
      case 'loading': return <div className="w-3 h-3 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />;
      case 'success': return <span className="text-green-400">✓</span>;
      case 'error': return <span className="text-red-400">✗</span>;
      case 'skipped': return <span className="text-white/30">-</span>;
    }
  };

  const httpSuccessCount = httpStatuses.filter(s => s.status === 'success').length;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-[380px] bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden mb-2">
          {/* Header */}
          <div className="bg-white/5 px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
            <span className="font-medium text-sm text-white/90">시스템 상태 점검</span>
            <button
              onClick={onToggle}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-[450px] overflow-y-auto">
            {/* Section 1: Server Warmup */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-white/90">1. 서버 웜업</span>
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
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    isWarmingUp
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-emerald-500/80 text-white hover:bg-emerald-500'
                  }`}
                >
                  {isWarmingUp ? '진행중...' : '시작'}
                </button>
              </div>

              {warmupPhase && (
                <div className="mb-3 flex items-center gap-2 text-xs text-emerald-400">
                  {isWarmingUp && (
                    <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{warmupPhase}</span>
                </div>
              )}

              {httpStatuses.length > 0 && (
                <div className="space-y-1.5">
                  {httpStatuses.map((svc, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 bg-white/5 rounded-lg text-xs">
                      <span className="text-white/70">{svc.service}</span>
                      <div className="flex items-center gap-2">
                        {svc.time !== undefined && svc.status === 'success' && (
                          <span className="text-white/40">{svc.time}ms</span>
                        )}
                        {svc.message && svc.status === 'error' && (
                          <span className="text-red-400/70 max-w-[80px] truncate" title={svc.message}>
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
                <div className="mt-2 text-right text-[10px] text-white/30">
                  총 소요시간: {warmupTotalTime}ms
                </div>
              )}
            </div>

            {/* Section 2: NATS Test */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-white/90">2. NATS 통신 테스트</span>
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
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    isTestingNats || isWarmingUp
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-purple-500/80 text-white hover:bg-purple-500'
                  }`}
                >
                  {isTestingNats ? '테스트중...' : '3회 테스트'}
                </button>
              </div>

              {natsTestPhase && (
                <div className="mb-3 flex items-center gap-2 text-xs text-purple-400">
                  {isTestingNats && (
                    <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{natsTestPhase}</span>
                </div>
              )}

              {natsResults.length > 0 && (
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-4 gap-1 bg-white/5 px-2 py-1.5 text-[10px] font-medium text-white/50">
                    <div>서비스</div>
                    <div className="text-center">1차</div>
                    <div className="text-center">2차</div>
                    <div className="text-center">3차</div>
                  </div>
                  {NATS_SERVICES.map((svc) => (
                    <div key={svc.name} className="grid grid-cols-4 gap-1 px-2 py-1.5 text-xs border-t border-white/5">
                      <div className="text-white/60 truncate">{svc.name}</div>
                      {[1, 2, 3].map((attempt) => {
                        const result = natsResults.find(r => r.service === svc.name && r.attempt === attempt);
                        return (
                          <div key={attempt} className="flex items-center justify-center gap-1">
                            {result ? (
                              <>
                                {result.time !== undefined && result.status === 'success' && (
                                  <span className="text-[10px] text-white/30">{result.time}ms</span>
                                )}
                                {getStatusIcon(result.status)}
                              </>
                            ) : (
                              <span className="text-white/20">-</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {natsResults.length === 0 && !isTestingNats && (
                <p className="text-xs text-white/30 text-center py-3">
                  서버 웜업 후 NATS 테스트를 진행하세요
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
          transition-all duration-200 font-medium text-sm backdrop-blur-sm
          ${isOpen
            ? 'bg-white/20 text-white border border-white/20'
            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:border-white/20 active:scale-95'
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
  );
};
