import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty({
        example: 'testuser',
        description: 'The username of the user',
    })
    @IsString()
    @IsNotEmpty({ message: 'Username should not be empty.' })
    username: string;

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
        example: 'ADMIN',
        description: 'The role of the user',
        enum: Role,
        required: false,
    })
    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}