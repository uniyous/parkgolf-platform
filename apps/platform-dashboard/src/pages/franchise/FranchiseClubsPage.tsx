import React, { useState, useMemo } from 'react';
import {
  MapPin, Layers, Wifi, WifiOff, AlertTriangle, Plus, Pencil, Trash2,
  Play, RefreshCw, CheckCircle2, XCircle, Clock, Timer,
  TrendingUp,
} from 'lucide-react';
import { useAllClubsQuery, useClubDetailQuery } from '@/hooks/queries/course';
import {
  usePartnersQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useDeletePartnerMutation,
  useGameMappingsQuery,
  useCreateGameMappingMutation,
  useDeleteGameMappingMutation,
  useTestConnectionMutation,
  useManualSyncMutation,
  useSyncLogsQuery,
} from '@/hooks/queries/partner';
import { useCompaniesQuery } from '@/hooks/queries/company';
import { PageLayout } from '@/components/layout';
import { DataContainer } from '@/components/common';
import { Modal } from '@/components/ui';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterResetButton,
  ActiveFilterTags,
} from '@/components/common/filters';
import type { Club, BookingMode, ClubStatus } from '@/types/club';
import type {
  PartnerConfig,
  SyncMode,
  SyncLog,
  CreatePartnerConfigDto,
  UpdatePartnerConfigDto,
  CreateGameMappingDto,
  GameMapping,
} from '@/types/partner';
import type { Company } from '@/types/company';

type BookingModeFilter = BookingMode | 'ALL';

interface FilterState {
  search: string;
  bookingMode: BookingModeFilter;
}

const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  PLATFORM: '플랫폼',
  PARTNER: '파트너',
};

const BOOKING_MODE_COLORS: Record<BookingMode, string> = {
  PLATFORM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PARTNER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const STATUS_LABELS: Record<ClubStatus, string> = {
  ACTIVE: '운영 중',
  INACTIVE: '비활성',
  MAINTENANCE: '점검',
  SEASONAL_CLOSED: '시즌 종료',
};

const STATUS_COLORS: Record<ClubStatus, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  INACTIVE: 'bg-red-500/20 text-red-400',
  MAINTENANCE: 'bg-yellow-500/20 text-yellow-400',
  SEASONAL_CLOSED: 'bg-gray-500/20 text-gray-400',
};

const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  API_POLLING: 'API 폴링',
  WEBHOOK: '웹훅',
  HYBRID: '하이브리드',
  MANUAL: '수동',
};

