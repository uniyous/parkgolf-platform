import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, MapPin, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useGameTimeSlots } from '../hooks/useGames';
import { useSearchGamesQuery } from '../hooks/queries';
import { useGameSearchParams } from '../hooks/useSearchParams';
import type { Game, GameTimeSlot, GameSearchParams } from '@/lib/api/gameApi';
import { Button, Input, Select, PriceDisplay } from '../components';

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export const SearchPage: React.FC = () => {
  const { user, logout } = useAuth();
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
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    minPlayers: filters.minPlayers ?? undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    limit: 20,
  }), [filters]);

  // Query hooks
  const { data: searchResult, isLoading: isLoadingGames, error: gamesError } = useSearchGamesQuery(searchParams);

  const games = searchResult?.data?.games || [];
  const pagination = searchResult?.pagination;

  const getMinDate = () => new Date().toISOString().split('T')[0];

  const getMaxDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    return date.toISOString().split('T')[0];
  };

  // Time slot selection handler
  const handleTimeSlotSelect = (game: Game, timeSlot: GameTimeSlot) => {
    navigate('/booking-detail', {
      state: { game, timeSlot, date: filters.date },
    });
  };

  const timeOfDayOptions = [
    { value: 'all', label: '전체' },
    { value: 'morning', label: '오전 (06:00-11:59)' },
    { value: 'afternoon', label: '오후 (12:00-18:00)' },
  ];

  const sortOptions = [
    { value: 'name-asc', label: '이름순 (오름차순)' },
    { value: 'name-desc', label: '이름순 (내림차순)' },
    { value: 'price-asc', label: '가격 낮은순' },
    { value: 'price-desc', label: '가격 높은순' },
    { value: 'createdAt-desc', label: '최신순' },
  ];

  const playerOptions = [
    { value: 'all', label: '인원 제한 없음' },
    { value: '1', label: '1명 이상' },
    { value: '2', label: '2명 이상' },
    { value: '3', label: '3명 이상' },
    { value: '4', label: '4명 이상' },
  ];

  const handleSortChange = (value: string | number) => {
    const [sortBy, sortOrder] = String(value).split('-') as [GameSearchParams['sortBy'], GameSearchParams['sortOrder']];
    updateFilters({ sortBy, sortOrder });
  };

  const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;

  const hasActiveFilters = filters.search || filters.minPrice || filters.maxPrice || filters.minPlayers;

  return (
    <div className="min-h-screen gradient-forest relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="glass-card mx-4 mt-4 mb-8 !p-4 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
              🏌️
            </div>
            <h2 className="text-white text-2xl font-bold m-0">라운드 예약</h2>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <Button variant="glass" size="sm" onClick={() => navigate('/my-bookings')}>
                내 예약
              </Button>
              <div className="px-4 py-2 bg-white/20 rounded-full text-sm text-white font-medium backdrop-blur-sm">
                {user.name}님
              </div>
              <Button variant="glass" size="sm" onClick={logout}>
                로그아웃
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Search Filters */}
        <div className="glass-card mb-8">
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
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
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
                options={timeOfDayOptions}
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>

                {/* 인원수 */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-1">인원</label>
                  <Select
                    value={filters.minPlayers ? String(filters.minPlayers) : 'all'}
                    onValueChange={(value) => updateFilters({ minPlayers: value === 'all' ? null : Number(value) })}
                    options={playerOptions}
                    glass
                  />
                </div>

                {/* 정렬 */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-1">정렬</label>
                  <Select
                    value={currentSortValue}
                    onValueChange={handleSortChange}
                    options={sortOptions}
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
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="glass"
                      disabled={pagination.page <= 1}
                      onClick={() => updateFilters({ page: pagination.page - 1 })}
                    >
                      이전
                    </Button>
                    <span className="px-4 py-2 text-white/70">
                      {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    <Button
                      variant="glass"
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                      onClick={() => updateFilters({ page: pagination.page + 1 })}
                    >
                      다음
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Loading Skeleton
const GameCardSkeleton: React.FC = () => (
  <div className="glass-card overflow-hidden animate-pulse">
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-3">
          <div className="h-7 bg-white/20 rounded w-2/3"></div>
          <div className="h-4 bg-white/20 rounded w-1/3"></div>
          <div className="flex gap-2">
            <div className="h-6 bg-white/20 rounded-full w-20"></div>
            <div className="h-6 bg-white/20 rounded-full w-24"></div>
            <div className="h-6 bg-white/20 rounded-full w-16"></div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="h-8 bg-white/20 rounded w-24"></div>
        </div>
      </div>
    </div>
    <div className="border-t border-white/20 p-6 bg-black/10">
      <div className="h-5 bg-white/20 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 bg-white/10 rounded-xl"></div>
        ))}
      </div>
    </div>
  </div>
);

