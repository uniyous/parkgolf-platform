import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/adminApi';
import { adminKeys, roleKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import type { CreateAdminDto, UpdateAdminDto } from '@/types';

// ============================================
// Queries
// ============================================

export const useAdminsQuery = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: adminKeys.list(filters),
    queryFn: () => adminApi.getAdmins(filters),
    staleTime: 1000 * 60 * 5,
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useAdminQuery = (id: number) => {
  return useQuery({
    queryKey: adminKeys.detail(id),
    queryFn: () => adminApi.getAdmin(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAdminStatsQuery = () => {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => adminApi.getAdminStats(),
    staleTime: 1000 * 60 * 10,
  });
};

export const usePermissionsQuery = () => {
  return useQuery({
    queryKey: adminKeys.permissions(),
    queryFn: () => adminApi.getPermissions(),
    staleTime: 1000 * 60 * 30,
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminDto) => adminApi.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      showSuccessToast('관리자가 생성되었습니다.');
    },
    meta: { errorMessage: '관리자 생성에 실패했습니다.' },
  });
};

export const useUpdateAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAdminDto }) =>
      adminApi.updateAdmin(id, data),
    onSuccess: (updatedAdmin, { id }) => {
      queryClient.setQueryData(adminKeys.detail(id), updatedAdmin);
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      showSuccessToast('관리자 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '관리자 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminApi.deleteAdmin(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: adminKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      showSuccessToast('관리자가 삭제되었습니다.');
    },
    meta: { errorMessage: '관리자 삭제에 실패했습니다.' },
  });
};

export const useUpdateAdminStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      adminApi.updateAdminStatus(id, isActive),
    onSuccess: (updatedAdmin, { id, isActive }) => {
      queryClient.setQueryData(adminKeys.detail(id), updatedAdmin);
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      showSuccessToast(isActive ? '관리자가 활성화되었습니다.' : '관리자가 비활성화되었습니다.');
    },
    meta: { errorMessage: '상태 변경에 실패했습니다.' },
  });
};

export const useToggleAdminStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminApi.toggleAdminStatus(id),
    onSuccess: (updatedAdmin, id) => {
      queryClient.setQueryData(adminKeys.detail(id), updatedAdmin);
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      showSuccessToast('상태가 변경되었습니다.');
    },
    meta: { errorMessage: '상태 변경에 실패했습니다.' },
  });
};

export const useUpdateAdminPermissionsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      adminApi.updateAdminPermissions(id, permissionIds),
    onSuccess: (updatedAdmin, { id }) => {
      queryClient.setQueryData(adminKeys.detail(id), updatedAdmin);
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      showSuccessToast('권한이 수정되었습니다.');
    },
    meta: { errorMessage: '권한 수정에 실패했습니다.' },
  });
};

export const useBulkDeleteAdminsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => adminApi.deleteAdmin(id))
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`${failures.length}/${ids.length} 삭제 실패`);
      }

      return { deletedCount: ids.length };
    },
    onSuccess: ({ deletedCount }, ids) => {
      ids.forEach((id) => {
        queryClient.removeQueries({ queryKey: adminKeys.detail(id) });
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      showSuccessToast(`${deletedCount}명의 관리자가 삭제되었습니다.`);
    },
    meta: { errorMessage: '일괄 삭제에 실패했습니다.' },
  });
};

export const useBulkUpdateAdminStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, isActive }: { ids: number[]; isActive: boolean }) => {
      const results = await Promise.allSettled(
        ids.map((id) => adminApi.updateAdminStatus(id, isActive))
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`${failures.length}/${ids.length} 업데이트 실패`);
      }

      return { updatedCount: ids.length };
    },
    onSuccess: ({ updatedCount }, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      showSuccessToast(`${updatedCount}명의 관리자가 ${isActive ? '활성화' : '비활성화'}되었습니다.`);
    },
    meta: { errorMessage: '일괄 상태 변경에 실패했습니다.' },
  });
};

// ============================================
// Role Queries
// ============================================

export const useRolesQuery = (userType?: string) => {
  return useQuery({
    queryKey: roleKeys.list(userType),
    queryFn: () => adminApi.getRoles(userType),
    staleTime: 1000 * 60 * 30, // 30분
  });
};

export const useRolesWithPermissionsQuery = (userType?: string) => {
  return useQuery({
    queryKey: roleKeys.withPermissions(userType),
    queryFn: () => adminApi.getRolesWithPermissions(userType),
    staleTime: 1000 * 60 * 30, // 30분
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useRolePermissionsQuery = (roleCode: string) => {
  return useQuery({
    queryKey: roleKeys.permissions(roleCode),
    queryFn: () => adminApi.getRolePermissions(roleCode),
    enabled: !!roleCode,
    staleTime: 1000 * 60 * 30, // 30분
  });
};

export const useUpdateRolePermissionsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleCode, permissions }: { roleCode: string; permissions: string[] }) =>
      adminApi.updateRolePermissions(roleCode, permissions),
    onSuccess: (_, { roleCode }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.permissions(roleCode) });
      queryClient.invalidateQueries({ queryKey: roleKeys.withPermissions() });
      queryClient.invalidateQueries({ queryKey: roleKeys.list() });
      showSuccessToast('역할 권한이 수정되었습니다.');
    },
    meta: { errorMessage: '역할 권한 수정에 실패했습니다.' },
  });
};
