import { useCallback } from 'react';
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateUserStatusMutation,
  useUpdateUserPermissionsMutation,
} from './queries';
import { useUserUIStore } from '@/stores';
import type { User, CreateAdminDto, UpdateAdminDto, UserStatus } from '@/types';

export interface UseUserActionsReturn {
  users: User[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (data: CreateAdminDto) => Promise<User | null>;
  updateUser: (id: number, data: UpdateAdminDto) => Promise<User | null>;
  deleteUser: (id: number) => Promise<boolean>;
  updateUserStatus: (id: number, status: UserStatus) => Promise<User | null>;
  updateUserPermissions: (id: number, permissions: string[]) => Promise<User | null>;
  selectUser: (id: number | null) => void;
}

export const useUserActions = (): UseUserActionsReturn => {
  // Get filters and pagination from UI store
  const { filters, page, limit, setSelectedUser } = useUserUIStore();

  // TanStack Query hooks
  const { data, isLoading, error, refetch } = useUsersQuery(
    {
      search: filters.search,
      role: filters.membershipTier,
      status: filters.status,
    },
    page,
    limit
  );

  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const updateStatusMutation = useUpdateUserStatusMutation();
  const updatePermissionsMutation = useUpdateUserPermissionsMutation();

  const users = data?.users || [];
  const total = data?.total || 0;

  const fetchUsers = useCallback(async () => {
    try {
      console.log('Refetching users...');
      await refetch();
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, [refetch]);

  const createUser = useCallback(
    async (data: CreateAdminDto): Promise<User | null> => {
      try {
        const user = await createUserMutation.mutateAsync(data);
        return user;
      } catch (error) {
        console.error('Failed to create user:', error);
        return null;
      }
    },
    [createUserMutation]
  );

  const updateUser = useCallback(
    async (id: number, data: UpdateAdminDto): Promise<User | null> => {
      try {
        const user = await updateUserMutation.mutateAsync({ id, data });
        return user;
      } catch (error) {
        console.error('Failed to update user:', error);
        return null;
      }
    },
    [updateUserMutation]
  );

  const deleteUser = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await deleteUserMutation.mutateAsync(id);
        return true;
      } catch (error) {
        console.error('Failed to delete user:', error);
        return false;
      }
    },
    [deleteUserMutation]
  );

  const updateUserStatus = useCallback(
    async (id: number, status: UserStatus): Promise<User | null> => {
      try {
        const user = await updateStatusMutation.mutateAsync({ id, status });
        return user;
      } catch (error) {
        console.error('Failed to update user status:', error);
        return null;
      }
    },
    [updateStatusMutation]
  );

  const updateUserPermissions = useCallback(
    async (id: number, permissions: string[]): Promise<User | null> => {
      try {
        const user = await updatePermissionsMutation.mutateAsync({ id, permissions });
        return user;
      } catch (error) {
        console.error('Failed to update user permissions:', error);
        return null;
      }
    },
    [updatePermissionsMutation]
  );

  const selectUser = useCallback(
    (id: number | null) => {
      const user = id ? users.find((u) => u.id === id) || null : null;
      setSelectedUser(user);
    },
    [users, setSelectedUser]
  );

  return {
    users,
    total,
    isLoading:
      isLoading ||
      createUserMutation.isPending ||
      updateUserMutation.isPending ||
      deleteUserMutation.isPending ||
      updateStatusMutation.isPending ||
      updatePermissionsMutation.isPending,
    error: error?.message || null,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    updateUserStatus,
    updateUserPermissions,
    selectUser,
  };
};
