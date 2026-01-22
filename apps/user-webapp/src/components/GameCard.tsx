import React, { useState, useMemo } from 'react';
import { MapPin, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, PriceDisplay } from './ui';
import type { Game, GameTimeSlot } from '@/lib/api/gameApi';

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

export interface GameCardProps {
  game: Game;
  date: string;
  timeOfDay: 'all' | 'morning' | 'afternoon';
  onTimeSlotSelect: (game: Game, timeSlot: GameTimeSlot) => void;
}

const SLOTS_PER_TWO_ROWS = 12;

export const GameCard: React.FC<GameCardProps> = ({ game, date, timeOfDay, onTimeSlotSelect }) => {
  const [showAllSlots, setShowAllSlots] = useState(false);

  const timeSlots = game.timeSlots || [];

  const filteredSlots = useMemo(() => {
    return timeSlots.filter((slot) => {
      const maxCapacity = slot.maxPlayers ?? slot.maxCapacity ?? 4;
      const currentBookings = slot.bookedPlayers ?? slot.currentBookings ?? 0;
      const remaining = slot.availablePlayers ?? (maxCapacity - currentBookings);

      if (slot.status && slot.status !== 'AVAILABLE') return false;

      const isAvailable = slot.isAvailable ?? slot.available ?? (remaining > 0);
      if (!isAvailable) return false;

      const hour = parseInt(slot.startTime.split(':')[0]);
      if (timeOfDay === 'morning') {
        return hour < 12;
      } else if (timeOfDay === 'afternoon') {
        return hour >= 12;
      }
      return true;
    });
  }, [timeSlots, timeOfDay]);

  const hasDiscount = game.weekendPrice && game.basePrice && game.weekendPrice < game.basePrice;

  return (
    <div className="glass-card overflow-hidden !p-0">
      {/* Game Info */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
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
      <div className="border-t border-white/20 p-4 md:p-6 bg-black/10">
        <h4 className="text-base font-semibold text-white mb-4">예약 가능 시간</h4>

        {filteredSlots.length === 0 ? (
          <div className="text-center py-6 text-white/70">
            선택한 조건에 예약 가능한 시간이 없습니다
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {(showAllSlots ? filteredSlots : filteredSlots.slice(0, SLOTS_PER_TWO_ROWS)).map((slot) => {
                const maxCapacity = slot.maxPlayers ?? slot.maxCapacity ?? 4;
                const currentBookings = slot.bookedPlayers ?? slot.currentBookings ?? 0;
                const remaining = slot.availablePlayers ?? (maxCapacity - currentBookings);
                const availabilityColor = getAvailabilityColor(remaining, maxCapacity);

                const isAvailable = slot.isAvailable ?? slot.available ?? (remaining > 0);

                return (
                  <button
                    key={slot.id}
                    onClick={() => onTimeSlotSelect(game, slot)}
                    disabled={!isAvailable}
                    className={`
                      p-3 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm border
                      ${
                        slot.isPremium
                          ? 'bg-amber-400/20 border-amber-400/50 hover:bg-amber-400/30'
                          : 'bg-white/10 border-white/30 hover:bg-white/20'
                      }
                      ${!isAvailable && 'opacity-50 cursor-not-allowed'}
                    `}
                  >
                    <div className="text-base font-semibold text-white">{slot.startTime}</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="text-sm font-medium text-emerald-300">{slot.price.toLocaleString()}원</span>
                      <span className="text-white/50">·</span>
                      <div className={`w-2 h-2 rounded-full ${availabilityColor}`}></div>
                      <span className="text-xs text-white/70">{remaining}자리</span>
                    </div>
                    {slot.isPremium && (
                      <div className="text-xs text-amber-300 font-semibold mt-1">프리미엄</div>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredSlots.length > SLOTS_PER_TWO_ROWS && (
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllSlots(!showAllSlots)}
                  className="text-white/70 hover:text-white"
                >
                  {showAllSlots
                    ? '접기'
                    : `더보기 (+${filteredSlots.length - SLOTS_PER_TWO_ROWS}개)`
                  }
                  {showAllSlots ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const GameCardSkeleton: React.FC = () => (
  <div className="glass-card overflow-hidden !p-0 animate-pulse">
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
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
    <div className="border-t border-white/20 p-4 md:p-6 bg-black/10">
      <div className="h-5 bg-white/20 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 bg-white/10 rounded-xl"></div>
        ))}
      </div>
    </div>
  </div>
);

export { getAvailabilityColor, getAvailabilityText };
