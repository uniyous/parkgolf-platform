import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { User } from '@prisma/client';

/** User 엔티티 타입 (관계 포함 가능) */
export type UserWithRelations = User;

/** User 응답 DTO - password 제외 */
export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: number;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'User name' })
  name: string | null;

  @ApiProperty({ description: 'Phone number' })
  phone: string | null;

  @ApiProperty({ description: 'Profile image URL' })
  profileImageUrl: string | null;

  @ApiProperty({ description: 'Role code' })
  roleCode: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: string | null;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: string | null;

  /**
   * 엔티티를 DTO로 변환 (password 제외)
   */
  static fromEntity(entity: UserWithRelations): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.name = entity.name;
    dto.phone = entity.phone;
    dto.profileImageUrl = entity.profileImageUrl;
    dto.roleCode = entity.roleCode;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt?.toISOString() ?? null;
    dto.updatedAt = entity.updatedAt?.toISOString() ?? null;
    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: UserWithRelations[]): UserResponseDto[] {
    return entities.map(entity => UserResponseDto.fromEntity(entity));
  }
}

export class CreateUserDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'The email address of the user',
    })
    @IsEmail({}, { message: 'Please provide a valid email address.' })
    @IsNotEmpty({ message: 'Email should not be empty.' })
    email: string;

    @ApiProperty({
        example: 'Str0ngP@ssw0rd!',
        description: 'The password for the user (min 8 characters)',
        minLength: 8,
    })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long.' })
    @IsNotEmpty({ message: 'Password should not be empty.' })
    password: string;

    @ApiProperty({
        example: 'John Doe',
        description: 'The full name of the user',
        required: false,
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        example: 'USER',
        description: 'The role of the user',
        enum: ['ADMIN', 'MODERATOR', 'USER', 'VIEWER'],
        required: false,
    })
    @IsOptional()
    @IsIn(['ADMIN', 'MODERATOR', 'USER', 'VIEWER'])
    role?: string;
}