export const FranchiseClubsPage: React.FC = () => {
  const { data: clubs, isLoading } = useAllClubsQuery();
  const { data: partnersResponse } = usePartnersQuery();
  const allClubs = clubs || [];
  const partners = partnersResponse?.data || [];

  // clubId → PartnerConfig 매핑
  const partnerByClubId = useMemo(() => {
    const map = new Map<number, PartnerConfig>();
    for (const p of partners) {
      map.set(p.clubId, p);
    }
    return map;
  }, [partners]);

  // Local UI State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    bookingMode: 'ALL',
  });
  const [selectedClubId, setSelectedClubId] = useState<number | undefined>();

  // Filtered Data
  const filteredClubs = useMemo(() => {
    let result = [...allClubs];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchLower) ||
          c.address?.toLowerCase().includes(searchLower) ||
          c.location?.toLowerCase().includes(searchLower),
      );
    }

    if (filters.bookingMode !== 'ALL') {
      result = result.filter((c) => c.bookingMode === filters.bookingMode);
    }

    return result;
  }, [allClubs, filters]);

  // Stats
  const stats = useMemo(
    () => ({
      total: allClubs.length,
      platform: allClubs.filter((c) => c.bookingMode === 'PLATFORM').length,
      partner: allClubs.filter((c) => c.bookingMode === 'PARTNER').length,
    }),
    [allClubs],
  );

  const TAB_OPTIONS: { value: BookingModeFilter; label: string; count: number }[] = [
    { value: 'ALL', label: '전체', count: stats.total },
    { value: 'PLATFORM', label: '플랫폼', count: stats.platform },
    { value: 'PARTNER', label: '파트너', count: stats.partner },
  ];

  return (
    <PageLayout>
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div>
          <h2 className="text-xl font-semibold text-white">골프장 현황</h2>
          <p className="mt-1 text-sm text-white/50">
            전체 골프장 목록을 조회하고 상태를 확인합니다
          </p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
                <div className="text-sm text-emerald-400">전체 골프장</div>
              </div>
              <MapPin className="h-8 w-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{stats.platform}</div>
            <div className="text-sm text-green-400">플랫폼</div>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{stats.partner}</div>
            <div className="text-sm text-blue-400">파트너</div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <FilterContainer columns="flex">
        <FilterSelect
          label="운영 방식"
          showLabel
          value={filters.bookingMode}
          onChange={(value) => setFilters((f) => ({ ...f, bookingMode: value as BookingModeFilter }))}
          options={TAB_OPTIONS.map((t) => ({ value: t.value, label: `${t.label} (${t.count})` }))}
        />
        <FilterSearch
          label="검색"
          showLabel
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="골프장명, 주소..."
        />
        <div className="ml-auto flex items-end">
          <FilterResetButton
            hasActiveFilters={!!(filters.search || filters.bookingMode !== 'ALL')}
            onClick={() => setFilters({ search: '', bookingMode: 'ALL' })}
          />
        </div>
      </FilterContainer>

      {/* Active Filter Tags */}
      <ActiveFilterTags
        filters={[
          ...(filters.search
            ? [{ id: 'search', label: '검색', value: filters.search }]
            : []),
          ...(filters.bookingMode !== 'ALL'
            ? [
                {
                  id: 'bookingMode',
                  label: '모드',
                  value: BOOKING_MODE_LABELS[filters.bookingMode],
                  color: filters.bookingMode === 'PLATFORM' ? ('green' as const) : ('blue' as const),
                },
              ]
            : []),
        ]}
        onRemove={(id) => {
          if (id === 'search') setFilters((f) => ({ ...f, search: '' }));
          if (id === 'bookingMode') setFilters((f) => ({ ...f, bookingMode: 'ALL' }));
        }}
        onResetAll={() => setFilters({ search: '', bookingMode: 'ALL' })}
      />

      {/* Club Cards */}
      <DataContainer
        isLoading={isLoading}
        isEmpty={filteredClubs.length === 0}
        emptyIcon="🏌️"
        emptyMessage={allClubs.length === 0 ? '등록된 골프장이 없습니다' : '검색 결과가 없습니다'}
        emptyDescription={
          allClubs.length === 0
            ? '가맹점에서 골프장을 등록하면 여기에 표시됩니다'
            : '다른 검색어나 필터를 시도해 보세요'
        }
        loadingMessage="골프장 목록을 불러오는 중..."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              partner={partnerByClubId.get(club.id)}
              onClick={() => setSelectedClubId(club.id)}
            />
          ))}
        </div>
      </DataContainer>

      {/* Detail Modal */}
      <ClubDetailModal
        clubId={selectedClubId}
        partner={selectedClubId ? partnerByClubId.get(selectedClubId) : undefined}
        onClose={() => setSelectedClubId(undefined)}
      />
    </PageLayout>
  );
};

// ── Club Card ──

