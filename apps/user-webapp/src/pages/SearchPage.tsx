import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronUp, ChevronDown } from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { useSearchGamesQuery } from '../hooks/queries';
import { useGameSearchParams } from '../hooks/useSearchParams';
import type { Game, GameTimeSlot, GameSearchParams } from '@/lib/api/gameApi';
import { Button, Input, Select, Pagination, GameCard, GameCardSkeleton } from '../components';
import { useDebounce } from '@/hooks/useDebounce';
import { SORT_OPTIONS, PLAYER_OPTIONS, DATE_FILTER_MAX_MONTHS, TIME_OF_DAY_OPTIONS } from '@/lib/constants';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { filters, updateFilters, resetFilters } = useGameSearchParams();

  // Local state for text input (debounced before sending to URL)
  const [searchInput, setSearchInput] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce the search input
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update URL params when debounced search changes
  React.useEffect(() => {
    if (debouncedSearch !== filters.search) {
      updateFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, updateFilters]);

  // Prepare search params for API
  const searchParams: GameSearchParams = useMemo(() => ({
    search: filters.search || undefined,
    date: filters.date || undefined,  // 해당 날짜에 예약 가능한 타임슬롯이 있는 게임만 필터링
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    minPlayers: filters.minPlayers ?? undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    limit: 20,
  }), [filters.search, filters.date, filters.minPrice, filters.maxPrice, filters.minPlayers, filters.sortBy, filters.sortOrder, filters.page]);

  // Query hooks
  const { data: searchResult, isLoading: isLoadingGames, error: gamesError } = useSearchGamesQuery(searchParams);

  // 백엔드 응답 구조: { success, data: [...games], total, page, limit, totalPages }
  const games = searchResult?.data || [];
  const pagination = searchResult ? {
    total: searchResult.total || games.length,
    page: searchResult.page || filters.page,
    limit: searchResult.limit || 20,
    totalPages: searchResult.totalPages || 1,
  } : undefined;

  const getMinDate = () => new Date().toISOString().split('T')[0];

  const getMaxDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + DATE_FILTER_MAX_MONTHS);
    return date.toISOString().split('T')[0];
  };

  // Time slot selection handler
  const handleTimeSlotSelect = (game: Game, timeSlot: GameTimeSlot) => {
    navigate('/booking-detail', {
      state: { game, timeSlot, date: filters.date },
    });
  };

  const handleSortChange = (value: string | number) => {
    const [sortBy, sortOrder] = String(value).split('-') as [GameSearchParams['sortBy'], GameSearchParams['sortOrder']];
    updateFilters({ sortBy, sortOrder });
  };

  const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;

  const hasActiveFilters = filters.search || filters.minPrice || filters.maxPrice || filters.minPlayers;

  return (
    <AppLayout title="라운드 검색">
      <Container className="py-4 md:py-6">
        {/* Search Filters */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">예약 조건</h2>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
              data-testid="filter-toggle-button"
            >
              <SlidersHorizontal className="w-4 h-4" />
              필터 {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
            {/* 검색어 */}
            <div className="relative">
              <label className="block text-sm font-semibold text-white/90 mb-1">검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="골프장, 지역 검색..."
                  className="w-full h-10 pl-10 pr-4 py-2 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      updateFilters({ search: '' });
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 날짜 선택 */}
            <Input
              label="예약 날짜"
              type="date"
              value={filters.date}
              onChange={(e) => updateFilters({ date: e.target.value })}
              min={getMinDate()}
              max={getMaxDate()}
              glass
            />

            {/* 시간대 */}
            <div>
              <label className="block text-sm font-semibold text-white/90 mb-1">시간대</label>
              <Select
                value={filters.timeOfDay}
                onValueChange={(value) =>
                  updateFilters({ timeOfDay: value as 'all' | 'morning' | 'afternoon' })
                }
                options={TIME_OF_DAY_OPTIONS}
                glass
              />
            </div>
          </div>

          {/* Advanced Filters - Expandable */}
          {showFilters && (
            <div className="border-t border-white/20 pt-5 mt-5" data-testid="expanded-filters">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* 가격 범위 */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-1">최소 가격</label>
                  <input
                    type="number"
                    value={filters.minPrice ?? ''}
                    onChange={(e) => updateFilters({ minPrice: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0"
                    min={0}
                    step={1000}
                    className="w-full h-10 px-4 py-2 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-1">최대 가격</label>
                  <input
                    type="number"
                    value={filters.maxPrice ?? ''}
                    onChange={(e) => updateFilters({ maxPrice: e.target.value ? Number(e.target.value) : null })}
                    placeholder="100,000"
                    min={0}
                    step={1000}
                    className="w-full h-10 px-4 py-2 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>

                {/* 인원수 */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-1">인원</label>
                  <Select
                    value={filters.minPlayers ? String(filters.minPlayers) : 'all'}
                    onValueChange={(value) => updateFilters({ minPlayers: value === 'all' ? null : Number(value) })}
                    options={PLAYER_OPTIONS}
                    glass
                  />
                </div>

                {/* 정렬 */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-1">정렬</label>
                  <Select
                    value={currentSortValue}
                    onValueChange={handleSortChange}
                    options={SORT_OPTIONS}
                    glass
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-white/70 hover:text-white">
                    <X className="w-4 h-4 mr-1" />
                    필터 초기화
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {gamesError && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm p-4 mb-6">
            <p className="text-red-200">게임 목록을 불러오는 중 오류가 발생했습니다.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingGames && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Game List */}
        {!isLoadingGames && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                예약 가능한 라운드 ({pagination?.total || games.length}개)
              </h2>
              {pagination && pagination.total > pagination.limit && (
                <div className="text-white/70 text-sm">
                  {pagination.page} / {Math.ceil(pagination.total / pagination.limit)} 페이지
                </div>
              )}
            </div>

            {games.length === 0 ? (
              <div className="glass-card text-center py-12">
                <div className="text-6xl mb-4">🏌️</div>
                <h3 className="text-xl text-white mb-2">예약 가능한 라운드가 없습니다</h3>
                <p className="text-white/70">다른 검색 조건을 선택해 보세요</p>
                {hasActiveFilters && (
                  <Button variant="glass" className="mt-4" onClick={resetFilters}>
                    필터 초기화
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-6">
                  {games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      date={filters.date}
                      timeOfDay={filters.timeOfDay}
                      onTimeSlotSelect={handleTimeSlotSelect}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.total > pagination.limit && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={Math.ceil(pagination.total / pagination.limit)}
                    onPageChange={(page) => updateFilters({ page })}
                    className="mt-8"
                    variant="glass"
                  />
                )}
              </>
            )}
          </div>
        )}
      </Container>
    </AppLayout>
  );
};
