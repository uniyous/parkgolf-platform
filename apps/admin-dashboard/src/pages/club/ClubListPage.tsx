import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Flag } from 'lucide-react';
import { useClub } from '@/hooks';
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
  
  // Redux hooks
  const {
    clubs,
    loading,
    errors,
    pagination,
    loadClubs,
    searchForClubs,
  } = useClub();

  // 초기 로드
  useEffect(() => {
    loadClubs();
  }, []);

  // 검색 처리
  const handleSearch = async () => {
    if (searchKeyword.trim()) {
      try {
        await searchForClubs(searchKeyword.trim());
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      // 빈 검색어면 전체 목록 로드
      loadClubs();
    }
  };

  // 키보드 엔터 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 골프장 선택
  const handleClubSelect = (club: Club) => {
    navigate(`/clubs/${club.id}`);
  };

  // 에러 처리
  useEffect(() => {
    if (errors.list) {
      console.error('Club list error:', errors.list);
    }
  }, [errors.list]);

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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-600">골프장 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
    <div className="space-y-6">
      {/* 헤더 카드 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">골프장 관리</h2>
            <p className="mt-1 text-sm text-gray-500">
              9홀 단위 코스 관리 및 18홀 조합 운영
            </p>
          </div>
          <button
            onClick={() => navigate('/clubs/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            골프장 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-600">전체 골프장</div>
              </div>
              <div className="text-3xl">🏌️</div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-green-600">운영중</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
                <div className="text-sm text-yellow-600">정비중</div>
              </div>
              <div className="text-3xl">🔧</div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                <div className="text-sm text-red-600">휴장</div>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <FilterContainer columns={4}>
        <FilterSearch
          label="검색"
          showLabel
          value={searchKeyword}
          onChange={setSearchKeyword}
          placeholder="골프장 이름이나 지역으로 검색..."
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
        />
        <div className="flex items-end gap-2">
          <button
            onClick={handleSearch}
            disabled={loading.search}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading.search ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {loading.search ? '검색 중...' : '검색'}
          </button>
          <FilterResetButton
            hasActiveFilters={!!searchKeyword}
            onClick={() => {
              setSearchKeyword('');
              loadClubs();
            }}
            label="전체 보기"
          />
        </div>
      </FilterContainer>

      {/* 에러 메시지 */}
      {(errors.list || errors.search) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {errors.search || errors.list}
        </div>
      )}

      {/* 골프장 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <DataContainer
          isLoading={loading.list}
          isEmpty={clubs.length === 0}
          emptyIcon={<Flag className="h-12 w-12 text-gray-400" />}
          emptyMessage="골프장이 없습니다"
          emptyDescription={searchKeyword ? '검색 조건에 맞는 골프장이 없습니다.' : '등록된 골프장이 없습니다.'}
          emptyAction={
            !searchKeyword ? (
              <button
                onClick={() => navigate('/clubs/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
              >
                {/* 골프장 이미지 영역 (더 작게) */}
                <div className="h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg mb-3 flex items-center justify-center">
                  <Flag className="w-8 h-8 text-green-600" />
                </div>

                {/* 골프장 정보 (간소화) */}
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {club.name.replace(' Golf Club', '')}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      📍 {club.location}
                    </p>
                  </div>

                  {/* 코스 정보 (간소화) */}
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-600">
                        ⛳ {club.courses?.reduce((sum, course) => sum + (course.holeCount || course.holes?.length || 0), 0) || club.totalHoles || 0}홀
                      </span>
                      <span className="text-xs text-gray-600">
                        🎯 {club.courses?.length || club.totalCourses || 0}코스
                      </span>
                    </div>
                  </div>

                  {/* 상태 */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        club.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : club.status === 'MAINTENANCE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {club.status === 'ACTIVE' ? '운영' : club.status === 'MAINTENANCE' ? '정비' : '휴장'}
                      </span>
                      <span className="text-xs text-gray-400">
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
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          총 {pagination.totalCount}개의 골프장이 등록되어 있습니다.
          {searchKeyword && ` '${searchKeyword}' 검색 결과입니다.`}
          {pagination.totalPages > 1 && (
            <span className="ml-2">
              (페이지 {pagination.currentPage}/{pagination.totalPages})
            </span>
          )}
        </p>
      </div>
    </div>
    </CanManageCourses>
  );
};