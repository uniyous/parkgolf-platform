import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Token Decorator
 * JwtAuthGuard에서 추출한 토큰을 컨트롤러에서 쉽게 가져올 수 있도록 함
 *
 * @example
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@Token() token: string) {
 *   return this.authService.getProfile(token);
 * }
 */
export const Token = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.token;
  },
);
