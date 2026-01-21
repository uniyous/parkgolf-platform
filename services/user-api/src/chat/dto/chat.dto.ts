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
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
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
