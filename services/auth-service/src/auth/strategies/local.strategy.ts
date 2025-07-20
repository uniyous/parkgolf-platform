import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '@prisma/client';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({ usernameField: 'email' }); // Tell passport-local to use 'email' as username
    }

    async validate(email: string, pass: string): Promise<Omit<User, 'password'>> {
        const user = await this.authService.validateUser(email, pass);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return user; // This will be attached to req.user
    }
}