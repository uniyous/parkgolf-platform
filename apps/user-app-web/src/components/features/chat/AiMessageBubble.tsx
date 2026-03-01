import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ChatAction, ClubCardData, SlotCardData, WeatherCardData, BookingCompleteData, ConfirmBookingData, PaymentCardData, SelectMembersData, TeamCompleteData, SettlementStatusData } from '@/lib/api/chatApi';
import { ClubCard } from './cards/ClubCard';
import { SlotCard } from './cards/SlotCard';
import { WeatherCard } from './cards/WeatherCard';
import { BookingCompleteCard } from './cards/BookingCompleteCard';
import { ConfirmBookingCard } from './cards/ConfirmBookingCard';
import { PaymentCard } from './cards/PaymentCard';
import { SelectMembersCard } from './cards/SelectMembersCard';
import { TeamCompleteCard } from './cards/TeamCompleteCard';
import { SettlementStatusCard } from './cards/SettlementStatusCard';

interface AiMessageBubbleProps {
  content: string;
  actions?: ChatAction[];
  createdAt: string;
  showLabel?: boolean;
  currentUserId?: number;
  roomId?: string;
  conversationId?: string;
  onClubSelect?: (clubId: string, clubName: string) => void;
  onSlotSelect?: (slotId: string, time: string, price: number, clubId?: string, clubName?: string) => void;
  onConfirmBooking?: (paymentMethod: 'onsite' | 'card' | 'dutchpay') => void;
  onCancelBooking?: () => void;
  onPaymentComplete?: (success: boolean) => void;
  onTeamMemberSelect?: (members: Array<{ userId: number; userName: string; userEmail: string }>) => void;
  onNextTeam?: () => void;
  onFinishGroup?: () => void;
  onSendReminder?: () => void;
  onRefreshSettlement?: () => void;
  onSplitPaymentComplete?: (success: boolean, orderId: string) => void;
  selectedClubId?: string | null;
  selectedSlotId?: string | null;
  /** 최신 AI 메시지 여부: false이면 액션 카드를 읽기 전용으로 렌더링 */
  isLatestAiMessage?: boolean;
}

export const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({
  content,
  actions,
  createdAt,
  showLabel = true,
  currentUserId,
  roomId,
  conversationId,
  onClubSelect,
  onSlotSelect,
  onConfirmBooking,
  onCancelBooking,
  onPaymentComplete,
  onTeamMemberSelect,
  onNextTeam,
  onFinishGroup,
  onSendReminder,
  onRefreshSettlement,
  onSplitPaymentComplete,
  selectedClubId,
  selectedSlotId,
  isLatestAiMessage = true,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        {showLabel && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs text-violet-400 font-semibold">AI 예약 도우미</span>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <div className="bg-violet-500/10 border-l-[3px] border-l-violet-400 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <p className="text-sm text-white whitespace-pre-wrap break-words leading-relaxed">{content}</p>

            {actions?.map((action, index) => (
              <div key={index}>
                {action.type === 'SHOW_CLUBS' && (
                  <ClubCard
                    data={action.data as ClubCardData}
                    onSelect={onClubSelect}
                    selectedClubId={selectedClubId}
                  />
                )}
                {action.type === 'SHOW_SLOTS' && (
                  <SlotCard
                    data={action.data as SlotCardData}
                    onSelect={(slotId, time, price) => {
                      const slotData = action.data as SlotCardData;
                      onSlotSelect?.(slotId, time, price, slotData.clubId, slotData.clubName);
                    }}
                    selectedSlotId={selectedSlotId}
                  />
                )}
                {action.type === 'SHOW_WEATHER' && (
                  <WeatherCard data={action.data as WeatherCardData} />
                )}
                {action.type === 'CONFIRM_BOOKING' && (
                  <ConfirmBookingCard
                    data={action.data as ConfirmBookingData}
                    onConfirm={onConfirmBooking}
                    onCancel={onCancelBooking}
                    completed={!isLatestAiMessage}
                  />
                )}
                {action.type === 'SHOW_PAYMENT' && (
                  <PaymentCard
                    data={action.data as PaymentCardData}
                    roomId={roomId}
                    conversationId={conversationId}
                    onPaymentComplete={onPaymentComplete}
                    completed={!isLatestAiMessage}
                  />
                )}
                {action.type === 'BOOKING_COMPLETE' && (
                  <BookingCompleteCard data={action.data as BookingCompleteData} />
                )}
                {action.type === 'SELECT_MEMBERS' && (
                  <SelectMembersCard
                    data={action.data as SelectMembersData}
                    onConfirm={onTeamMemberSelect}
                    onCancel={onCancelBooking}
                    completed={!isLatestAiMessage}
                  />
                )}
                {action.type === 'TEAM_COMPLETE' && (
                  <TeamCompleteCard
                    data={action.data as TeamCompleteData}
                    onNextTeam={onNextTeam}
                    onFinish={onFinishGroup}
                    completed={!isLatestAiMessage}
                  />
                )}
                {action.type === 'SETTLEMENT_STATUS' && (
                  <SettlementStatusCard
                    data={action.data as SettlementStatusData}
                    currentUserId={currentUserId}
                    roomId={roomId}
                    conversationId={conversationId}
                    onSplitPaymentComplete={onSplitPaymentComplete}
                    onSendReminder={onSendReminder}
                    onRefresh={onRefreshSettlement}
                  />
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
