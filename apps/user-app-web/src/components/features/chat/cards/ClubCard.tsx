import React from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClubCardData } from '@/lib/api/chatApi';

interface ClubCardProps {
  data: ClubCardData;
  onSelect?: (clubId: string, clubName: string) => void;
}

export const ClubCard: React.FC<ClubCardProps> = ({ data, onSelect }) => {
  return (
    <div className="space-y-2 mt-2">
      {data.clubs.map((club) => (
        <div
          key={club.id}
          className="bg-white/5 rounded-xl p-3 border border-white/10"
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
            {onSelect && (
              <button
                onClick={() => onSelect(club.id, club.name)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium shrink-0',
                  'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors'
                )}
              >
                선택하기
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
