import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Admin, AdminRole, AdminCompany, Permission, Company } from '@/types';
import {
  hasPermission as checkPermission,
  canManageAdmin as checkCanManageAdmin,
  isPlatformRole,
  getRoleScope,
  getDefaultPermissions,
  ADMIN_ROLE_LABELS,
} from '@/utils/admin-permissions';

// API 응답에서 오는 회사 연결 데이터 타입
export interface ApiAdminCompanyResponse {
  id: number;
  adminId: number;
  companyId: number;
  companyRoleCode: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  company?: Company;
}

// API 응답에서 오는 사용자 데이터 타입
export interface ApiUserResponse {
  id: number;
  email: string;
  name?: string;
  username?: string;
  // 회사-역할 연결 (v3 구조)
  companies?: ApiAdminCompanyResponse[];
  permissions?: (string | { permission: string })[];
  // 프로필
  phone?: string;
  department?: string;
  description?: string;
  avatarUrl?: string;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields (하위 호환성)
  roleCode?: string;
  role?: string;
  roles?: string[];
  companyId?: number;
  courseIds?: number[];
  company?: Company;
}

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
  hydrateFromLogin: (user: ApiUserResponse, token: string) => void;
  hydrateFromProfile: (apiUser: ApiUserResponse, token: string) => void;
  hasPermission: (permission: Permission) => boolean;
  canManageAdminRole: (targetRole: AdminRole) => boolean;
  canAccessCompany: (companyId: number) => boolean;
  canAccessCourse: (courseId: number) => boolean;
  getDisplayInfo: () => { name: string; role: string; scope: string; company?: string };
}

// 유효한 AdminRole인지 확인
const VALID_ADMIN_ROLES: AdminRole[] = [
  'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_VIEWER',
  'COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_STAFF', 'COMPANY_VIEWER'
];

// 백엔드 역할 코드를 프론트엔드 AdminRole로 매핑
const mapToAdminRole = (role: string): AdminRole => {
  const roleUpper = (role || '').toUpperCase() as AdminRole;

  // 이미 유효한 역할인 경우 그대로 반환
  if (VALID_ADMIN_ROLES.includes(roleUpper)) {
    return roleUpper;
  }

  // 레거시 역할 매핑 (하위 호환성)
  const legacyMapping: Record<string, AdminRole> = {
    'ADMIN': 'PLATFORM_ADMIN',
    'SUPER_ADMIN': 'PLATFORM_ADMIN',
    'SYSTEM_ADMIN': 'PLATFORM_ADMIN',
    'SUPPORT': 'PLATFORM_SUPPORT',
    'CUSTOMER_SUPPORT': 'PLATFORM_SUPPORT',
    'MANAGER': 'COMPANY_MANAGER',
    'OPERATION_MANAGER': 'COMPANY_MANAGER',
    'STAFF': 'COMPANY_STAFF',
    'COURSE_STAFF': 'COMPANY_STAFF',
    'OPERATOR': 'COMPANY_STAFF',
    'VIEWER': 'COMPANY_VIEWER',
  };

  return legacyMapping[roleUpper] || 'COMPANY_VIEWER';
};

// AdminCompany 변환
const convertToAdminCompany = (apiCompany: ApiAdminCompanyResponse): AdminCompany => ({
  id: apiCompany.id,
  adminId: apiCompany.adminId,
  companyId: apiCompany.companyId,
  companyRoleCode: mapToAdminRole(apiCompany.companyRoleCode),
  isPrimary: apiCompany.isPrimary,
  isActive: apiCompany.isActive,
  createdAt: apiCompany.createdAt || new Date().toISOString(),
  updatedAt: apiCompany.updatedAt || new Date().toISOString(),
  company: apiCompany.company,
});

