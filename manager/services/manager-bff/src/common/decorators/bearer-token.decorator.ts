import {
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Bearer Token 추출 데코레이터
 *
 * Authorization 헤더에서 Bearer 토큰을 추출합니다.
 * 토큰이 없거나 형식이 잘못된 경우 UnauthorizedException을 발생시킵니다.
 *
 * @example
 * // 필수 토큰 (기본값)
 * @Get()
 * async getUser(@BearerToken() token: string) { ... }
 *
 * // 선택적 토큰
 * @Get()
 * async getPublicData(@BearerToken({ required: false }) token?: string) { ... }
 */
export const BearerToken = createParamDecorator(
  (options: { required?: boolean } = { required: true }, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      if (options.required !== false) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'AUTH_002',
              message: 'Authorization token required',
            },
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      return undefined;
    }

    return authorization.substring(7);
  },
);
