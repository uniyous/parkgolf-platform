import { Controller, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { UserResponseDto } from './dto/create-user.dto';
import { NatsResponse } from '../common/types/response.types';

/**
 * User Management NATS Controller
 *
 * Handles user CRUD operations:
 * - users.list, users.getById, users.create, users.update, users.delete
 * - users.updateStatus, users.stats, users.findByEmail, users.validateCredentials
 * - users.resetPassword, users.updateRole, users.updatePermissions
 */
@Controller()
export class UserNatsController {
  private readonly logger = new Logger(UserNatsController.name);

  constructor(private readonly userService: UserService) {}

  @MessagePattern('iam.users.list')
  async getUserList(@Payload() data: { filters?: any; token?: string }) {
    this.logger.log('Get user list request');
    const { filters } = data;
    const limit = filters?.limit || 10;
    const result = await this.userService.findAll(filters?.page, limit);
    return NatsResponse.paginated(result.users, result.total, result.page, limit);
  }

  @MessagePattern('iam.users.getById')
  async getUserById(@Payload() data: { userId: string; token?: string }) {
    this.logger.log(`Get user by ID: ${data.userId}`);
    const user = await this.userService.findOne(data.userId);
    return NatsResponse.success(user);
  }

  @MessagePattern('iam.users.create')
  async createUser(@Payload() data: { userData: any; token?: string }) {
    this.logger.log(`Create user: ${data.userData?.email}`);
    const user = await this.userService.create(data.userData);
    return NatsResponse.success(user);
  }

  @MessagePattern('iam.users.update')
  async updateUser(@Payload() data: { userId: string; updateData: any; token?: string }) {
    this.logger.log(`Update user: ${data.userId}`);
    const user = await this.userService.update(data.userId, data.updateData);
    return NatsResponse.success(user);
  }

  @MessagePattern('iam.users.delete')
  async deleteUser(@Payload() data: { userId: string; token?: string }) {
    this.logger.log(`Delete user: ${data.userId}`);
    await this.userService.remove(parseInt(data.userId, 10));
    return NatsResponse.deleted();
  }

  @MessagePattern('iam.users.updateStatus')
  async updateUserStatus(@Payload() data: { userId: string; isActive: boolean; token?: string }) {
    this.logger.log(`Update user status: ${data.userId} -> ${data.isActive}`);
    const user = await this.userService.update(data.userId, { isActive: data.isActive });
    return NatsResponse.success(user);
  }

  @MessagePattern('iam.users.stats')
  async getUserStats(@Payload() data: { dateRange?: any; token?: string }) {
    this.logger.log('Get user stats request');
    const stats = await this.userService.getStats();
    return NatsResponse.success(stats);
  }

  @MessagePattern('iam.users.findByEmail')
  async findUserByEmail(@Payload() data: { email: string; token?: string }) {
    this.logger.log(`Find user by email: ${data.email}`);
    const user = await this.userService.findByEmail(data.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return NatsResponse.success(UserResponseDto.fromEntity(user));
  }

  @MessagePattern('iam.users.validateCredentials')
  async validateUserCredentials(@Payload() data: { email: string; password: string }) {
    this.logger.log(`Validate user credentials: ${data.email}`);
    const user = await this.userService.validateUser(data.email, data.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return NatsResponse.success(UserResponseDto.fromEntity(user));
  }

  @MessagePattern('iam.users.resetPassword')
  async resetUserPassword(@Payload() data: { userId: string; password: string; token?: string }) {
    this.logger.log(`Reset user password: ${data.userId}`);
    const user = await this.userService.resetPassword(data.userId, data.password);
    return NatsResponse.success(user);
  }

  @MessagePattern('iam.users.updateRole')
  async updateUserRole(@Payload() data: { userId: string; role: string; token?: string }) {
    this.logger.log(`Update user role: ${data.userId} -> ${data.role}`);
    const user = await this.userService.updateRole(data.userId, data.role);
    return NatsResponse.success(user);
  }

  @MessagePattern('iam.users.updatePermissions')
  async updateUserPermissions(@Payload() data: { userId: string; permissions: string[]; token?: string }) {
    this.logger.log(`Update user permissions: ${data.userId}`);
    const user = await this.userService.updatePermissions(data.userId, data.permissions);
    return NatsResponse.success(user);
  }
}
