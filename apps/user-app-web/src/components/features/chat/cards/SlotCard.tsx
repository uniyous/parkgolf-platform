import React, { useState } from 'react';
import { Clock, Check, MapPin, Calendar, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SlotCardData } from '@/lib/api/chatApi';

const SLOTS_PER_PAGE = 4;

interface SlotCardProps {
  data: SlotCardData;
  onSelect?: (slotId: string, time: string, price: number, gameName?: string) => void;
  selectedSlotId?: string | null;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ko-KR').format(price);

const formatDateKorean = (dateStr: string) => {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  } catch {
    return dateStr;
  }
};

export const SlotCard: React.FC<SlotCardProps> = ({ data, onSelect, selectedSlotId }) => {
  const hasSelection = !!selectedSlotId;
  // 라운드별 페이지 상태: { [gameId]: pageIndex }
  const [pages, setPages] = useState<Record<string | number, number>>({});

  const getPage = (gameId: string | number) => pages[gameId] ?? 0;
  const setPage = (gameId: string | number, page: number) =>
    setPages((prev) => ({ ...prev, [gameId]: page }));

  // ── 라운드 그룹 레이아웃 ──
  if (data.rounds && data.rounds.length > 0) {
    return (
      <div className="mt-2 w-full min-w-[260px] max-w-[480px] rounded-2xl bg-violet-500/10 border border-violet-500/20 overflow-hidden">
        {/* 골프장 헤더 */}
        {data.clubName && (
          <>
            <div className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-lg font-bold text-white">{data.clubName}</span>
              </div>
              {data.clubAddress && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-white/40" />
                  <span className="text-base text-white/40 truncate">{data.clubAddress}</span>
                </div>
              )}
              {data.date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-white/40" />
                  <span className="text-base text-white/40">{formatDateKorean(data.date)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-white/10" />
          </>
        )}

        {/* 라운드 목록 */}
        {data.rounds.map((round, index) => {
          const totalSlots = round.slots.length;
          const totalPages = Math.ceil(totalSlots / SLOTS_PER_PAGE);
          const currentPage = getPage(round.gameId);

          // 선택된 슬롯이 있으면 해당 페이지로 자동 이동
          const selectedIdx = selectedSlotId
            ? round.slots.findIndex((s) => String(s.id) === selectedSlotId)
            : -1;
          const effectivePage = selectedIdx >= 0
            ? Math.floor(selectedIdx / SLOTS_PER_PAGE)
            : currentPage;

          const start = effectivePage * SLOTS_PER_PAGE;
          const visibleSlots = round.slots.slice(start, start + SLOTS_PER_PAGE);
          const needsPagination = totalPages > 1;

          return (
            <React.Fragment key={round.gameId}>
              <div className="px-4 py-3">
                {/* 라운드 헤더: 이름 + 가격 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-white">{round.name}</span>
                  <span className="text-base font-semibold text-violet-400">
                    {'\u20A9'}{formatPrice(round.price)}
                  </span>
                </div>

                {/* 타임슬롯 칩 */}
                <div className="flex flex-wrap gap-1.5">
                  {visibleSlots.map((slot) => {
                    const isSelected = selectedSlotId === String(slot.id);
                    const isDisabled = hasSelection && !isSelected;

                    return (
                      <button
                        key={slot.id}
                        onClick={() => !isDisabled && onSelect?.(String(slot.id), slot.time, slot.price, round.name)}
                        disabled={!onSelect || isDisabled}
                        className={cn(
                          'rounded-lg px-2.5 py-1.5 border text-left transition-all inline-flex items-center gap-1',
                          isSelected
                            ? 'bg-violet-500/15 border-violet-500'
                            : isDisabled
                              ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-default'
                              : 'bg-white/[0.06] border-white/10',
                          onSelect && !isDisabled && !isSelected && 'hover:bg-white/10 hover:border-violet-500/30'
                        )}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-violet-400" />
                        )}
                        <span className={cn(
                          'text-base',
                          isSelected ? 'font-bold text-violet-400' : 'font-medium text-white'
                        )}>
                          {slot.time}
                        </span>
                        {slot.availableSpots != null && (
                          <span className={cn(
                            'text-xs',
                            isSelected ? 'text-violet-400/70' : 'text-white/40'
                          )}>
                            {slot.availableSpots}명
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 페이지네이션 */}
                {needsPagination && (
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => setPage(round.gameId, effectivePage - 1)}
                      disabled={effectivePage === 0}
                      className={cn(
                        'inline-flex items-center gap-0.5 text-xs px-2 py-1 rounded-md transition-colors',
                        effectivePage === 0
                          ? 'text-white/20 cursor-default'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      )}
                    >
                      <ChevronLeft className="w-3 h-3" />
                      이전
                    </button>
                    <span className="text-xs text-white/40">
                      {effectivePage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(round.gameId, effectivePage + 1)}
                      disabled={effectivePage >= totalPages - 1}
                      className={cn(
                        'inline-flex items-center gap-0.5 text-xs px-2 py-1 rounded-md transition-colors',
                        effectivePage >= totalPages - 1
                          ? 'text-white/20 cursor-default'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      )}
                    >
                      다음
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {index < data.rounds!.length - 1 && (
                <div className="border-t border-white/[0.04] mx-4" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // ── 하위 호환: flat slots 그리드 ──
  return (
    <div className="mt-2 w-full min-w-[260px] max-w-[480px] rounded-2xl bg-violet-500/10 border border-violet-500/20 p-3">
        <div className="grid grid-cols-2 gap-2">
          {data.slots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            const isDisabled = hasSelection && !isSelected;

            return (
              <button
                key={slot.id}
                onClick={() => !isDisabled && onSelect?.(slot.id, slot.time, slot.price, slot.gameName)}
                disabled={!onSelect || isDisabled}
                className={cn(
                  'rounded-xl p-3 border text-left transition-all relative',
                  isSelected
                    ? 'bg-violet-500/15 border-violet-500/40'
                    : isDisabled
                      ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-default'
                      : 'bg-white/[0.06] border-white/10',
                  onSelect && !isDisabled && !isSelected && 'hover:bg-white/10 hover:border-violet-500/30'
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-lg font-semibold text-white">{slot.time}</span>
                </div>
                <p className="text-base text-white/60">{slot.gameName}</p>
                <p className="text-base text-violet-400 mt-1">
                  {'\u20A9'}{formatPrice(slot.price)}
                </p>
              </button>
            );
          })}
        </div>
    </div>
  );
};
