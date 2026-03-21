import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Monitor, Link2, ArrowRight, Wifi, WifiOff, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { useCompanyStatsQuery } from '@/hooks/queries/company';
import { useAllClubsQuery, useClubStatsQuery } from '@/hooks/queries/course';
import { usePartnersQuery } from '@/hooks/queries/partner';
import { PageLayout } from '@/components/layout';
import { DataContainer } from '@/components/common';
import type { Club } from '@/types/club';
import type { PartnerConfig } from '@/types/partner';

const BOOKING_MODE_LABELS: Record<string, string> = {
  PLATFORM: '플랫폼',
  PARTNER: '파트너',
};

const BOOKING_MODE_COLORS: Record<string, string> = {
  PLATFORM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PARTNER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export const FranchiseDashboardPage: React.FC = () => {
  const { data: companyStats, isLoading: companiesLoading } = useCompanyStatsQuery();
  const { data: clubStats, isLoading: clubStatsLoading } = useClubStatsQuery();
  const { data: clubsResponse, isLoading: clubsLoading } = useAllClubsQuery({ page: 1, limit: 20 });
  const { data: partnersResponse, isLoading: partnersLoading } = usePartnersQuery();

  const allClubs = clubsResponse?.data || [];
  const partners = partnersResponse?.data || [];

  const isLoading = companiesLoading || clubStatsLoading || clubsLoading || partnersLoading;

  // Stats
  const stats = useMemo(() => {
    const activePartners = partners.filter((p) => p.isActive);

    return {
      totalCompanies: companyStats?.totalCompanies || 0,
      totalClubs: clubStats?.total || 0,
      platformClubs: clubStats?.byBookingMode?.platform || 0,
      partnerClubs: clubStats?.byBookingMode?.partner || 0,
      activePartners: activePartners.length,
      inactivePartners: partners.length - activePartners.length,
    };
  }, [companyStats, clubStats, partners]);

  // Recent clubs (sorted by createdAt desc, top 5)
  const recentClubs = useMemo(() => {
    return [...allClubs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [allClubs]);

  // Partner clubId → PartnerConfig map
  const partnerByClubId = useMemo(() => {
    const map = new Map<number, PartnerConfig>();
    for (const p of partners) map.set(p.clubId, p);
    return map;
  }, [partners]);

  // Onboarding status for PARTNER clubs
  interface OnboardingItem {
    club: Club;
    partner: PartnerConfig | undefined;
    steps: { label: string; done: boolean; link?: string }[];
    completedCount: number;
    totalSteps: number;
  }

  const onboardingItems = useMemo((): OnboardingItem[] => {
    const partnerClubs = allClubs.filter((c) => c.bookingMode === 'PARTNER');
    return partnerClubs
      .map((club) => {
        const partner = partnerByClubId.get(club.id);
        const steps = [
          { label: '골프장 등록 완료', done: true }, // Club exists
          { label: '코스/게임 설정 완료', done: (club.totalCourses ?? 0) > 0, link: '/franchise/clubs' },
          { label: '파트너 연동 설정 완료', done: !!partner, link: '/franchise/clubs' },
          { label: '동기화 활성', done: !!partner?.isActive, link: '/franchise/clubs' },
        ];
        return {
          club,
          partner,
          steps,
          completedCount: steps.filter((s) => s.done).length,
          totalSteps: steps.length,
        };
      })
      .filter((item) => item.completedCount < item.totalSteps);
  }, [allClubs, partnerByClubId]);

  return (
    <PageLayout>
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div>
          <h2 className="text-xl font-semibold text-white">가맹점 현황</h2>
          <p className="mt-1 text-sm text-white/50">
            전체 가맹점 및 골프장 운영 현황을 한눈에 확인합니다
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{stats.totalCompanies}</div>
                <div className="text-sm text-emerald-400">전체 회사</div>
              </div>
              <Building2 className="h-8 w-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-sky-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-sky-400">{stats.totalClubs}</div>
                <div className="text-sm text-sky-400">전체 골프장</div>
              </div>
              <MapPin className="h-8 w-8 text-sky-400/50" />
            </div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">{stats.platformClubs}</div>
                <div className="text-sm text-green-400">플랫폼 사용</div>
              </div>
              <Monitor className="h-8 w-8 text-green-400/50" />
            </div>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">{stats.partnerClubs}</div>
                <div className="text-sm text-blue-400">파트너 연동</div>
              </div>
              <Link2 className="h-8 w-8 text-blue-400/50" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clubs */}
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">최근 등록 골프장</h3>
            <Link
              to="/franchise/clubs"
              className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              전체 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <DataContainer
            isLoading={isLoading}
            isEmpty={recentClubs.length === 0}
            emptyIcon="🏌️"
            emptyMessage="등록된 골프장이 없습니다"
            loadingMessage="골프장 목록을 불러오는 중..."
          >
            <div className="divide-y divide-white/10">
              {recentClubs.map((club) => (
                <ClubRow key={club.id} club={club} />
              ))}
            </div>
          </DataContainer>
        </div>

        {/* Partner Sync Summary */}
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">파트너 동기화 현황</h3>
            <Link
              to="/franchise/clubs"
              className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              전체 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <DataContainer
            isLoading={isLoading}
            isEmpty={partners.length === 0}
            emptyIcon="🔗"
            emptyMessage="등록된 파트너가 없습니다"
            loadingMessage="파트너 목록을 불러오는 중..."
          >
            <div className="p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-500/10 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Wifi className="h-4 w-4 text-green-400" />
                    <span className="text-lg font-bold text-green-400">{stats.activePartners}</span>
                  </div>
                  <div className="text-xs text-green-400/70">연동 중</div>
                </div>
                <div className="bg-red-500/10 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <WifiOff className="h-4 w-4 text-red-400" />
                    <span className="text-lg font-bold text-red-400">{stats.inactivePartners}</span>
                  </div>
                  <div className="text-xs text-red-400/70">비활성</div>
                </div>
              </div>

              {/* Partner List */}
              <div className="space-y-3">
                {partners.slice(0, 5).map((partner) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        {partner.systemName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{partner.systemName}</div>
                        <div className="text-xs text-white/40">{partner.externalClubId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {partner.lastSlotSyncStatus && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            partner.lastSlotSyncStatus === 'SUCCESS'
                              ? 'bg-green-500/20 text-green-400'
                              : partner.lastSlotSyncStatus === 'FAILED'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {partner.lastSlotSyncStatus}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                          partner.isActive
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                      >
                        {partner.isActive ? (
                          <><Wifi className="h-3 w-3" /> 활성</>
                        ) : (
                          <><WifiOff className="h-3 w-3" /> 비활성</>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DataContainer>
        </div>
      </div>

      {/* Onboarding Progress */}
      {onboardingItems.length > 0 && (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-medium text-white">온보딩 진행 중</h3>
              <span className="text-sm text-white/50">({onboardingItems.length}개)</span>
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {onboardingItems.map((item) => (
              <div key={item.club.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                      {item.club.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-white">{item.club.name}</div>
                      <div className="text-xs text-white/40">
                        {item.club.company?.name || `회사 #${item.club.companyId}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-white/50">
                    {item.completedCount}/{item.totalSteps} 완료
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full mb-3">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(item.completedCount / item.totalSteps) * 100}%` }}
                  />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-2 gap-2">
                  {item.steps.map((step) => (
                    <div
                      key={step.label}
                      className="flex items-center gap-2 text-xs"
                    >
                      {step.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                      )}
                      {!step.done && step.link ? (
                        <Link
                          to={step.link}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                          {step.label}
                        </Link>
                      ) : (
                        <span className={step.done ? 'text-white/50' : 'text-white/70'}>
                          {step.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

// ── Sub-component ──

const ClubRow: React.FC<{ club: Club }> = ({ club }) => {
  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">
          {club.name?.charAt(0) || '?'}
        </div>
        <div>
          <div className="font-medium text-white">{club.name}</div>
          <div className="text-sm text-white/40">
            {club.company?.name || `회사 #${club.companyId}`}
            <span className="mx-1.5 text-white/20">|</span>
            {club.totalCourses}코스 {club.totalHoles}홀
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
            BOOKING_MODE_COLORS[club.bookingMode] || 'bg-white/10 text-white/60 border-white/15'
          }`}
        >
          {BOOKING_MODE_LABELS[club.bookingMode] || club.bookingMode}
        </span>
        <span className="text-xs text-white/30">
          {new Date(club.createdAt).toLocaleDateString('ko-KR')}
        </span>
      </div>
    </div>
  );
};
