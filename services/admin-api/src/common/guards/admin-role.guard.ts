import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isAdminRole, ADMIN_ROLES, AdminRole } from '../../shared/constants';

// Re-export for backward compatibility
export { ADMIN_ROLES, AdminRole };

/**
 * Admin Role Guard
 * 관리자 역할을 가진 사용자만 접근 허용
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User information not available',
        },
      });
    }

    const userRole = user.role || user.roleCode;

    if (!isAdminRole(userRole)) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'INSUFFICIENT_PRIVILEGES',
          message: 'Admin privileges required',
        },
      });
    }

    return true;
  }
}

/**
 * 특정 역할만 허용하는 데코레이터와 함께 사용할 메타데이터 키
 */
export const ROLES_KEY = 'roles';
