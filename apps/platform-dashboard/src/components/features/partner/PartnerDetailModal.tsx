import React, { useState } from 'react';
import { RefreshCw, Play, Settings2, Clock, Database, ArrowLeftRight, FileText } from 'lucide-react';
import { Modal } from '@/components/ui';
import {
  useCourseMappingsQuery,
  useSlotMappingsQuery,
  useBookingMappingsQuery,
  useSyncLogsQuery,
  useTestConnectionMutation,
  useManualSyncMutation,
} from '@/hooks/queries/partner';
import type { PartnerConfig, SyncMode } from '@/types/partner';

type DetailTab = 'info' | 'courseMappings' | 'slotMappings' | 'bookingMappings' | 'syncLogs';

const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  API_POLLING: '폴링',
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
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

  if (!partner) return null;

  const tabs = [
    { id: 'info' as const, label: '기본 정보', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'courseMappings' as const, label: '코스 매핑', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'slotMappings' as const, label: '슬롯 매핑', icon: <Clock className="w-4 h-4" /> },
    { id: 'bookingMappings' as const, label: '예약 매핑', icon: <Database className="w-4 h-4" /> },
    { id: 'syncLogs' as const, label: '동기화 이력', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={partner.systemName} maxWidth="2xl">
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-white/15 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-white/60 hover:bg-white/10'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'info' && <InfoTab partner={partner} onEdit={onEdit} />}
        {activeTab === 'courseMappings' && <CourseMappingsTab partnerId={partner.id} />}
        {activeTab === 'slotMappings' && <SlotMappingsTab partnerId={partner.id} />}
        {activeTab === 'bookingMappings' && <BookingMappingsTab clubId={partner.clubId} />}
        {activeTab === 'syncLogs' && <SyncLogsTab partnerId={partner.id} />}
      </div>
    </Modal>
  );
};

// ── Info Tab ──

