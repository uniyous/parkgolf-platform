import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Lightbulb } from 'lucide-react';
import { useGamesQuery, useClubsQuery } from '@/hooks/queries';
import { DataContainer } from '@/components/common';
import { FilterContainer, FilterSelect, FilterSearch, FilterResetButton } from '@/components/common/filters';
import { CanManageCourses } from '@/components/auth';
import { PageLayout } from '@/components/layout';
import { GameFormModal } from '@/components/features/game';
import type { Game, GameFilter } from '@/lib/api/gamesApi';

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '운영중', color: 'bg-green-100 text-green-800' },
  INACTIVE: { label: '비활성', color: 'bg-gray-100 text-gray-800' },
  MAINTENANCE: { label: '정비중', color: 'bg-yellow-100 text-yellow-800' },
};

export const GameListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<number | null>(
    searchParams.get('clubId') ? Number(searchParams.get('clubId')) : null
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Queries
  const filters: GameFilter = useMemo(() => ({
    clubId: selectedClubId || undefined,
    page: 1,
    limit: 50,
  }), [selectedClubId]);

  const { data: gamesData, error, isLoading } = useGamesQuery(filters);
  const { data: clubsData } = useClubsQuery();

  const games = gamesData?.data || [];
  const clubs = clubsData?.data || [];

  // 검색 필터링 (클라이언트 사이드)
  const filteredGames = useMemo(() => {
    if (!searchKeyword.trim()) return games;
    const keyword = searchKeyword.toLowerCase();
    return games.filter(
      (game) =>
        game.name.toLowerCase().includes(keyword) ||
        game.description?.toLowerCase().includes(keyword)
    );
  }, [games, searchKeyword]);

  // Stats
  const stats = useMemo(() => ({
    total: games.length,
    active: games.filter((g) => g.status === 'ACTIVE').length,
    maintenance: games.filter((g) => g.status === 'MAINTENANCE').length,
    inactive: games.filter((g) => g.status === 'INACTIVE').length,
  }), [games]);

  // 클럽 필터 변경
  const handleClubFilterChange = (clubId: number | null) => {
    setSelectedClubId(clubId);
    if (clubId) {
      setSearchParams({ clubId: String(clubId) });
    } else {
      setSearchParams({});
    }
  };

  // 게임 선택
  const handleGameSelect = (game: Game) => {
    navigate(`/games/${game.id}`);
  };

  // 클럽 이름 조회
  const getClubName = (clubId: number) => {
    const club = clubs.find((c) => c.id === clubId);
    return club?.name || `Club ${clubId}`;
  };

  return (
    <CanManageCourses
      fallback={
        <PageLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-600">라운드 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
    <div className="space-y-6">
      {/* 헤더 카드 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">라운드 관리</h2>
            <p className="mt-1 text-sm text-gray-500">
              18홀 라운드 조합 및 가격 설정
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            라운드 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-600">전체 라운드</div>
              </div>
              <div className="text-3xl">🎮</div>
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
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
                <div className="text-sm text-gray-600">비활성</div>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <FilterContainer columns={4}>
        <FilterSelect
          label="골프장"
          value={selectedClubId}
          onChange={(value) => handleClubFilterChange(value ? Number(value) : null)}
          options={clubs.map((club) => ({ value: club.id, label: club.name }))}
          placeholder="전체"
        />
        <FilterSearch
          label="검색"
          showLabel
          value={searchKeyword}
          onChange={setSearchKeyword}
          placeholder="라운드 이름으로 검색..."
        />
        <div className="flex items-end">
          <FilterResetButton
            hasActiveFilters={!!(searchKeyword || selectedClubId)}
            onClick={() => {
              setSearchKeyword('');
              handleClubFilterChange(null);
            }}
            label="필터 초기화"
            className="w-full"
          />
        </div>
      </FilterContainer>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.message}
        </div>
      )}

      {/* 라운드 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <DataContainer
          isLoading={isLoading}
          isEmpty={filteredGames.length === 0}
          emptyIcon={<Lightbulb className="h-12 w-12 text-gray-400" />}
          emptyMessage="라운드가 없습니다"
          emptyDescription={
            searchKeyword || selectedClubId
              ? '검색 조건에 맞는 라운드가 없습니다.'
              : '등록된 라운드가 없습니다.'
          }
          emptyAction={
            !searchKeyword && !selectedClubId ? (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                첫 번째 라운드 추가하기
              </button>
            ) : undefined
          }
          loadingMessage="라운드 목록을 불러오는 중..."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                onClick={() => handleGameSelect(game)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
              >
                {/* 라운드 아이콘 */}
                <div className="h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-2xl">🎮</span>
                </div>

                {/* 라운드 정보 */}
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {game.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      🏌️ {getClubName(game.clubId)}
                    </p>
                  </div>

                  {/* 상세 정보 */}
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-600">
                        👥 최대 {game.maxPlayers ?? '-'}명
                      </span>
                      <span className="text-xs text-gray-600">
                        ⏱️ {game.duration ?? '-'}분
                      </span>
                    </div>
                  </div>

                  {/* 가격 */}
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-blue-600">
                      ₩{(game.price ?? 0).toLocaleString()}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusLabels[game.status]?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {statusLabels[game.status]?.label || game.status || '-'}
                    </span>
                  </div>

                  {/* 코스 정보 */}
                  {game.courseIds && game.courseIds.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        코스 조합: {game.courseIds.length}개 코스
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DataContainer>
      </div>

      {/* 하단 정보 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          총 {filteredGames.length}개의 라운드가 있습니다.
          {searchKeyword && ` '${searchKeyword}' 검색 결과입니다.`}
          {selectedClubId && ` (${getClubName(selectedClubId)} 필터 적용)`}
        </p>
      </div>

      {/* 새 라운드 추가 모달 */}
      <GameFormModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(game) => {
          navigate(`/games/${game.id}`);
        }}
      />
    </div>
    </CanManageCourses>
  );
};

export default GameListPage;
