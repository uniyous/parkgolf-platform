import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Admin, Permission, AdminRole, AdminScope } from '../types';
import { 
  hasPermission, 
  canManageAdmin, 
  isPlatformAdmin, 
  isCompanyAdmin,
  ADMIN_ROLE_LABELS 
} from '../utils/adminPermissions';
import { getMockAdminById } from '../utils/mockAdminData';

interface AdminAuthContextType {
  // 현재 로그인한 관리자 정보
  currentAdmin: Admin | null;
  isAuthenticated: boolean;
  
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
  
  // 초기화: localStorage에서 로그인 정보 복원
  useEffect(() => {
    const savedAdminId = localStorage.getItem('currentAdminId');
    if (savedAdminId) {
      const admin = getMockAdminById(parseInt(savedAdminId));
      if (admin) {
        setCurrentAdmin(admin);
      }
    }
  }, []);

  // 로그인 함수
  const login = async (adminId: number): Promise<void> => {
    console.log('AdminAuthContext login 호출됨, adminId:', adminId);
    const admin = getMockAdminById(adminId);
    console.log('찾은 관리자:', admin);
    
    if (!admin) {
      console.error('관리자를 찾을 수 없음:', adminId);
      throw new Error('관리자를 찾을 수 없습니다.');
    }
    
    if (!admin.isActive) {
      console.error('비활성화된 계정:', admin);
      throw new Error('비활성화된 계정입니다.');
    }
    
    console.log('로그인 성공, 관리자 설정:', admin.name);
    setCurrentAdmin(admin);
    localStorage.setItem('currentAdminId', adminId.toString());
    localStorage.setItem('accessToken', `mock-token-${adminId}`);
  };

  // 로그아웃 함수
  const logout = () => {
    setCurrentAdmin(null);
    localStorage.removeItem('currentAdminId');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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