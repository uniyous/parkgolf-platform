import { IsInt, IsOptional, IsString, IsArray, Min } from 'class-validator';

export class UserIdDto {
  @IsInt()
  @Min(1)
  userId: number;
}

export class FriendPairDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsInt()
  @Min(1)
  friendId: number;
}

export class SearchUsersDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsString()
  query: string;
}

export class SendFriendRequestDto {
  @IsInt()
  @Min(1)
  fromUserId: number;

  @IsInt()
  @Min(1)
  toUserId: number;

  @IsOptional()
  @IsString()
  message?: string;
}

export class FriendRequestActionDto {
  @IsInt()
  @Min(1)
  requestId: number;

  @IsInt()
  @Min(1)
  userId: number;
}

export class ContactsSearchDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsArray()
  @IsString({ each: true })
  phoneNumbers: string[];
}
