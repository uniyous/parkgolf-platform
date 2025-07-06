import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '@prisma/client';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({ usernameField: 'username' }); // Tell passport-local to use 'username' as username
    }

    async validate(username: string, pass: string): Promise<Omit<User, 'password'>> {
        const user = await this.authService.validateUser(username, pass);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return user; // This will be attached to req.user
    }
}