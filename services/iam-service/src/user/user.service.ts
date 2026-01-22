import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    private readonly SALT_ROUNDS = 10;

    private omitPassword(user: User): Omit<User, 'password'> {
        const { password, ...result } = user;
        return result;
    }

    async signUp(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered.');
        }


        const hashedPassword = await bcrypt.hash(
            createUserDto.password,
            this.SALT_ROUNDS,
        );

        try {
            const newUser = await this.prisma.user.create({
                data: {
                    email: createUserDto.email,
                    password: hashedPassword,
                    name: createUserDto.name,
                    roleCode: createUserDto.role || 'USER',
                    isActive: true,
                },
            });
            return this.omitPassword(newUser);
        } catch (error) {
            // Handle potential Prisma errors, e.g., unique constraint if somehow missed
            console.error('Prisma error during user creation:', error);
            throw new BadRequestException(`Could not create user: ${error.message}`);
        }
    }

    async updateUser(
        id: number,
        updateUserDto: UpdateUserDto,
    ): Promise<Omit<User, 'password'>> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        const dataToUpdate: Partial<User> = {};

        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUserWithNewEmail = await this.prisma.user.findUnique({
                where: { email: updateUserDto.email },
            });
            if (existingUserWithNewEmail && existingUserWithNewEmail.id !== id) {
                throw new ConflictException('Email already in use by another account.');
            }
            dataToUpdate.email = updateUserDto.email;
        }

        if (updateUserDto.password) {
            dataToUpdate.password = await bcrypt.hash(
                updateUserDto.password,
                this.SALT_ROUNDS,
            );
        }

        if (Object.keys(dataToUpdate).length === 0) {
            // If nothing to update, you might return the user as is or throw an error
            // For simplicity, let's just return the user without changes
            return this.omitPassword(user);
        }

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: dataToUpdate,
        });

        return this.omitPassword(updatedUser);
    }

    async deleteUser(id: number): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        await this.prisma.user.delete({
            where: { id },
        });

        return { message: `User with ID ${id} successfully deleted.` };
    }

    // Optional: A helper to find a user if needed elsewhere, e.g., for auth
    async findOneById(id: number): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } });
    }


    // For NATS controller compatibility
    async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
        return this.signUp(createUserDto);
    }

    async findAll(page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count(),
        ]);

        return {
            users: users.map(user => this.omitPassword(user)),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<Omit<User, 'password'>> {
        const user = await this.prisma.user.findUnique({ 
            where: { id: parseInt(id) } 
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }
        return this.omitPassword(user);
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
        return this.updateUser(parseInt(id), updateUserDto);
    }

    async remove(id: number): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        await this.prisma.user.delete({ where: { id } });
        return user;
    }


    async getStats(): Promise<any> {
        const totalUsers = await this.prisma.user.count();
        const activeUsers = await this.prisma.user.count({
            where: { isActive: true }
        });
        const inactiveUsers = totalUsers - activeUsers;

        return {
            totalUsers,
            activeUsers,
            inactiveUsers,
            growthRate: 0, // TODO: Calculate based on date range
        };
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.findByEmail(email);
        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        return user;
    }

    async resetPassword(id: string, newPassword: string): Promise<Omit<User, 'password'>> {
        const user = await this.prisma.user.findUnique({
            where: { id: parseInt(id) }
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
        const updatedUser = await this.prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                password: hashedPassword,
                passwordChangedAt: new Date(),
            },
        });

        return this.omitPassword(updatedUser);
    }

    /**
     * 비밀번호 변경 (인증된 사용자용)
     * - 현재 비밀번호 검증
     * - 새 비밀번호와 확인 일치 검증
     * - 현재 비밀번호와 새 비밀번호 동일 여부 검증
     */
    async changePassword(
        userId: number,
        changePasswordDto: ChangePasswordDto,
    ): Promise<{ message: string; passwordChangedAt: Date }> {
        const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

        // 새 비밀번호 확인 일치 검증
        if (newPassword !== confirmPassword) {
            throw new BadRequestException('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        }

        // 사용자 조회
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundException(`사용자를 찾을 수 없습니다.`);
        }

        // 현재 비밀번호 검증
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
        }

        // 새 비밀번호가 현재 비밀번호와 동일한지 검증
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new BadRequestException('새 비밀번호는 현재 비밀번호와 다르게 설정해야 합니다.');
        }

        // 비밀번호 해시 및 업데이트
        const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
        const passwordChangedAt = new Date();

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                passwordChangedAt,
            },
        });

        return {
            message: '비밀번호가 성공적으로 변경되었습니다.',
            passwordChangedAt,
        };
    }

    /**
     * 비밀번호 변경 필요 여부 확인 (90일 경과)
     */
    async checkPasswordExpiry(userId: number): Promise<{
        needsChange: boolean;
        daysSinceChange: number | null;
        passwordChangedAt: Date | null;
    }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { passwordChangedAt: true, createdAt: true },
        });

        if (!user) {
            throw new NotFoundException('사용자를 찾을 수 없습니다.');
        }

        const referenceDate = user.passwordChangedAt || user.createdAt;
        const daysSinceChange = Math.floor(
            (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
            needsChange: daysSinceChange >= 90,
            daysSinceChange,
            passwordChangedAt: user.passwordChangedAt,
        };
    }

    async updateRole(id: string, role: string): Promise<Omit<User, 'password'>> {
        const user = await this.prisma.user.findUnique({
            where: { id: parseInt(id) }
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: parseInt(id) },
            data: { roleCode: role },
        });

        return this.omitPassword(updatedUser);
    }

    // 개별 권한 관리는 제거됨 - 역할 기반 권한만 사용
    // 권한 변경은 역할(roleCode) 변경을 통해 수행
    async updatePermissions(id: string, _permissionCodes: string[]): Promise<Omit<User, 'password'>> {
        const userId = parseInt(id);
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        // 개별 권한 테이블이 삭제되어 역할 기반으로만 권한 관리
        // 권한을 변경하려면 updateRole()을 통해 roleCode를 변경해야 함
        console.warn('updatePermissions is deprecated. Use role-based permissions by updating roleCode.');

        return this.omitPassword(user);
    }
}