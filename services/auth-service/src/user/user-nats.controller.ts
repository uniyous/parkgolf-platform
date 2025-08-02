import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller()
export class UserNatsController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('auth.user.list')
  async getUserList(@Payload() data: { filters: any; token: string }) {
    try {
      const { filters } = data;
      const users = await this.userService.findAll(filters);
      
      return {
        success: true,
        data: users.map(({ password, ...user }) => user),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.user.getById')
  async getUserById(@Payload() data: { userId: string; token: string }) {
    try {
      const user = await this.userService.findOne(parseInt(data.userId, 10));
      const { password, ...result } = user;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.user.create')
  async createUser(@Payload() data: { userData: any; token: string }) {
    try {
      const user = await this.userService.create(data.userData);
      const { password, ...result } = user;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.user.update')
  async updateUser(@Payload() data: { userId: string; updateData: any; token: string }) {
    try {
      const user = await this.userService.update(
        parseInt(data.userId, 10),
        data.updateData
      );
      const { password, ...result } = user;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.user.delete')
  async deleteUser(@Payload() data: { userId: string; token: string }) {
    try {
      const user = await this.userService.remove(parseInt(data.userId, 10));
      const { password, ...result } = user;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.user.updateStatus')
  async updateUserStatus(@Payload() data: { userId: string; isActive: boolean; token: string }) {
    try {
      const user = await this.userService.update(
        parseInt(data.userId, 10),
        { isActive: data.isActive }
      );
      const { password, ...result } = user;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.user.stats')
  async getUserStats(@Payload() data: { dateRange?: any; token: string }) {
    try {
      const stats = await this.userService.getStats();
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.user.findByEmail')
  async findUserByEmail(@Payload() data: { email: string; token: string }) {
    try {
      const user = await this.userService.findByEmail(data.email);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        };
      }
      
      const { password, ...result } = user;
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.user.validateCredentials')
  async validateUserCredentials(@Payload() data: { email: string; password: string }) {
    try {
      const user = await this.userService.validateUser(data.email, data.password);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        };
      }
      
      const { password, ...result } = user;
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: error.message,
        },
      };
    }
  }
}