// Auth store
export {
  useAuthStore,
  useCurrentAdmin,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  initializeAuthFromStorage,
} from './auth.store';
export type { ApiUserResponse } from './auth.store';

// Breadcrumb store
export { useBreadcrumbStore, useBreadcrumbs, useBreadcrumb, useSetBreadcrumb } from './breadcrumb.store';
export type { BreadcrumbItem } from './breadcrumb.store';

// Company store
export { useCompanyStore } from './company.store';

// Course store
export { useCourseStore } from './course.store';

// Admin UI store
export {
  useAdminUIStore,
  useAdminViewMode,
  useEditingAdmin,
  usePermissionAdmin,
  useSelectedAdmins,
  useShowBulkActions,
} from './admin.store';

// User UI store
export {
  useUserUIStore,
  useUserViewMode,
  useEditingUser,
  usePermissionUser,
  useSelectedUser,
  useSelectedUsers,
  useShowUserBulkActions,
  useUserFilters,
  useUserPagination,
} from './user.store';
