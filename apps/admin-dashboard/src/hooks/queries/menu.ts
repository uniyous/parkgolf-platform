import { useQuery } from '@tanstack/react-query';
import { menuApi, getStaticMenuFallback } from '@/lib/api/menuApi';
import type { MenuTreeItem } from '@/lib/api/menuApi';
import { menuKeys } from './keys';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 현재 로그인된 관리자의 권한/회사유형 기반 메뉴 트리 조회
 * DB 메뉴 API 실패 시 정적 메뉴로 폴백
 */
export const useMenuTreeQuery = () => {
  const currentAdmin = useAuthStore((state) => state.currentAdmin);
  const permissions = currentAdmin?.permissions ?? [];
  const companyType = currentAdmin?.primaryCompany?.company?.companyType ?? 'FRANCHISE';
  const scope = currentAdmin?.primaryScope ?? 'COMPANY';

  const query = useQuery({
    queryKey: menuKeys.tree(companyType, scope),
    queryFn: async (): Promise<MenuTreeItem[]> => {
      try {
        const menus = await menuApi.getMenusByAdmin(permissions, companyType, scope);
        if (menus && menus.length > 0) return menus;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[Menu] DB 메뉴 API 실패, 정적 메뉴 사용:', error);
        }
      }
      // DB 메뉴가 비어있거나 API 실패 시 정적 폴백
      return getStaticMenuFallback(permissions);
    },
    enabled: !!currentAdmin && permissions.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return query;
};
