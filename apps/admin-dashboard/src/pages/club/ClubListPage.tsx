import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClub } from '@/hooks';
import { DataContainer } from '@/components/common';
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
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏌️ 골프장 관리</h1>
            <p className="text-gray-600 mt-1">9홀 단위 코스 관리 및 18홀 조합 운영</p>
          </div>
          <button
            onClick={() => navigate('/clubs/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>새 골프장 추가</span>
          </button>
        </div>

        {/* 검색 바 */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="골프장 이름이나 지역으로 검색하세요..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading.search}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading.search && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
            )}
            <span>{loading.search ? '검색 중...' : '검색'}</span>
          </button>
          {searchKeyword && (
            <button
              onClick={() => {
                setSearchKeyword('');
                loadClubs();
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              전체 보기
            </button>
          )}
        </div>
      </div>

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
          emptyIcon={
            <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
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
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
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