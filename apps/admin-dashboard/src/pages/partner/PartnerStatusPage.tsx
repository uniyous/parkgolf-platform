import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
} from 'lucide-react';
import {
  useMyPartnerConfigQuery,
  useSyncLogsQuery,
  useBookingMappingsQuery,
  useManualSyncMutation,
  useResolveConflictMutation,
} from '@/hooks/queries/partner';
import { useClubsQuery } from '@/hooks/queries/course';
import type { SyncLog, BookingMapping, BookingSyncStatus } from '@/types/partner';

type TabKey = 'overview' | 'syncLogs' | 'bookingMappings';

const SYNC_RESULT_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  SUCCESS: { color: 'text-green-400', icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
  PARTIAL: { color: 'text-yellow-400', icon: <AlertTriangle className="w-4 h-4 text-yellow-400" /> },
  FAILED: { color: 'text-red-400', icon: <XCircle className="w-4 h-4 text-red-400" /> },
};

const BOOKING_STATUS_STYLES: Record<BookingSyncStatus, { label: string; color: string }> = {
  SYNCED: { label: '동기화 완료', color: 'bg-green-500/20 text-green-400' },
  PENDING: { label: '대기 중', color: 'bg-yellow-500/20 text-yellow-400' },
  CONFLICT: { label: '충돌', color: 'bg-red-500/20 text-red-400' },
  FAILED: { label: '실패', color: 'bg-red-500/20 text-red-400' },
};

