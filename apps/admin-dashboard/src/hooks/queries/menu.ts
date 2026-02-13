import { useQuery } from '@tanstack/react-query';
import { menuApi } from '@/lib/api/menuApi';
import { menuKeys } from './keys';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 현재 로그인된 관리자의 권한/회사유형 기반 메뉴 트리 조회
 */
export const useMenuTreeQuery = () => {
  const currentAdmin = useAuthStore((state) => state.currentAdmin);
  const permissions = currentAdmin?.permissions ?? [];
  const companyType = currentAdmin?.primaryCompany?.company?.companyType ?? 'FRANCHISE';
  const scope = currentAdmin?.primaryScope ?? 'COMPANY';

  return useQuery({
    queryKey: menuKeys.tree(companyType, scope),
    queryFn: () => menuApi.getMenusByAdmin(permissions, companyType, scope),
    enabled: !!currentAdmin && permissions.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
