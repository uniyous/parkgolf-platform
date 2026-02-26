import React from 'react';
import { MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClubCardData } from '@/lib/api/chatApi';

interface ClubCardProps {
  data: ClubCardData;
  onSelect?: (clubId: string, clubName: string) => void;
  selectedClubId?: string | null;
}

export const ClubCard: React.FC<ClubCardProps> = ({ data, onSelect, selectedClubId }) => {
  const hasSelection = !!selectedClubId;

  return (
    <div className="space-y-2 mt-2">
      {data.clubs.map((club) => {
        const isSelected = selectedClubId === club.id;
        const isDisabled = hasSelection && !isSelected;

        return (
          <div
            key={club.id}
            className={cn(
              'rounded-xl p-3 border transition-all',
              isSelected
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : isDisabled
                  ? 'bg-white/[0.02] border-white/5 opacity-50'
                  : 'bg-white/5 border-white/10'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">
                  {club.name}
                </h4>
                <div className="flex items-center gap-1 mt-1 text-white/50 text-xs">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{club.address}</span>
                </div>
              </div>
              {isSelected ? (
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
              ) : (
                onSelect && !isDisabled && (
                  <button
                    onClick={() => onSelect(club.id, club.name)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium shrink-0',
                      'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors'
                    )}
                  >
                    선택
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
