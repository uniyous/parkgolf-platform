import React, { useState, useMemo } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, AlertTriangle, Wifi, WifiOff, Play, Settings2, Eye } from 'lucide-react';
import {
  usePartnersQuery,
  useCreatePartnerMutation,
  useDeletePartnerMutation,
  useTestConnectionMutation,
  useUpdatePartnerMutation,
} from '@/hooks/queries/partner';
import type { CreatePartnerConfigDto, UpdatePartnerConfigDto } from '@/types/partner';
import { Modal } from '@/components/ui';
import { DataContainer } from '@/components/common';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterResetButton,
  ActiveFilterTags,
} from '@/components/common/filters';
import { PageLayout } from '@/components/layout';
import { showSuccessToast } from '@/lib/errors';
import { PartnerDetailModal } from '@/components/features/partner/PartnerDetailModal';
import type { PartnerConfig, SyncMode } from '@/types/partner';

type SortField = 'systemName' | 'syncMode' | 'isActive' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  syncMode: SyncMode | 'ALL';
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  API_POLLING: '폴링',
  WEBHOOK: '웹훅',
  HYBRID: '하이브리드',
  MANUAL: '수동',
};

const SYNC_MODE_COLORS: Record<SyncMode, string> = {
  API_POLLING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  WEBHOOK: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  HYBRID: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  MANUAL: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const PartnersPage: React.FC = () => {
  // Queries & Mutations
  const { data: partnersResponse, refetch, isLoading } = usePartnersQuery();
  const deletePartner = useDeletePartnerMutation();
  const testConnection = useTestConnectionMutation();
  const updatePartner = useUpdatePartnerMutation();

  const partners = partnersResponse?.data || [];

  // Local UI State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    syncMode: 'ALL',
    status: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('systemName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal State
  const [formModal, setFormModal] = useState<{ open: boolean; partner?: PartnerConfig }>({ open: false });
  const [detailModal, setDetailModal] = useState<{ open: boolean; partner?: PartnerConfig }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; partner?: PartnerConfig }>({ open: false });
  const [testResult, setTestResult] = useState<{ open: boolean; success?: boolean; message?: string; latencyMs?: number }>({ open: false });

  // Filtered & Sorted Data
  const filteredPartners = useMemo(() => {
    let result = [...partners];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((p) =>
        p.systemName?.toLowerCase().includes(searchLower) ||
        p.externalClubId?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.syncMode !== 'ALL') {
      result = result.filter((p) => p.syncMode === filters.syncMode);
    }

    if (filters.status !== 'ALL') {
      result = result.filter((p) => (filters.status === 'ACTIVE' ? p.isActive : !p.isActive));
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [partners, filters, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => ({
    total: partners.length,
    active: partners.filter((p) => p.isActive).length,
    inactive: partners.filter((p) => !p.isActive).length,
    polling: partners.filter((p) => p.syncMode === 'API_POLLING').length,
  }), [partners]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.partner) return;
    await deletePartner.mutateAsync(deleteConfirm.partner.id);
    setDeleteConfirm({ open: false });
  };

  const handleTestConnection = async (partner: PartnerConfig) => {
    const result = await testConnection.mutateAsync(partner.id);
    setTestResult({ open: true, ...result });
  };

  const handleToggleActive = async (partner: PartnerConfig) => {
    await updatePartner.mutateAsync({
      id: partner.id,
      data: { isActive: !partner.isActive },
    });
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">파트너 연동 관리</h2>
            <p className="mt-1 text-sm text-white/50">
              외부 부킹 API 연동 파트너를 관리하고 동기화 설정을 구성합니다
            </p>
          </div>
          <button
            onClick={() => setFormModal({ open: true })}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            파트너 추가
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
            <div className="text-sm text-emerald-400">전체 파트너</div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            <div className="text-sm text-green-400">연동 중</div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{stats.inactive}</div>
            <div className="text-sm text-red-400">비활성</div>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{stats.polling}</div>
            <div className="text-sm text-blue-400">폴링 모드</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterContainer columns={4}>
        <FilterSearch
          label="검색"
          showLabel
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="시스템명, 외부 골프장 ID..."
        />
        <FilterSelect
          label="동기화 모드"
          value={filters.syncMode === 'ALL' ? '' : filters.syncMode}
          onChange={(value) => setFilters((f) => ({ ...f, syncMode: (value || 'ALL') as SyncMode | 'ALL' }))}
          options={[
            { value: 'API_POLLING', label: '폴링' },
            { value: 'WEBHOOK', label: '웹훅' },
            { value: 'HYBRID', label: '하이브리드' },
            { value: 'MANUAL', label: '수동' },
          ]}
          placeholder="전체 모드"
        />
        <FilterSelect
          label="상태"
          value={filters.status === 'ALL' ? '' : filters.status}
          onChange={(value) => setFilters((f) => ({ ...f, status: (value || 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE' }))}
          options={[
            { value: 'ACTIVE', label: '활성' },
            { value: 'INACTIVE', label: '비활성' },
          ]}
          placeholder="전체 상태"
        />
        <div className="flex items-end gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <FilterResetButton
            hasActiveFilters={!!(filters.search || filters.syncMode !== 'ALL' || filters.status !== 'ALL')}
            onClick={() => setFilters({ search: '', syncMode: 'ALL', status: 'ALL' })}
            variant="text"
          />
        </div>
      </FilterContainer>

      {/* Active Filter Tags */}
      <ActiveFilterTags
        filters={[
          ...(filters.search ? [{ id: 'search', label: '검색', value: filters.search }] : []),
          ...(filters.syncMode !== 'ALL' ? [{ id: 'syncMode', label: '모드', value: SYNC_MODE_LABELS[filters.syncMode], color: 'blue' as const }] : []),
          ...(filters.status !== 'ALL' ? [{ id: 'status', label: '상태', value: filters.status === 'ACTIVE' ? '활성' : '비활성', color: 'violet' as const }] : []),
        ]}
        onRemove={(id) => {
          if (id === 'search') setFilters((f) => ({ ...f, search: '' }));
          if (id === 'syncMode') setFilters((f) => ({ ...f, syncMode: 'ALL' }));
          if (id === 'status') setFilters((f) => ({ ...f, status: 'ALL' }));
        }}
        onResetAll={() => setFilters({ search: '', syncMode: 'ALL', status: 'ALL' })}
      />

      {/* Partner Table */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="text-lg font-medium text-white">
            파트너 목록
            <span className="ml-2 text-sm font-normal text-white/50">
              ({filteredPartners.length}개)
            </span>
          </h3>
        </div>
        <DataContainer
          isLoading={isLoading}
          isEmpty={filteredPartners.length === 0}
          emptyIcon="🔗"
          emptyMessage={partners.length === 0 ? '등록된 파트너가 없습니다' : '검색 결과가 없습니다'}
          emptyDescription={partners.length === 0 ? '새 파트너 연동을 추가해 보세요' : '다른 검색어나 필터를 시도해 보세요'}
          loadingMessage="파트너 목록을 불러오는 중..."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/15">
              <thead className="bg-white/5">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('systemName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>파트너 정보</span>
                      {sortField === 'systemName' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">회사/골프장</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('syncMode')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>동기화</span>
                      {sortField === 'syncMode' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">마지막 동기화</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {filteredPartners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setDetailModal({ open: true, partner })}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {partner.systemName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-white">{partner.systemName}</div>
                          <div className="text-sm text-white/50">{partner.externalClubId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-white">회사 #{partner.companyId}</div>
                      <div className="text-sm text-white/50">골프장 #{partner.clubId}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${SYNC_MODE_COLORS[partner.syncMode]}`}>
                        {SYNC_MODE_LABELS[partner.syncMode]}
                      </span>
                      <div className="text-xs text-white/40 mt-1">{partner.syncIntervalMin}분 간격</div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(partner); }}
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border cursor-pointer transition-colors ${
                          partner.isActive
                            ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                        }`}
                      >
                        {partner.isActive ? (
                          <><Wifi className="w-3 h-3 mr-1" /> 활성</>
                        ) : (
                          <><WifiOff className="w-3 h-3 mr-1" /> 비활성</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-white/60">
                        {partner.lastSlotSyncAt
                          ? new Date(partner.lastSlotSyncAt).toLocaleString('ko-KR')
                          : '동기화 없음'}
                      </div>
                      {partner.lastSlotSyncStatus && (
                        <div className={`text-xs mt-0.5 ${partner.lastSlotSyncStatus === 'SUCCESS' ? 'text-green-400' : partner.lastSlotSyncStatus === 'FAILED' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {partner.lastSlotSyncStatus}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailModal({ open: true, partner })}
                          className="inline-flex items-center px-2.5 py-1.5 text-sm text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                          title="상세 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTestConnection(partner)}
                          disabled={testConnection.isPending}
                          className="inline-flex items-center px-2.5 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="연결 테스트"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFormModal({ open: true, partner })}
                          className="inline-flex items-center px-2.5 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="설정"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, partner })}
                          className="inline-flex items-center px-2.5 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataContainer>
      </div>

      {/* Partner Form Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false })}
        title={formModal.partner ? '파트너 설정 수정' : '파트너 추가'}
        maxWidth="lg"
      >
        <PartnerFormContent
          partner={formModal.partner}
          onClose={() => setFormModal({ open: false })}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteConfirm.open && !!deleteConfirm.partner}
        onClose={() => setDeleteConfirm({ open: false })}
        title="파트너 삭제"
        maxWidth="sm"
      >
        {deleteConfirm.partner && (
          <>
            <div className="flex items-center space-x-4 p-4 bg-red-500/10 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="font-medium text-white">{deleteConfirm.partner.systemName}</div>
                <div className="text-sm text-white/50">{deleteConfirm.partner.externalClubId}</div>
              </div>
            </div>
            <p className="text-white/60 mb-2">이 파트너 설정을 삭제하시겠습니까?</p>
            <p className="text-sm text-red-400 mb-6">
              연동된 코스 매핑, 동기화 이력이 모두 삭제됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false })}
                className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deletePartner.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletePartner.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Partner Detail Modal */}
      <PartnerDetailModal
        partner={detailModal.partner ?? null}
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false })}
        onEdit={(partner) => {
          setDetailModal({ open: false });
          setFormModal({ open: true, partner });
        }}
      />

      {/* Test Result Modal */}
      <Modal
        isOpen={testResult.open}
        onClose={() => setTestResult({ open: false })}
        title="연결 테스트 결과"
        maxWidth="sm"
      >
        <div className={`p-4 rounded-lg mb-4 ${testResult.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-center space-x-3">
            {testResult.success ? (
              <Wifi className="w-6 h-6 text-green-400" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-400" />
            )}
            <div>
              <div className={`font-medium ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.success ? '연결 성공' : '연결 실패'}
              </div>
              <div className="text-sm text-white/60">{testResult.message}</div>
              {testResult.latencyMs !== undefined && (
                <div className="text-xs text-white/40 mt-1">응답 시간: {testResult.latencyMs}ms</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setTestResult({ open: false })}
            className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
          >
            닫기
          </button>
        </div>
      </Modal>
    </PageLayout>
  );
};

// ── Inline Form Component ──

interface PartnerFormContentProps {
  partner?: PartnerConfig;
  onClose: () => void;
}

const PartnerFormContent: React.FC<PartnerFormContentProps> = ({ partner, onClose }) => {
  const createMutation = useCreatePartnerMutation();
  const updateMutation = useUpdatePartnerMutation();
  const isEdit = !!partner;

  const [form, setForm] = useState({
    systemName: partner?.systemName || '',
    externalClubId: partner?.externalClubId || '',
    specUrl: partner?.specUrl || '',
    apiKey: '',
    apiSecret: '',
    companyId: partner?.companyId?.toString() || '',
    clubId: partner?.clubId?.toString() || '',
    syncMode: partner?.syncMode || 'API_POLLING' as SyncMode,
    syncIntervalMin: partner?.syncIntervalMin?.toString() || '10',
    isActive: partner?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit) {
      const data: UpdatePartnerConfigDto = {
        id: partner!.id,
        systemName: form.systemName || undefined,
        specUrl: form.specUrl || undefined,
        syncMode: form.syncMode,
        syncIntervalMin: parseInt(form.syncIntervalMin) || undefined,
        isActive: form.isActive,
      };
      if (form.apiKey) data.apiKey = form.apiKey;
      if (form.apiSecret) data.apiSecret = form.apiSecret;

      await updateMutation.mutateAsync({ id: partner!.id, data });
    } else {
      const data: CreatePartnerConfigDto = {
        systemName: form.systemName,
        externalClubId: form.externalClubId,
        specUrl: form.specUrl,
        apiKey: form.apiKey,
        apiSecret: form.apiSecret || undefined,
        companyId: parseInt(form.companyId),
        clubId: parseInt(form.clubId),
        syncMode: form.syncMode,
        syncIntervalMin: parseInt(form.syncIntervalMin) || 10,
        responseMapping: {},
      };

      await createMutation.mutateAsync(data);
    }

    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">시스템명 *</label>
          <input
            type="text"
            value={form.systemName}
            onChange={(e) => setForm((f) => ({ ...f, systemName: e.target.value }))}
            required
            className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="외부 부킹 시스템 이름"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">외부 골프장 ID *</label>
          <input
            type="text"
            value={form.externalClubId}
            onChange={(e) => setForm((f) => ({ ...f, externalClubId: e.target.value }))}
            required
            disabled={isEdit}
            className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            placeholder="EXT_CLUB_001"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">OpenAPI Spec URL *</label>
        <input
          type="url"
          value={form.specUrl}
          onChange={(e) => setForm((f) => ({ ...f, specUrl: e.target.value }))}
          required
          className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="https://partner-api.example.com/openapi.json"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            API Key {isEdit ? '(변경시에만 입력)' : '*'}
          </label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
            required={!isEdit}
            className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">API Secret (선택)</label>
          <input
            type="password"
            value={form.apiSecret}
            onChange={(e) => setForm((f) => ({ ...f, apiSecret: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="••••••••"
          />
        </div>
      </div>

      {!isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">회사 ID *</label>
            <input
              type="number"
              value={form.companyId}
              onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">골프장(Club) ID *</label>
            <input
              type="number"
              value={form.clubId}
              onChange={(e) => setForm((f) => ({ ...f, clubId: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">동기화 모드</label>
          <select
            value={form.syncMode}
            onChange={(e) => setForm((f) => ({ ...f, syncMode: e.target.value as SyncMode }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="API_POLLING">폴링</option>
            <option value="WEBHOOK">웹훅</option>
            <option value="HYBRID">하이브리드</option>
            <option value="MANUAL">수동</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">동기화 간격 (분)</label>
          <input
            type="number"
            value={form.syncIntervalMin}
            onChange={(e) => setForm((f) => ({ ...f, syncIntervalMin: e.target.value }))}
            min={1}
            max={1440}
            className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
        />
        <label htmlFor="isActive" className="text-sm text-white/70">활성화</label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/15">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
        </button>
      </div>
    </form>
  );
};
