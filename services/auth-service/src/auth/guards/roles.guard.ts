import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest<{ user: JwtPayload & { roles: Role[] } }>();

        if (!user || !user.roles) {
            throw new ForbiddenException('User roles not found. Ensure JWT payload includes roles.');
        }

        const hasRequiredRole = requiredRoles.some((role) => user.roles.includes(role));

        if (!hasRequiredRole) {
            throw new ForbiddenException(`User does not have the required role(s): ${requiredRoles.join(', ')}`);
        }
        return true;
    }
}