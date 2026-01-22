import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'CurrentP@ss123',
    description: '현재 비밀번호',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewStr0ngP@ss!',
    description: '새 비밀번호 (8-128자, 영문+숫자+특수문자 조합)',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(128, { message: '비밀번호는 최대 128자까지 가능합니다.' })
  @Matches(
    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
    { message: '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.' },
  )
  newPassword: string;

  @ApiProperty({
    example: 'NewStr0ngP@ss!',
    description: '새 비밀번호 확인',
  })
  @IsString()
  confirmPassword: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({ example: '비밀번호가 성공적으로 변경되었습니다.' })
  message: string;

  @ApiProperty({ example: '2025-01-22T10:00:00.000Z' })
  passwordChangedAt: Date;
}

export class PasswordExpiryResponseDto {
  @ApiProperty({ example: true, description: '비밀번호 변경 필요 여부' })
  needsChange: boolean;

  @ApiProperty({ example: 95, description: '마지막 변경 후 경과 일수' })
  daysSinceChange: number | null;

  @ApiProperty({ example: '2024-10-15T10:00:00.000Z', description: '마지막 비밀번호 변경일' })
  passwordChangedAt: Date | null;
}
