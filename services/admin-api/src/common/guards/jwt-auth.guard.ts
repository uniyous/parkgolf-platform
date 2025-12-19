import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * JWT Authentication Guard
 * Bearer 토큰 존재 여부를 확인하고 request.token에 저장
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
        },
      });
    }

    // request 객체에 토큰 저장 (다른 가드나 컨트롤러에서 사용)
    (request as any).token = token;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must use Bearer scheme',
        },
      });
    }

    return authorization.substring(7);
  }
}
