import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 팀 멤버 DTO (중첩 객체 — whitelist 호환)
 */
export class TeamMemberDto {
  @IsNumber()
  userId: number;

  @IsString()
  userName: string;

  @IsString()
  userEmail: string;
}

/**
 * 채팅 요청 DTO
 */
export class ChatRequestDto {
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  // ── 구조화된 선택 필드 (Direct Handling) ──

  @IsOptional()
  @IsString()
  selectedClubId?: string;

  @IsOptional()
  @IsString()
  selectedClubName?: string;

  @IsOptional()
  @IsString()
  selectedSlotId?: string;

  @IsOptional()
  @IsString()
  selectedSlotTime?: string;

  @IsOptional()
  @IsNumber()
  selectedSlotPrice?: number;

  @IsOptional()
  @IsString()
  selectedGameName?: string;

  @IsOptional()
  @IsBoolean()
  confirmBooking?: boolean;

  @IsOptional()
  @IsBoolean()
  cancelBooking?: boolean;

  // ── 결제 관련 필드 ──

  @IsOptional()
  @IsString()
  paymentMethod?: string; // "onsite" | "card" | "dutchpay"

  @IsOptional()
  @IsBoolean()
  paymentComplete?: boolean; // 결제 완료 콜백

  @IsOptional()
  @IsBoolean()
  paymentSuccess?: boolean; // 결제 성공 여부

  // ── 그룹 예약 필드 ──

  @IsOptional()
  @IsString()
  chatRoomId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teamMembers?: TeamMemberDto[];

  @IsOptional()
  @IsBoolean()
  nextTeam?: boolean;

  @IsOptional()
  @IsBoolean()
  finishGroup?: boolean;

  @IsOptional()
  @IsBoolean()
  sendReminder?: boolean;

  // ── 분할결제 완료 필드 ──

  @IsOptional()
  @IsBoolean()
  splitPaymentComplete?: boolean;

  @IsOptional()
  @IsString()
  splitOrderId?: string;
}

/**
 * 대화 상태
 */
export type ConversationState =
  | 'IDLE'                    // 초기 상태
  | 'COLLECTING'              // 정보 수집 중
  | 'SELECTING_MEMBERS'       // 팀 멤버 선택 중
  | 'CONFIRMING'              // 예약 확인 중
  | 'BOOKING'                 // 예약 진행 중
  | 'SETTLING'                // 더치페이 정산 중
  | 'TEAM_COMPLETE'           // 1팀 완료, 다음 팀/종료 대기
  | 'COMPLETED'               // 완료
  | 'CANCELLED';              // 취소

/**
 * UI 액션 타입
 */
export type ActionType =
  | 'SHOW_CLUBS'              // 골프장 목록 표시
  | 'SHOW_SLOTS'              // 타임슬롯 표시
  | 'SHOW_WEATHER'            // 날씨 정보 표시
  | 'CONFIRM_BOOKING'         // 예약 확인 UI
  | 'SELECT_MEMBERS'          // 팀 멤버 선택 카드
  | 'SHOW_PAYMENT'            // 결제 카드 표시 (카드결제)
  | 'SPLIT_PAYMENT'           // 더치페이 결제 상태
  | 'SETTLEMENT_STATUS'       // 정산 현황
  | 'TEAM_COMPLETE'           // 팀 완료 카드
  | 'BOOKING_COMPLETE';       // 예약 완료

/**
 * UI 액션
 */
export interface ChatAction {
  type: ActionType;
  data: unknown;
}

/**
 * 채팅 응답 DTO
 */
export class ChatResponseDto {
  conversationId: string;
  message: string;
  state: ConversationState;
  actions?: ChatAction[];
}

/**
 * 대화 리셋 요청 DTO
 */
export class ResetRequestDto {
  @IsNumber()
  userId: number;
}

/**
 * 대화 히스토리 항목
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * 대화 컨텍스트
 */
export interface ConversationContext {
  conversationId: string;
  userId: number;
  state: ConversationState;
  messages: ConversationMessage[];
  slots: BookingSlots;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 예약 슬롯 (수집된 정보)
 */
export interface BookingSlots {
  location?: string;
  clubName?: string;
  clubId?: string;
  gameName?: string;
  date?: string;
  time?: string;
  slotId?: string;
  playerCount?: number;
  confirmed?: boolean;
  latitude?: number;
  longitude?: number;
  regionName?: string;
  bookingId?: number;
  bookingNumber?: string;
  totalPrice?: number;
  slotPrice?: number;

  // 팀 예약 (모든 예약에 적용)
  chatRoomId?: string;
  bookerId?: number;
  paymentMethod?: string;
  groupMode?: boolean;
  currentTeamNumber?: number;
  currentTeamMembers?: Array<{ userId: number; userName: string; userEmail: string }>;
  completedTeams?: Array<{
    teamNumber: number;
    bookingId: number;
    bookingNumber: string;
    slotId: string;
    slotTime: string;
    gameName: string;
    members: Array<{ userId: number; userName: string }>;
    totalPrice: number;
    paymentMethod: string;
  }>;
}
