import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ description: '알림 유형', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: '템플릿 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '템플릿 내용' })
  @IsString()
  content: string;

  @ApiProperty({ description: '템플릿 변수 정의', required: false })
  @IsOptional()
  variables?: any;

  @ApiProperty({ description: '활성화 상태', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateTemplateDto {
  @ApiProperty({ description: '템플릿 제목', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '템플릿 내용', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '템플릿 변수 정의', required: false })
  @IsOptional()
  variables?: any;

  @ApiProperty({ description: '활성화 상태', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}