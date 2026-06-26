import {
    Injectable,
    Logger,
    NotFoundException,
    ConflictException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { DrizzleService } from '../db/drizzle.service';
import { users } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import type { User } from '../db/schema';

const PASSWORD_EXPIRY_DAYS = 90;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(private readonly drizzle: DrizzleService) {}

    private get db() { return this.drizzle.db; }

    private readonly SALT_ROUNDS = 10;

    private omitPassword(user: User): Omit<User, 'password'> {
        const { password, ...result } = user;
        return result;
    }

    async signUp(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
        const [existingUser] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, createUserDto.email))
            .limit(1);

        if (existingUser) {
            throw new ConflictException('Email already registered.');
        }


        const hashedPassword = await bcrypt.hash(
            createUserDto.password,
            this.SALT_ROUNDS,
        );

        try {
            const [newUser] = await this.db
                .insert(users)
                .values({
                    email: createUserDto.email,
                    password: hashedPassword,
                    name: createUserDto.name,
                    phone: createUserDto.phone,
                    roleCode: createUserDto.role || 'USER',
                    isActive: true,
                })
                .returning();
            return this.omitPassword(newUser);
        } catch (error) {
            this.logger.error(`DB error during user creation: ${error.message}`);
            throw new BadRequestException(`Could not create user: ${error.message}`);
        }
    }

    async updateUser(
        id: number,
        updateUserDto: UpdateUserDto,
    ): Promise<Omit<User, 'password'>> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        const dataToUpdate: Partial<User> = {};

        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const [existingUserWithNewEmail] = await this.db
                .select()
                .from(users)
                .where(eq(users.email, updateUserDto.email))
                .limit(1);
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

        if (updateUserDto.name !== undefined) {
            dataToUpdate.name = updateUserDto.name;
        }

        if (updateUserDto.phone !== undefined) {
            dataToUpdate.phone = updateUserDto.phone;
        }

        if (Object.keys(dataToUpdate).length === 0) {
            // If nothing to update, you might return the user as is or throw an error
            // For simplicity, let's just return the user without changes
            return this.omitPassword(user);
        }

        const [updatedUser] = await this.db
            .update(users)
            .set(dataToUpdate)
            .where(eq(users.id, id))
            .returning();

        return this.omitPassword(updatedUser);
    }

    async deleteUser(id: number): Promise<{ message: string }> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        await this.db.delete(users).where(eq(users.id, id));

        return { message: `User with ID ${id} successfully deleted.` };
    }

    // Optional: A helper to find a user if needed elsewhere, e.g., for auth
    async findOneById(id: number): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        return user ?? null;
    }

    async findOneByEmail(email: string): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        return user ?? null;
    }


    // For NATS controller compatibility
    async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
        return this.signUp(createUserDto);
    }

    async findAll(page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;
        const [rows, [totalRow]] = await Promise.all([
            this.db.query.users.findMany({
                offset: skip,
                limit,
                orderBy: (u, { desc }) => [desc(u.createdAt)],
            }),
            this.db.select({ value: count() }).from(users),
        ]);
        const total = totalRow.value;

        return {
            users: rows.map(user => this.omitPassword(user)),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<Omit<User, 'password'>> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, parseInt(id)))
            .limit(1);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }
        return this.omitPassword(user);
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
        return this.updateUser(parseInt(id), updateUserDto);
    }

    async remove(id: number): Promise<User> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        await this.db.delete(users).where(eq(users.id, id));
        return user;
    }


    async getStats(): Promise<any> {
        const [totalRow] = await this.db.select({ value: count() }).from(users);
        const totalUsers = totalRow.value;
        const [activeRow] = await this.db
            .select({ value: count() })
            .from(users)
            .where(eq(users.isActive, true));
        const activeUsers = activeRow.value;
        const inactiveUsers = totalUsers - activeUsers;

        return {
            totalUsers,
            activeUsers,
            inactiveUsers,
            growthRate: 0,
        };
    }

    async findByEmail(email: string): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        return user ?? null;
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
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, parseInt(id)))
            .limit(1);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
        const [updatedUser] = await this.db
            .update(users)
            .set({
                password: hashedPassword,
                passwordChangedAt: new Date(),
            })
            .where(eq(users.id, parseInt(id)))
            .returning();

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
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
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

        await this.db
            .update(users)
            .set({
                password: hashedPassword,
                passwordChangedAt,
            })
            .where(eq(users.id, userId));

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
        const [user] = await this.db
            .select({ passwordChangedAt: users.passwordChangedAt, createdAt: users.createdAt })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            throw new NotFoundException('사용자를 찾을 수 없습니다.');
        }

        const referenceDate = user.passwordChangedAt || user.createdAt;
        const daysSinceChange = Math.floor(
            (Date.now() - referenceDate.getTime()) / MS_PER_DAY
        );

        return {
            needsChange: daysSinceChange >= PASSWORD_EXPIRY_DAYS,
            daysSinceChange,
            passwordChangedAt: user.passwordChangedAt,
        };
    }

    async updateRole(id: string, role: string): Promise<Omit<User, 'password'>> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, parseInt(id)))
            .limit(1);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        const [updatedUser] = await this.db
            .update(users)
            .set({ roleCode: role })
            .where(eq(users.id, parseInt(id)))
            .returning();

        return this.omitPassword(updatedUser);
    }

    // 개별 권한 관리는 제거됨 - 역할 기반 권한만 사용
    // 권한 변경은 역할(roleCode) 변경을 통해 수행
    async updatePermissions(id: string, _permissionCodes: string[]): Promise<Omit<User, 'password'>> {
        const userId = parseInt(id);
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        // 개별 권한 테이블이 삭제되어 역할 기반으로만 권한 관리
        // 권한을 변경하려면 updateRole()을 통해 roleCode를 변경해야 함
        this.logger.warn('updatePermissions is deprecated. Use role-based permissions by updating roleCode.');

        return this.omitPassword(user);
    }
}