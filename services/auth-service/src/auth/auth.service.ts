import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, Admin } from '@prisma/client';
import { JwtPayload, UserJwtPayload, AdminJwtPayload } from './interfaces/jwt-payload.interface';

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
        const payload: UserJwtPayload = {
            email: user.email,
            sub: user.id,
            roles: [user.roleCode],
            type: 'user',
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email,
                role: user.roleCode || 'USER',
                type: 'user',
            }
        };
    }

    async validateToken(token: string) {
        try {
            const payload = this.jwtService.verify(token);
            console.log('🔍 validateToken - payload:', payload);
            
            // Check if this is an admin token
            if (payload.type === 'admin') {
                console.log('🔍 validateToken - admin token detected');
                const admin = await this.adminService.findByEmail(payload.email);
                console.log('🔍 validateToken - admin found:', !!admin);
                if (!admin) {
                    throw new UnauthorizedException('Admin not found');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password, ...result } = admin;
                console.log('🔍 validateToken - admin result:', { id: result.id, email: result.email, roleCode: result.roleCode });
                return { user: result };
            } else {
                // Regular user token
                const user = await this.userService.findOneByEmail(payload.email);
                if (!user) {
                    throw new UnauthorizedException('User not found');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password, ...result } = user;
                return { user: result };
            }
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);

            // Check token type and refresh accordingly
            if (payload.type === 'admin') {
                return this.adminRefreshToken(refreshToken);
            }

            const user = await this.userService.findOneByEmail(payload.email);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const newPayload: UserJwtPayload = {
                email: user.email,
                sub: user.id,
                roles: [user.roleCode],
                type: 'user',
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
                    type: 'user',
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

    async adminLogin(admin: any) {
        console.log('🔑 Admin login - permissions:', admin.permissions?.length || 0);
        
        const payload = {
            username: admin.email,
            email: admin.email,
            sub: admin.id,
            role: admin.roleCode,
            type: 'admin',
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        // Get admin permissions
        const adminPermissions = admin.permissions || [];
        const permissionCodes = adminPermissions.map(p => p.permission);
        console.log('🔑 Permission codes:', permissionCodes);
        
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
                permissions: permissionCodes,
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

    async getCurrentUser(user: any) {
        // Check if this is an admin token by checking if it has admin-specific properties
        if (user.type === 'admin' || user.role?.includes('ADMIN') || user.role?.includes('OWNER') || user.role?.includes('MANAGER') || user.role?.includes('STAFF')) {
            // For admin tokens, use the sub (user ID) to fetch admin information
            const adminId = user.sub || user.id;
            const admin = await this.adminService.findOne(adminId);
            if (!admin || !admin.isActive) {
                throw new UnauthorizedException('Admin not found or inactive');
            }

            // Type assertion for admin with permissions relation
            const adminWithPermissions = admin as any;

            return {
                id: admin.id,
                username: admin.email,
                email: admin.email,
                name: admin.name,
                role: admin.roleCode,
                scope: this.getAdminScope(admin.roleCode),
                permissions: adminWithPermissions.permissions?.map((p: any) => p.permission) || [],
                isActive: admin.isActive,
                lastLoginAt: admin.lastLoginAt,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt,
                department: admin.department,
                description: admin.description,
                phone: admin.phone,
                type: 'admin'
            };
        } else {
            // For regular user tokens, fetch complete user information
            const userId = user.sub || user.id;
            const userData = await this.userService.findOneById(userId);
            if (!userData || !userData.isActive) {
                throw new UnauthorizedException('User not found or inactive');
            }

            const { password, ...userResult } = userData;
            return {
                ...userResult,
                username: userResult.email,
                role: userResult.roleCode,
                scope: 'USER',
                permissions: [],
                type: 'user'
            };
        }
    }

    private getAdminScope(roleCode: string): string {
        // Map role codes to admin scopes
        const roleToScope = {
            'SUPER_ADMIN': 'PLATFORM',
            'PLATFORM_ADMIN': 'PLATFORM', 
            'PLATFORM_OWNER': 'PLATFORM',
            'COMPANY_OWNER': 'COMPANY',
            'COMPANY_MANAGER': 'COMPANY',
            'COURSE_MANAGER': 'COURSE',
            'STAFF': 'COURSE',
            'READONLY_STAFF': 'COURSE'
        };
        
        return roleToScope[roleCode] || 'COURSE';
    }
}