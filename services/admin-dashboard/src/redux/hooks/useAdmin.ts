import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './reduxHooks';
import { fetchAdmins as fetchAdminsThunk, selectAdmin as selectAdminAction } from '../slices/adminSlice';
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
  const dispatch = useAppDispatch();
  const { admins, isLoading, error } = useAppSelector((state: any) => state.admin);

  const fetchAdmins = useCallback(async () => {
    try {
      console.log('📡 Dispatching fetchAdminsThunk...');
      dispatch(fetchAdminsThunk());
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  }, [dispatch]);

  const createAdmin = useCallback(async (data: CreateAdminDto): Promise<Admin | null> => {
    try {
      const admin = await adminApi.createAdmin(data);
      // Refresh the admin list
      dispatch(fetchAdminsThunk());
      return admin;
    } catch (error) {
      console.error('Failed to create admin:', error);
      return null;
    }
  }, [dispatch]);

  const updateAdmin = useCallback(async (id: number, data: UpdateAdminDto): Promise<Admin | null> => {
    try {
      const admin = await adminApi.updateAdmin(id, data);
      // Refresh the admin list
      dispatch(fetchAdminsThunk());
      return admin;
    } catch (error) {
      console.error('Failed to update admin:', error);
      return null;
    }
  }, [dispatch]);

  const deleteAdmin = useCallback(async (id: number): Promise<boolean> => {
    try {
      await adminApi.deleteAdmin(id);
      // Refresh the admin list
      dispatch(fetchAdminsThunk());
      return true;
    } catch (error) {
      console.error('Failed to delete admin:', error);
      return false;
    }
  }, [dispatch]);

  const selectAdmin = useCallback((id: number | null) => {
    const admin = admins.find(a => a.id === id) || null;
    dispatch(selectAdminAction(admin));
  }, [dispatch, admins]);

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