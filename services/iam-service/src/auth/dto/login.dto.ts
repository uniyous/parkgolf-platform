import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../../common/constants/password.constants';

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email address' })
    @IsString()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Str0ngP@ssw0rd!', description: 'User password' })
    @IsString()
    @IsNotEmpty()
    @MinLength(PASSWORD_MIN_LENGTH, { message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.` })
    password: string;
}