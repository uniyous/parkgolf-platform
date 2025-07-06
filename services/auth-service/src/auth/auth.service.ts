import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
    ) {}

    async validateUser(username: string, pass: string): Promise<Omit<User, 'password'> | null> {
        console.log(`🔍 Validating user: ${username}, password provided: ${!!pass}`);
        const user = await this.userService.findOneByUsername(username);
        console.log(`👤 User found:`, user ? `${user.username} (active: ${user.isActive}, hasPassword: ${!!user?.password})` : 'null');
        
        if (user && user.isActive) {
            if (!pass || !user.password) {
                console.log(`❌ Missing password data: pass=${!!pass}, user.password=${!!user?.password}`);
                return null;
            }
            
            const passwordMatch = await bcrypt.compare(pass, user.password);
            console.log(`🔐 Password comparison result: ${passwordMatch}`);
            
            if (passwordMatch) {
                console.log(`✅ Password match for ${username}`);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password, ...result } = user;
                return result;
            }
        }
        console.log(`❌ Login failed for ${username}`);
        return null;
    }

    async login(user: Omit<User, 'password'>) {
        // User is already validated by LocalAuthGuard/LocalStrategy
        const payload: JwtPayload = {
            username: user.username,
            email: user.email,
            sub: user.id,
            roles: user.roles,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.roles?.[0] || 'USER', // Take first role as primary role
            }
        };
    }

    async validateToken(token: string) {
        try {
            const payload = this.jwtService.verify(token);
            const user = await this.userService.findOneByUsername(payload.username);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...result } = user;
            return { user: result };
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.userService.findOneByUsername(payload.username);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const newPayload: JwtPayload = {
                username: user.username,
                email: user.email,
                sub: user.id,
                roles: user.roles,
            };

            const newAccessToken = this.jwtService.sign(newPayload);
            const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.roles?.[0] || 'USER',
                }
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}