export const PartnerStatusPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedClubId, setSelectedClubId] = useState<number | undefined>();

  // Get clubs for selector
  const { data: clubsData } = useClubsQuery();
  const clubs = clubsData?.data || [];

  // Auto-select first club
  const clubId = selectedClubId ?? clubs[0]?.id;

  // Queries (only fetch when clubId is available)
  const { data: partnerConfig, isLoading: configLoading } = useMyPartnerConfigQuery(clubId ?? 0, { enabled: !!clubId });
  const { data: syncLogs, isLoading: logsLoading } = useSyncLogsQuery(clubId ?? 0, { enabled: !!clubId && activeTab !== 'overview' || activeTab === 'syncLogs' });
  const { data: bookingMappings, isLoading: mappingsLoading } = useBookingMappingsQuery(clubId ?? 0, { enabled: !!clubId && activeTab === 'bookingMappings' });

  const manualSync = useManualSyncMutation();
  const resolveConflict = useResolveConflictMutation();

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
            <p className="mt-1 text-sm text-white/50">외부 부킹 시스템 연동 상태를 확인합니다</p>
          </div>
          <div className="flex items-center gap-3">
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
            {partnerConfig && (
              <button
                onClick={() => manualSync.mutate(clubId)}
                disabled={manualSync.isPending}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                {manualSync.isPending ? '동기화 중...' : '수동 동기화'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      {configLoading ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8 text-center">
          <RefreshCw className="w-8 h-8 text-white/30 mx-auto animate-spin" />
          <p className="mt-2 text-white/50">연동 정보를 불러오는 중...</p>
        </div>
      ) : !partnerConfig ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8 text-center">
          <WifiOff className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">연동된 파트너가 없습니다</h3>
          <p className="text-white/50">이 골프장에 연동된 외부 부킹 시스템이 없습니다.</p>
          <p className="text-sm text-white/30 mt-1">플랫폼 관리자에게 파트너 연동을 요청하세요.</p>
        </div>
      ) : (
        <>
          {/* Partner Info Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-white/50 mb-1">파트너</div>
                <div className="font-medium text-white">{partnerConfig.name}</div>
                <div className="text-xs text-white/40">{partnerConfig.partnerCode}</div>
              </div>
              <div>
                <div className="text-sm text-white/50 mb-1">상태</div>
                <div className={`inline-flex items-center px-2.5 py-1 text-sm font-medium rounded-full ${
                  partnerConfig.isActive
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {partnerConfig.isActive ? (
                    <><Wifi className="w-3.5 h-3.5 mr-1" /> 연동 중</>
                  ) : (
                    <><WifiOff className="w-3.5 h-3.5 mr-1" /> 비활성</>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-white/50 mb-1">동기화 모드</div>
                <div className="font-medium text-white">{partnerConfig.syncMode}</div>
                <div className="text-xs text-white/40">{partnerConfig.syncIntervalMinutes}분 간격</div>
              </div>
              <div>
                <div className="text-sm text-white/50 mb-1">마지막 동기화</div>
                <div className="font-medium text-white">
                  {partnerConfig.lastSyncAt
                    ? new Date(partnerConfig.lastSyncAt).toLocaleString('ko-KR')
                    : '-'}
                </div>
              </div>
            </div>
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
          {activeTab === 'overview' && (
            <OverviewTab partnerConfig={partnerConfig} />
          )}
          {activeTab === 'syncLogs' && (
            <SyncLogsTab logs={syncLogs || []} isLoading={logsLoading} />
          )}
          {activeTab === 'bookingMappings' && (
            <BookingMappingsTab
              mappings={bookingMappings || []}
              isLoading={mappingsLoading}
              onResolve={(id, resolution) =>
                resolveConflict.mutate({ bookingMappingId: id, resolution, clubId })
              }
              isResolving={resolveConflict.isPending}
            />
          )}
        </>
      )}
    </div>
  );
};

// ── Overview Tab ──

import type { PartnerConfig } from '@/types/partner';

const OverviewTab: React.FC<{ partnerConfig: PartnerConfig }> = ({ partnerConfig }) => (
  <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
    <h3 className="text-lg font-medium text-white mb-4">연동 상세 정보</h3>
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
      {[
        { label: '파트너 ID', value: partnerConfig.id },
        { label: '파트너명', value: partnerConfig.name },
        { label: '파트너 코드', value: partnerConfig.partnerCode },
        { label: '동기화 모드', value: partnerConfig.syncMode },
        { label: '동기화 간격', value: `${partnerConfig.syncIntervalMinutes}분` },
        { label: '활성 상태', value: partnerConfig.isActive ? '활성' : '비활성' },
        { label: '서킷 브레이커', value: partnerConfig.circuitBreakerStatus || '-' },
        { label: '등록일', value: new Date(partnerConfig.createdAt).toLocaleDateString('ko-KR') },
      ].map((item) => (
        <div key={item.label} className="flex justify-between py-2 border-b border-white/5">
          <dt className="text-sm text-white/50">{item.label}</dt>
          <dd className="text-sm font-medium text-white">{item.value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

// ── Sync Logs Tab ──

const SyncLogsTab: React.FC<{ logs: SyncLog[]; isLoading: boolean }> = ({ logs, isLoading }) => {
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
    <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/15">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">결과</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">유형</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">생성/수정/삭제</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">소요 시간</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">시작 시간</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">오류</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {logs.map((log) => {
              const style = SYNC_RESULT_STYLES[log.result] || SYNC_RESULT_STYLES.FAILED;
              return (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {style.icon}
                      <span className={`text-sm font-medium ${style.color}`}>{log.result}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {log.syncType === 'SLOT' ? '타임슬롯' : '예약'}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    <span className="text-green-400">+{log.slotsCreated}</span>
                    {' / '}
                    <span className="text-blue-400">~{log.slotsUpdated}</span>
                    {' / '}
                    <span className="text-red-400">-{log.slotsDeleted}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {log.durationMs >= 1000 ? `${(log.durationMs / 1000).toFixed(1)}s` : `${log.durationMs}ms`}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {new Date(log.startedAt).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-400 max-w-xs truncate">
                    {log.errorMessage || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Booking Mappings Tab ──

interface BookingMappingsTabProps {
  mappings: BookingMapping[];
  isLoading: boolean;
  onResolve: (id: number, resolution: Record<string, unknown>) => void;
  isResolving: boolean;
}

const BookingMappingsTab: React.FC<BookingMappingsTabProps> = ({ mappings, isLoading, onResolve, isResolving }) => {
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
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">내부 예약</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">외부 예약</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">생성일</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {mappings.map((mapping) => {
              const statusStyle = BOOKING_STATUS_STYLES[mapping.syncStatus];
              return (
                <tr key={mapping.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-mono">#{mapping.internalBookingId}</td>
                  <td className="px-4 py-3 text-sm text-white/60 font-mono">{mapping.externalBookingId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusStyle.color}`}>
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {new Date(mapping.createdAt).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {mapping.syncStatus === 'CONFLICT' && (
                      <button
                        onClick={() => onResolve(mapping.id, { action: 'USE_INTERNAL' })}
                        disabled={isResolving}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        충돌 해결
                      </button>
                    )}
                    {mapping.resolvedAt && (
                      <span className="text-xs text-white/40">
                        해결됨: {new Date(mapping.resolvedAt).toLocaleString('ko-KR')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
