import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Admin Context 정보
 *
 * JWT 토큰에서 추출한 관리자 컨텍스트 + 요청 헤더에서 결정한 companyId
 */
export interface AdminContextData {
  /** 관리자 ID (JWT sub) */
  adminId: number;
  /** 관리자 이메일 */
  email: string;
  /** 역할 코드 (예: COMPANY_ADMIN, PLATFORM_ADMIN) */
  roleCode: string;
  /** 스코프: PLATFORM 또는 COMPANY */
  scope: string;
  /** 현재 컨텍스트의 companyId (COMPANY 스코프: JWT에서, PLATFORM 지원모드: X-Company-Id 헤더에서) */
  companyId: number | null;
  /** Bearer 토큰 원본 */
  token: string;
}

/**
 * JWT 페이로드를 base64 디코딩 (verification 없이)
 * admin-api는 BFF이므로 토큰 검증은 마이크로서비스에서 수행
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * AdminContext 파라미터 데코레이터
 *
 * JWT 토큰을 디코딩하여 관리자 컨텍스트를 반환합니다.
 * - COMPANY 스코프: JWT의 companyId 사용
 * - PLATFORM 스코프 + 지원 모드: X-Company-Id 헤더 사용
 * - PLATFORM 스코프 + 본사 모드: companyId = null (전체 조회)
 *
 * @example
 * @Get()
 * async getClubs(@AdminContext() ctx: AdminContextData) {
 *   return this.service.getClubs(ctx.companyId, ctx.token);
 * }
 */
export const AdminContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminContextData | null => {
    const request = ctx.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }

    const token = authorization.substring(7);
    const payload = decodeJwtPayload(token);

    if (!payload || payload.type !== 'admin') {
      return null;
    }

    const adminId = payload.sub as number;
    const email = (payload.email as string) || '';
    const roles = (payload.roles as string[]) || [];
    const roleCode = roles[0] || 'COMPANY_VIEWER';
    const scope = (payload.scope as string) || 'COMPANY';
    const jwtCompanyId = (payload.companyId as number) || null;

    // CompanyId 결정 로직
    let companyId: number | null;

    if (scope === 'PLATFORM') {
      // 플랫폼 스코프: X-Company-Id 헤더가 있으면 지원 모드
      const headerCompanyId = request.headers['x-company-id'];
      companyId = headerCompanyId ? parseInt(headerCompanyId, 10) : null;
      if (companyId !== null && isNaN(companyId)) {
        companyId = null;
      }
    } else {
      // 회사 스코프: JWT의 companyId 사용
      companyId = jwtCompanyId;
    }

    return {
      adminId,
      email,
      roleCode,
      scope,
      companyId,
      token,
    };
  },
);
