import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { successResponse, errorResponse, paginationMeta } from '../common/utils/response.util';
import { UserResponseDto } from './dto/create-user.dto';

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

  @MessagePattern('users.list')
  async getUserList(@Payload() data: { filters?: any; token?: string }) {
    try {
      this.logger.log('Get user list request');
      const { filters } = data;
      const result = await this.userService.findAll(filters?.page, filters?.limit);
      return successResponse(result.users, paginationMeta(result.total, result.page, filters?.limit || 10));
    } catch (error) {
      this.logger.error('Get user list failed', error);
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('users.getById')
  async getUserById(@Payload() data: { userId: string; token?: string }) {
    try {
      this.logger.log(`Get user by ID: ${data.userId}`);
      const user = await this.userService.findOne(data.userId);
      return successResponse(user);
    } catch (error) {
      this.logger.error(`Get user failed: ${data.userId}`, error);
      return errorResponse('NOT_FOUND', error.message);
    }
  }

  @MessagePattern('users.create')
  async createUser(@Payload() data: { userData: any; token?: string }) {
    try {
      this.logger.log(`Create user: ${data.userData?.email}`);
      const user = await this.userService.create(data.userData);
      return successResponse(user);
    } catch (error) {
      this.logger.error('Create user failed', error);
      return errorResponse('CREATE_FAILED', error.message);
    }
  }

  @MessagePattern('users.update')
  async updateUser(@Payload() data: { userId: string; updateData: any; token?: string }) {
    try {
      this.logger.log(`Update user: ${data.userId}`);
      const user = await this.userService.update(data.userId, data.updateData);
      return successResponse(user);
    } catch (error) {
      this.logger.error(`Update user failed: ${data.userId}`, error);
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('users.delete')
  async deleteUser(@Payload() data: { userId: string; token?: string }) {
    try {
      this.logger.log(`Delete user: ${data.userId}`);
      const result = await this.userService.remove(parseInt(data.userId, 10));
      return successResponse(result);
    } catch (error) {
      this.logger.error(`Delete user failed: ${data.userId}`, error);
      return errorResponse('DELETE_FAILED', error.message);
    }
  }

  @MessagePattern('users.updateStatus')
  async updateUserStatus(@Payload() data: { userId: string; isActive: boolean; token?: string }) {
    try {
      this.logger.log(`Update user status: ${data.userId} -> ${data.isActive}`);
      const user = await this.userService.update(data.userId, { isActive: data.isActive });
      return successResponse(user);
    } catch (error) {
      this.logger.error(`Update user status failed: ${data.userId}`, error);
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('users.stats')
  async getUserStats(@Payload() data: { dateRange?: any; token?: string }) {
    try {
      this.logger.log('Get user stats request');
      const stats = await this.userService.getStats();
      return successResponse(stats);
    } catch (error) {
      this.logger.error('Get user stats failed', error);
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('users.findByEmail')
  async findUserByEmail(@Payload() data: { email: string; token?: string }) {
    try {
      this.logger.log(`Find user by email: ${data.email}`);
      const user = await this.userService.findByEmail(data.email);
      if (!user) {
        return errorResponse('NOT_FOUND', 'User not found');
      }
      return successResponse(UserResponseDto.fromEntity(user));
    } catch (error) {
      this.logger.error(`Find user by email failed: ${data.email}`, error);
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('users.validateCredentials')
  async validateUserCredentials(@Payload() data: { email: string; password: string }) {
    try {
      this.logger.log(`Validate user credentials: ${data.email}`);
      const user = await this.userService.validateUser(data.email, data.password);
      if (!user) {
        return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password');
      }
      return successResponse(UserResponseDto.fromEntity(user));
    } catch (error) {
      this.logger.error(`Validate credentials failed: ${data.email}`, error);
      return errorResponse('VALIDATION_FAILED', error.message);
    }
  }

  @MessagePattern('users.resetPassword')
  async resetUserPassword(@Payload() data: { userId: string; password: string; token?: string }) {
    try {
      this.logger.log(`Reset user password: ${data.userId}`);
      const user = await this.userService.resetPassword(data.userId, data.password);
      return successResponse(user);
    } catch (error) {
      this.logger.error(`Reset password failed: ${data.userId}`, error);
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('users.updateRole')
  async updateUserRole(@Payload() data: { userId: string; role: string; token?: string }) {
    try {
      this.logger.log(`Update user role: ${data.userId} -> ${data.role}`);
      const user = await this.userService.updateRole(data.userId, data.role);
      return successResponse(user);
    } catch (error) {
      this.logger.error(`Update role failed: ${data.userId}`, error);
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('users.updatePermissions')
  async updateUserPermissions(@Payload() data: { userId: string; permissions: string[]; token?: string }) {
    try {
      this.logger.log(`Update user permissions: ${data.userId}`);
      const user = await this.userService.updatePermissions(data.userId, data.permissions);
      return successResponse(user);
    } catch (error) {
      this.logger.error(`Update permissions failed: ${data.userId}`, error);
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }
}
