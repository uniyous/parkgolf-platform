import React from 'react';
import { Sparkles, Search, CalendarCheck, MapPin, CloudSun } from 'lucide-react';

interface AiWelcomeCardProps {
  onQuickAction: (message: string) => void;
}

const quickActions = [
  { icon: Search, label: '골프장 검색', message: '골프장 검색해줘', color: 'text-emerald-400' },
  { icon: CalendarCheck, label: '예약 하기', message: '예약하고 싶어', color: 'text-blue-400' },
  { icon: MapPin, label: '내 근처 찾기', message: '내 근처 골프장 알려줘', color: 'text-amber-400' },
  { icon: CloudSun, label: '날씨 확인', message: '오늘 날씨 어때?', color: 'text-purple-400' },
];

export const AiWelcomeCard: React.FC<AiWelcomeCardProps> = ({ onQuickAction }) => {
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-emerald-400 font-semibold">AI 예약 도우미</span>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-sm text-white leading-relaxed">
            안녕하세요! 파크골프 예약 도우미입니다.
          </p>
          <p className="text-sm text-white/70 mt-1">
            골프장 검색, 예약, 날씨 확인 등을 도와드릴게요.
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3">
            {quickActions.map(({ icon: Icon, label, message, color }) => (
              <button
                key={label}
                onClick={() => onQuickAction(message)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-left group"
              >
                <Icon className={`w-4 h-4 ${color} shrink-0 group-hover:scale-110 transition-transform`} />
                <span className="text-xs text-white/80 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
