import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

/**
 * Auth Service for User API
 *
 * NATS Patterns:
 * - Authentication: auth.user.login, auth.user.refresh
 * - User Registration: users.create
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly natsClient: NatsClientService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Register request: ${registerDto.email}`);

    // Create user via users.create
    const response = await this.natsClient.send<any>('users.create', {
      userData: {
        email: registerDto.email,
        password: registerDto.password,
        name: registerDto.name,
      },
    });

    if (!response.success) {
      if (response.error?.message?.includes('Email already registered')) {
        throw new ConflictException('이미 존재하는 이메일입니다.');
      }
      throw new ConflictException(response.error?.message || '회원가입에 실패했습니다.');
    }

    const userData = response.data;

    // Login to get tokens via auth.user.login
    const loginResponse = await this.natsClient.send<any>('auth.user.login', {
      email: registerDto.email,
      password: registerDto.password,
    });

    if (!loginResponse.success) {
      throw new UnauthorizedException('회원가입 후 로그인에 실패했습니다.');
    }

    const authData = loginResponse.data;

    return {
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name || registerDto.name,
        phoneNumber: registerDto.phoneNumber || '',
        createdAt: userData.createdAt || new Date(),
      },
      expiresIn: 3600,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`User login: ${loginDto.email}`);

    const response = await this.natsClient.send<any>('auth.user.login', {
      email: loginDto.email,
      password: loginDto.password,
    });

    if (!response.success) {
      throw new UnauthorizedException(
        response.error?.message || '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    const authData = response.data;

    return {
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.name || authData.user.email,
        phoneNumber: '',
        createdAt: new Date(),
      },
      expiresIn: 3600,
    };
  }

  async refreshToken(refreshTokenStr: string): Promise<AuthResponseDto> {
    this.logger.log('Token refresh request');

    const response = await this.natsClient.send<any>('auth.user.refresh', { refreshToken: refreshTokenStr }, NATS_TIMEOUTS.QUICK);

    if (!response.success) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const authData = response.data;

    return {
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.name || authData.user.email,
        phoneNumber: '',
        createdAt: new Date(),
      },
      expiresIn: 3600,
    };
  }

  async logout(userId: number): Promise<{ message: string }> {
    return { message: '로그아웃되었습니다.' };
  }
}
