import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserEntity } from '../user/entities/user.entity';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';
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
}