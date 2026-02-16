import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import type { Permission } from '@/types';

/**
 * 특정 도메인에 대한 액션 권한 판단 훅
 *
 * ADMIN_SITE_PLAN.md 2.4:
 * - canView   = 도메인 권한 OR VIEW OR ALL
 * - canCreate = 도메인 권한 OR ALL
 * - canEdit   = 도메인 권한 OR ALL
 * - canDelete = 도메인 권한 OR ALL
 * - isViewOnly = VIEW만 있고 도메인 권한/ALL 없음
 */
export function useActionPermissions(domainPermission: Permission) {
  const permissions = useAuthStore((state) => state.currentAdmin?.permissions ?? []);

  return useMemo(() => {
    const hasAll = permissions.includes('ALL');
    const hasDomain = permissions.includes(domainPermission);
    const hasView = permissions.includes('VIEW');

    return {
      canView: hasDomain || hasView || hasAll,
      canCreate: hasDomain || hasAll,
      canEdit: hasDomain || hasAll,
      canDelete: hasDomain || hasAll,
      isViewOnly: hasView && !hasDomain && !hasAll,
    };
  }, [permissions, domainPermission]);
}