const ClubCard: React.FC<{
  club: Club;
  partner?: PartnerConfig;
  onClick: () => void;
}> = ({ club, partner, onClick }) => {
  const isPartnerMode = club.bookingMode === 'PARTNER';

  const getPartnerSyncStatus = () => {
    if (!partner) return null;
    if (!partner.isActive) return { label: '비활성', color: 'text-gray-400', icon: WifiOff };
    if (partner.lastSlotSyncStatus === 'FAILED') return { label: '동기화 오류', color: 'text-red-400', icon: AlertTriangle };
    return { label: '정상', color: 'text-green-400', icon: Wifi };
  };

  const syncStatus = isPartnerMode ? getPartnerSyncStatus() : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-5 hover:bg-white/15 transition-colors"
    >
      {/* Top: Name + Badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            {club.name?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-white truncate">{club.name}</div>
            <div className="text-xs text-white/40 truncate">
              {club.company?.name || `회사 #${club.companyId}`}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-white/50">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{club.address || club.location || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Layers className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{club.totalCourses}코스 / {club.totalHoles}홀</span>
        </div>
      </div>

      {/* Partner Sync Status (PARTNER mode only) */}
      {isPartnerMode && (
        <div className="mb-3">
          {partner && syncStatus ? (
            <div className={`flex items-center gap-1.5 text-xs ${syncStatus.color}`}>
              <syncStatus.icon className="h-3.5 w-3.5" />
              <span>{partner.systemName} - {syncStatus.label}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>연동 미설정</span>
            </div>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
            BOOKING_MODE_COLORS[club.bookingMode] || 'bg-white/10 text-white/60 border-white/15'
          }`}
        >
          {BOOKING_MODE_LABELS[club.bookingMode] || club.bookingMode}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
            STATUS_COLORS[club.status] || 'bg-white/10 text-white/60'
          }`}
        >
          {STATUS_LABELS[club.status] || club.status}
        </span>
      </div>
    </button>
  );
};

// ── Club Detail Modal ──

type ClubDetailTab = 'info' | 'config' | 'status';

const ClubDetailModal: React.FC<{
  clubId?: number;
  partner?: PartnerConfig;
  onClose: () => void;
}> = ({ clubId, partner, onClose }) => {
  const { data: club, isLoading } = useClubDetailQuery(clubId);
  const [activeTab, setActiveTab] = useState<ClubDetailTab>('info');

  const isPartnerMode = club?.bookingMode === 'PARTNER';

  const tabs: { id: ClubDetailTab; label: string }[] = [
    { id: 'info', label: '기본 정보' },
    ...(isPartnerMode ? [
      { id: 'config' as const, label: '연동 설정' },
      { id: 'status' as const, label: '연동 현황' },
    ] : []),
  ];

  // Reset tab when modal closes or club changes
  const handleClose = () => {
    setActiveTab('info');
    onClose();
  };

  return (
    <Modal
      isOpen={!!clubId}
      onClose={handleClose}
      title="골프장 상세"
      maxWidth={isPartnerMode ? '2xl' : 'lg'}
    >
      <DataContainer
        isLoading={isLoading}
        isEmpty={!club}
        emptyMessage="골프장 정보를 찾을 수 없습니다"
        loadingMessage="골프장 정보를 불러오는 중..."
      >
        {club && (
          <div className="space-y-5">
            {/* Tab Navigation (PARTNER mode only) */}
            {isPartnerMode && (
              <div className="flex gap-1 border-b border-white/10 pb-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'text-white/50 hover:bg-white/8 hover:text-white/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'info' && <ClubInfoTab club={club} />}
            {activeTab === 'config' && isPartnerMode && (
              <PartnerConfigTab club={club} partner={partner} />
            )}
            {activeTab === 'status' && isPartnerMode && partner && (
              <PartnerStatusTab partner={partner} />
            )}
            {activeTab === 'status' && isPartnerMode && !partner && (
              <div className="text-center py-12">
                <AlertTriangle className="w-10 h-10 text-yellow-400/50 mx-auto mb-3" />
                <div className="text-white/50 text-sm">파트너 연동 설정이 필요합니다</div>
                <div className="text-white/30 text-xs mt-1">
                  "연동 설정" 탭에서 파트너를 등록해 주세요
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-white/15">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors text-white/70"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </DataContainer>
    </Modal>
  );
};

// ── Club Info Tab ──

const ClubInfoTab: React.FC<{ club: Club }> = ({ club }) => (
  <div className="space-y-6">
    {/* Basic Info */}
    <div>
      <h4 className="text-sm font-medium text-white/50 mb-3">기본 정보</h4>
      <div className="grid grid-cols-2 gap-4">
        <InfoItem label="골프장명" value={club.name} />
        <InfoItem label="소속 회사" value={club.company?.name || `회사 #${club.companyId}`} />
        <InfoItem label="주소" value={club.address || club.location || '-'} />
        <InfoItem label="연락처" value={club.phone || '-'} />
        <InfoItem label="코스 수" value={`${club.totalCourses}개`} />
        <InfoItem label="홀 수" value={`${club.totalHoles}개`} />
        <InfoItem label="클럽 유형" value={club.clubType === 'PAID' ? '유료' : '무료'} />
        <InfoItem
          label="운영 방식"
          value={BOOKING_MODE_LABELS[club.bookingMode] || club.bookingMode}
          badge
          badgeColor={BOOKING_MODE_COLORS[club.bookingMode]}
        />
        <InfoItem
          label="상태"
          value={STATUS_LABELS[club.status] || club.status}
          badge
          badgeColor={STATUS_COLORS[club.status]}
        />
        <InfoItem
          label="등록일"
          value={new Date(club.createdAt).toLocaleDateString('ko-KR')}
        />
      </div>
    </div>

    {/* Operating Hours */}
    {club.operatingHours && (
      <div>
        <h4 className="text-sm font-medium text-white/50 mb-3">운영 시간</h4>
        <div className="bg-white/5 rounded-lg p-3">
          <span className="text-sm text-white">
            {club.operatingHours.open} ~ {club.operatingHours.close}
          </span>
        </div>
      </div>
    )}

    {/* Courses */}
    {club.courses && club.courses.length > 0 && (
      <div>
        <h4 className="text-sm font-medium text-white/50 mb-3">
          코스 목록 ({club.courses.length}개)
        </h4>
        <div className="space-y-2">
          {club.courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div>
                <div className="text-sm font-medium text-white">{course.name}</div>
                <div className="text-xs text-white/40">
                  {course.holes?.length || 0}홀
                  {course.description && ` | ${course.description}`}
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                  course.status === 'ACTIVE'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {course.status === 'ACTIVE' ? '운영 중' : course.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Facilities */}
    {club.facilities && club.facilities.length > 0 && (
      <div>
        <h4 className="text-sm font-medium text-white/50 mb-3">시설</h4>
        <div className="flex flex-wrap gap-2">
          {club.facilities.map((facility) => (
            <span
              key={facility}
              className="inline-flex items-center px-2.5 py-1 text-xs bg-white/10 text-white/70 rounded-full"
            >
              {facility}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ── Partner Config Tab (연동 설정) ──

const PartnerConfigTab: React.FC<{
  club: Club;
  partner?: PartnerConfig;
}> = ({ club, partner }) => {
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { data: companiesResponse } = useCompaniesQuery();
  const companies = companiesResponse?.data || [];
  const deletePartner = useDeletePartnerMutation();

  const handleDelete = async () => {
    if (!partner) return;
    await deletePartner.mutateAsync(partner.id);
    setDeleteConfirm(false);
  };

  // No partner yet — show create form
  if (!partner || showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white/50">
            {partner ? '파트너 설정 수정' : '파트너 연동 등록'}
          </h4>
          {showForm && partner && (
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              취소
            </button>
          )}
        </div>
        <PartnerFormContent
          partner={showForm ? partner : undefined}
          club={club}
          companies={companies}
          onClose={() => setShowForm(false)}
        />
      </div>
    );
  }

  // Partner exists — show config info + game mappings
  return (
    <div className="space-y-5">
      {/* Partner Config Info */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white/50">연동 설정 정보</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditMode(true); setShowForm(true); }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              수정
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <ConfigInfoRow label="시스템명" value={partner.systemName} />
            <ConfigInfoRow label="외부 골프장 ID" value={partner.externalClubId} />
            <ConfigInfoRow label="Spec URL" value={
              <span className="text-blue-400 text-xs break-all">{partner.specUrl}</span>
            } />
            <ConfigInfoRow label="동기화 모드" value={SYNC_MODE_LABELS[partner.syncMode]} />
            <ConfigInfoRow label="동기화 간격" value={`${partner.syncIntervalMin}분`} />
            <ConfigInfoRow label="동기화 범위" value={`오늘 ~ +${partner.syncRangeDays}일`} />
            <ConfigInfoRow label="상태" value={
              <span className={`px-1.5 py-0.5 rounded text-xs ${partner.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {partner.isActive ? '활성' : '비활성'}
              </span>
            } />
            <ConfigInfoRow label="슬롯 동기화" value={partner.slotSyncEnabled ? '사용' : '미사용'} />
            <ConfigInfoRow label="예약 동기화" value={partner.bookingSyncEnabled ? '사용' : '미사용'} />
          </div>
        </div>
      </div>

      {/* Game Mappings */}
      <GameMappingsSection partnerId={partner.id} club={club} />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">파트너 삭제 확인</span>
          </div>
          <p className="text-xs text-white/60 mb-3">
            이 파트너 설정을 삭제하면 연동된 코스 매핑, 동기화 이력이 모두 삭제됩니다.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deletePartner.isPending}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deletePartner.isPending ? '삭제 중...' : '삭제'}
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-3 py-1.5 border border-white/15 text-white/70 text-xs rounded-lg hover:bg-white/5 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Partner Form Content ──

const PartnerFormContent: React.FC<{
  partner?: PartnerConfig;
  club: Club;
  companies: Company[];
  onClose: () => void;
}> = ({ partner, club, companies, onClose }) => {
  const createMutation = useCreatePartnerMutation();
  const updateMutation = useUpdatePartnerMutation();
  const isEdit = !!partner;

  const [form, setForm] = useState({
    systemName: partner?.systemName || '',
    externalClubId: partner?.externalClubId || '',
    specUrl: partner?.specUrl || '',
    apiKey: '',
    apiSecret: '',
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
      const company = companies.find((c) => c.id === club.companyId);
      const data: CreatePartnerConfigDto = {
        systemName: form.systemName,
        externalClubId: form.externalClubId,
        specUrl: form.specUrl,
        apiKey: form.apiKey,
        apiSecret: form.apiSecret || undefined,
        companyId: club.companyId,
        clubId: club.id,
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
      {/* Club info (read-only) */}
      {!isEdit && (
        <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60">
          <span className="text-white/40">골프장: </span>
          <span className="text-white">{club.name}</span>
          <span className="mx-2 text-white/20">|</span>
          <span className="text-white/40">회사: </span>
          <span className="text-white">{club.company?.name || `회사 #${club.companyId}`}</span>
        </div>
      )}

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
          id="partnerIsActive"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
        />
        <label htmlFor="partnerIsActive" className="text-sm text-white/70">활성화</label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/15">
        {partner && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
          >
            취소
          </button>
        )}
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

// ── Game Mappings Section ──

const GameMappingsSection: React.FC<{ partnerId: number; club: Club }> = ({ partnerId, club }) => {
  const { data: gameMappings, isLoading } = useGameMappingsQuery(partnerId);
  const createMapping = useCreateGameMappingMutation();
  const deleteMapping = useDeleteGameMappingMutation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMapping, setNewMapping] = useState<{
    internalCourseId: string;
    internalGameId: string;
    externalCourseId: string;
    externalCourseName: string;
  }>({
    internalCourseId: '',
    internalGameId: '',
    externalCourseId: '',
    externalCourseName: '',
  });

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateGameMappingDto = {
      partnerId,
      internalCourseId: parseInt(newMapping.internalCourseId),
      internalGameId: parseInt(newMapping.internalGameId),
      externalCourseId: newMapping.externalCourseId,
      externalCourseName: newMapping.externalCourseName,
    };
    await createMapping.mutateAsync(data);
    setNewMapping({ internalCourseId: '', internalGameId: '', externalCourseId: '', externalCourseName: '' });
    setShowAddForm(false);
  };

  const handleDeleteMapping = async (mapping: GameMapping) => {
    await deleteMapping.mutateAsync({ id: mapping.id, partnerId });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white/50">
          코스 매핑 ({gameMappings?.length ?? 0}개)
        </h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          매핑 추가
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddMapping} className="bg-white/5 rounded-lg p-3 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">내부 코스</label>
              <select
                value={newMapping.internalCourseId}
                onChange={(e) => setNewMapping((f) => ({ ...f, internalCourseId: e.target.value }))}
                required
                className="w-full px-2 py-1.5 bg-white/5 border border-white/15 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">코스 선택</option>
                {club.courses?.map((c) => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">내부 게임 ID</label>
              <input
                type="number"
                value={newMapping.internalGameId}
                onChange={(e) => setNewMapping((f) => ({ ...f, internalGameId: e.target.value }))}
                required
                className="w-full px-2 py-1.5 bg-white/5 border border-white/15 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="게임 ID"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">외부 코스 ID</label>
              <input
                type="text"
                value={newMapping.externalCourseId}
                onChange={(e) => setNewMapping((f) => ({ ...f, externalCourseId: e.target.value }))}
                required
                className="w-full px-2 py-1.5 bg-white/5 border border-white/15 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="EXT_COURSE_01"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">외부 코스명</label>
              <input
                type="text"
                value={newMapping.externalCourseName}
                onChange={(e) => setNewMapping((f) => ({ ...f, externalCourseName: e.target.value }))}
                required
                className="w-full px-2 py-1.5 bg-white/5 border border-white/15 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="외부 코스 이름"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={createMapping.isPending}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {createMapping.isPending ? '추가 중...' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-white/15 text-white/70 text-xs rounded-lg hover:bg-white/5 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* Mappings List */}
      {isLoading ? (
        <div className="text-xs text-white/40 py-4 text-center">로딩 중...</div>
      ) : !gameMappings?.length ? (
        <div className="text-xs text-white/40 py-4 text-center bg-white/5 rounded-lg">
          등록된 코스 매핑이 없습니다
        </div>
      ) : (
        <div className="space-y-1">
          {gameMappings.map((mapping) => (
            <div
              key={mapping.id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white">{mapping.externalCourseName}</span>
                  <span className="text-white/20">-&gt;</span>
                  <span className="text-white/60">코스 #{mapping.internalCourseId}</span>
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  외부: {mapping.externalCourseId} | 게임: #{mapping.internalGameId}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 text-xs rounded ${mapping.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {mapping.isActive ? '활성' : '비활성'}
                </span>
                <button
                  onClick={() => handleDeleteMapping(mapping)}
                  disabled={deleteMapping.isPending}
                  className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Partner Status Tab (연동 현황) ──

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
  return diff > intervalMin * 60000 * 2;
}

const PartnerStatusTab: React.FC<{ partner: PartnerConfig }> = ({ partner }) => {
  const testConnection = useTestConnectionMutation();
  const manualSync = useManualSyncMutation();
  const { data: logs } = useSyncLogsQuery(partner.id);
  const { data: gameMappings } = useGameMappingsQuery(partner.id);
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
      {/* Health Cards */}
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
          value={`${gameMappings?.length ?? 0}개`}
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

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTest}
          disabled={testConnection.isPending}
          className="inline-flex items-center px-3.5 py-2 bg-blue-600/90 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 text-sm transition-all shadow-sm"
        >
          <Play className="w-4 h-4 mr-1.5" />
          {testConnection.isPending ? '테스트 중...' : '연결 테스트'}
        </button>
        <button
          onClick={() => manualSync.mutate(partner.id)}
          disabled={manualSync.isPending}
          className="inline-flex items-center px-3.5 py-2 bg-indigo-600/90 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 text-sm transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${manualSync.isPending ? 'animate-spin' : ''}`} />
          {manualSync.isPending ? '동기화 중...' : '수동 동기화'}
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {testResult.message}
        </div>
      )}

      {/* Recent Sync Logs (5건) */}
      <div>
        <h4 className="text-sm font-medium text-white/50 mb-3">최근 동기화 로그</h4>
        {!logs?.length ? (
          <div className="text-xs text-white/40 py-4 text-center bg-white/5 rounded-lg">
            동기화 실행 이력이 없습니다
          </div>
        ) : (
          <div className="space-y-1">
            {logs.slice(0, 5).map((log) => {
              const isSuccess = log.status === 'SUCCESS';
              const isFailed = log.status === 'FAILED';
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-lg"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    isSuccess ? 'bg-green-400' : isFailed ? 'bg-red-400' : 'bg-yellow-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white font-medium">
                        {log.action === 'SLOT_SYNC' ? '슬롯 동기화' : '예약 수신'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
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
                        {log.errorCount > 0 && <span className="text-red-400/80">err {log.errorCount}</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Shared Sub-components ──

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
}> = ({ title, lastSyncAt, status, error, isOverdue: overdueFlag, log, enabled }) => {
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
    <div className={`bg-white/5 rounded-lg p-4 border ${overdueFlag ? 'border-yellow-500/40' : 'border-white/10'}`}>
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
      {overdueFlag && (
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

const ConfigInfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-xs text-white/40 w-24 shrink-0">{label}</span>
    <span className="text-xs text-white/80">{value}</span>
  </div>
);

const InfoItem: React.FC<{
  label: string;
  value: string;
  badge?: boolean;
  badgeColor?: string;
}> = ({ label, value, badge, badgeColor }) => {
  return (
    <div>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      {badge ? (
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${badgeColor || 'bg-white/10 text-white/60'}`}
        >
          {value}
        </span>
      ) : (
        <div className="text-sm text-white">{value}</div>
      )}
    </div>
  );
};
