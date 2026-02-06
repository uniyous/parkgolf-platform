import { IsString, IsOptional, IsNumber } from 'class-validator';

/**
 * 채팅 요청 DTO
 */
export class ChatRequestDto {
  @IsNumber()
  userId: number;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

/**
 * 대화 상태
 */
export type ConversationState =
  | 'IDLE'           // 초기 상태
  | 'COLLECTING'     // 정보 수집 중
  | 'CONFIRMING'     // 예약 확인 중
  | 'BOOKING'        // 예약 진행 중
  | 'COMPLETED'      // 완료
  | 'CANCELLED';     // 취소

/**
 * UI 액션 타입
 */
export type ActionType =
  | 'SHOW_CLUBS'     // 골프장 목록 표시
  | 'SHOW_SLOTS'     // 타임슬롯 표시
  | 'SHOW_WEATHER'   // 날씨 정보 표시
  | 'CONFIRM_BOOKING'// 예약 확인 UI
  | 'BOOKING_COMPLETE'; // 예약 완료

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
  date?: string;
  time?: string;
  slotId?: string;
  playerCount?: number;
  confirmed?: boolean;
}
