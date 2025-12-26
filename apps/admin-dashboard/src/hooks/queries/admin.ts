import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/adminApi';
import { adminKeys } from './keys';
import type { CreateAdminDto, UpdateAdminDto } from '@/types';

// ============================================
// Queries
// ============================================

export const useAdmins = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: adminKeys.list(filters),
    queryFn: () => adminApi.getAdmins(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAdmin = (id: number) => {
  return useQuery({
    queryKey: adminKeys.detail(id),
    queryFn: () => adminApi.getAdmin(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => adminApi.getAdminStats(),
    staleTime: 1000 * 60 * 10,
  });
};

export const usePermissions = () => {
  return useQuery({
    queryKey: adminKeys.permissions(),
    queryFn: () => adminApi.getPermissions(),
    staleTime: 1000 * 60 * 30,
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateAdmin = () => {
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

export const useUpdateAdmin = () => {
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

export const useDeleteAdmin = () => {
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

export const useUpdateAdminStatus = () => {
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

export const useToggleAdminStatus = () => {
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

export const useUpdateAdminPermissions = () => {
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

export const useBulkDeleteAdmins = () => {
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

export const useBulkUpdateAdminStatus = () => {
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