// Availability color indicator
const getAvailabilityColor = (remaining: number, total: number) => {
  if (total === 0) return 'bg-gray-400';
  const ratio = remaining / total;
  if (ratio === 0) return 'bg-gray-400';
  if (ratio <= 0.25) return 'bg-red-400';
  if (ratio <= 0.5) return 'bg-amber-400';
  return 'bg-green-400';
};

const getAvailabilityText = (remaining: number) => {
  if (remaining === 0) return '매진';
  if (remaining <= 2) return `${remaining}자리 (마감임박)`;
  return `${remaining}자리 남음`;
};

// Game Card Component with Time Slots
interface GameCardProps {
  game: Game;
  date: string;
  timeOfDay: 'all' | 'morning' | 'afternoon';
  onTimeSlotSelect: (game: Game, timeSlot: GameTimeSlot) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, date, timeOfDay, onTimeSlotSelect }) => {
  const { timeSlots, isLoading: isLoadingSlots } = useGameTimeSlots(game.id, date);

  const filteredSlots = useMemo(() => {
    return timeSlots.filter((slot) => {
      if (!slot.available) return false;

      const hour = parseInt(slot.startTime.split(':')[0]);
      if (timeOfDay === 'morning') {
        return hour < 12;
      } else if (timeOfDay === 'afternoon') {
        return hour >= 12;
      }
      return true;
    });
  }, [timeSlots, timeOfDay]);

  // Calculate if there's a discount
  const hasDiscount = game.weekendPrice && game.basePrice && game.weekendPrice < game.basePrice;

  return (
    <div className="glass-card overflow-hidden">
      {/* Game Info */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-white">{game.name}</h3>
              {game.isActive && (
                <span className="bg-green-400/20 text-green-300 px-2 py-0.5 rounded-full text-xs font-medium">
                  운영중
                </span>
              )}
              {hasDiscount && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  할인
                </span>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
              <MapPin className="w-4 h-4" />
              <span>{game.clubName}</span>
              {game.clubLocation && (
                <span className="text-white/60">· {game.clubLocation}</span>
              )}
            </div>

            {game.description && (
              <p className="text-white/70 text-sm mb-4">{game.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {game.duration}분
              </span>
              <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1">
                <Users className="w-3 h-3" />
                최대 {game.maxPlayers}명
              </span>
              {game.courses?.map((course, index) => (
                <span
                  key={index}
                  className="bg-emerald-400/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                >
                  {course.courseName}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <PriceDisplay price={game.pricePerPerson || game.basePrice || 0} size="md" unit="/인" />
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="border-t border-white/20 p-6 bg-black/10">
        <h4 className="text-base font-semibold text-white mb-4">예약 가능 시간</h4>

        {isLoadingSlots ? (
          <div className="grid grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="text-center py-6 text-white/70">
            선택한 조건에 예약 가능한 시간이 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredSlots.map((slot) => {
              const remaining = slot.maxCapacity - slot.currentBookings;
              const availabilityColor = getAvailabilityColor(remaining, slot.maxCapacity);

              return (
                <button
                  key={slot.id}
                  onClick={() => onTimeSlotSelect(game, slot)}
                  disabled={!slot.available}
                  className={`
                    p-3 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm border
                    ${
                      slot.isPremium
                        ? 'bg-amber-400/20 border-amber-400/50 hover:bg-amber-400/30'
                        : 'bg-white/10 border-white/30 hover:bg-white/20'
                    }
                    ${!slot.available && 'opacity-50 cursor-not-allowed'}
                  `}
                >
                  <div className="text-base font-semibold text-white">{slot.startTime}</div>
                  <PriceDisplay price={slot.price} size="sm" showUnit={false} />
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className={`w-2 h-2 rounded-full ${availabilityColor}`}></div>
                    <span className="text-xs text-white/70">
                      {getAvailabilityText(remaining)}
                    </span>
                  </div>
                  {slot.isPremium && (
                    <div className="text-xs text-amber-300 font-semibold mt-1">프리미엄</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

