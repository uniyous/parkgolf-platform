import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsEnum, IsOptional, IsNumber } from 'class-validator';

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
}
