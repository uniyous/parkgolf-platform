import { useCallback } from 'react';
import { useAdmins, useCreateAdmin, useUpdateAdmin, useDeleteAdmin } from './queries';
import { useAdminUIStore } from '@/stores';
import type { Admin, CreateAdminDto, UpdateAdminDto } from '@/types';

export interface UseAdminActionsReturn {
  admins: Admin[];
  isLoading: boolean;
  error: string | null;
  fetchAdmins: () => Promise<void>;
  createAdmin: (data: CreateAdminDto) => Promise<Admin | null>;
  updateAdmin: (id: number, data: UpdateAdminDto) => Promise<Admin | null>;
  deleteAdmin: (id: number) => Promise<boolean>;
  selectAdmin: (id: number | null) => void;
}

export const useAdminActions = (): UseAdminActionsReturn => {
  // TanStack Query hooks
  const { data: admins = [], isLoading, error, refetch } = useAdmins();
  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();
  const deleteAdminMutation = useDeleteAdmin();

  // UI store
  const { setEditingAdmin } = useAdminUIStore();

  const fetchAdmins = useCallback(async () => {
    try {
      console.log('Refetching admins...');
      await refetch();
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  }, [refetch]);

  const createAdmin = useCallback(
    async (data: CreateAdminDto): Promise<Admin | null> => {
      try {
        const admin = await createAdminMutation.mutateAsync(data);
        return admin;
      } catch (error) {
        console.error('Failed to create admin:', error);
        return null;
      }
    },
    [createAdminMutation]
  );

  const updateAdmin = useCallback(
    async (id: number, data: UpdateAdminDto): Promise<Admin | null> => {
      try {
        const admin = await updateAdminMutation.mutateAsync({ id, data });
        return admin;
      } catch (error) {
        console.error('Failed to update admin:', error);
        return null;
      }
    },
    [updateAdminMutation]
  );

  const deleteAdmin = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await deleteAdminMutation.mutateAsync(id);
        return true;
      } catch (error) {
        console.error('Failed to delete admin:', error);
        return false;
      }
    },
    [deleteAdminMutation]
  );

  const selectAdmin = useCallback(
    (id: number | null) => {
      const admin = id ? admins.find((a) => a.id === id) || null : null;
      setEditingAdmin(admin);
    },
    [admins, setEditingAdmin]
  );

  return {
    admins,
    isLoading:
      isLoading ||
      createAdminMutation.isPending ||
      updateAdminMutation.isPending ||
      deleteAdminMutation.isPending,
    error: error?.message || null,
    fetchAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    selectAdmin,
  };
};