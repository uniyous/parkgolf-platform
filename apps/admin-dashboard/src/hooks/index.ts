// Shared hooks
export { useFormManager } from './useFormManager';
export { useModal } from './useModal';
export { useConfirmation } from './useConfirmation';
export { useRolePermission } from './useRolePermission';
export { withPermission, PermissionGuard } from './usePermissionGuard';

// Auth hooks
export { useAuth, useAuthInitialize } from './useAuth';
export { useProtectedRoute, useHasPermission, useCanManageRole } from './useAuth';

// Action hooks
export { useAdminActions } from './useAdminActions';
export { useUserActions } from './useUserActions';

// Management hooks
export { useCompanyManagement } from './useCompanyManagement';
export { useClubManagement, useClub } from './useClubManagement';
export { useClubDetail } from './useClubDetail';

// TanStack Query hooks - re-export all queries
export * from './queries';