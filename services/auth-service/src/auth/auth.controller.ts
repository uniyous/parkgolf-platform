import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from '../admin/dto/admin-login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserEntity } from '../user/entities/user.entity';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log in a user' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: 'Login successful, returns JWT.', type: () => ({ access_token: String })})
    @ApiResponse({ status: 401, description: 'Unauthorized (Invalid credentials).' })
    async login(@Request() req, @Body() loginDto: LoginDto /* loginDto is used by Swagger but not directly in handler due to LocalAuthGuard */) {
        // req.user is populated by LocalAuthGuard after LocalStrategy validates
        return this.authService.login(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiBearerAuth() // Indicates that this endpoint requires a Bearer token
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Returns current user profile.', type: UserEntity })
    @ApiResponse({ status: 401, description: 'Unauthorized (Token not provided or invalid).' })
    getProfile(@Request() req) {
        // req.user is populated by JwtAuthGuard after JwtStrategy validates
        return new UserEntity(req.user);
    }

    // Example of a role-protected route
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('admin-only')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin-only endpoint' })
    @ApiResponse({ status: 200, description: 'Accessible by admins.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden (User does not have ADMIN role).' })
    getAdminResource(@Request() req) {
        return { message: `Welcome Admin ${req.user.email}! This is an admin-only resource.` };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('USER', 'ADMIN')
    @Get('user-or-admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'User or Admin endpoint' })
    getProtectedResource(@Request() req) {
        return { message: `Welcome ${req.user.email}! You have access.` };
    }

    // Admin authentication endpoints
    @Post('admin/login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log in an admin' })
    @ApiBody({ type: AdminLoginDto })
    @ApiResponse({ status: 200, description: 'Login successful, returns JWT.' })
    @ApiResponse({ status: 401, description: 'Unauthorized (Invalid credentials).' })
    async adminLogin(@Body() loginDto: AdminLoginDto) {
        const admin = await this.authService.validateAdmin(loginDto.email, loginDto.password);
        if (!admin) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.adminLogin(admin);
    }

    @Post('admin/refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh admin token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized (Invalid refresh token).' })
    async adminRefresh(@Body('refreshToken') refreshToken: string) {
        return this.authService.adminRefreshToken(refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Get('admin/profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current admin profile' })
    @ApiResponse({ status: 200, description: 'Returns current admin profile.' })
    @ApiResponse({ status: 401, description: 'Unauthorized (Token not provided or invalid).' })
    async getAdminProfile(@Request() req) {
        if (req.user.type !== 'admin') {
            throw new UnauthorizedException('Not an admin token');
        }
        // For now, return user info from token
        return {
            id: req.user.adminId,
            username: req.user.username,
            role: req.user.role,
            type: req.user.type
        };
    }
}