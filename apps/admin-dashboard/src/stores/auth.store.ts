import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Admin, AdminRole, Permission } from '@/types';
import {
  hasPermission as checkPermission,
  canManageAdmin as checkCanManageAdmin,
  isPlatformAdmin,
  getRoleScope,
  getDefaultPermissions,
  ADMIN_ROLE_LABELS,
} from '@/utils/admin-permissions';

interface AuthState {
  currentAdmin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setCurrentAdmin: (admin: Admin | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  clearError: () => void;
  hydrateFromLogin: (user: any, token: string) => void;
  hydrateFromProfile: (apiUser: any, token: string) => void;
  hasPermission: (permission: Permission) => boolean;
  canManageAdminRole: (targetRole: AdminRole) => boolean;
  canAccessCompany: (companyId: number) => boolean;
  canAccessCourse: (courseId: number) => boolean;
  getDisplayInfo: () => { name: string; role: string; scope: string; company?: string };
}

// 백엔드 역할 코드를 프론트엔드 AdminRole로 매핑
const mapToAdminRole = (role: string): AdminRole => {
  const roleUpper = (role || '').toUpperCase();

  // 시스템 관리자 역할들
  if (['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'PLATFORM_ADMIN', 'PLATFORM_OWNER'].includes(roleUpper)) {
    return 'ADMIN';
  }
  // 고객지원 역할
  if (['SUPPORT', 'CUSTOMER_SUPPORT'].includes(roleUpper)) {
    return 'SUPPORT';
  }
  // 운영 관리자 역할
  if (['MANAGER', 'OPERATION_MANAGER', 'COMPANY_ADMIN'].includes(roleUpper)) {
    return 'MANAGER';
  }
  // 현장 직원 역할
  if (['STAFF', 'COURSE_STAFF', 'OPERATOR'].includes(roleUpper)) {
    return 'STAFF';
  }
  // 그 외는 조회 전용
  return 'VIEWER';
};

const convertUserToAdmin = (user: any): Admin => {
  // roles 배열 또는 role/roleCode 문자열 처리
  let rawRole = '';
  if (user.roleCode) {
    rawRole = user.roleCode;
  } else if (user.role) {
    rawRole = user.role;
  } else if (Array.isArray(user.roles) && user.roles.length > 0) {
    rawRole = user.roles[0];
  }

  const adminRole = mapToAdminRole(rawRole);
  const scope = getRoleScope(adminRole);

  let permissions: Permission[];
  if (user.permissions && user.permissions.length > 0) {
    permissions = user.permissions.map((p: any) =>
      typeof p === 'string' ? p : p.permission
    ) as Permission[];
  } else {
    // 권한이 없으면 역할 기반 기본 권한 사용
    permissions = getDefaultPermissions(adminRole);
  }

  // 디버그 로그 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('[Auth] User role mapping:', { rawRole, adminRole, permissions });
  }

  return {
    id: user.id,
    username: user.username || user.email,
    email: user.email,
    name: user.name || user.username || 'Unknown',
    role: adminRole,
    scope: scope,
    permissions: permissions,
    isActive: user.isActive ?? true,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
    companyId: user.companyId,
    courseIds: user.courseIds,
    phone: user.phone,
    department: user.department,
    description: user.description,
    company: user.company,
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentAdmin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setCurrentAdmin: (admin) =>
        set({ currentAdmin: admin, isAuthenticated: !!admin }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        set({
          currentAdmin: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      hydrateFromLogin: (user, token) => {
        const admin = convertUserToAdmin(user);
        localStorage.setItem('accessToken', token);
        localStorage.setItem('currentUser', JSON.stringify({
          id: admin.id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          type: 'admin',
          permissions: admin.permissions,
        }));
        set({
          currentAdmin: admin,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      hydrateFromProfile: (apiUser, token) => {
        const admin = convertUserToAdmin(apiUser);
        localStorage.setItem('currentUser', JSON.stringify({
          id: admin.id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          type: 'admin',
          permissions: admin.permissions,
        }));
        set({
          currentAdmin: admin,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      hasPermission: (permission) => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        return checkPermission(admin.permissions, permission);
      },

      canManageAdminRole: (targetRole) => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        return checkCanManageAdmin(admin.role, targetRole);
      },

      canAccessCompany: (companyId) => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        if (isPlatformAdmin(admin.role)) return true;
        return admin.companyId === companyId;
      },

      canAccessCourse: (courseId) => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        if (isPlatformAdmin(admin.role)) return true;
        if (admin.scope === 'SYSTEM' || admin.scope === 'OPERATION') return true;
        // VIEW 스코프의 경우 courseIds가 있으면 해당 코스만 접근 가능
        if (admin.courseIds) {
          return admin.courseIds.includes(courseId);
        }
        return false;
      },

      getDisplayInfo: () => {
        const admin = get().currentAdmin;
        if (!admin) {
          return { name: '로그인 필요', role: '', scope: '' };
        }
        return {
          name: admin.name,
          role: ADMIN_ROLE_LABELS[admin.role],
          scope: admin.scope ?? '',
          company: admin.company?.name,
        };
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export const useCurrentAdmin = () => useAuthStore((state) => state.currentAdmin);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

export const initializeAuthFromStorage = () => {
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('currentUser');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.getState().hydrateFromLogin(user, token);
      return true;
    } catch (error) {
      console.error('Failed to parse cached user data:', error);
      useAuthStore.getState().logout();
      return false;
    }
  }
  return false;
};
