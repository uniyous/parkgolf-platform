import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * JWT 토큰에서 추출된 사용자 정보
 */
export interface JwtUser {
  userId: number;
  email: string;
  name?: string;
  roles?: string[];
}

/**
 * 현재 인증된 사용자 정보를 추출하는 데코레이터
 *
 * JwtAuthGuard와 함께 사용해야 합니다.
 *
 * @example
 * // 전체 사용자 정보 가져오기
 * @Get()
 * async getProfile(@CurrentUser() user: JwtUser) {
 *   console.log(user.userId, user.email);
 * }
 *
 * @example
 * // 특정 필드만 가져오기
 * @Get()
 * async getProfile(@CurrentUser('userId') userId: number) {
 *   console.log(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): JwtUser | number | string | string[] | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
