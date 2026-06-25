import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsIn,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({
    description: 'Admin username',
    example: 'newadmin',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  username: string;

  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'password123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
    { message: '비밀번호는 영문, 숫자, 특수문자를 모두 포함하여 8자 이상이어야 합니다.' },
  )
  password: string;

  @ApiProperty({
    description: 'Admin full name',
    example: 'Admin User',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({
    description: 'Admin role',
    example: 'ADMIN',
    enum: ['ADMIN', 'MODERATOR', 'VIEWER'],
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  @IsIn(['ADMIN', 'MODERATOR', 'VIEWER'], {
    message: 'Role must be ADMIN, MODERATOR, or VIEWER',
  })
  role: string;
}

export class SignupResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    message: string;
    user: {
      id: string;
      username: string;
      email: string;
      name: string;
      role: string;
      isActive: boolean;
    };
  };
}
