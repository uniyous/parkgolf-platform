import { useAppSelector } from './reduxHooks';
import { adminApi } from '../../api/adminApi';
import type { Admin, CreateAdminDto, UpdateAdminDto } from '../../types';

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
  const { users: admins, isLoading, error } = useAppSelector((state: any) => state.admin);

  const fetchAdmins = async () => {
    try {
      // Set loading state
      // For now, we'll use the API directly since we need proper admin slice implementation
      const admins = await adminApi.getAdmins();
      // Update state with admins
      // This would require proper Redux slice implementation
      console.log('Fetched admins:', admins);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  };

  const createAdmin = async (data: CreateAdminDto): Promise<Admin | null> => {
    try {
      const admin = await adminApi.createAdmin(data);
      // Refresh the admin list
      await fetchAdmins();
      return admin;
    } catch (error) {
      console.error('Failed to create admin:', error);
      return null;
    }
  };

  const updateAdmin = async (id: number, data: UpdateAdminDto): Promise<Admin | null> => {
    try {
      const admin = await adminApi.updateAdmin(id, data);
      // Refresh the admin list
      await fetchAdmins();
      return admin;
    } catch (error) {
      console.error('Failed to update admin:', error);
      return null;
    }
  };

  const deleteAdmin = async (id: number): Promise<boolean> => {
    try {
      await adminApi.deleteAdmin(id);
      // Refresh the admin list
      await fetchAdmins();
      return true;
    } catch (error) {
      console.error('Failed to delete admin:', error);
      return false;
    }
  };

  const selectAdmin = (id: number | null) => {
    // This would require proper Redux slice implementation
    console.log('Selected admin:', id);
  };

  return {
    admins,
    isLoading,
    error,
    fetchAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    selectAdmin,
  };
};