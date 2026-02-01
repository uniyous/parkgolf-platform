import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, Admin } from '@prisma/client';
import { JwtPayload, UserJwtPayload, AdminJwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly refreshSecret: string;

    constructor(
        private userService: UserService,
        private adminService: AdminService,
        private jwtService: JwtService,
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async validateUser(email: string, pass: string): Promise<Omit<User, 'password'> | null> {
        this.logger.debug(`Validating user: ${email}, password provided: ${!!pass}`);
        const user = await this.userService.findOneByEmail(email);
        this.logger.debug(`User found: ${user ? `${user.email} (active: ${user.isActive}, hasPassword: ${!!user?.password})` : 'null'}`);

        if (user && user.isActive) {
            if (!pass || !user.password) {
                this.logger.debug(`Missing password data: pass=${!!pass}, user.password=${!!user?.password}`);
                return null;
            }

            const passwordMatch = await bcrypt.compare(pass, user.password);
            this.logger.debug(`Password comparison result: ${passwordMatch}`);

            if (passwordMatch) {
                this.logger.log(`Password match for ${email}`);
                const { password, ...result } = user;
                return result;
            }
        }
        this.logger.warn(`Login failed for ${email}`);
        return null;
    }

    async login(user: Omit<User, 'password'>) {
        const payload: UserJwtPayload = {
            email: user.email,
            sub: user.id,
            name: user.name,
            roles: [user.roleCode],
            type: 'user',
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.refreshSecret,
            expiresIn: '7d',
        });

        // Store hashed refresh token in DB
        const hashedToken = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({
            data: {
                token: hashedToken,
                userId: user.id,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email,
                roles: [user.roleCode || 'USER'],
                type: 'user',
            }
        };
    }

    async validateToken(token: string) {
        try {
            const payload = this.jwtService.verify(token);
            this.logger.debug(`validateToken - payload type: ${payload.type}, email: ${payload.email}`);

            // Check if this is an admin token
            if (payload.type === 'admin') {
                this.logger.debug('validateToken - admin token detected');
                const admin = await this.adminService.findByEmail(payload.email);
                this.logger.debug(`validateToken - admin found: ${!!admin}`);
                if (!admin) {
                    throw new UnauthorizedException('Admin not found');
                }
                const { password, ...result } = admin;
                this.logger.debug(`validateToken - admin result: id=${result.id}, email=${result.email}, roleCode=${result.roleCode}`);
                return { user: { ...result, type: 'admin' } };
            } else {
                // Regular user token
                const user = await this.userService.findOneByEmail(payload.email);
                if (!user) {
                    throw new UnauthorizedException('User not found');
                }
                const { password, ...result } = user;
                return { user: { ...result, type: 'user' } };
            }
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.refreshSecret,
            });

            // Check token type and refresh accordingly
            if (payload.type === 'admin') {
                return this.adminRefreshToken(refreshToken);
            }

            // Verify token exists in DB (reuse detection)
            const hashedToken = this.hashToken(refreshToken);
            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { token: hashedToken },
            });

            if (!storedToken) {
                // Token reuse detected - revoke all tokens for this user
                this.logger.warn(`Refresh token reuse detected for user ${payload.sub}`);
                await this.prisma.refreshToken.deleteMany({
                    where: { userId: payload.sub },
                });
                throw new UnauthorizedException('Token reuse detected');
            }

            // Delete the used token (rotation)
            await this.prisma.refreshToken.delete({
                where: { id: storedToken.id },
            });

            const user = await this.userService.findOneByEmail(payload.email);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const newPayload: UserJwtPayload = {
                email: user.email,
                sub: user.id,
                name: user.name,
                roles: [user.roleCode],
                type: 'user',
            };

            const newAccessToken = this.jwtService.sign(newPayload);
            const newRefreshToken = this.jwtService.sign(newPayload, {
                secret: this.refreshSecret,
                expiresIn: '7d',
            });

            // Store new hashed refresh token
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await this.prisma.refreshToken.create({
                data: {
                    token: this.hashToken(newRefreshToken),
                    userId: user.id,
                    expiresAt,
                },
            });

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name || user.email,
                    roles: [user.roleCode || 'USER'],
                    type: 'user',
                }
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // Admin authentication methods
    async validateAdmin(username: string, pass: string): Promise<Omit<Admin, 'password'> | null> {
        const startTime = Date.now();
        this.logger.log(`[PERF] AuthService.validateAdmin START - ${username}`);

        const admin = await this.adminService.validateAdmin(username, pass);
        this.logger.log(`[PERF] AuthService.validateAdmin (adminService call): ${Date.now() - startTime}ms`);

        if (admin) {
            this.logger.log(`[PERF] AuthService.validateAdmin SUCCESS - ${username}, total: ${Date.now() - startTime}ms`);
            const { password, ...result } = admin;
            return result;
        }

        this.logger.warn(`[PERF] AuthService.validateAdmin FAILED - ${username}, total: ${Date.now() - startTime}ms`);
        return null;
    }

    async adminLogin(admin: any) {
        this.logger.debug(`Admin login - permissions count: ${admin.permissions?.length || 0}, companies: ${admin.companies?.length || 0}`);

        // Get admin permissions
        const adminPermissions = admin.permissions || [];
        const permissionCodes = adminPermissions.map(p => p.permission);
        this.logger.debug(`Permission codes: ${permissionCodes.join(', ')}`);

        // 주 소속 역할 코드 (레거시 호환성)
        const roleCode = admin.roleCode || 'COMPANY_VIEWER';

        const payload: AdminJwtPayload = {
            email: admin.email,
            sub: admin.id,
            roles: [roleCode],
            type: 'admin',
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.refreshSecret,
            expiresIn: '7d',
        });

        // Store hashed refresh token in DB
        const hashedToken = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.adminRefreshToken.create({
            data: {
                token: hashedToken,
                adminId: admin.id,
                expiresAt,
            },
        });

        // companies 배열 변환 (프론트엔드 형식에 맞게)
        const companies = (admin.companies || []).map((ac: any) => ({
            id: ac.id,
            adminId: ac.adminId,
            companyId: ac.companyId,
            companyRoleCode: ac.companyRoleCode,
            isPrimary: ac.isPrimary,
            isActive: ac.isActive,
            createdAt: ac.createdAt,
            updatedAt: ac.updatedAt,
            company: ac.company ? {
                id: ac.company.id,
                name: ac.company.name,
                code: ac.company.code,
                companyType: ac.company.companyType,
            } : undefined,
        }));

        return {
            accessToken,
            refreshToken,
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                phone: admin.phone,
                department: admin.department,
                isActive: admin.isActive,
                lastLoginAt: admin.lastLoginAt,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt,
                // v3 구조: companies 배열
                companies,
                // 레거시 호환성
                roleCode,
                roles: [roleCode],
                type: 'admin',
                permissions: permissionCodes,
            }
        };
    }

    async adminRefreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.refreshSecret,
            });

            if (payload.type !== 'admin') {
                throw new UnauthorizedException('Invalid admin token');
            }

            // Verify token exists in DB (reuse detection)
            const hashedToken = this.hashToken(refreshToken);
            const storedToken = await this.prisma.adminRefreshToken.findUnique({
                where: { token: hashedToken },
            });

            if (!storedToken) {
                // Token reuse detected - revoke all tokens for this admin
                this.logger.warn(`Admin refresh token reuse detected for admin ${payload.sub}`);
                await this.prisma.adminRefreshToken.deleteMany({
                    where: { adminId: payload.sub },
                });
                throw new UnauthorizedException('Token reuse detected');
            }

            // Delete the used token (rotation)
            await this.prisma.adminRefreshToken.delete({
                where: { id: storedToken.id },
            });

            const admin = await this.adminService.findByEmail(payload.email);
            if (!admin || !admin.isActive) {
                throw new UnauthorizedException('Admin not found or inactive');
            }

            const newPayload: AdminJwtPayload = {
                email: admin.email,
                sub: admin.id,
                roles: [admin.roleCode],
                type: 'admin',
            };

            const newAccessToken = this.jwtService.sign(newPayload);
            const newRefreshToken = this.jwtService.sign(newPayload, {
                secret: this.refreshSecret,
                expiresIn: '7d',
            });

            // Store new hashed refresh token
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await this.prisma.adminRefreshToken.create({
                data: {
                    token: this.hashToken(newRefreshToken),
                    adminId: admin.id,
                    expiresAt,
                },
            });

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    roles: [admin.roleCode],
                    type: 'admin',
                }
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(userId: number) {
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });
        this.logger.log(`User ${userId} logged out - all refresh tokens revoked`);
        return { message: '로그아웃되었습니다.' };
    }

    async adminLogout(adminId: number) {
        await this.prisma.adminRefreshToken.deleteMany({
            where: { adminId },
        });
        this.logger.log(`Admin ${adminId} logged out - all refresh tokens revoked`);
        return { message: '로그아웃되었습니다.' };
    }

    async getCurrentUser(user: any) {
        // Check if this is an admin token by checking type field
        if (user.type === 'admin') {
            // For admin tokens, use the sub (user ID) to fetch admin information
            const adminId = user.sub || user.id;
            const admin = await this.adminService.findOne(adminId);
            if (!admin || !admin.isActive) {
                throw new UnauthorizedException('Admin not found or inactive');
            }

            // Type assertion for admin with permissions relation
            const adminWithPermissions = admin as any;
            const permissionCodes = adminWithPermissions.permissions?.map((p: any) => p.permission) || [];

            // companies 배열 변환
            const companies = (admin.companies || []).map((ac: any) => ({
                id: ac.id,
                adminId: ac.adminId,
                companyId: ac.companyId,
                companyRoleCode: ac.companyRoleCode,
                isPrimary: ac.isPrimary,
                isActive: ac.isActive,
                createdAt: ac.createdAt,
                updatedAt: ac.updatedAt,
                company: ac.company ? {
                    id: ac.company.id,
                    name: ac.company.name,
                    code: ac.company.code,
                    companyType: ac.company.companyType,
                } : undefined,
            }));

            const roleCode = admin.roleCode || 'COMPANY_VIEWER';

            return {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                phone: admin.phone,
                department: admin.department,
                description: admin.description,
                isActive: admin.isActive,
                lastLoginAt: admin.lastLoginAt,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt,
                // v3 구조: companies 배열
                companies,
                // 레거시 호환성
                roleCode,
                roles: [roleCode],
                scope: this.getAdminScope(roleCode),
                permissions: permissionCodes,
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
                roles: [userResult.roleCode],
                scope: 'USER',
                permissions: [],
                type: 'user'
            };
        }
    }

    private getAdminScope(roleCode: string): string {
        // Map role codes to admin scopes (v3 - CompanyType 기반)
        const roleToScope: Record<string, string> = {
            // 플랫폼 역할
            'PLATFORM_ADMIN': 'PLATFORM',
            'PLATFORM_SUPPORT': 'PLATFORM',
            'PLATFORM_VIEWER': 'PLATFORM',
            // 회사 역할
            'COMPANY_ADMIN': 'COMPANY',
            'COMPANY_MANAGER': 'COMPANY',
            'COMPANY_STAFF': 'COMPANY',
            'COMPANY_VIEWER': 'COMPANY',
            // 레거시 호환성
            'ADMIN': 'PLATFORM',
            'SUPPORT': 'PLATFORM',
            'MANAGER': 'COMPANY',
            'STAFF': 'COMPANY',
            'VIEWER': 'COMPANY'
        };

        return roleToScope[roleCode] || 'COMPANY';
    }
}