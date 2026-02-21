import React from 'react';
import { Bot } from 'lucide-react';
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
        'p-2.5 rounded-full transition-all',
        active
          ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
          : 'bg-white/10 border border-transparent text-white/40 hover:text-white/60'
      )}
      title={active ? 'AI 모드 끄기' : 'AI 예약 도우미'}
    >
      <Bot className="w-5 h-5" />
    </button>
  );
};
