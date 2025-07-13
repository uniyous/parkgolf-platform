import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsPhoneNumber } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  email: string;

  @ApiProperty({ description: '비밀번호 (8자 이상, 영문+숫자+특수문자)', example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  @MaxLength(20, { message: '비밀번호는 20자 이하여야 합니다.' })
  @Matches(
    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.' }
  )
  password: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  @MinLength(2, { message: '이름은 2자 이상이어야 합니다.' })
  @MaxLength(10, { message: '이름은 10자 이하여야 합니다.' })
  name: string;

  @ApiProperty({ description: '전화번호', example: '010-1234-5678' })
  @IsString()
  @Matches(/^010-\d{4}-\d{4}$/, { message: '올바른 전화번호 형식을 입력해주세요. (010-1234-5678)' })
  phoneNumber: string;

  @ApiProperty({ description: '생년월일', example: '1990-01-01', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '올바른 생년월일 형식을 입력해주세요. (YYYY-MM-DD)' })
  birthDate?: string;
}

export class LoginDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'Password123!' })
  @IsString()
  @MinLength(1, { message: '비밀번호를 입력해주세요.' })
  password: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: '액세스 토큰' })
  accessToken: string;

  @ApiProperty({ description: '리프레시 토큰' })
  refreshToken: string;

  @ApiProperty({ description: '사용자 정보' })
  user: {
    id: number;
    email: string;
    name: string;
    phoneNumber: string;
    birthDate?: string;
    createdAt: Date;
  };

  @ApiProperty({ description: '토큰 만료 시간 (초)' })
  expiresIn: number;
}

export class UserProfileDto {
  @ApiProperty({ description: '사용자 ID' })
  id: number;

  @ApiProperty({ description: '이메일' })
  email: string;

  @ApiProperty({ description: '이름' })
  name: string;

  @ApiProperty({ description: '전화번호' })
  phoneNumber: string;

  @ApiProperty({ description: '생년월일' })
  birthDate?: string;

  @ApiProperty({ description: '가입일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}