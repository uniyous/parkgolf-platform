import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators';
import {
  CreateChatRoomDto,
  SendMessageDto,
  GetMessagesQueryDto,
  GetRoomsQueryDto,
  MessageType,
} from './dto/chat.dto';

@ApiTags('Chat')
@Controller('api/user/chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  @ApiOperation({ summary: '채팅방 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '채팅방 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getChatRooms(
    @CurrentUser('userId') userId: number,
    @Query() query: GetRoomsQueryDto,
  ) {
    return this.chatService.getChatRooms(userId);
  }

  @Get('rooms/:roomId')
  @ApiOperation({ summary: '채팅방 상세 조회' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '채팅방 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  async getChatRoom(@Param('roomId') roomId: string) {
    return this.chatService.getChatRoom(roomId);
  }

  @Post('rooms')
  @ApiOperation({ summary: '채팅방 생성' })
  @ApiResponse({ status: 201, description: '채팅방 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async createChatRoom(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateChatRoomDto,
  ) {
    return this.chatService.createChatRoom(
      user.userId,
      user.name || user.email,
      dto,
    );
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: '메시지 목록 조회' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: '이전 응답의 nextCursor' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '메시지 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getMessages(
    @CurrentUser('userId') userId: number,
    @Param('roomId') roomId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.chatService.getMessages(
      roomId,
      userId,
      query.cursor,
      query.limit || 50,
    );
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: '메시지 전송' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({ status: 201, description: '메시지 전송 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async sendMessage(
    @CurrentUser() user: JwtUser,
    @Param('roomId') roomId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      roomId,
      user.userId,
      user.name || user.email,
      dto.content,
      dto.message_type || MessageType.TEXT,
    );
  }

  @Delete('rooms/:roomId/leave')
  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '채팅방 나가기 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async leaveChatRoom(
    @CurrentUser('userId') userId: number,
    @Param('roomId') roomId: string,
  ) {
    return this.chatService.leaveChatRoom(roomId, userId);
  }

  @Post('rooms/:roomId/read')
  @ApiOperation({ summary: '메시지 읽음 처리' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '읽음 처리 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async markAsRead(
    @CurrentUser('userId') userId: number,
    @Param('roomId') roomId: string,
    @Body('messageId') messageId: string,
  ) {
    return this.chatService.markAsRead(roomId, userId, messageId);
  }

  @Get('rooms/:roomId/unread')
  @ApiOperation({ summary: '읽지 않은 메시지 수 조회' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '읽지 않은 메시지 수 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getUnreadCount(
    @CurrentUser('userId') userId: number,
    @Param('roomId') roomId: string,
  ) {
    return this.chatService.getUnreadCount(roomId, userId);
  }
}
