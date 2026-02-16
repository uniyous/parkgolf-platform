import { useQuery } from '@tanstack/react-query';
import { menuApi } from '@/lib/api/menuApi';
import { menuKeys } from './keys';
import { useAuthStore } from '@/stores/auth.store';

/**
 * admin-dashboard용 메뉴 트리 조회
 *
 * admin-dashboard는 가맹점 운영 도구이므로, 본사/협회 관리자도
 * 가맹점(FRANCHISE) 메뉴를 동일하게 사용합니다.
 * 본사 전용 메뉴는 platform-dashboard에서 제공됩니다.
 */
export const useMenuTreeQuery = () => {
  const currentAdmin = useAuthStore((state) => state.currentAdmin);
  const permissions = currentAdmin?.permissions ?? [];

  return useQuery({
    queryKey: menuKeys.tree('FRANCHISE', 'COMPANY'),
    queryFn: () => menuApi.getMenusByAdmin(permissions, 'FRANCHISE', 'COMPANY'),
    enabled: !!currentAdmin && permissions.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
