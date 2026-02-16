import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class RequestDeletionDto {
  @ApiProperty({
    example: 'MyP@ssword123',
    description: '비밀번호 확인',
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: '서비스를 더 이상 사용하지 않습니다',
    description: '탈퇴 사유 (선택)',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    example: true,
    description: '탈퇴 동의 확인',
  })
  @IsBoolean()
  confirmation: boolean;
}
