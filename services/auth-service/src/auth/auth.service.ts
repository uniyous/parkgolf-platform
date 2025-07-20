import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, Admin } from '@prisma/client';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private adminService: AdminService,
        private jwtService: JwtService,
    ) {}

    async validateUser(email: string, pass: string): Promise<Omit<User, 'password'> | null> {
        console.log(`🔍 Validating user: ${email}, password provided: ${!!pass}`);
        const user = await this.userService.findOneByEmail(email);
        console.log(`👤 User found:`, user ? `${user.email} (active: ${user.isActive}, hasPassword: ${!!user?.password})` : 'null');
        
        if (user && user.isActive) {
            if (!pass || !user.password) {
                console.log(`❌ Missing password data: pass=${!!pass}, user.password=${!!user?.password}`);
                return null;
            }
            
            const passwordMatch = await bcrypt.compare(pass, user.password);
            console.log(`🔐 Password comparison result: ${passwordMatch}`);
            
            if (passwordMatch) {
                console.log(`✅ Password match for ${email}`);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password, ...result } = user;
                return result;
            }
        }
        console.log(`❌ Login failed for ${email}`);
        return null;
    }

    async login(user: Omit<User, 'password'>) {
        // User is already validated by LocalAuthGuard/LocalStrategy
        const payload: JwtPayload = {
            email: user.email,
            sub: user.id,
            roles: [user.roleCode],
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email, // Use name if available, otherwise email
                role: user.roleCode || 'USER', // Take first role as primary role
            }
        };
    }

    async validateToken(token: string) {
        try {
            const payload = this.jwtService.verify(token);
            const user = await this.userService.findOneByEmail(payload.email);
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
            const user = await this.userService.findOneByEmail(payload.email);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const newPayload: JwtPayload = {
                email: user.email,
                sub: user.id,
                roles: [user.roleCode],
            };

            const newAccessToken = this.jwtService.sign(newPayload);
            const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name || user.email,
                    role: user.roleCode || 'USER',
                }
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // Admin authentication methods
    async validateAdmin(username: string, pass: string): Promise<Omit<Admin, 'password'> | null> {
        console.log(`🔍 Validating admin: ${username}`);
        const admin = await this.adminService.validateAdmin(username, pass);
        
        if (admin) {
            console.log(`✅ Admin validated: ${username}`);
            const { password, ...result } = admin;
            return result;
        }
        
        console.log(`❌ Admin login failed for ${username}`);
        return null;
    }

    async adminLogin(admin: Omit<Admin, 'password'>) {
        const payload = {
            username: admin.email,
            email: admin.email,
            sub: admin.id,
            role: admin.roleCode,
            type: 'admin',
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            accessToken,
            refreshToken,
            user: {
                id: admin.id,
                username: admin.email,
                email: admin.email,
                name: admin.name,
                role: admin.roleCode,
                type: 'admin',
            }
        };
    }

    async adminRefreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            
            if (payload.type !== 'admin') {
                throw new UnauthorizedException('Invalid admin token');
            }
            
            const admin = await this.adminService.findByEmail(payload.email);
            if (!admin || !admin.isActive) {
                throw new UnauthorizedException('Admin not found or inactive');
            }

            const newPayload = {
                username: admin.email,
                email: admin.email,
                sub: admin.id,
                role: admin.roleCode,
                type: 'admin',
            };

            const newAccessToken = this.jwtService.sign(newPayload);
            const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: admin.id,
                    username: admin.email,
                    email: admin.email,
                    name: admin.name,
                    role: admin.roleCode,
                    type: 'admin',
                }
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}