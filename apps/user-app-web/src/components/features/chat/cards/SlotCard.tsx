import React from 'react';
import { Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SlotCardData } from '@/lib/api/chatApi';

interface SlotCardProps {
  data: SlotCardData;
  onSelect?: (slotId: string, time: string) => void;
  selectedSlotId?: string | null;
}

export const SlotCard: React.FC<SlotCardProps> = ({ data, onSelect, selectedSlotId }) => {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR').format(price);

  const hasSelection = !!selectedSlotId;

  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-2">
        {data.slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          const isDisabled = hasSelection && !isSelected;

          return (
            <button
              key={slot.id}
              onClick={() => !isDisabled && onSelect?.(slot.id, slot.time)}
              disabled={!onSelect || isDisabled}
              className={cn(
                'rounded-xl p-3 border text-left transition-all relative',
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : isDisabled
                    ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-default'
                    : 'bg-white/5 border-white/10',
                onSelect && !isDisabled && !isSelected && 'hover:bg-white/10 hover:border-emerald-500/30'
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className={cn('w-3.5 h-3.5', isSelected ? 'text-emerald-400' : 'text-emerald-400')} />
                <span className="text-sm font-semibold text-white">{slot.time}</span>
              </div>
              <p className="text-xs text-white/60">{slot.courseName}</p>
              <p className="text-xs text-emerald-400 mt-1">
                {'\u20A9'}{formatPrice(slot.price)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
