import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Lightbulb } from 'lucide-react';
import { useGamesQuery, useClubsQuery } from '@/hooks/queries';
import { DataContainer } from '@/components/common';
import { FilterContainer, FilterSearch, FilterResetButton } from '@/components/common/filters';
import { CanManageCourses } from '@/components/auth';
import { PageLayout } from '@/components/layout';
import { GameFormModal } from '@/components/features/game';
import type { Game, GameFilter } from '@/lib/api/gamesApi';

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '운영중', color: 'bg-green-500/20 text-green-400' },
  INACTIVE: { label: '비활성', color: 'bg-white/10 text-white' },
  MAINTENANCE: { label: '정비중', color: 'bg-yellow-500/20 text-yellow-400' },
};

export const GameListPage: React.FC = () => {
  const navigate = useNavigate();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Queries
  const filters: GameFilter = useMemo(() => ({
    page: 1,
    limit: 50,
  }), []);

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

  // 게임 선택
  const handleGameSelect = (game: Game) => {
    navigate(`/games/${game.id}`);
  };

  // 클럽 이름 조회 (game.clubName 우선, 없으면 clubs 목록에서 조회)
  const getClubName = (game: Game) => {
    if (game.clubName) return game.clubName;
    const club = clubs.find((c) => c.id === game.clubId);
    return club?.name || `Club ${game.clubId}`;
  };

  return (
    <CanManageCourses
      fallback={
        <PageLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">접근 권한이 없습니다</h1>
            <p className="text-white/60">라운드 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
    <PageLayout>
      {/* 헤더 카드 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">라운드 관리</h2>
            <p className="mt-1 text-sm text-white/50">
              18홀 라운드 조합 및 가격 설정
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            라운드 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
                <div className="text-sm text-emerald-400">전체 라운드</div>
              </div>
              <div className="text-3xl">🎮</div>
            </div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-green-600">운영중</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-yellow-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
                <div className="text-sm text-yellow-600">정비중</div>
              </div>
              <div className="text-3xl">🔧</div>
            </div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white/60">{stats.inactive}</div>
                <div className="text-sm text-white/60">비활성</div>
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
              placeholder="라운드 이름으로 검색..."
            />
          </div>
          <div className="flex items-end">
            <FilterResetButton
              hasActiveFilters={!!searchKeyword}
              onClick={() => setSearchKeyword('')}
            />
          </div>
        </div>
      </FilterContainer>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/10 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.message}
        </div>
      )}

      {/* 라운드 목록 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <DataContainer
          isLoading={isLoading}
          isEmpty={filteredGames.length === 0}
          emptyIcon={<Lightbulb className="h-12 w-12 text-white/40" />}
          emptyMessage="라운드가 없습니다"
          emptyDescription={
            searchKeyword
              ? '검색 조건에 맞는 라운드가 없습니다.'
              : '등록된 라운드가 없습니다.'
          }
          emptyAction={
            !searchKeyword ? (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
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
                className="p-4 border border-white/15 rounded-lg hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
              >
                {/* 라운드 아이콘 */}
                <div className="h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-2xl">🎮</span>
                </div>

                {/* 라운드 정보 */}
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                      {game.name}
                    </h3>
                    <p className="text-xs text-white/50 truncate">
                      🏌️ {getClubName(game)}
                    </p>
                  </div>

                  {/* 상세 정보 */}
                  <div className="flex items-center justify-between py-2 border-t border-white/10">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-white/60">
                        👥 최대 {game.maxPlayers ?? '-'}명
                      </span>
                      <span className="text-xs text-white/60">
                        ⏱️ {game.duration ?? '-'}분
                      </span>
                    </div>
                  </div>

                  {/* 가격 */}
                  <div className="flex items-center justify-between py-2 border-t border-white/10">
                    <span className="text-sm font-medium text-emerald-400">
                      ₩{(game.price ?? 0).toLocaleString()}
                    </span>
                    <div className="flex items-center space-x-1">
                      {game.slotMode && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          game.slotMode === 'TEE_TIME'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-purple-500/20 text-purple-700'
                        }`}>
                          {game.slotMode === 'TEE_TIME' ? '티타임' : '세션'}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusLabels[game.status]?.color || 'bg-white/10 text-white'
                      }`}>
                        {statusLabels[game.status]?.label || game.status || '-'}
                      </span>
                    </div>
                  </div>

                  {/* 코스 정보 */}
                  {game.courseIds && game.courseIds.length > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs text-white/50">
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
      <div className="bg-white/5 rounded-lg p-4">
        <p className="text-sm text-white/60 text-center">
          총 {filteredGames.length}개의 라운드가 있습니다.
          {searchKeyword && ` '${searchKeyword}' 검색 결과입니다.`}
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
    </PageLayout>
    </CanManageCourses>
  );
};

export default GameListPage;
