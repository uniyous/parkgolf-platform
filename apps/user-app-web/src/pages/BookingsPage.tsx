import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard } from '@/components/ui';
import { Pagination, GameCard, GameCardSkeleton } from '@/components';
import { useSearchGamesQuery } from '@/hooks/queries';
import { useGameSearchParams } from '@/hooks/useSearchParams';
import { useDebounce } from '@/hooks/useDebounce';
import { DATE_FILTER_MAX_MONTHS, SIMPLE_TIME_PERIODS } from '@/lib/constants';
import type { Game, GameTimeSlot, GameSearchParams } from '@/lib/api/gameApi';

export function BookingsPage() {
  const navigate = useNavigate();
  const { filters, updateFilters } = useGameSearchParams();

  const [searchInput, setSearchInput] = useState(filters.search);

  const debouncedSearch = useDebounce(searchInput, 300);

  React.useEffect(() => {
    if (debouncedSearch !== filters.search) {
      updateFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, updateFilters]);

  // Prepare search params for API
  const searchParams: GameSearchParams = useMemo(
    () => ({
      search: filters.search || undefined,
      date: filters.date || undefined,
      timeOfDay: filters.timeOfDay || undefined,
      page: filters.page,
      limit: 20,
    }),
    [filters.search, filters.date, filters.timeOfDay, filters.page]
  );

  const {
    data: searchResult,
    isLoading: isLoadingGames,
    error: gamesError,
  } = useSearchGamesQuery(searchParams);

  const games = searchResult?.data || [];
  const pagination = searchResult
    ? {
        total: searchResult.total || games.length,
        page: searchResult.page || filters.page,
        limit: searchResult.limit || 20,
        totalPages: searchResult.totalPages || 1,
      }
    : undefined;

  const getMinDate = () => new Date().toISOString().split('T')[0];
  const getMaxDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + DATE_FILTER_MAX_MONTHS);
    return date.toISOString().split('T')[0];
  };

  const handleTimeSlotSelect = (game: Game, timeSlot: GameTimeSlot) => {
    navigate('/booking-detail', {
      state: { game, timeSlot, date: filters.date },
    });
  };

  return (
    <AppLayout title="예약">
      <Container className="py-4 md:py-6 space-y-6">
        {/* Search Filters */}
        <GlassCard>
          <h2 className="text-xl font-semibold text-white mb-6">언제 치러 가세요?</h2>

          <div className="space-y-5">
            {/* 날짜 선택 */}
            <div>
              <label className="block text-base font-semibold text-white/90 mb-2">예약 날짜</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => updateFilters({ date: e.target.value })}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full h-14 px-4 text-lg bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 appearance-none"
              />
            </div>

            {/* 검색어 */}
            <div>
              <label className="block text-base font-semibold text-white/90 mb-2">골프장 검색</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="골프장, 지역 검색..."
                  className="w-full h-14 px-4 text-lg bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      updateFilters({ search: '' });
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* 시간대 (3개 단일선택) */}
            <div>
              <label className="block text-base font-semibold text-white/90 mb-2">시간대</label>
              <div className="grid grid-cols-3 gap-3">
                {SIMPLE_TIME_PERIODS.map((period) => (
                  <button
                    key={period.label}
                    type="button"
                    onClick={() => updateFilters({ timeOfDay: period.value })}
                    className={`py-3 text-lg font-medium rounded-xl transition-all border ${
                      (filters.timeOfDay || '') === period.value
                        ? 'bg-green-500/30 text-green-300 border-green-500/50'
                        : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Error */}
        {gamesError && (
          <GlassCard className="bg-[var(--color-error)]/10 border-[var(--color-error)]/30">
            <p className="text-[var(--color-error)]">
              게임 목록을 불러오는 중 오류가 발생했습니다.
            </p>
          </GlassCard>
        )}

        {/* Loading */}
        {isLoadingGames && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Game List */}
        {!isLoadingGames && (
          <div>
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-xl font-bold text-white">
                예약 가능한 라운드 ({pagination?.total || games.length}개)
              </h3>
              {pagination && pagination.total > pagination.limit && (
                <span className="text-sm text-[var(--color-text-muted)]">
                  {pagination.page} / {pagination.totalPages} 페이지
                </span>
              )}
            </div>

            {games.length === 0 ? (
              <GlassCard className="text-center py-12">
                <div className="text-5xl mb-4">🏌️</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  예약 가능한 라운드가 없습니다
                </h3>
                <p className="text-[var(--color-text-muted)]">
                  다른 검색 조건을 선택해 보세요
                </p>
              </GlassCard>
            ) : (
              <>
                <div className="grid gap-4">
                  {games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      date={filters.date}
                      onTimeSlotSelect={handleTimeSlotSelect}
                    />
                  ))}
                </div>

                {pagination && pagination.total > pagination.limit && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => updateFilters({ page })}
                    className="mt-6"
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
}
