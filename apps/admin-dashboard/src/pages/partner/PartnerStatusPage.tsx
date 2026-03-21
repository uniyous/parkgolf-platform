import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import {
  useMyPartnerConfigQuery,
  useSyncLogsQuery,
  useBookingMappingsQuery,
} from '@/hooks/queries/partner';
import { useClubsQuery } from '@/hooks/queries/course';
import type { PartnerConfig, SyncLog, SyncAction, BookingMapping, BookingSyncStatus, GameMapping } from '@/types/partner';

type TabKey = 'overview' | 'syncLogs' | 'bookingMappings';

const SYNC_RESULT_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  SUCCESS: { color: 'text-green-400', icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
  PARTIAL: { color: 'text-yellow-400', icon: <AlertTriangle className="w-4 h-4 text-yellow-400" /> },
  FAILED: { color: 'text-red-400', icon: <XCircle className="w-4 h-4 text-red-400" /> },
};

const ACTION_LABELS: Record<SyncAction, string> = {
  SLOT_SYNC: '슬롯 동기화',
  BOOKING_IMPORT: '예약 가져오기',
  BOOKING_EXPORT: '예약 내보내기',
  BOOKING_CANCEL: '예약 취소 전파',
  CONNECTION_TEST: '연결 테스트',
};

const BOOKING_STATUS_STYLES: Record<BookingSyncStatus, { label: string; color: string }> = {
  SYNCED: { label: '동기화 완료', color: 'bg-green-500/20 text-green-400' },
  PENDING: { label: '대기 중', color: 'bg-yellow-500/20 text-yellow-400' },
  CONFLICT: { label: '충돌', color: 'bg-red-500/20 text-red-400' },
  FAILED: { label: '실패', color: 'bg-red-500/20 text-red-400' },
  CANCELLED: { label: '취소', color: 'bg-gray-500/20 text-gray-400' },
};

const SYNC_MODE_LABELS: Record<string, string> = {
  API_POLLING: '자동 폴링',
  WEBHOOK: '웹훅',
  HYBRID: '폴링 + 웹훅',
  MANUAL: '수동',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function isOverdue(lastSync: string | null | undefined, intervalMin: number): boolean {
  if (!lastSync) return true;
  const elapsed = Date.now() - new Date(lastSync).getTime();
  return elapsed > intervalMin * 2 * 60000;
}

export const PartnerStatusPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedClubId, setSelectedClubId] = useState<number | undefined>();

  const { data: clubsData } = useClubsQuery();
  const clubs = clubsData?.data || [];
  const clubId = selectedClubId ?? clubs[0]?.id;

  const { data: partnerConfig, isLoading: configLoading } = useMyPartnerConfigQuery(clubId ?? 0, { enabled: !!clubId });
  const { data: syncLogs, isLoading: logsLoading } = useSyncLogsQuery(clubId ?? 0, { enabled: !!clubId && activeTab === 'syncLogs' });
  const { data: bookingMappings, isLoading: mappingsLoading } = useBookingMappingsQuery(clubId ?? 0, { enabled: !!clubId && activeTab === 'bookingMappings' });

  const conflictCount = useMemo(() =>
    bookingMappings?.filter((m) => m.syncStatus === 'CONFLICT').length ?? 0,
    [bookingMappings]
  );

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'overview', label: '연동 현황' },
    { key: 'syncLogs', label: '동기화 이력' },
    { key: 'bookingMappings', label: '예약 매핑', count: conflictCount || undefined },
  ];

  if (!clubId) {
    return (
      <div className="text-center py-20">
        <WifiOff className="w-12 h-12 text-white/30 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">골프장을 선택해주세요</h3>
        <p className="text-white/50">파트너 연동 현황을 확인할 골프장이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">파트너 연동 현황</h2>
            <p className="mt-1 text-sm text-white/50">외부 부킹 시스템 연동 상태를 확인합니다 (조회 전용)</p>
          </div>
          {clubs.length > 1 && (
            <select
              value={clubId}
              onChange={(e) => setSelectedClubId(Number(e.target.value))}
              className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {configLoading ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8 text-center">
          <RefreshCw className="w-8 h-8 text-white/30 mx-auto animate-spin" />
          <p className="mt-2 text-white/50">연동 정보를 불러오는 중...</p>
        </div>
      ) : !partnerConfig ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8 text-center">
          <WifiOff className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">파트너 연동이 설정되지 않았습니다</h3>
          <p className="text-white/50">이 골프장은 자체 플랫폼 모드로 운영 중입니다.</p>
          <p className="text-sm text-white/30 mt-1">파트너 연동이 필요하면 플랫폼 관리자에게 요청하세요.</p>
        </div>
      ) : (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatusCard
              label="연결 상태"
              value={partnerConfig.isActive ? '연동 중' : '비활성'}
              icon={partnerConfig.isActive ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              color={partnerConfig.isActive ? 'emerald' : 'red'}
            />
            <StatusCard
              label="동기화 모드"
              value={SYNC_MODE_LABELS[partnerConfig.syncMode] || partnerConfig.syncMode}
              sub={`${partnerConfig.syncIntervalMin}분 간격`}
              icon={<Clock className="w-5 h-5" />}
              color="blue"
            />
            <StatusCard
              label="마지막 슬롯 동기화"
              value={partnerConfig.lastSlotSyncAt ? timeAgo(partnerConfig.lastSlotSyncAt) : '없음'}
              sub={partnerConfig.lastSlotSyncStatus || undefined}
              icon={partnerConfig.lastSlotSyncStatus === 'FAILED'
                ? <XCircle className="w-5 h-5" />
                : <CheckCircle className="w-5 h-5" />}
              color={isOverdue(partnerConfig.lastSlotSyncAt, partnerConfig.syncIntervalMin) ? 'yellow' : 'emerald'}
              warning={isOverdue(partnerConfig.lastSlotSyncAt, partnerConfig.syncIntervalMin) ? '동기화 지연' : undefined}
            />
            <StatusCard
              label="코스 매핑"
              value={`${partnerConfig.gameMappings?.length ?? 0}개`}
              sub={`동기화 범위: ${partnerConfig.syncRangeDays}일`}
              icon={<RefreshCw className="w-5 h-5" />}
              color="purple"
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-white/15">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
                    activeTab === tab.key
                      ? 'bg-white/10 text-white border-b-2 border-emerald-400'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-red-500 text-white rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && <OverviewTab partnerConfig={partnerConfig} />}
          {activeTab === 'syncLogs' && <SyncLogsTab logs={syncLogs || []} isLoading={logsLoading} />}
          {activeTab === 'bookingMappings' && (
            <BookingMappingsTab mappings={bookingMappings || []} isLoading={mappingsLoading} />
          )}
        </>
      )}
    </div>
  );
};

