import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui';
import type { Game, GameTimeSlot } from '@/lib/api/gameApi';

const getAvailabilityText = (remaining: number) => {
  if (remaining === 0) return '매진';
  if (remaining <= 2) return '마감임박';
  return `${remaining}자리`;
};

export interface GameCardProps {
  game: Game;
  onTimeSlotSelect: (game: Game, timeSlot: GameTimeSlot) => void;
}

const SLOTS_VISIBLE = 4;

export const GameCard: React.FC<GameCardProps> = ({ game, onTimeSlotSelect }) => {
  const [showAllSlots, setShowAllSlots] = useState(false);

  const timeSlots = game.timeSlots || [];

  // 시간대 필터링은 서버에서 처리하므로 클라이언트에서는 가용성만 필터
  const filteredSlots = useMemo(() => {
    return timeSlots.filter((slot) => {
      if (slot.status && slot.status !== 'AVAILABLE') return false;

      const maxCapacity = slot.maxPlayers ?? slot.maxCapacity ?? 4;
      const currentBookings = slot.bookedPlayers ?? slot.currentBookings ?? 0;
      const remaining = slot.availablePlayers ?? (maxCapacity - currentBookings);
      const isAvailable = slot.isAvailable ?? slot.available ?? (remaining > 0);
      return isAvailable;
    });
  }, [timeSlots]);

  const pricePerPerson = game.pricePerPerson || game.basePrice || 0;

  return (
    <div className="glass-card overflow-hidden !p-0">
      {/* Game Info */}
      <div className="p-5 md:p-6">
        <h3 className="text-xl font-bold text-white mb-1">{game.clubName || game.name}</h3>
        <p className="text-base text-white/70 mb-2">
          {game.clubLocation && `📍 ${game.clubLocation}`}
          {game.clubLocation && game.name && ' · '}
          {game.name}
        </p>
        <p className="text-lg font-semibold text-white/90">
          {pricePerPerson.toLocaleString()}원 /인 · {game.duration}분 · {game.maxPlayers}명
        </p>
      </div>

      {/* Time Slots - 세로 리스트 */}
      <div className="border-t border-white/20 p-5 md:p-6 bg-black/10">
        <h4 className="text-base font-semibold text-white mb-4">예약 가능 시간</h4>

        {filteredSlots.length === 0 ? (
          <div className="text-center py-6 text-white/70">
            선택한 조건에 예약 가능한 시간이 없습니다
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(showAllSlots ? filteredSlots : filteredSlots.slice(0, SLOTS_VISIBLE)).map((slot) => {
                const maxCapacity = slot.maxPlayers ?? slot.maxCapacity ?? 4;
                const currentBookings = slot.bookedPlayers ?? slot.currentBookings ?? 0;
                const remaining = slot.availablePlayers ?? (maxCapacity - currentBookings);
                const isAvailable = slot.isAvailable ?? slot.available ?? (remaining > 0);

                return (
                  <button
                    key={slot.id}
                    onClick={() => onTimeSlotSelect(game, slot)}
                    disabled={!isAvailable}
                    className={`
                      h-14 px-5 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm border
                      flex items-center justify-between
                      ${
                        slot.isPremium
                          ? 'bg-amber-400/20 border-amber-400/50 hover:bg-amber-400/30'
                          : 'bg-white/10 border-white/30 hover:bg-white/20'
                      }
                      ${!isAvailable && 'opacity-50 cursor-not-allowed'}
                    `}
                  >
                    <span className="text-base font-semibold text-white">{slot.startTime}</span>
                    <span className={`text-base ${remaining <= 2 ? 'text-red-300' : 'text-emerald-300'}`}>
                      {getAvailabilityText(remaining)}
                    </span>
                  </button>
                );
              })}
            </div>
            {filteredSlots.length > SLOTS_VISIBLE && (
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllSlots(!showAllSlots)}
                  className="text-white/70 hover:text-white text-base"
                >
                  {showAllSlots
                    ? '접기'
                    : `전체 ${filteredSlots.length}개 시간 보기`
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
    <div className="p-5 md:p-6 space-y-3">
      <div className="h-7 bg-white/20 rounded w-2/3"></div>
      <div className="h-5 bg-white/20 rounded w-1/3"></div>
      <div className="h-5 bg-white/20 rounded w-1/2"></div>
    </div>
    <div className="border-t border-white/20 p-5 md:p-6 bg-black/10">
      <div className="h-5 bg-white/20 rounded w-32 mb-4"></div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-white/10 rounded-xl"></div>
        ))}
      </div>
    </div>
  </div>
);

export { getAvailabilityText };
