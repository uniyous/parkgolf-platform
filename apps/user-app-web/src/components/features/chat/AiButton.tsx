import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiButtonProps {
  active: boolean;
  onClick: () => void;
}

export const AiButton: React.FC<AiButtonProps> = ({ active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2.5 rounded-full transition-all',
        active
          ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
          : 'bg-white/10 border border-transparent text-white/40 hover:text-white/60'
      )}
      title={active ? 'AI 모드 끄기' : 'AI 예약 도우미'}
    >
      <Sparkles className={cn('w-5 h-5', active && 'animate-pulse')} />
      {active && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
      )}
    </button>
  );
};