// ── Status Card ──

const StatusCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  warning?: string;
}> = ({ label, value, sub, icon, color, warning }) => {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    red: 'text-red-400 bg-red-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50 uppercase">{label}</span>
        <div className={`p-1.5 rounded-lg ${c}`}>{icon}</div>
      </div>
      <div className="text-lg font-semibold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-0.5">{sub}</div>}
      {warning && (
        <div className="flex items-center mt-2 text-xs text-yellow-400">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {warning}
        </div>
      )}
    </div>
  );
};

// ── Overview Tab ──

const OverviewTab: React.FC<{ partnerConfig: PartnerConfig }> = ({ partnerConfig }) => (
  <div className="space-y-4">
    {/* Config Info */}
    <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
      <h3 className="text-lg font-medium text-white mb-4">연동 상세 정보</h3>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
        {[
          { label: '시스템명', value: partnerConfig.systemName },
          { label: '외부 골프장 ID', value: partnerConfig.externalClubId },
          { label: '동기화 모드', value: SYNC_MODE_LABELS[partnerConfig.syncMode] || partnerConfig.syncMode },
          { label: '동기화 주기', value: `${partnerConfig.syncIntervalMin}분` },
          { label: '동기화 범위', value: `오늘 ~ +${partnerConfig.syncRangeDays}일` },
          { label: '슬롯 동기화', value: partnerConfig.slotSyncEnabled ? '활성' : '비활성' },
          { label: '예약 동기화', value: partnerConfig.bookingSyncEnabled ? '활성' : '비활성' },
          { label: '서킷 브레이커', value: partnerConfig.circuitBreakerStatus || 'CLOSED' },
          { label: '등록일', value: new Date(partnerConfig.createdAt).toLocaleDateString('ko-KR') },
        ].map((item) => (
          <div key={item.label} className="flex justify-between py-2 border-b border-white/5">
            <dt className="text-sm text-white/50">{item.label}</dt>
            <dd className="text-sm font-medium text-white">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>

    {/* Course Mappings */}
    {partnerConfig.gameMappings && partnerConfig.gameMappings.length > 0 && (
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <h3 className="text-lg font-medium text-white mb-4">코스 매핑</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/15">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">외부 코스명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">내부 Game ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/15">
              {partnerConfig.gameMappings.map((cm: GameMapping) => (
                <tr key={cm.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-white">{cm.externalCourseName}</td>
                  <td className="px-4 py-3 text-sm text-white/60 font-mono">#{cm.internalGameId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${
                      cm.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {cm.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

// ── Sync Logs Tab ──

const SyncLogsTab: React.FC<{ logs: SyncLog[]; isLoading: boolean }> = ({ logs, isLoading }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white/10 rounded-lg border border-white/15 p-8 text-center">
        <RefreshCw className="w-6 h-6 text-white/30 mx-auto animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white/10 rounded-lg border border-white/15 p-8 text-center">
        <Clock className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/50">동기화 이력이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log, idx) => {
        const style = SYNC_RESULT_STYLES[log.status] || SYNC_RESULT_STYLES.FAILED;
        const isExpanded = expandedId === log.id;
        const prevLog = logs[idx + 1];
        const gap = prevLog
          ? (new Date(log.createdAt).getTime() - new Date(prevLog.createdAt).getTime()) / 60000
          : 0;

        return (
          <React.Fragment key={log.id}>
            <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {style.icon}
                  <span className="text-sm font-medium text-white">
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <span className="text-xs text-white/40">
                    {log.direction === 'INBOUND' ? '← 수신' : '→ 발신'}
                  </span>
                  <div className="flex items-center space-x-3 text-xs text-white/50">
                    <span className="text-green-400">+{log.createdCount}</span>
                    <span className="text-blue-400">~{log.updatedCount}</span>
                    {log.errorCount > 0 && <span className="text-red-400">!{log.errorCount}</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-white/40">
                    {log.durationMs != null && (
                      log.durationMs >= 1000 ? `${(log.durationMs / 1000).toFixed(1)}s` : `${log.durationMs}ms`
                    )}
                  </span>
                  <span className="text-xs text-white/50">
                    {new Date(log.createdAt).toLocaleString('ko-KR')}
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
                  <div className="grid grid-cols-4 gap-4">
                    <StatBox label="총 처리" value={log.recordCount} />
                    <StatBox label="신규" value={log.createdCount} color="green" />
                    <StatBox label="갱신" value={log.updatedCount} color="blue" />
                    <StatBox label="오류" value={log.errorCount} color="red" />
                  </div>
                  {log.errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-xs text-red-400 font-mono">{log.errorMessage}</p>
                    </div>
                  )}
                  {log.payload && (
                    <details className="text-xs">
                      <summary className="text-white/40 cursor-pointer hover:text-white/60">Payload</summary>
                      <pre className="mt-1 p-2 bg-black/20 rounded text-white/50 overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Gap indicator */}
            {gap > 15 && (
              <div className="flex items-center justify-center py-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  gap > 30 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/30'
                }`}>
                  {Math.floor(gap)}분 간격
                </span>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => {
  const colorClass = color === 'green' ? 'text-green-400'
    : color === 'blue' ? 'text-blue-400'
    : color === 'red' ? 'text-red-400'
    : 'text-white';

  return (
    <div className="bg-white/5 rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
};

// ── Booking Mappings Tab ──

const BookingMappingsTab: React.FC<{
  mappings: BookingMapping[];
  isLoading: boolean;
}> = ({ mappings, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white/10 rounded-lg border border-white/15 p-8 text-center">
        <RefreshCw className="w-6 h-6 text-white/30 mx-auto animate-spin" />
      </div>
    );
  }

  if (mappings.length === 0) {
    return (
      <div className="bg-white/10 rounded-lg border border-white/15 p-8 text-center">
        <CheckCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/50">예약 매핑 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/15">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">방향</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">내부 예약</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">외부 예약</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">날짜 / 시간</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">예약자</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">동기화 상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">예약 상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {mappings.map((mapping) => {
              const statusStyle = BOOKING_STATUS_STYLES[mapping.syncStatus] || BOOKING_STATUS_STYLES.FAILED;
              return (
                <tr key={mapping.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    {mapping.syncDirection === 'INBOUND' ? (
                      <span className="inline-flex items-center text-xs text-blue-400">
                        <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> 수신
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-orange-400">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> 발신
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-white font-mono">#{mapping.internalBookingId}</td>
                  <td className="px-4 py-3 text-sm text-white/60 font-mono">{mapping.externalBookingId}</td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {new Date(mapping.date).toLocaleDateString('ko-KR')} {mapping.startTime}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {mapping.playerName || '-'} ({mapping.playerCount}명)
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusStyle.color}`}>
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">{mapping.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
