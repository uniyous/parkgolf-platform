import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({ description: '친구 요청 대상 사용자 ID' })
  @IsNumber()
  toUserId: number;

  @ApiPropertyOptional({ description: '친구 요청 메시지' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class FindFromContactsDto {
  @ApiProperty({
    description: '검색할 전화번호 목록',
    example: ['01012345678', '01098765432'],
  })
  @IsArray()
  @IsString({ each: true })
  phoneNumbers: string[];
}

export class FriendResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  friendId: number;

  @ApiProperty()
  friendName: string;

  @ApiProperty()
  friendEmail: string;

  @ApiPropertyOptional()
  friendProfileImageUrl?: string;

  @ApiProperty()
  createdAt: Date;
}

export class FriendRequestResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  fromUserId: number;

  @ApiProperty()
  fromUserName: string;

  @ApiProperty()
  fromUserEmail: string;

  @ApiPropertyOptional()
  fromUserProfileImageUrl?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty()
  createdAt: Date;
}

export class UserSearchResultResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  profileImageUrl?: string;

  @ApiProperty()
  isFriend: boolean;

  @ApiProperty()
  hasPendingRequest: boolean;
}
