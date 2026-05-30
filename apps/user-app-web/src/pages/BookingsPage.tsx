import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard } from '@/components/ui';
import { Pagination, GameCard, GameCardSkeleton } from '@/components';
import { useSearchGamesQuery } from '@/hooks/queries';
import { useGameSearchParams } from '@/hooks/useSearchParams';
import { useDebounce } from '@/hooks/useDebounce';
import { SIMPLE_TIME_PERIODS, DEFAULT_PAGE_SIZE, DEBOUNCE_DELAY_MS } from '@/lib/constants';
import type { Game, GameTimeSlot, GameSearchParams } from '@/lib/api/gameApi';

export function BookingsPage() {
  const navigate = useNavigate();
  const { filters, updateFilters } = useGameSearchParams();

  const [searchInput, setSearchInput] = useState(filters.search);

  const debouncedSearch = useDebounce(searchInput, DEBOUNCE_DELAY_MS);

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
      limit: DEFAULT_PAGE_SIZE,
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
        limit: searchResult.limit || DEFAULT_PAGE_SIZE,
        totalPages: searchResult.totalPages || 1,
      }
    : undefined;

  // 날짜 칩 옵션 (내일부터 30일, 로컬 시간대 기준)
  const dateOptions = useMemo(() => {
    const dates: { date: string; weekday: string; shortDate: string; isWeekend: boolean }[] = [];
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      dates.push({
        date: dateStr,
        weekday: days[dayOfWeek],
        shortDate: `${month}/${day}`,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
    return dates;
  }, []);

  // 날짜 스크롤 상태
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = dateScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  // 선택된 날짜 칩으로 자동 스크롤
  useEffect(() => {
    if (dateScrollRef.current) {
      const selectedEl = dateScrollRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    // 초기 스크롤 상태 업데이트
    setTimeout(updateScrollState, 300);
  }, [filters.date, updateScrollState]);

  // 스크롤 이벤트로 버튼 상태 업데이트
  useEffect(() => {
    const el = dateScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState]);

  const scrollDates = (direction: 'left' | 'right') => {
    dateScrollRef.current?.scrollBy({
      left: direction === 'left' ? -216 : 216,
      behavior: 'smooth',
    });
  };

  const handleTimeSlotSelect = (game: Game, timeSlot: GameTimeSlot) => {
    navigate('/booking-detail', {
      state: { game, timeSlot, date: filters.date },
    });
  };

  return (
    <AppLayout title="예약">
      <Container className="py-4 md:py-6 space-y-6">
        {/* 검색어 */}
        <div className="relative px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="골프장, 지역 검색..."
            className="w-full h-12 pl-11 pr-10 text-base bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
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

        {/* 날짜 칩 가로 스크롤 + 데스크탑 좌우 버튼 */}
        <div className="relative group">
          {/* 좌 버튼 (데스크탑만) */}
          {canScrollLeft && (
            <button
              onClick={() => scrollDates('left')}
              className="hidden md:flex absolute left-0 top-0 bottom-0 z-10 items-center pl-1 pr-3 bg-gradient-to-r from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/80 to-transparent"
            >
              <ChevronLeft className="w-5 h-5 text-white/70 hover:text-white transition-colors" />
            </button>
          )}

          <div
            ref={dateScrollRef}
            className="flex gap-2 overflow-x-auto pb-1 px-1 md:px-8"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {dateOptions.map((opt) => {
              const isSelected = filters.date === opt.date;
              return (
                <button
                  key={opt.date}
                  data-selected={isSelected}
                  onClick={() => updateFilters({ date: opt.date })}
                  className={`flex-shrink-0 w-[52px] h-[52px] flex flex-col items-center justify-center rounded-xl transition-all ${
                    isSelected
                      ? 'bg-green-500/30 border border-green-500/50'
                      : 'bg-white/10 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <span className={`text-xs font-medium leading-none ${
                    isSelected ? 'text-green-300' : opt.isWeekend ? 'text-amber-400' : 'text-white/60'
                  }`}>
                    {opt.weekday}
                  </span>
                  <span className={`text-sm font-semibold leading-none mt-0.5 ${
                    isSelected ? 'text-white' : 'text-white/90'
                  }`}>
                    {opt.shortDate}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 우 버튼 (데스크탑만) */}
          {canScrollRight && (
            <button
              onClick={() => scrollDates('right')}
              className="hidden md:flex absolute right-0 top-0 bottom-0 z-10 items-center pr-1 pl-3 bg-gradient-to-l from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/80 to-transparent"
            >
              <ChevronRight className="w-5 h-5 text-white/70 hover:text-white transition-colors" />
            </button>
          )}
        </div>

        {/* 시간대 필터 + 검색 건수 */}
        <div className="flex items-center justify-between px-1">
          <div className="flex gap-2">
            {SIMPLE_TIME_PERIODS.map((period) => (
              <button
                key={period.label}
                type="button"
                onClick={() => updateFilters({ timeOfDay: period.value })}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all border ${
                  (filters.timeOfDay || '') === period.value
                    ? 'bg-green-500/30 text-green-300 border-green-500/50'
                    : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          {(pagination?.total ?? 0) > 0 && (
            <span className="text-sm text-white/50">{pagination?.total}건</span>
          )}
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
