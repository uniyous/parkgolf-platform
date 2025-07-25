import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Admin, Permission, AdminRole, AdminScope, User } from '../types';
import { 
  hasPermission, 
  canManageAdmin, 
  isPlatformAdmin, 
  isCompanyAdmin,
  ADMIN_ROLE_LABELS,
  getDefaultPermissions,
  getRoleScope
} from '../utils/adminPermissions';
import { authApi } from '../api/authApi';

interface AdminAuthContextType {
  // 현재 로그인한 관리자 정보
  currentAdmin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // 권한 체크 함수들
  hasPermission: (permission: Permission) => boolean;
  canManageAdminRole: (targetRole: AdminRole) => boolean;
  canAccessCompany: (companyId: number) => boolean;
  canAccessCourse: (courseId: number) => boolean;
  
  // 관리 범위 정보
  getAccessibleCompanies: () => number[];
  getAccessibleCourses: () => number[];
  
  // 관리자 관리 권한
  canManageAdmin: (targetAdminId: number) => boolean;
  canAddAdminToCompany: (companyId: number) => boolean;
  
  // 인증 관련 함수들
  login: (adminId: number) => Promise<void>;
  logout: () => void;
  
  // UI 헬퍼
  getDisplayInfo: () => {
    name: string;
    role: string;
    scope: string;
    company?: string;
  };
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // User 타입을 Admin 타입으로 변환하는 함수
  const convertUserToAdmin = (user: User): Admin => {
    // 사용자의 역할을 Admin 역할로 변환
    const adminRole = (user.role as AdminRole) || 'PLATFORM_ADMIN';
    
    // 역할에 따른 스코프 자동 설정
    const scope = user.scope || getRoleScope(adminRole);
    
    // 역할에 따른 기본 권한 설정 (API에서 권한을 제공하지 않는 경우)
    const permissions = user.permissions && user.permissions.length > 0 
      ? user.permissions 
      : getDefaultPermissions(adminRole);
    
    return {
      id: user.id,
      username: user.username || user.email,
      email: user.email,
      name: user.name || user.username || 'Unknown',
      role: adminRole,
      scope: scope,
      permissions: permissions,
      isActive: user.isActive ?? true,
      lastLoginAt: typeof user.lastLoginAt === 'string' ? user.lastLoginAt : user.lastLoginAt?.toISOString(),
      createdAt: typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString(),
      updatedAt: typeof user.updatedAt === 'string' ? user.updatedAt : user.updatedAt?.toISOString(),
      companyId: user.companyId,
      courseIds: user.courseIds,
      department: user.department,
      description: user.description
    };
  };

