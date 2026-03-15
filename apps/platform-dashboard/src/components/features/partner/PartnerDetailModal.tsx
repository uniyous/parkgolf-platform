import React, { useState, useMemo } from 'react';
import {
  RefreshCw, Play, Settings2, Clock, Database, ArrowLeftRight,
  Activity, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Wifi, Timer, TrendingUp, Layers,
} from 'lucide-react';
import { Modal } from '@/components/ui';
import {
  useCourseMappingsQuery,
  useSlotMappingsQuery,
  useBookingMappingsQuery,
  useSyncLogsQuery,
  useTestConnectionMutation,
  useManualSyncMutation,
} from '@/hooks/queries/partner';
import type { PartnerConfig, SyncMode, SyncLog } from '@/types/partner';

type DetailTab = 'dashboard' | 'timeline' | 'slots' | 'bookings';

const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  API_POLLING: 'API 폴링',
  WEBHOOK: '웹훅',
  HYBRID: '하이브리드',
  MANUAL: '수동',
};

interface PartnerDetailModalProps {
  partner: PartnerConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (partner: PartnerConfig) => void;
}

export const PartnerDetailModal: React.FC<PartnerDetailModalProps> = ({ partner, isOpen, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('dashboard');

  if (!partner) return null;

  const tabs = [
    { id: 'dashboard' as const, label: '연동 현황', icon: <Activity className="w-4 h-4" /> },
    { id: 'timeline' as const, label: '동기화 타임라인', icon: <Timer className="w-4 h-4" /> },
    { id: 'slots' as const, label: '슬롯 데이터', icon: <Clock className="w-4 h-4" /> },
    { id: 'bookings' as const, label: '예약 데이터', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 -mt-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
          {partner.systemName?.charAt(0) || '?'}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">{partner.systemName}</h2>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span>골프장 #{partner.clubId}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span className={`px-1.5 py-0.5 rounded ${partner.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {partner.isActive ? '연동중' : '비활성'}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
              {SYNC_MODE_LABELS[partner.syncMode]} · {partner.syncIntervalMin}분
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-5 border-b border-white/10 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-white/50 hover:bg-white/8 hover:text-white/80'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[420px]">
        {activeTab === 'dashboard' && <DashboardTab partner={partner} onEdit={onEdit} />}
        {activeTab === 'timeline' && <TimelineTab partnerId={partner.id} />}
        {activeTab === 'slots' && <SlotsTab partnerId={partner.id} />}
        {activeTab === 'bookings' && <BookingsTab clubId={partner.clubId} />}
      </div>
    </Modal>
  );
};

// ── Helper: 시간 경과 표시 ──

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '없음';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 ${mins % 60}분 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function isOverdue(dateStr: string | null | undefined, intervalMin: number): boolean {
  if (!dateStr) return false;
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff > intervalMin * 60000 * 2; // 2배 이상 지나면 경고
}

// ── Dashboard Tab ──

const DashboardTab: React.FC<{ partner: PartnerConfig; onEdit: (p: PartnerConfig) => void }> = ({ partner, onEdit }) => {
  const testConnection = useTestConnectionMutation();
  const manualSync = useManualSyncMutation();
  const { data: logs } = useSyncLogsQuery(partner.id);
  const { data: courseMappings } = useCourseMappingsQuery(partner.id);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    const result = await testConnection.mutateAsync(partner.id);
    setTestResult(result);
  };

  // 최근 동기화 통계
  const syncStats = useMemo(() => {
    if (!logs?.length) return { total: 0, success: 0, failed: 0, successRate: 0, recentSlot: null as SyncLog | null, recentBooking: null as SyncLog | null };
    const recent = logs.slice(0, 20);
    const success = recent.filter((l) => l.status === 'SUCCESS').length;
    const failed = recent.filter((l) => l.status === 'FAILED').length;
    const recentSlot = logs.find((l) => l.action === 'SLOT_SYNC') ?? null;
    const recentBooking = logs.find((l) => l.action === 'BOOKING_IMPORT') ?? null;
    return { total: recent.length, success, failed, successRate: recent.length ? Math.round((success / recent.length) * 100) : 0, recentSlot, recentBooking };
  }, [logs]);

  const slotOverdue = isOverdue(partner.lastSlotSyncAt, partner.syncIntervalMin);

  return (
    <div className="space-y-5">
      {/* Sync Health Cards */}
      <div className="grid grid-cols-4 gap-3">
        <HealthCard
          icon={<Wifi className="w-5 h-5" />}
          label="연결 상태"
          value={partner.isActive ? '정상' : '비활성'}
          color={partner.isActive ? 'green' : 'red'}
        />
        <HealthCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="성공률 (최근 20건)"
          value={`${syncStats.successRate}%`}
          color={syncStats.successRate >= 80 ? 'green' : syncStats.successRate >= 50 ? 'yellow' : 'red'}
        />
        <HealthCard
          icon={<Layers className="w-5 h-5" />}
          label="코스 매핑"
          value={`${courseMappings?.length ?? 0}개`}
          color="blue"
        />
        <HealthCard
          icon={<Timer className="w-5 h-5" />}
          label="동기화 간격"
          value={`${partner.syncIntervalMin}분`}
          color="indigo"
        />
      </div>

      {/* Last Sync Status */}
      <div className="grid grid-cols-2 gap-3">
        <SyncStatusCard
          title="마지막 슬롯 동기화"
          lastSyncAt={partner.lastSlotSyncAt}
          status={partner.lastSlotSyncStatus}
          error={partner.lastSlotSyncError}
          isOverdue={slotOverdue}
          log={syncStats.recentSlot}
          enabled={partner.slotSyncEnabled}
        />
        <SyncStatusCard
          title="마지막 예약 동기화"
          lastSyncAt={partner.lastBookingSyncAt}
          status={syncStats.recentBooking?.status}
          log={syncStats.recentBooking}
          enabled={partner.bookingSyncEnabled}
        />
      </div>

      {/* Config Info */}
      <div className="bg-white/5 rounded-lg p-4 space-y-2">
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide">연동 설정</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <InfoRow label="외부 골프장 ID" value={partner.externalClubId} />
          <InfoRow label="회사/골프장" value={`회사 #${partner.companyId} · 골프장 #${partner.clubId}`} />
          <InfoRow label="Spec URL" value={<span className="text-blue-400 text-xs break-all">{partner.specUrl}</span>} />
          <InfoRow label="동기화 범위" value={`오늘 ~ +${partner.syncRangeDays}일`} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleTest}
          disabled={testConnection.isPending}
          className="inline-flex items-center px-3.5 py-2 bg-blue-600/90 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 text-sm transition-all shadow-sm"
        >
          <Play className="w-4 h-4 mr-1.5" />
          {testConnection.isPending ? '테스트 중...' : '연결 테스트'}
        </button>
        <button
          onClick={() => manualSync.mutate(partner.clubId)}
          disabled={manualSync.isPending}
          className="inline-flex items-center px-3.5 py-2 bg-indigo-600/90 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 text-sm transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${manualSync.isPending ? 'animate-spin' : ''}`} />
          {manualSync.isPending ? '동기화 중...' : '수동 동기화'}
        </button>
        <button
          onClick={() => onEdit(partner)}
          className="inline-flex items-center px-3.5 py-2 border border-white/15 text-white/70 rounded-lg hover:bg-white/5 hover:text-white text-sm transition-all ml-auto"
        >
          <Settings2 className="w-4 h-4 mr-1.5" />
          설정 수정
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {testResult.message}
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──

const HealthCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => {
  const colors: Record<string, string> = {
    green: 'from-green-500/15 to-green-500/5 text-green-400 border-green-500/20',
    red: 'from-red-500/15 to-red-500/5 text-red-400 border-red-500/20',
    yellow: 'from-yellow-500/15 to-yellow-500/5 text-yellow-400 border-yellow-500/20',
    blue: 'from-blue-500/15 to-blue-500/5 text-blue-400 border-blue-500/20',
    indigo: 'from-indigo-500/15 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
  };
  return (
    <div className={`bg-gradient-to-b ${colors[color]} border rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-1 opacity-70">{icon}<span className="text-xs">{label}</span></div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
};

const SyncStatusCard: React.FC<{
  title: string;
  lastSyncAt?: string | null;
  status?: string | null;
  error?: string | null;
  isOverdue?: boolean;
  log: SyncLog | null;
  enabled: boolean;
}> = ({ title, lastSyncAt, status, error, isOverdue, log, enabled }) => {
  if (!enabled) {
    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h4 className="text-sm text-white/40 mb-2">{title}</h4>
        <div className="text-white/30 text-sm">비활성</div>
      </div>
    );
  }

  const statusIcon = status === 'SUCCESS'
    ? <CheckCircle2 className="w-5 h-5 text-green-400" />
    : status === 'FAILED'
    ? <XCircle className="w-5 h-5 text-red-400" />
    : <Clock className="w-5 h-5 text-white/30" />;

  return (
    <div className={`bg-white/5 rounded-lg p-4 border ${isOverdue ? 'border-yellow-500/40' : 'border-white/10'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm text-white/60">{title}</h4>
        {statusIcon}
      </div>
      <div className="text-white font-medium">
        {lastSyncAt ? timeAgo(lastSyncAt) : '실행 전'}
      </div>
      {lastSyncAt && (
        <div className="text-xs text-white/40 mt-0.5">
          {new Date(lastSyncAt).toLocaleString('ko-KR')}
        </div>
      )}
      {isOverdue && (
        <div className="flex items-center gap-1 mt-2 text-xs text-yellow-400">
          <AlertTriangle className="w-3 h-3" />
          예상 간격 초과 — 동기화 지연 확인 필요
        </div>
      )}
      {log && (
        <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
          <span>처리 {log.recordCount}건</span>
          {log.createdCount > 0 && <span className="text-green-400/70">+{log.createdCount}</span>}
          {log.updatedCount > 0 && <span className="text-blue-400/70">~{log.updatedCount}</span>}
          {log.errorCount > 0 && <span className="text-red-400/70">err {log.errorCount}</span>}
          {log.durationMs && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
        </div>
      )}
      {error && (
        <div className="mt-2 text-xs text-red-400 truncate" title={error}>{error}</div>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-xs text-white/40 w-24 shrink-0">{label}</span>
    <span className="text-xs text-white/80">{value}</span>
  </div>
);

// ── Timeline Tab ──

const TimelineTab: React.FC<{ partnerId: number }> = ({ partnerId }) => {
  const { data: logs, isLoading } = useSyncLogsQuery(partnerId);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const actionLabels: Record<string, string> = {
    SLOT_SYNC: '슬롯 동기화',
    BOOKING_IMPORT: '예약 수신',
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-white/50 text-sm py-8 justify-center"><RefreshCw className="w-4 h-4 animate-spin" />로딩 중...</div>;
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-12">
        <Timer className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <div className="text-white/40 text-sm">동기화 실행 이력이 없습니다</div>
        <div className="text-white/25 text-xs mt-1">10분 간격 Cron이 실행되면 이력이 기록됩니다</div>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
      {logs.map((log, idx) => {
        const isExpanded = expandedId === log.id;
        const isSuccess = log.status === 'SUCCESS';
        const isFailed = log.status === 'FAILED';
        const prevLog = logs[idx + 1];
        const timeSincePrev = prevLog
          ? Math.round((new Date(log.createdAt).getTime() - new Date(prevLog.createdAt).getTime()) / 60000)
          : null;

        return (
          <div key={log.id}>
            {/* Gap indicator between logs */}
            {timeSincePrev !== null && timeSincePrev > 15 && (
              <div className="flex items-center gap-2 py-1 pl-6">
                <div className="w-px h-4 bg-yellow-500/30 ml-[7px]" />
                <span className="text-xs text-yellow-500/60">{timeSincePrev}분 간격</span>
              </div>
            )}

            <button
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              className={`w-full text-left rounded-lg transition-all ${
                isExpanded ? 'bg-white/8' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Timeline dot */}
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isSuccess ? 'bg-green-500/20' : isFailed ? 'bg-red-500/20' : 'bg-yellow-500/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isSuccess ? 'bg-green-400' : isFailed ? 'bg-red-400' : 'bg-yellow-400'
                  }`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {actionLabels[log.action] ?? log.action}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      isSuccess ? 'bg-green-500/15 text-green-400' :
                      isFailed ? 'bg-red-500/15 text-red-400' :
                      'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                    <span>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                    {log.durationMs && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
                    <span className="flex items-center gap-1.5">
                      {log.recordCount > 0 && <span>처리 {log.recordCount}</span>}
                      {log.createdCount > 0 && <span className="text-green-400/80">+{log.createdCount}</span>}
                      {log.updatedCount > 0 && <span className="text-blue-400/80">~{log.updatedCount}</span>}
                      {log.errorCount > 0 && <span className="text-red-400/80">err {log.errorCount}</span>}
                    </span>
                  </div>
                </div>

                {/* Expand icon */}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
              </div>
            </button>

            {/* Expanded Detail */}
            {isExpanded && (
              <div className="ml-10 mr-3 mb-2 bg-white/5 rounded-lg p-3 space-y-2 text-xs">
                <div className="grid grid-cols-4 gap-3">
                  <StatBox label="전체 처리" value={log.recordCount} />
                  <StatBox label="신규 생성" value={log.createdCount} color="green" />
                  <StatBox label="갱신" value={log.updatedCount} color="blue" />
                  <StatBox label="에러" value={log.errorCount} color="red" />
                </div>
                {log.errorMessage && (
                  <div className="bg-red-500/10 rounded p-2 text-red-400">
                    <span className="font-medium">에러: </span>{log.errorMessage}
                  </div>
                )}
                {log.payload && (
                  <details className="text-white/40">
                    <summary className="cursor-pointer hover:text-white/60 text-xs">payload 상세</summary>
                    <pre className="mt-1 text-xs bg-black/20 rounded p-2 overflow-x-auto max-h-40">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => {
  const textColor = color === 'green' ? 'text-green-400' : color === 'blue' ? 'text-blue-400' : color === 'red' ? 'text-red-400' : 'text-white';
  return (
    <div className="bg-white/5 rounded p-2 text-center">
      <div className={`text-lg font-bold ${textColor}`}>{value}</div>
      <div className="text-white/40 text-xs">{label}</div>
    </div>
  );
};

// ── Slots Tab ──

const SlotsTab: React.FC<{ partnerId: number }> = ({ partnerId }) => {
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const params = dateFilter ? { date: dateFilter } : {};
  const { data: slots, isLoading } = useSlotMappingsQuery(partnerId, params);

  const statusConfig: Record<string, { bg: string; label: string }> = {
    MAPPED: { bg: 'bg-green-500/15 text-green-400', label: 'MAPPED' },
    UNMAPPED: { bg: 'bg-yellow-500/15 text-yellow-400', label: 'UNMAPPED' },
    CHANGED: { bg: 'bg-blue-500/15 text-blue-400', label: 'CHANGED' },
    DELETED: { bg: 'bg-red-500/15 text-red-400', label: 'DELETED' },
  };

  const extStatusConfig: Record<string, { color: string; dot: string }> = {
    AVAILABLE: { color: 'text-green-400', dot: 'bg-green-400' },
    FULLY_BOOKED: { color: 'text-orange-400', dot: 'bg-orange-400' },
    CLOSED: { color: 'text-red-400', dot: 'bg-red-400' },
  };

  // Group by course
  const grouped = useMemo(() => {
    if (!slots?.length) return {};
    return slots.reduce((acc, slot) => {
      const course = slot.courseMapping?.externalCourseName ?? '미분류';
      if (!acc[course]) acc[course] = [];
      acc[course].push(slot);
      return acc;
    }, {} as Record<string, typeof slots>);
  }, [slots]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-1.5 bg-white/5 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button onClick={() => setDateFilter('')} className="text-xs text-white/40 hover:text-white/70 transition-colors">전체</button>
        <div className="ml-auto flex items-center gap-2 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-green-400" /> 예약가능
          <span className="w-2 h-2 rounded-full bg-orange-400" /> 마감
          <span className="w-2 h-2 rounded-full bg-red-400" /> 종료
          <span className="ml-2">{slots?.length ?? 0}건</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-white/50 text-sm py-8 justify-center"><RefreshCw className="w-4 h-4 animate-spin" />로딩 중...</div>
      ) : !slots?.length ? (
        <div className="text-center py-12">
          <Clock className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <div className="text-white/40 text-sm">해당 날짜의 슬롯 데이터가 없습니다</div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([courseName, courseSlots]) => (
            <div key={courseName}>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-sm font-medium text-white">{courseName}</span>
                <span className="text-xs text-white/30">{courseSlots.length}건</span>
              </div>
              <div className="grid gap-1">
                {courseSlots.map((slot) => {
                  const ext = extStatusConfig[slot.externalStatus];
                  const sync = statusConfig[slot.syncStatus];
                  return (
                    <div key={slot.id} className="flex items-center gap-3 px-3 py-2 bg-white/3 rounded-lg hover:bg-white/6 transition-colors text-xs">
                      <span className="text-white font-mono w-24">{slot.startTime}~{slot.endTime}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${ext?.dot ?? 'bg-white/30'}`} />
                        <span className={`${ext?.color ?? 'text-white/40'}`}>{slot.externalStatus}</span>
                      </div>
                      <span className="text-white/50">{slot.externalBooked}/{slot.externalMaxPlayers}명</span>
                      {slot.externalPrice != null && <span className="text-white/40">{Number(slot.externalPrice).toLocaleString()}원</span>}
                      <span className="ml-auto">
                        {slot.internalSlotId
                          ? <span className="text-green-400/70">내부 #{slot.internalSlotId}</span>
                          : <span className="text-white/20">미연결</span>
                        }
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${sync?.bg ?? 'bg-gray-500/15 text-gray-400'}`}>
                        {sync?.label ?? slot.syncStatus}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Bookings Tab ──

const BookingsTab: React.FC<{ clubId: number }> = ({ clubId }) => {
  const { data: bookings, isLoading } = useBookingMappingsQuery(clubId);

  const statusConfig: Record<string, { bg: string; label: string }> = {
    SYNCED: { bg: 'bg-green-500/15 text-green-400', label: '동기화됨' },
    PENDING: { bg: 'bg-yellow-500/15 text-yellow-400', label: '대기' },
    CONFLICT: { bg: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30', label: '충돌' },
    FAILED: { bg: 'bg-red-500/15 text-red-400', label: '실패' },
    CANCELLED: { bg: 'bg-gray-500/15 text-gray-400', label: '취소' },
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-white/50 text-sm py-8 justify-center"><RefreshCw className="w-4 h-4 animate-spin" />로딩 중...</div>;
  }

  if (!bookings?.length) {
    return (
      <div className="text-center py-12">
        <Database className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <div className="text-white/40 text-sm">동기화된 예약 데이터가 없습니다</div>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
      {bookings.map((b) => {
        const sync = statusConfig[b.syncStatus];
        return (
          <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/3 rounded-lg hover:bg-white/6 transition-colors">
            {/* Player info */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/20 to-cyan-600/20 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">
              {b.playerName?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">{b.playerName}</span>
                <span className="text-xs text-white/30">{b.playerCount}명</span>
                <span className={`text-xs ${b.syncDirection === 'INBOUND' ? 'text-cyan-400/70' : 'text-orange-400/70'}`}>
                  {b.syncDirection === 'INBOUND' ? '수신' : '발신'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                <span>{new Date(b.date).toLocaleDateString('ko-KR')}</span>
                <span>{b.startTime}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className={b.status === 'CONFIRMED' ? 'text-green-400/60' : b.status === 'CANCELLED' ? 'text-red-400/60' : 'text-blue-400/60'}>
                  {b.status}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-white/25">ext:{b.externalBookingId}</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${sync?.bg ?? 'bg-gray-500/15 text-gray-400'}`}>
              {sync?.label ?? b.syncStatus}
            </span>
          </div>
        );
      })}
    </div>
  );
};
