import React from 'react';
import { Bot } from 'lucide-react';
import type { ChatAction, ClubCardData, SlotCardData, WeatherCardData, BookingCompleteData } from '@/lib/api/chatApi';
import { ClubCard } from './cards/ClubCard';
import { SlotCard } from './cards/SlotCard';
import { WeatherCard } from './cards/WeatherCard';
import { BookingCompleteCard } from './cards/BookingCompleteCard';

interface AiMessageBubbleProps {
  content: string;
  actions?: ChatAction[];
  createdAt: string;
  onClubSelect?: (clubId: string, clubName: string) => void;
  onSlotSelect?: (slotId: string, time: string) => void;
}

export const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({
  content,
  actions,
  createdAt,
  onClubSelect,
  onSlotSelect,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Bot className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-xs text-emerald-400 font-medium">AI 예약 도우미</span>
        </div>

        <div className="flex items-end gap-1.5">
          <div className="bg-white/10 rounded-2xl rounded-bl-sm px-3.5 py-2">
            <p className="text-sm text-white whitespace-pre-wrap break-words">{content}</p>

            {actions?.map((action, index) => (
              <div key={index}>
                {action.type === 'SHOW_CLUBS' && (
                  <ClubCard data={action.data as ClubCardData} onSelect={onClubSelect} />
                )}
                {action.type === 'SHOW_SLOTS' && (
                  <SlotCard data={action.data as SlotCardData} onSelect={onSlotSelect} />
                )}
                {action.type === 'SHOW_WEATHER' && (
                  <WeatherCard data={action.data as WeatherCardData} />
                )}
                {action.type === 'BOOKING_COMPLETE' && (
                  <BookingCompleteCard data={action.data as BookingCompleteData} />
                )}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-white/40 shrink-0">
            {formatTime(createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
