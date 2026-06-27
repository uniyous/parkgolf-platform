import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, MaxLength, IsBoolean, Matches } from 'class-validator';

export class UpdateUserDto {
    @ApiPropertyOptional({
        example: 'newuser@example.com',
        description: 'The new email address of the user (optional)',
    })
    @IsOptional()
    @IsEmail({}, { message: 'Please provide a valid email address.' })
    email?: string;

    @ApiPropertyOptional({
        example: 'NewStr0ngP@ss!',
        description: 'The new password for the user (min 8 characters, optional)',
        minLength: 8,
    })
    @IsOptional()
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long.' })
    password?: string;

    @ApiPropertyOptional({
        example: true,
        description: 'Active status of the user',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        example: '홍길동',
        description: 'The name of the user (optional)',
    })
    @IsOptional()
    @IsString()
    @MinLength(2, { message: '이름은 2자 이상이어야 합니다.' })
    @MaxLength(10, { message: '이름은 10자 이하여야 합니다.' })
    name?: string;

    @ApiPropertyOptional({
        example: '010-1234-5678',
        description: 'The phone number of the user (optional)',
    })
    @IsOptional()
    @IsString()
    @Matches(/^010-\d{4}-\d{4}$/, {
        message: '올바른 전화번호 형식을 입력해주세요. (010-1234-5678)',
    })
    phone?: string;
}