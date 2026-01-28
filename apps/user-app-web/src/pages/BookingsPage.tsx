import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button, SectionHeader } from '@/components/ui';
import { Input, Select, Pagination, GameCard, GameCardSkeleton } from '@/components';
import { useSearchGamesQuery } from '@/hooks/queries';
import { useGameSearchParams } from '@/hooks/useSearchParams';
import { useDebounce } from '@/hooks/useDebounce';
import { SORT_OPTIONS, PLAYER_OPTIONS, DATE_FILTER_MAX_MONTHS, TIME_OF_DAY_OPTIONS } from '@/lib/constants';
import type { Game, GameTimeSlot, GameSearchParams } from '@/lib/api/gameApi';

export function BookingsPage() {
  const navigate = useNavigate();
  const { filters, updateFilters, resetFilters } = useGameSearchParams();

  const [searchInput, setSearchInput] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);

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
      minPrice: filters.minPrice ?? undefined,
      maxPrice: filters.maxPrice ?? undefined,
      minPlayers: filters.minPlayers ?? undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: filters.page,
      limit: 20,
    }),
    [filters]
  );

  // Query hooks
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

  const handleSortChange = (value: string | number) => {
    const [sortBy, sortOrder] = String(value).split('-') as [
      GameSearchParams['sortBy'],
      GameSearchParams['sortOrder']
    ];
    updateFilters({ sortBy, sortOrder });
  };

  const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;
  const hasActiveFilters = filters.search || filters.minPrice || filters.maxPrice || filters.minPlayers;

  return (
    <AppLayout title="예약">
      <Container className="py-4 md:py-6 space-y-6">
        {/* Search Section */}
        <div>
          <SectionHeader title="라운드 검색" icon={Search} className="mb-3 px-1" />
          <GlassCard>
            {/* Basic Filters */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                예약 조건
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-4 h-4" />
                필터
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="골프장, 지역 검색..."
                  className="input-glass pl-10"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      updateFilters({ search: '' });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Date */}
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => updateFilters({ date: e.target.value })}
                min={getMinDate()}
                max={getMaxDate()}
                glass
              />

              {/* Time of Day */}
              <Select
                value={filters.timeOfDay}
                onValueChange={(value) =>
                  updateFilters({ timeOfDay: value as 'all' | 'morning' | 'afternoon' })
                }
                options={TIME_OF_DAY_OPTIONS}
                glass
              />
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t border-[var(--color-border)] pt-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                      최소 가격
                    </label>
                    <input
                      type="number"
                      value={filters.minPrice ?? ''}
                      onChange={(e) =>
                        updateFilters({ minPrice: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="0"
                      min={0}
                      step={1000}
                      className="input-glass"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                      최대 가격
                    </label>
                    <input
                      type="number"
                      value={filters.maxPrice ?? ''}
                      onChange={(e) =>
                        updateFilters({ maxPrice: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="100,000"
                      min={0}
                      step={1000}
                      className="input-glass"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">인원</label>
                    <Select
                      value={filters.minPlayers ? String(filters.minPlayers) : 'all'}
                      onValueChange={(value) =>
                        updateFilters({ minPlayers: value === 'all' ? null : Number(value) })
                      }
                      options={PLAYER_OPTIONS}
                      glass
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">정렬</label>
                    <Select
                      value={currentSortValue}
                      onValueChange={handleSortChange}
                      options={SORT_OPTIONS}
                      glass
                    />
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="secondary" size="sm" onClick={resetFilters}>
                      <X className="w-4 h-4" />
                      필터 초기화
                    </Button>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>

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
              <h3 className="text-lg font-semibold text-white">
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
                <h3 className="text-lg font-semibold text-white mb-2">
                  예약 가능한 라운드가 없습니다
                </h3>
                <p className="text-[var(--color-text-muted)] mb-4">
                  다른 검색 조건을 선택해 보세요
                </p>
                {hasActiveFilters && (
                  <Button variant="secondary" onClick={resetFilters}>
                    필터 초기화
                  </Button>
                )}
              </GlassCard>
            ) : (
              <>
                <div className="grid gap-4">
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
