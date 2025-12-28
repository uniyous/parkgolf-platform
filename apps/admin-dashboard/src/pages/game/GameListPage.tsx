import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGames, useClubs } from '@/hooks/queries';
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

  const { data: gamesData, isLoading, error, refetch } = useGames(filters);
  const { data: clubsData } = useClubs();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🎮 라운드 관리</h1>
            <p className="text-gray-600 mt-1">18홀 라운드 조합 및 가격 설정</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>새 라운드 추가</span>
          </button>
        </div>

        {/* 필터 바 */}
        <div className="flex items-center space-x-4">
          {/* 클럽 필터 */}
          <div className="w-64">
            <select
              value={selectedClubId || ''}
              onChange={(e) => handleClubFilterChange(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 골프장</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>

          {/* 검색 바 */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="라운드 이름으로 검색하세요..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {(searchKeyword || selectedClubId) && (
            <button
              onClick={() => {
                setSearchKeyword('');
                handleClubFilterChange(null);
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error.message}
        </div>
      )}

      {/* 라운드 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">라운드가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchKeyword || selectedClubId
                ? '검색 조건에 맞는 라운드가 없습니다.'
                : '등록된 라운드가 없습니다.'}
            </p>
            {!searchKeyword && !selectedClubId && (
              <div className="mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  첫 번째 라운드 추가하기
                </button>
              </div>
            )}
          </div>
        ) : (
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
        )}
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
  );
};

export default GameListPage;
