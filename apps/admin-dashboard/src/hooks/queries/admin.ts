import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/adminApi';
import { adminKeys, roleKeys } from './keys';
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
    },
    onError: (error) => {
      console.error('Failed to create admin:', error);
    },
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
    },
    onError: (error) => {
      console.error('Failed to update admin:', error);
    },
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
    },
    onError: (error) => {
      console.error('Failed to delete admin:', error);
    },
  });
};

export const useUpdateAdminStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      adminApi.updateAdminStatus(id, isActive),
    onSuccess: (updatedAdmin, { id }) => {
      queryClient.setQueryData(adminKeys.detail(id), updatedAdmin);
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update admin status:', error);
    },
  });
};

export const useToggleAdminStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminApi.toggleAdminStatus(id),
    onSuccess: (updatedAdmin, id) => {
      queryClient.setQueryData(adminKeys.detail(id), updatedAdmin);
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to toggle admin status:', error);
    },
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
    },
    onError: (error) => {
      console.error('Failed to update admin permissions:', error);
    },
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
    onSuccess: (_, ids) => {
      ids.forEach((id) => {
        queryClient.removeQueries({ queryKey: adminKeys.detail(id) });
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
    onError: (error) => {
      console.error('Failed to bulk delete admins:', error);
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to bulk update admin status:', error);
    },
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
    },
    onError: (error) => {
      console.error('Failed to update role permissions:', error);
    },
  });
};