const InfoTab: React.FC<{ partner: PartnerConfig; onEdit: (p: PartnerConfig) => void }> = ({ partner, onEdit }) => {
  const testConnection = useTestConnectionMutation();
  const manualSync = useManualSyncMutation();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    const result = await testConnection.mutateAsync(partner.id);
    setTestResult(result);
  };

  const handleSync = () => {
    manualSync.mutate(partner.clubId);
  };

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: '시스템명', value: partner.systemName },
    { label: '외부 골프장 ID', value: partner.externalClubId },
    { label: '회사 ID', value: `#${partner.companyId}` },
    { label: '골프장 ID', value: `#${partner.clubId}` },
    { label: 'Spec URL', value: <span className="text-blue-400 break-all text-xs">{partner.specUrl}</span> },
    { label: '동기화 모드', value: <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{SYNC_MODE_LABELS[partner.syncMode]}</span> },
    { label: '동기화 간격', value: `${partner.syncIntervalMin}분` },
    { label: '동기화 범위', value: `${partner.syncRangeDays}일` },
    { label: '슬롯 동기화', value: partner.slotSyncEnabled ? '활성' : '비활성' },
    { label: '예약 동기화', value: partner.bookingSyncEnabled ? '활성' : '비활성' },
    {
      label: '마지막 슬롯 동기화',
      value: partner.lastSlotSyncAt ? (
        <span>
          {new Date(partner.lastSlotSyncAt).toLocaleString('ko-KR')}
          {partner.lastSlotSyncStatus && (
            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
              partner.lastSlotSyncStatus === 'SUCCESS' ? 'bg-green-500/20 text-green-400' :
              partner.lastSlotSyncStatus === 'FAILED' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {partner.lastSlotSyncStatus}
            </span>
          )}
        </span>
      ) : '없음',
    },
    {
      label: '마지막 예약 동기화',
      value: partner.lastBookingSyncAt ? new Date(partner.lastBookingSyncAt).toLocaleString('ko-KR') : '없음',
    },
    { label: '생성일', value: new Date(partner.createdAt).toLocaleString('ko-KR') },
    { label: '수정일', value: new Date(partner.updatedAt).toLocaleString('ko-KR') },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[140px_1fr] gap-y-3 gap-x-4">
        {infoRows.map((row) => (
          <React.Fragment key={row.label}>
            <div className="text-sm text-white/50">{row.label}</div>
            <div className="text-sm text-white">{row.value}</div>
          </React.Fragment>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-white/15">
        <button
          onClick={handleTest}
          disabled={testConnection.isPending}
          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 text-sm transition-colors"
        >
          <Play className="w-4 h-4 mr-1.5" />
          {testConnection.isPending ? '테스트 중...' : '연결 테스트'}
        </button>
        <button
          onClick={handleSync}
          disabled={manualSync.isPending}
          className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${manualSync.isPending ? 'animate-spin' : ''}`} />
          {manualSync.isPending ? '동기화 중...' : '수동 동기화'}
        </button>
        <button
          onClick={() => onEdit(partner)}
          className="inline-flex items-center px-3 py-2 border border-white/15 text-white rounded-lg hover:bg-white/5 text-sm transition-colors"
        >
          <Settings2 className="w-4 h-4 mr-1.5" />
          설정 수정
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {testResult.success ? '연결 성공' : '연결 실패'}: {testResult.message}
        </div>
      )}
    </div>
  );
};

// ── Course Mappings Tab ──

const CourseMappingsTab: React.FC<{ partnerId: number }> = ({ partnerId }) => {
  const { data: mappings, isLoading } = useCourseMappingsQuery(partnerId);

  if (isLoading) return <div className="text-white/50 text-sm">로딩 중...</div>;
  if (!mappings?.length) return <div className="text-white/50 text-sm">등록된 코스 매핑이 없습니다.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/15">
        <thead className="bg-white/5">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-white/50">외부 코스명</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-white/50">외부 코스 ID</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-white/50">내부 Game ID</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-white/50">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/15">
          {mappings.map((m) => (
            <tr key={m.id} className="hover:bg-white/5">
              <td className="px-4 py-3 text-sm text-white">{m.externalCourseName}</td>
              <td className="px-4 py-3 text-sm text-white/70">{m.externalCourseId}</td>
              <td className="px-4 py-3 text-sm text-white/70">#{m.internalGameId}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded text-xs ${m.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {m.isActive ? '활성' : '비활성'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Slot Mappings Tab ──

const SlotMappingsTab: React.FC<{ partnerId: number }> = ({ partnerId }) => {
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const params = dateFilter ? { date: dateFilter } : {};
  const { data: slots, isLoading } = useSlotMappingsQuery(partnerId, params);

  const statusColors: Record<string, string> = {
    MAPPED: 'bg-green-500/20 text-green-400',
    UNMAPPED: 'bg-yellow-500/20 text-yellow-400',
    CHANGED: 'bg-blue-500/20 text-blue-400',
    DELETED: 'bg-red-500/20 text-red-400',
  };

  const extStatusColors: Record<string, string> = {
    AVAILABLE: 'text-green-400',
    FULLY_BOOKED: 'text-orange-400',
    CLOSED: 'text-red-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-white/50">날짜</label>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-1.5 bg-white/5 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => setDateFilter('')}
          className="text-xs text-white/50 hover:text-white/80"
        >
          전체 보기
        </button>
        <span className="text-xs text-white/40 ml-auto">{slots?.length ?? 0}건</span>
      </div>

      {isLoading ? (
        <div className="text-white/50 text-sm">로딩 중...</div>
      ) : !slots?.length ? (
        <div className="text-white/50 text-sm">동기화된 슬롯 데이터가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full divide-y divide-white/15">
            <thead className="bg-white/5 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-white/50">날짜</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-white/50">시간</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-white/50">코스</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-white/50">외부 상태</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-white/50">인원</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-white/50">가격</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-white/50">내부 연결</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-white/50">동기화</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/15">
              {slots.map((slot) => (
                <tr key={slot.id} className="hover:bg-white/5">
                  <td className="px-3 py-2 text-xs text-white">{new Date(slot.date).toLocaleDateString('ko-KR')}</td>
                  <td className="px-3 py-2 text-xs text-white">{slot.startTime}~{slot.endTime}</td>
                  <td className="px-3 py-2 text-xs text-white/70">{slot.courseMapping?.externalCourseName ?? '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs ${extStatusColors[slot.externalStatus] ?? 'text-white/50'}`}>
                      {slot.externalStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-white/70">{slot.externalBooked}/{slot.externalMaxPlayers}</td>
                  <td className="px-3 py-2 text-xs text-white/70">
                    {slot.externalPrice != null ? `${Number(slot.externalPrice).toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {slot.internalSlotId ? (
                      <span className="text-green-400">#{slot.internalSlotId}</span>
                    ) : (
                      <span className="text-white/30">미연결</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors[slot.syncStatus] ?? 'bg-gray-500/20 text-gray-400'}`}>
                      {slot.syncStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Booking Mappings Tab ──

const BookingMappingsTab: React.FC<{ clubId: number }> = ({ clubId }) => {
  const { data: bookings, isLoading } = useBookingMappingsQuery(clubId);

  const statusColors: Record<string, string> = {
    SYNCED: 'bg-green-500/20 text-green-400',
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    CONFLICT: 'bg-red-500/20 text-red-400',
    FAILED: 'bg-red-500/20 text-red-400',
    CANCELLED: 'bg-gray-500/20 text-gray-400',
  };

  const directionLabels: Record<string, string> = {
    INBOUND: '수신',
    OUTBOUND: '발신',
  };

  if (isLoading) return <div className="text-white/50 text-sm">로딩 중...</div>;
  if (!bookings?.length) return <div className="text-white/50 text-sm">동기화된 예약 데이터가 없습니다.</div>;

  return (
    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="min-w-full divide-y divide-white/15">
        <thead className="bg-white/5 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">예약자</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">날짜</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">시간</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">인원</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">방향</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">예약 상태</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">동기화 상태</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">외부 ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/15">
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-white/5">
              <td className="px-3 py-2 text-sm text-white">{b.playerName}</td>
              <td className="px-3 py-2 text-xs text-white/70">{new Date(b.date).toLocaleDateString('ko-KR')}</td>
              <td className="px-3 py-2 text-xs text-white/70">{b.startTime}</td>
              <td className="px-3 py-2 text-xs text-white/70">{b.playerCount}명</td>
              <td className="px-3 py-2">
                <span className={`text-xs ${b.syncDirection === 'INBOUND' ? 'text-cyan-400' : 'text-orange-400'}`}>
                  {directionLabels[b.syncDirection] ?? b.syncDirection}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`text-xs ${b.status === 'CONFIRMED' ? 'text-green-400' : b.status === 'CANCELLED' ? 'text-red-400' : 'text-blue-400'}`}>
                  {b.status}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors[b.syncStatus] ?? 'bg-gray-500/20 text-gray-400'}`}>
                  {b.syncStatus}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-white/40">{b.externalBookingId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Sync Logs Tab ──

const SyncLogsTab: React.FC<{ partnerId: number }> = ({ partnerId }) => {
  const { data: logs, isLoading } = useSyncLogsQuery(partnerId);

  const resultColors: Record<string, string> = {
    SUCCESS: 'bg-green-500/20 text-green-400',
    PARTIAL: 'bg-yellow-500/20 text-yellow-400',
    FAILED: 'bg-red-500/20 text-red-400',
  };

  const typeLabels: Record<string, string> = {
    SLOT_SYNC: '슬롯 동기화',
    BOOKING_IMPORT: '예약 동기화',
  };

  if (isLoading) return <div className="text-white/50 text-sm">로딩 중...</div>;
  if (!logs?.length) return <div className="text-white/50 text-sm">동기화 이력이 없습니다.</div>;

  return (
    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="min-w-full divide-y divide-white/15">
        <thead className="bg-white/5 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">유형</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">결과</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">생성</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">수정</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">삭제</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">소요시간</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">시작</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-white/50">에러</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/15">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-white/5">
              <td className="px-3 py-2 text-xs text-white">{typeLabels[log.syncType] ?? log.syncType}</td>
              <td className="px-3 py-2">
                <span className={`px-1.5 py-0.5 rounded text-xs ${resultColors[log.result] ?? 'bg-gray-500/20 text-gray-400'}`}>
                  {log.result}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-white/70">{log.slotsCreated}</td>
              <td className="px-3 py-2 text-xs text-white/70">{log.slotsUpdated}</td>
              <td className="px-3 py-2 text-xs text-white/70">{log.slotsDeleted}</td>
              <td className="px-3 py-2 text-xs text-white/70">{log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}</td>
              <td className="px-3 py-2 text-xs text-white/40">{new Date(log.startedAt).toLocaleString('ko-KR')}</td>
              <td className="px-3 py-2 text-xs text-red-400 max-w-[200px] truncate" title={log.errorMessage ?? ''}>
                {log.errorMessage || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
