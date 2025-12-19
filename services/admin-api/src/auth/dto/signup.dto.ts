import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
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
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
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
