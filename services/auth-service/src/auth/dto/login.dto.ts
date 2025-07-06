import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'admin', description: 'Username' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'Str0ngP@ssw0rd!', description: 'User password' })
    @IsString()
    @IsNotEmpty()
    password: string;
}