import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type UserFilters } from '@/lib/api/adminApi';
import { userKeys } from './keys';
import type { CreateAdminDto, UpdateAdminDto, ChangePasswordDto } from '@/types';

// ============================================
// Queries
// ============================================

export const useUsersQuery = (filters?: UserFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: userKeys.list({ ...filters, page, limit }),
    queryFn: () => adminApi.getUsers(filters, page, limit),
    staleTime: 1000 * 60 * 5,
  });
};

export const useUserQuery = (id: number) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => adminApi.getUser(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminDto) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAdminDto }) =>
      adminApi.updateUser(id, data),
    onSuccess: (updatedUser, { id }) => {
      queryClient.setQueryData(userKeys.detail(id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update user:', error);
    },
  });
};

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to delete user:', error);
    },
  });
};

export const useUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminApi.updateUserStatus(id, status),
    onSuccess: (updatedUser, { id }) => {
      queryClient.setQueryData(userKeys.detail(id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update user status:', error);
    },
  });
};

export const useUpdateUserPermissionsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: string[] }) =>
      adminApi.updateUserPermissions(id, permissions),
    onSuccess: (updatedUser, { id }) => {
      queryClient.setQueryData(userKeys.detail(id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update user permissions:', error);
    },
  });
};

export const useChangeUserPasswordMutation = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ChangePasswordDto }) =>
      adminApi.changeUserPassword(id, data),
    onError: (error) => {
      console.error('Failed to change user password:', error);
    },
  });
};

export const useBulkDeleteUsersMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => adminApi.deleteUser(id))
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`${failures.length}/${ids.length} 삭제 실패`);
      }

      return { deletedCount: ids.length };
    },
    onSuccess: (_, ids) => {
      ids.forEach((id) => {
        queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to bulk delete users:', error);
    },
  });
};

export const useBulkUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      const results = await Promise.allSettled(
        ids.map((id) => adminApi.updateUserStatus(id, status))
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`${failures.length}/${ids.length} 업데이트 실패`);
      }

      return { updatedCount: ids.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to bulk update user status:', error);
    },
  });
};
