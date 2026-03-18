import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Flag } from 'lucide-react';
import { useClubsQuery, useSearchClubsQuery } from '@/hooks/queries';
import { DataContainer } from '@/components/common';
import {
  FilterContainer,
  FilterSearch,
  FilterResetButton,
} from '@/components/common/filters';
import { CanManageCourses } from '@/components/auth';
import { PageLayout } from '@/components/layout';
import type { Club } from '@/types/club';

export const ClubListPage: React.FC = () => {
  const navigate = useNavigate();

  const [searchKeyword, setSearchKeyword] = useState('');

  // React Query hooks
  const { data: clubsData, isLoading: isLoadingClubs } = useClubsQuery();
  const { data: searchData, isLoading: isSearching } = useSearchClubsQuery(searchKeyword);

  // 검색어가 있으면 검색 결과, 없으면 전체 목록 사용
  const clubs = searchKeyword ? (searchData ?? []) : (clubsData?.data ?? []);
  const isLoading = isLoadingClubs || isSearching;

  // 골프장 선택
  const handleClubSelect = (club: Club) => {
    navigate(`/clubs/${club.id}`);
  };

  // 전체 보기 (검색 초기화)
  const handleReset = () => {
    setSearchKeyword('');
  };

  // Stats
  const stats = useMemo(() => ({
    total: clubs.length,
    active: clubs.filter((c) => c.status === 'ACTIVE').length,
    maintenance: clubs.filter((c) => c.status === 'MAINTENANCE').length,
    inactive: clubs.filter((c) => c.status !== 'ACTIVE' && c.status !== 'MAINTENANCE').length,
  }), [clubs]);

  return (
    <CanManageCourses
      fallback={
        <PageLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">접근 권한이 없습니다</h1>
            <p className="text-white/60">골프장 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
    <PageLayout>
      {/* 헤더 카드 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">골프장 관리</h2>
            <p className="mt-1 text-sm text-white/50">
              9홀 단위 코스 관리 및 18홀 조합 운영
            </p>
          </div>
          <button
            onClick={() => navigate('/clubs/new')}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            골프장 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
                <div className="text-sm text-emerald-400">전체 골프장</div>
              </div>
              <div className="text-3xl">🏌️</div>
            </div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">{stats.active}</div>
                <div className="text-sm text-green-400">운영중</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-yellow-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{stats.maintenance}</div>
                <div className="text-sm text-yellow-400">정비중</div>
              </div>
              <div className="text-3xl">🔧</div>
            </div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-400">{stats.inactive}</div>
                <div className="text-sm text-red-400">휴장</div>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <FilterContainer columns="flex">
        <div className="flex items-end justify-between w-full">
          <div className="flex items-end gap-4">
            <FilterSearch
              label="검색"
              showLabel
              value={searchKeyword}
              onChange={setSearchKeyword}
              placeholder="골프장 이름이나 지역으로 검색..."
            />
          </div>
          <div className="flex items-end">
            <FilterResetButton
              hasActiveFilters={!!searchKeyword}
              onClick={handleReset}
              label="필터 초기화"
            />
          </div>
        </div>
      </FilterContainer>

      {/* 골프장 목록 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <DataContainer
          isLoading={isLoading}
          isEmpty={clubs.length === 0}
          emptyIcon={<Flag className="h-12 w-12 text-white/40" />}
          emptyMessage="골프장이 없습니다"
          emptyDescription={searchKeyword ? '검색 조건에 맞는 골프장이 없습니다.' : '등록된 골프장이 없습니다.'}
          emptyAction={
            !searchKeyword ? (
              <button
                onClick={() => navigate('/clubs/new')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                첫 번째 골프장 추가하기
              </button>
            ) : undefined
          }
          loadingMessage="골프장 목록을 불러오는 중..."
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {clubs.map((club) => (
              <div
                key={club.id}
                onClick={() => handleClubSelect(club)}
                className="p-4 border border-white/15 rounded-lg hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
              >
                {/* 골프장 이미지 영역 (더 작게) */}
                <div className="h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg mb-3 flex items-center justify-center">
                  <Flag className="w-8 h-8 text-green-600" />
                </div>

                {/* 골프장 정보 (간소화) */}
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                      {club.name.replace(' Golf Club', '')}
                    </h3>
                    <p className="text-xs text-white/50 truncate">
                      📍 {club.location}
                    </p>
                  </div>

                  {/* 코스 정보 (간소화) */}
                  <div className="flex items-center justify-between py-2 border-t border-white/10">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-white/60">
                        ⛳ {club.courses?.reduce((sum, course) => sum + (course.holeCount || course.holes?.length || 0), 0) || club.totalHoles || 0}홀
                      </span>
                      <span className="text-xs text-white/60">
                        🎯 {club.courses?.length || club.totalCourses || 0}코스
                      </span>
                    </div>
                  </div>

                  {/* 상태 */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          club.status === 'ACTIVE'
                            ? 'bg-green-500/20 text-green-400'
                            : club.status === 'MAINTENANCE'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {club.status === 'ACTIVE' ? '운영' : club.status === 'MAINTENANCE' ? '정비' : '휴장'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          club.clubType === 'FREE'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {club.clubType === 'FREE' ? '무료' : '유료'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          club.bookingMode === 'PARTNER'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {club.bookingMode === 'PARTNER' ? '파트너' : '플랫폼'}
                        </span>
                      </div>
                      <span className="text-xs text-white/40">
                        {club.operatingHours?.open?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataContainer>
      </div>

      {/* 하단 정보 */}
      <div className="bg-white/5 rounded-lg p-4">
        <p className="text-sm text-white/60 text-center">
          총 {clubs.length}개의 골프장이 등록되어 있습니다.
          {searchKeyword && ` '${searchKeyword}' 검색 결과입니다.`}
        </p>
      </div>
    </PageLayout>
    </CanManageCourses>
  );
};
