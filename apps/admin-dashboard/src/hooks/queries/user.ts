import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type UserFilters } from '@/lib/api/adminApi';
import { userKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import type { CreateUserDto, UpdateUserDto, ChangePasswordDto } from '@/types';

// ============================================
// Queries
// ============================================

export const useUsersQuery = (filters?: UserFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: userKeys.list({ ...filters, page, limit }),
    queryFn: () => adminApi.getUsers(filters, page, limit),
    staleTime: 1000 * 60 * 5,
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useUserQuery = (id: number) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => adminApi.getUser(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      showSuccessToast('사용자가 생성되었습니다.');
    },
    meta: { errorMessage: '사용자 생성에 실패했습니다.' },
  });
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) =>
      adminApi.updateUser(id, data),
    onSuccess: (updatedUser, { id }) => {
      queryClient.setQueryData(userKeys.detail(id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      showSuccessToast('사용자 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '사용자 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      showSuccessToast('사용자가 삭제되었습니다.');
    },
    meta: { errorMessage: '사용자 삭제에 실패했습니다.' },
  });
};

export const useUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminApi.updateUserStatus(id, status),
    onSuccess: (updatedUser, { id, status }) => {
      queryClient.setQueryData(userKeys.detail(id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      showSuccessToast(`사용자가 ${status === 'ACTIVE' ? '활성화' : '비활성화'}되었습니다.`);
    },
    meta: { errorMessage: '상태 변경에 실패했습니다.' },
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
      showSuccessToast('권한이 수정되었습니다.');
    },
    meta: { errorMessage: '권한 수정에 실패했습니다.' },
  });
};

export const useChangeUserPasswordMutation = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ChangePasswordDto }) =>
      adminApi.changeUserPassword(id, data),
    onSuccess: () => {
      showSuccessToast('비밀번호가 변경되었습니다.');
    },
    meta: { errorMessage: '비밀번호 변경에 실패했습니다.' },
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
    onSuccess: ({ deletedCount }, ids) => {
      ids.forEach((id) => {
        queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      showSuccessToast(`${deletedCount}명의 사용자가 삭제되었습니다.`);
    },
    meta: { errorMessage: '일괄 삭제에 실패했습니다.' },
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
    onSuccess: ({ updatedCount }, { status }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      showSuccessToast(`${updatedCount}명의 사용자가 ${status === 'ACTIVE' ? '활성화' : '비활성화'}되었습니다.`);
    },
    meta: { errorMessage: '일괄 상태 변경에 실패했습니다.' },
  });
};
