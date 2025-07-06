import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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
}