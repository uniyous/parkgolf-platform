import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Layers, Wifi, WifiOff, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAllClubsQuery, useClubDetailQuery } from '@/hooks/queries/course';
import { usePartnersQuery } from '@/hooks/queries/partner';
import { PageLayout } from '@/components/layout';
import { DataContainer } from '@/components/common';
import { Modal } from '@/components/ui';
import {
  FilterContainer,
  FilterSearch,
  FilterResetButton,
  ActiveFilterTags,
} from '@/components/common/filters';
import type { Club, BookingMode, ClubStatus } from '@/types/club';
import type { PartnerConfig } from '@/types/partner';

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

export const FranchiseClubsPage: React.FC = () => {
  const navigate = useNavigate();
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilters((f) => ({ ...f, bookingMode: tab.value }))}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.bookingMode === tab.value
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {tab.value === 'PLATFORM' && <span className="w-2 h-2 rounded-full bg-green-400" />}
            {tab.value === 'PARTNER' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
            {tab.label}
            <span className="text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <FilterContainer columns={2}>
        <FilterSearch
          label="검색"
          showLabel
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="골프장명, 주소..."
        />
        <div className="flex items-end justify-end">
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
              onPartnerClick={() => navigate('/franchise/partners')}
            />
          ))}
        </div>
      </DataContainer>

      {/* Detail Modal */}
      <ClubDetailModal
        clubId={selectedClubId}
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
  onPartnerClick: () => void;
}> = ({ club, partner, onClick, onPartnerClick }) => {
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>연동 미설정</span>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onPartnerClick(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onPartnerClick(); } }}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                파트너 연동 설정
              </span>
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
        {isPartnerMode && partner && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onPartnerClick(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onPartnerClick(); } }}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            파트너 연동 설정
          </span>
        )}
      </div>
    </button>
  );
};

// ── Club Detail Modal ──

const ClubDetailModal: React.FC<{
  clubId?: number;
  onClose: () => void;
}> = ({ clubId, onClose }) => {
  const { data: club, isLoading } = useClubDetailQuery(clubId);

  return (
    <Modal
      isOpen={!!clubId}
      onClose={onClose}
      title="골프장 상세"
      maxWidth="lg"
    >
      <DataContainer
        isLoading={isLoading}
        isEmpty={!club}
        emptyMessage="골프장 정보를 찾을 수 없습니다"
        loadingMessage="골프장 정보를 불러오는 중..."
      >
        {club && (
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
                  label="예약 모드"
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

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-white/15">
              <button
                onClick={onClose}
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

// ── Info Item ──

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