const convertUserToAdmin = (user: ApiUserResponse): Admin => {
  // 회사-역할 연결 처리 (v3 구조)
  let companies: AdminCompany[] = [];
  let primaryCompany: AdminCompany | undefined;
  let primaryRole: AdminRole | undefined;

  if (user.companies && user.companies.length > 0) {
    // 새로운 companies 구조 사용
    companies = user.companies.map(convertToAdminCompany);
    primaryCompany = companies.find(c => c.isPrimary) || companies[0];
    primaryRole = primaryCompany?.companyRoleCode;
  } else {
    // 레거시 roleCode/role 처리 (하위 호환성)
    let rawRole = user.roleCode || user.role || (user.roles?.[0]) || 'COMPANY_VIEWER';
    primaryRole = mapToAdminRole(rawRole);

    // 레거시 데이터로 임시 AdminCompany 생성
    if (user.companyId) {
      companies = [{
        id: 0,
        adminId: user.id,
        companyId: user.companyId,
        companyRoleCode: primaryRole,
        isPrimary: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        company: user.company,
      }];
      primaryCompany = companies[0];
    }
  }

  const scope = getRoleScope(primaryRole || 'COMPANY_VIEWER');

  let permissions: Permission[];
  if (user.permissions && user.permissions.length > 0) {
    permissions = user.permissions.map((p) =>
      typeof p === 'string' ? p : p.permission
    ) as Permission[];
  } else {
    // 권한이 없으면 역할 기반 기본 권한 사용
    permissions = getDefaultPermissions(primaryRole || 'COMPANY_VIEWER');
  }

  // 디버그 로그 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('[Auth] User role mapping:', { primaryRole, companies, permissions });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || user.username || 'Unknown',
    isActive: user.isActive ?? true,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
    phone: user.phone,
    department: user.department,
    description: user.description,
    avatarUrl: user.avatarUrl,
    // 회사-역할 연결 (v3)
    companies,
    permissions,
    primaryCompany,
    primaryRole,
    primaryScope: scope,
    // Legacy fields (하위 호환성)
    companyId: user.companyId || primaryCompany?.companyId,
    company: user.company || primaryCompany?.company,
    roleCode: primaryRole,
    role: primaryRole,
    username: user.username || user.email,
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
          type: 'admin',
          permissions: admin.permissions,
          // v3 구조
          companies: admin.companies,
          primaryRole: admin.primaryRole,
          primaryScope: admin.primaryScope,
          // Legacy
          role: admin.primaryRole,
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
          type: 'admin',
          permissions: admin.permissions,
          // v3 구조
          companies: admin.companies,
          primaryRole: admin.primaryRole,
          primaryScope: admin.primaryScope,
          // Legacy
          role: admin.primaryRole,
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
        if (!admin || !admin.primaryRole) return false;
        return checkCanManageAdmin(admin.primaryRole, targetRole);
      },

      canAccessCompany: (companyId) => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        // 플랫폼 역할은 모든 회사 접근 가능
        if (admin.primaryRole && isPlatformRole(admin.primaryRole)) return true;
        // 소속 회사만 접근 가능
        return admin.companies.some(c => c.companyId === companyId && c.isActive);
      },

      canAccessCourse: (courseId) => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        // 플랫폼 역할은 모든 코스 접근 가능
        if (admin.primaryRole && isPlatformRole(admin.primaryRole)) return true;
        // COMPANY 범위의 경우 회사 소속 여부로 판단 (코스는 회사에 속함)
        // TODO: 코스-회사 매핑이 필요한 경우 추가 로직 필요
        return admin.primaryScope === 'PLATFORM';
      },

      getDisplayInfo: () => {
        const admin = get().currentAdmin;
        if (!admin) {
          return { name: '로그인 필요', role: '', scope: '' };
        }
        const roleLabel = admin.primaryRole ? ADMIN_ROLE_LABELS[admin.primaryRole] : '';
        const companyName = admin.primaryCompany?.company?.name || admin.company?.name;
        return {
          name: admin.name,
          role: roleLabel,
          scope: admin.primaryScope ?? '',
          company: companyName,
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
