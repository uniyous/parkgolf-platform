import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
    ) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables. Ensure it is loaded by ConfigModule.');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload): Promise<Omit<User, 'password'>> {
        // Payload contains { sub: userId, email, roles }
        // We can use the userId (sub) to fetch the complete user object if needed,
        // ensuring the user still exists and is active.
        const user = await this.userService.findOneById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('User not found or token invalid.');
        }
        // Optionally, you could also re-verify roles or other properties here.
        // For now, we trust the payload if the user exists.

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return result;
    }
}