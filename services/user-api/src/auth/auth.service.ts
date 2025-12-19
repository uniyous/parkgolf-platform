import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  UserProfileDto,
} from './dto/auth.dto';
import { NatsClientService } from '../shared/nats';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly natsClient: NatsClientService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`Register request for: ${registerDto.email}`);

      const response = await this.natsClient.send<any>('users.create', {
        data: {
          email: registerDto.email,
          password: registerDto.password,
          name: registerDto.name,
        },
      });

      if (!response.success) {
        if (response.error?.message?.includes('Email already registered')) {
          throw new ConflictException('이미 존재하는 이메일입니다.');
        }
        throw new Error(response.error?.message || 'User creation failed');
      }

      const userData = response.data;

      const loginResponse = await this.natsClient.send<any>('auth.user.login', {
        email: registerDto.email,
        password: registerDto.password,
      });

      if (!loginResponse.success) {
        throw new Error('Login after registration failed');
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
    } catch (error) {
      this.logger.error(`Register failed: ${error.message}`);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException(error.message || '회원가입에 실패했습니다.');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`User login request for: ${loginDto.email}`);

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
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
  }

  async getProfile(userId: number): Promise<UserProfileDto> {
    try {
      this.logger.log(`Get profile request for userId: ${userId}`);

      const response = await this.natsClient.send<any>('auth.getProfile', { userId });

      if (!response.success) {
        throw new NotFoundException(response.error?.message || '사용자를 찾을 수 없습니다.');
      }

      const userData = response.data;

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name || userData.email,
        phoneNumber: userData.phoneNumber || '',
        birthDate: userData.birthDate,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
  }

  async refreshToken(refreshTokenStr: string): Promise<AuthResponseDto> {
    try {
      this.logger.log('Token refresh request');

      const response = await this.natsClient.send<any>('auth.refresh', { refreshToken: refreshTokenStr });

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
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    return { message: '로그아웃되었습니다.' };
  }
}
