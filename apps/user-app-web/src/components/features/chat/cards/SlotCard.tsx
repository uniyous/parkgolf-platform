import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SlotCardData } from '@/lib/api/chatApi';

interface SlotCardProps {
  data: SlotCardData;
  onSelect?: (slotId: string, time: string) => void;
}

export const SlotCard: React.FC<SlotCardProps> = ({ data, onSelect }) => {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR').format(price);

  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-2">
        {data.slots.map((slot) => (
          <button
            key={slot.id}
            onClick={() => onSelect?.(slot.id, slot.time)}
            disabled={!onSelect}
            className={cn(
              'bg-white/5 rounded-xl p-3 border border-white/10 text-left',
              onSelect && 'hover:bg-white/10 hover:border-emerald-500/30 transition-colors'
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm font-semibold text-white">{slot.time}</span>
            </div>
            <p className="text-xs text-white/60">{slot.courseName}</p>
            <p className="text-xs text-emerald-400 mt-1">
              ₩{formatPrice(slot.price)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
