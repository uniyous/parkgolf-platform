import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsEnum, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export enum ChatRoomType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  BOOKING = 'BOOKING',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
  BOOKING_INVITE = 'BOOKING_INVITE',
  AI_USER = 'AI_USER',
  AI_ASSISTANT = 'AI_ASSISTANT',
}

export class CreateChatRoomDto {
  @ApiProperty({ description: '채팅방 이름' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ChatRoomType, description: '채팅방 타입' })
  @IsEnum(ChatRoomType)
  type: ChatRoomType;

  @ApiProperty({ type: [String], description: '참여자 ID 목록' })
  @IsArray()
  @IsString({ each: true })
  participant_ids: string[];
}

export class SendMessageDto {
  @ApiProperty({ description: '메시지 내용' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  message_type?: MessageType = MessageType.TEXT;
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional({ description: '커서 (이전 응답의 nextCursor)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 50, description: '가져올 메시지 수' })
  @IsOptional()
  @IsNumber()
  limit?: number = 50;
}

export class GetRoomsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}

export class AddMembersDto {
  @ApiProperty({ type: [String], description: '초대할 사용자 ID 목록' })
  @IsArray()
  @IsString({ each: true })
  user_ids: string[];
}

export class AiChatRequestDto {
  @ApiProperty({ description: 'AI에게 보낼 메시지' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '기존 대화 ID (없으면 새 대화)' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ description: '사용자 현재 위치 위도' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '사용자 현재 위치 경도' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  // ── 구조화된 선택 필드 (Direct Handling) ──

  @ApiPropertyOptional({ description: '선택한 골프장 ID' })
  @IsOptional()
  @IsString()
  selectedClubId?: string;

  @ApiPropertyOptional({ description: '선택한 골프장 이름' })
  @IsOptional()
  @IsString()
  selectedClubName?: string;

  @ApiPropertyOptional({ description: '선택한 슬롯 ID' })
  @IsOptional()
  @IsString()
  selectedSlotId?: string;

  @ApiPropertyOptional({ description: '선택한 슬롯 시간' })
  @IsOptional()
  @IsString()
  selectedSlotTime?: string;

  @ApiPropertyOptional({ description: '선택한 슬롯 가격' })
  @IsOptional()
  @IsNumber()
  selectedSlotPrice?: number;

  @ApiPropertyOptional({ description: '예약 확인 버튼 클릭' })
  @IsOptional()
  @IsBoolean()
  confirmBooking?: boolean;

  @ApiPropertyOptional({ description: '취소 버튼 클릭' })
  @IsOptional()
  @IsBoolean()
  cancelBooking?: boolean;

  // ── 결제 관련 필드 ──

  @ApiPropertyOptional({ description: '결제방법 ("onsite" | "card")' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: '결제 완료 콜백 (Toss 위젯 후)' })
  @IsOptional()
  @IsBoolean()
  paymentComplete?: boolean;

  @ApiPropertyOptional({ description: '결제 성공 여부' })
  @IsOptional()
  @IsBoolean()
  paymentSuccess?: boolean;

  // ── 그룹 예약 필드 ──

  @ApiPropertyOptional({ description: '복수 슬롯 선택 (멀티팀)' })
  @IsOptional()
  @IsArray()
  selectedSlots?: Array<{
    slotId: string;
    slotTime: string;
    courseName: string;
    price: number;
  }>;

  @ApiPropertyOptional({ description: '팀 편성 데이터' })
  @IsOptional()
  teams?: Array<{
    teamNumber: number;
    slotId: string;
    members: Array<{
      userId: number;
      userName: string;
      userEmail: string;
    }>;
  }>;

  @ApiPropertyOptional({ description: '그룹 예약 확인' })
  @IsOptional()
  @IsBoolean()
  confirmGroupBooking?: boolean;

  // ── 분할결제 완료 필드 ──

  @ApiPropertyOptional({ description: '분할결제 완료 콜백' })
  @IsOptional()
  @IsBoolean()
  splitPaymentComplete?: boolean;

  @ApiPropertyOptional({ description: '분할결제 orderId' })
  @IsOptional()
  @IsString()
  splitOrderId?: string;
}