  // 현재 사용자 정보 로드
  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setCurrentAdmin(null);
        return;
      }

      console.log('토큰을 사용하여 사용자 정보 로드 중...');
      
      // 실제 API 호출
      const response = await authApi.getCurrentUser();
      
      if (response.success && response.data) {
        const admin = convertUserToAdmin(response.data);
        console.log('API에서 사용자 정보 로드 성공:', admin.name, admin.role);
        setCurrentAdmin(admin);
        return;
      } else {
        console.error('API 응답 실패:', response.error?.message);
        // API 실패 시 토큰 제거 및 로그아웃
        setCurrentAdmin(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
      }
    } catch (error) {
      console.error('사용자 정보 로드 중 오류:', error);
      // 에러 발생 시 토큰 제거 및 로그아웃
      setCurrentAdmin(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
    } finally {
      setIsLoading(false);
    }
  };

  // 초기화: 토큰이 있으면 사용자 정보 로드
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Redux 토큰 변경 감지하여 동기화
  useEffect(() => {
    const handleStorageChange = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        if (!currentAdmin) {
          console.log('토큰 변경 감지 - 사용자 정보 다시 로드');
          await loadCurrentUser();
        }
      } else {
        // 토큰이 없으면 로그아웃
        setCurrentAdmin(null);
        localStorage.removeItem('currentAdminId');
      }
    };

    // storage 이벤트 리스너 추가
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentAdmin]);

  // 로그인 함수 (실제로는 사용되지 않음 - 인증은 로그인 페이지에서 처리)
  const login = async (adminId: number): Promise<void> => {
    console.log('AdminAuthContext login 호출됨 - API 통합 후에는 사용되지 않음');
    // 실제 환경에서는 로그인 페이지에서 authApi.login을 사용하여 토큰을 받고
    // 그 토큰으로 loadCurrentUser를 호출하여 사용자 정보를 가져옴
    await loadCurrentUser();
  };

  // 로그아웃 함수
  const logout = () => {
    setCurrentAdmin(null);
    localStorage.removeItem('currentAdminId');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  };

  // 권한 체크
  const checkPermission = (permission: Permission): boolean => {
    if (!currentAdmin) return false;
    return hasPermission(currentAdmin.permissions, permission);
  };

  // 다른 관리자 관리 권한 체크
  const checkCanManageAdmin = (targetRole: AdminRole): boolean => {
    if (!currentAdmin) return false;
    return canManageAdmin(currentAdmin.role, targetRole);
  };

  // 회사 접근 권한 체크
  const canAccessCompany = (companyId: number): boolean => {
    if (!currentAdmin) return false;
    
    // 플랫폼 관리자는 모든 회사 접근 가능
    if (isPlatformAdmin(currentAdmin.role)) {
      return true;
    }
    
    // 회사 관리자는 자신의 회사만 접근 가능
    return currentAdmin.companyId === companyId;
  };

  // 코스 접근 권한 체크
  const canAccessCourse = (courseId: number): boolean => {
    if (!currentAdmin) return false;
    
    // 플랫폼 관리자는 모든 코스 접근 가능
    if (isPlatformAdmin(currentAdmin.role)) {
      return true;
    }
    
    // 회사 레벨 관리자는 자신의 회사 코스들에 접근 가능
    if (currentAdmin.scope === 'COMPANY') {
      // TODO: 실제로는 API를 통해 해당 코스가 자신의 회사 소속인지 확인
      return true; // 임시로 모든 코스 접근 허용
    }
    
    // 코스 레벨 관리자는 자신이 담당하는 코스만 접근 가능
    if (currentAdmin.scope === 'COURSE' && currentAdmin.courseIds) {
      return currentAdmin.courseIds.includes(courseId);
    }
    
    return false;
  };

  // 접근 가능한 회사 목록
  const getAccessibleCompanies = (): number[] => {
    if (!currentAdmin) return [];
    
    // 플랫폼 관리자는 모든 회사
    if (isPlatformAdmin(currentAdmin.role)) {
      return []; // 빈 배열은 "모든 회사" 의미
    }
    
    // 회사 관리자는 자신의 회사만
    if (currentAdmin.companyId) {
      return [currentAdmin.companyId];
    }
    
    return [];
  };

  // 접근 가능한 코스 목록
  const getAccessibleCourses = (): number[] => {
    if (!currentAdmin) return [];
    
    // 플랫폼 관리자는 모든 코스
    if (isPlatformAdmin(currentAdmin.role)) {
      return []; // 빈 배열은 "모든 코스" 의미
    }
    
    // 회사 레벨 관리자는 회사의 모든 코스
    if (currentAdmin.scope === 'COMPANY') {
      return []; // 회사 내 모든 코스
    }
    
    // 코스 레벨 관리자는 담당 코스만
    if (currentAdmin.courseIds) {
      return currentAdmin.courseIds;
    }
    
    return [];
  };

  // 관리자 관리 권한 확인 (회사 소속 직원 관리)
  const canManageAdmin = (targetAdminId: number): boolean => {
    if (!currentAdmin) return false;
    
    // 플랫폼 관리자는 모든 관리자 관리 가능
    if (isPlatformAdmin(currentAdmin.role)) {
      return true;
    }
    
    // 회사 관리자는 같은 회사의 하위 직급만 관리 가능
    if (currentAdmin.scope === 'COMPANY') {
      // TODO: 실제로는 API를 통해 대상 관리자의 회사 및 직급을 확인
      // 임시로 김대표(COMPANY_OWNER), 남운영(COMPANY_MANAGER)는 
      // 자신의 회사 직원들을 관리할 수 있도록 허용
      return true;
    }
    
    return false;
  };

  // 특정 회사의 관리자 추가 권한
  const canAddAdminToCompany = (companyId: number): boolean => {
    if (!currentAdmin) return false;
    
    // 플랫폼 관리자는 모든 회사에 관리자 추가 가능
    if (isPlatformAdmin(currentAdmin.role)) {
      return true;
    }
    
    // 회사 관리자는 자신의 회사에만 관리자 추가 가능
    if (currentAdmin.scope === 'COMPANY' && currentAdmin.companyId === companyId) {
      return ['COMPANY_OWNER', 'COMPANY_MANAGER'].includes(currentAdmin.role);
    }
    
    return false;
  };

  // 표시용 정보
  const getDisplayInfo = () => {
    if (!currentAdmin) {
      return {
        name: '로그인 필요',
        role: '',
        scope: ''
      };
    }

    return {
      name: currentAdmin.name,
      role: ADMIN_ROLE_LABELS[currentAdmin.role],
      scope: currentAdmin.scope,
      company: currentAdmin.company?.name
    };
  };

  const value: AdminAuthContextType = {
    currentAdmin,
    isAuthenticated: !!currentAdmin,
    isLoading,
    hasPermission: checkPermission,
    canManageAdminRole: checkCanManageAdmin,
    canAccessCompany,
    canAccessCourse,
    getAccessibleCompanies,
    getAccessibleCourses,
    canManageAdmin,
    canAddAdminToCompany,
    login,
    logout,
    getDisplayInfo
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};