import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { successResponse, errorResponse, omitPassword, paginationMeta } from '../common/utils/response.util';

@Controller()
export class UserNatsController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('auth.user.list')
  async getUserList(@Payload() data: { filters: any; token: string }) {
    try {
      const { filters } = data;
      const result = await this.userService.findAll(filters?.page, filters?.limit);
      return successResponse(result.users, paginationMeta(result.total, result.page, filters?.limit || 10));
    } catch (error) {
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('auth.user.getById')
  async getUserById(@Payload() data: { userId: string; token: string }) {
    try {
      const user = await this.userService.findOne(data.userId);
      return successResponse(user);
    } catch (error) {
      return errorResponse('NOT_FOUND', error.message);
    }
  }

  @MessagePattern('auth.user.create')
  async createUser(@Payload() data: { userData: any; token: string }) {
    try {
      const user = await this.userService.create(data.userData);
      return successResponse(user);
    } catch (error) {
      return errorResponse('CREATE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.user.update')
  async updateUser(@Payload() data: { userId: string; updateData: any; token: string }) {
    try {
      const user = await this.userService.update(data.userId, data.updateData);
      return successResponse(user);
    } catch (error) {
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.user.delete')
  async deleteUser(@Payload() data: { userId: string; token: string }) {
    try {
      const result = await this.userService.remove(parseInt(data.userId, 10));
      return successResponse(result);
    } catch (error) {
      return errorResponse('DELETE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.user.updateStatus')
  async updateUserStatus(@Payload() data: { userId: string; isActive: boolean; token: string }) {
    try {
      const user = await this.userService.update(data.userId, { isActive: data.isActive });
      return successResponse(user);
    } catch (error) {
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.user.stats')
  async getUserStats(@Payload() data: { dateRange?: any; token: string }) {
    try {
      const stats = await this.userService.getStats();
      return successResponse(stats);
    } catch (error) {
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('auth.user.findByEmail')
  async findUserByEmail(@Payload() data: { email: string; token: string }) {
    try {
      const user = await this.userService.findByEmail(data.email);
      if (!user) {
        return errorResponse('NOT_FOUND', 'User not found');
      }
      return successResponse(omitPassword(user));
    } catch (error) {
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('auth.user.validateCredentials')
  async validateUserCredentials(@Payload() data: { email: string; password: string }) {
    try {
      const user = await this.userService.validateUser(data.email, data.password);
      if (!user) {
        return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password');
      }
      return successResponse(omitPassword(user));
    } catch (error) {
      return errorResponse('VALIDATION_FAILED', error.message);
    }
  }
}