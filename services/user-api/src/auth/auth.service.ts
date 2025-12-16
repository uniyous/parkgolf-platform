import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Inject,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  UserProfileDto,
} from './dto/auth.dto';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';

// Mock user database
interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  birthDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  private users: User[] = [
    {
      id: 1,
      email: 'test@example.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '테스트 사용자',
      phoneNumber: '010-1234-5678',
      birthDate: '1990-01-01',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 2,
      email: 'user1@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '김철수',
      phoneNumber: '010-1111-1111',
      birthDate: '1985-03-15',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 3,
      email: 'user2@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '이영희',
      phoneNumber: '010-2222-2222',
      birthDate: '1988-07-22',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    },
    {
      id: 4,
      email: 'user3@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '박민수',
      phoneNumber: '010-3333-3333',
      birthDate: '1992-11-08',
      createdAt: new Date('2024-01-04'),
      updatedAt: new Date('2024-01-04'),
    },
    {
      id: 5,
      email: 'user4@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '정수연',
      phoneNumber: '010-4444-4444',
      birthDate: '1987-04-12',
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05'),
    },
    {
      id: 6,
      email: 'user5@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '최동현',
      phoneNumber: '010-5555-5555',
      birthDate: '1991-09-25',
      createdAt: new Date('2024-01-06'),
      updatedAt: new Date('2024-01-06'),
    },
    {
      id: 7,
      email: 'user6@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '황미영',
      phoneNumber: '010-6666-6666',
      birthDate: '1986-12-03',
      createdAt: new Date('2024-01-07'),
      updatedAt: new Date('2024-01-07'),
    },
    {
      id: 8,
      email: 'user7@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '강준호',
      phoneNumber: '010-7777-7777',
      birthDate: '1989-06-18',
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-08'),
    },
    {
      id: 9,
      email: 'user8@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '윤서진',
      phoneNumber: '010-8888-8888',
      birthDate: '1993-02-14',
      createdAt: new Date('2024-01-09'),
      updatedAt: new Date('2024-01-09'),
    },
    {
      id: 10,
      email: 'user9@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '임태웅',
      phoneNumber: '010-9999-9999',
      birthDate: '1984-10-30',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
    },
    {
      id: 11,
      email: 'user10@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '송하은',
      phoneNumber: '010-1010-1010',
      birthDate: '1990-05-27',
      createdAt: new Date('2024-01-11'),
      updatedAt: new Date('2024-01-11'),
    },
    {
      id: 12,
      email: 'user11@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '오준석',
      phoneNumber: '010-1112-1112',
      birthDate: '1987-08-16',
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-12'),
    },
    {
      id: 13,
      email: 'user12@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '신예린',
      phoneNumber: '010-1213-1213',
      birthDate: '1994-01-09',
      createdAt: new Date('2024-01-13'),
      updatedAt: new Date('2024-01-13'),
    },
    {
      id: 14,
      email: 'user13@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '배성민',
      phoneNumber: '010-1314-1314',
      birthDate: '1983-12-21',
      createdAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-14'),
    },
    {
      id: 15,
      email: 'user14@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '조아름',
      phoneNumber: '010-1415-1415',
      birthDate: '1989-03-05',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 16,
      email: 'user15@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '한지우',
      phoneNumber: '010-1516-1516',
      birthDate: '1992-07-11',
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
    },
    {
      id: 17,
      email: 'user16@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '안재혁',
      phoneNumber: '010-1617-1617',
      birthDate: '1985-11-28',
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17'),
    },
    {
      id: 18,
      email: 'user17@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '홍다영',
      phoneNumber: '010-1718-1718',
      birthDate: '1991-04-04',
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-18'),
    },
    {
      id: 19,
      email: 'user18@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '남궁현',
      phoneNumber: '010-1819-1819',
      birthDate: '1988-09-13',
      createdAt: new Date('2024-01-19'),
      updatedAt: new Date('2024-01-19'),
    },
    {
      id: 20,
      email: 'user19@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '서지현',
      phoneNumber: '010-1920-1920',
      birthDate: '1986-06-07',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    },
    {
      id: 21,
      email: 'admin@golf.com',
      password: '$2b$10$EpDUBFhAtJnDeD32xPhRsOQGwso4zl4ttZNGPNw3DwbPydNx2HO.e', // password123!
      name: '관리자',
      phoneNumber: '010-0000-0000',
      birthDate: '1980-01-01',
      createdAt: new Date('2024-01-21'),
      updatedAt: new Date('2024-01-21'),
    },
  ];

  constructor(
    private readonly jwtService: JwtService,
    @Optional() @Inject('NATS_CLIENT') private readonly natsClient?: ClientProxy,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = this.users.find(
      (user) => user.email === registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create new user
    const newUser: User = {
      id: this.users.length + 1,
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      phoneNumber: registerDto.phoneNumber,
      birthDate: registerDto.birthDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(newUser);

    // Generate tokens
    return this.generateTokens(newUser);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Call auth-service via NATS using email directly
      const response = await firstValueFrom(
        this.natsClient.send('auth.login', {
          email: loginDto.email,
          password: loginDto.password,
        }),
      );

      if (!response.success) {
        throw new UnauthorizedException(
          response.error?.message ||
            '이메일 또는 비밀번호가 일치하지 않습니다.',
        );
      }

      const authData = response.data;

      // Map the response to match our AuthResponseDto format
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
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }
  }

  async getProfile(userId: number): Promise<UserProfileDto> {
    try {
      // Call auth-service via NATS to get user profile
      const response = await firstValueFrom(
        this.natsClient.send('auth.getProfile', { userId }),
      );

      if (!response.success) {
        throw new NotFoundException(
          response.error?.message || '사용자를 찾을 수 없습니다.',
        );
      }

      const userData = response.data;
      
      // Map the response to match our UserProfileDto format
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

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = this.users.find((u) => u.id === payload.sub);

      if (!user) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    // In a real implementation, you would invalidate the tokens
    // For now, just return success message
    return { message: '로그아웃되었습니다.' };
  }

  private async generateTokens(user: User): Promise<AuthResponseDto> {
    const payload = { email: user.email, sub: user.id };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const { password, ...userInfo } = user;

    return {
      accessToken,
      refreshToken,
      user: userInfo,
      expiresIn: 3600, // 1 hour in seconds
    };
  }
}
