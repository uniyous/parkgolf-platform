import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class ValidateTokenDto {
  @ApiProperty({
    description: 'Access token to validate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}

export class TokenResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    valid: boolean;
    user?: {
      id: string;
      email: string;
      role: string;
    };
  };
}
