import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendFriendRequestDto, FindFromContactsDto } from './dto/friend.dto';

@ApiTags('Friends')
@Controller('api/user/friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: '친구 목록 조회' })
  @ApiResponse({ status: 200, description: '친구 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getFriends(@Request() req: any) {
    return this.friendsService.getFriends(req.user.userId);
  }

  @Get('requests')
  @ApiOperation({ summary: '친구 요청 목록 조회 (받은 요청)' })
  @ApiResponse({ status: 200, description: '친구 요청 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getFriendRequests(@Request() req: any) {
    return this.friendsService.getFriendRequests(req.user.userId);
  }

  @Get('search')
  @ApiOperation({ summary: '사용자 검색' })
  @ApiQuery({ name: 'q', description: '검색어 (이름 또는 이메일)' })
  @ApiResponse({ status: 200, description: '사용자 검색 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async searchUsers(@Request() req: any, @Query('q') query: string) {
    return this.friendsService.searchUsers(req.user.userId, query);
  }

  @Post('contacts')
  @ApiOperation({ summary: '연락처에서 친구 찾기' })
  @ApiResponse({ status: 200, description: '연락처 친구 검색 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async findFromContacts(@Request() req: any, @Body() dto: FindFromContactsDto) {
    return this.friendsService.findFromContacts(req.user.userId, dto.phoneNumbers);
  }

  @Post('request')
  @ApiOperation({ summary: '친구 요청 보내기' })
  @ApiResponse({ status: 201, description: '친구 요청 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async sendFriendRequest(
    @Request() req: any,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendFriendRequest(
      req.user.userId,
      dto.toUserId,
      dto.message,
    );
  }

  @Post('requests/:id/accept')
  @ApiOperation({ summary: '친구 요청 수락' })
  @ApiResponse({ status: 200, description: '친구 요청 수락 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async acceptFriendRequest(
    @Request() req: any,
    @Param('id', ParseIntPipe) requestId: number,
  ) {
    return this.friendsService.acceptFriendRequest(requestId, req.user.userId);
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: '친구 요청 거절' })
  @ApiResponse({ status: 200, description: '친구 요청 거절 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async rejectFriendRequest(
    @Request() req: any,
    @Param('id', ParseIntPipe) requestId: number,
  ) {
    return this.friendsService.rejectFriendRequest(requestId, req.user.userId);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: '친구 삭제' })
  @ApiResponse({ status: 200, description: '친구 삭제 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async removeFriend(
    @Request() req: any,
    @Param('friendId', ParseIntPipe) friendId: number,
  ) {
    return this.friendsService.removeFriend(req.user.userId, friendId);
  }

  @Get('check/:friendId')
  @ApiOperation({ summary: '친구 여부 확인' })
  @ApiResponse({ status: 200, description: '친구 여부 확인 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async isFriend(
    @Request() req: any,
    @Param('friendId', ParseIntPipe) friendId: number,
  ) {
    return this.friendsService.isFriend(req.user.userId, friendId);
  }
}
