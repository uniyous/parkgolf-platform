import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * 관리자 역할 목록
 */
export const ADMIN_ROLES = [
  // Platform Level
  'PLATFORM_OWNER',
  'PLATFORM_ADMIN',
  'PLATFORM_SUPPORT',
  'PLATFORM_ANALYST',
  // Company Level
  'COMPANY_OWNER',
  'COMPANY_MANAGER',
  // Course Level
  'COURSE_MANAGER',
  'STAFF',
  'READONLY_STAFF',
  // Legacy roles
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

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

    if (!this.isAdminRole(userRole)) {
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

  /**
   * 주어진 역할이 관리자 역할인지 확인
   */
  private isAdminRole(role: string): boolean {
    if (!role) return false;

    const normalizedRole = role.toUpperCase();
    return ADMIN_ROLES.some(
      (adminRole) => adminRole.toUpperCase() === normalizedRole,
    );
  }
}

/**
 * 특정 역할만 허용하는 데코레이터와 함께 사용할 메타데이터 키
 */
export const ROLES_KEY = 'roles';
