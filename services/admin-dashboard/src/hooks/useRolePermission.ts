import { useMemo } from 'react';
import { useAuth } from '../redux/hooks/useAuth';
import type { Permission, AdminRole, Admin } from '../types';

export interface UseRolePermissionReturn {
  currentAdmin: Admin | null;
  currentRole: AdminRole | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isRole: (role: AdminRole) => boolean;
  isAnyRole: (roles: AdminRole[]) => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isModerator: () => boolean;
  isViewer: () => boolean;
  canReadCourses: () => boolean;
  canWriteCourses: () => boolean;
  canDeleteCourses: () => boolean;
  canReadBookings: () => boolean;
  canWriteBookings: () => boolean;
  canDeleteBookings: () => boolean;
  canReadTimeSlots: () => boolean;
  canWriteTimeSlots: () => boolean;
  canDeleteTimeSlots: () => boolean;
  canManageAdmins: () => boolean;
  canDeleteAdmins: () => boolean;
  canManageSystem: () => boolean;
}

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: [
    'COURSE_READ', 'COURSE_WRITE', 'COURSE_DELETE',
    'BOOKING_READ', 'BOOKING_WRITE', 'BOOKING_DELETE',
    'TIMESLOT_READ', 'TIMESLOT_WRITE', 'TIMESLOT_DELETE',
    'ADMIN_READ', 'ADMIN_WRITE', 'ADMIN_DELETE',
    'SYSTEM_SETTINGS',
  ] as Permission[],
  ADMIN: [
    'COURSE_READ', 'COURSE_WRITE', 'COURSE_DELETE',
    'BOOKING_READ', 'BOOKING_WRITE', 'BOOKING_DELETE',
    'TIMESLOT_READ', 'TIMESLOT_WRITE', 'TIMESLOT_DELETE',
    'ADMIN_READ',
  ] as Permission[],
  MODERATOR: [
    'COURSE_READ',
    'BOOKING_READ', 'BOOKING_WRITE',
    'TIMESLOT_READ', 'TIMESLOT_WRITE',
  ] as Permission[],
  VIEWER: [
    'COURSE_READ',
    'BOOKING_READ',
    'TIMESLOT_READ',
  ] as Permission[],
};

export function useRolePermission(): UseRolePermissionReturn {
  const { user } = useAuth();
  
  const currentAdmin = user as Admin | null;
  const currentRole = currentAdmin?.role as AdminRole | null;
  
  const permissions = useMemo((): Permission[] => {
    if (!currentAdmin || !currentRole) return [];
    return currentAdmin.permissions || ROLE_PERMISSIONS[currentRole] || [];
  }, [currentAdmin, currentRole]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  const isRole = (role: AdminRole): boolean => {
    return currentRole === role;
  };

  const isAnyRole = (roles: AdminRole[]): boolean => {
    return currentRole ? roles.includes(currentRole) : false;
  };

  const isSuperAdmin = (): boolean => isRole('SUPER_ADMIN');
  const isAdmin = (): boolean => isRole('ADMIN');
  const isModerator = (): boolean => isRole('MODERATOR');
  const isViewer = (): boolean => isRole('VIEWER');

  const canReadCourses = (): boolean => hasPermission('COURSE_READ');
  const canWriteCourses = (): boolean => hasPermission('COURSE_WRITE');
  const canDeleteCourses = (): boolean => hasPermission('COURSE_DELETE');

  const canReadBookings = (): boolean => hasPermission('BOOKING_READ');
  const canWriteBookings = (): boolean => hasPermission('BOOKING_WRITE');
  const canDeleteBookings = (): boolean => hasPermission('BOOKING_DELETE');

  const canReadTimeSlots = (): boolean => hasPermission('TIMESLOT_READ');
  const canWriteTimeSlots = (): boolean => hasPermission('TIMESLOT_WRITE');
  const canDeleteTimeSlots = (): boolean => hasPermission('TIMESLOT_DELETE');

  const canManageAdmins = (): boolean => hasAnyPermission(['ADMIN_WRITE', 'ADMIN_DELETE']);
  const canDeleteAdmins = (): boolean => hasPermission('ADMIN_DELETE');
  const canManageSystem = (): boolean => hasPermission('SYSTEM_SETTINGS');

  return {
    currentAdmin,
    currentRole,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    isAnyRole,
    isSuperAdmin,
    isAdmin,
    isModerator,
    isViewer,
    canReadCourses,
    canWriteCourses,
    canDeleteCourses,
    canReadBookings,
    canWriteBookings,
    canDeleteBookings,
    canReadTimeSlots,
    canWriteTimeSlots,
    canDeleteTimeSlots,
    canManageAdmins,
    canDeleteAdmins,
    canManageSystem,
  };
}