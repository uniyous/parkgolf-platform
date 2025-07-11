import type { Admin, AdminRole, AdminScope } from '../types';
import { getDefaultPermissions, getRoleScope } from './adminPermissions';

/**
 * 새로운 관리자 역할 시스템을 위한 목 데이터
 */
export const mockAdminsData: Admin[] = [
  // === 플랫폼 레벨 관리자 ===
  {
    id: 1,
    username: 'platform_owner',
    email: 'owner@parkgolf.com',
    name: '김플랫폼',
    role: 'PLATFORM_OWNER',
    scope: 'PLATFORM',
    permissions: getDefaultPermissions('PLATFORM_OWNER'),
    isActive: true,
    lastLoginAt: '2024-07-10T09:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-07-10T09:30:00Z',
    department: '본사 경영진',
    description: '플랫폼 최고 책임자'
  },
  {
    id: 2,
    username: 'platform_admin',
    email: 'admin@parkgolf.com',
    name: '박운영',
    role: 'PLATFORM_ADMIN',
    scope: 'PLATFORM',
    permissions: getDefaultPermissions('PLATFORM_ADMIN'),
    isActive: true,
    lastLoginAt: '2024-07-10T08:15:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-07-10T08:15:00Z',
    department: '본사 운영팀',
    description: '플랫폼 운영 총괄'
  },
  {
    id: 3,
    username: 'platform_support',
    email: 'support@parkgolf.com',
    name: '이지원',
    role: 'PLATFORM_SUPPORT',
    scope: 'PLATFORM',
    permissions: getDefaultPermissions('PLATFORM_SUPPORT'),
    isActive: true,
    lastLoginAt: '2024-07-10T07:45:00Z',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-07-10T07:45:00Z',
    department: '고객 지원팀',
    description: '고객 문의 및 기술 지원'
  },
  {
    id: 4,
    username: 'platform_analyst',
    email: 'analyst@parkgolf.com',
    name: '최분석',
    role: 'PLATFORM_ANALYST',
    scope: 'PLATFORM',
    permissions: getDefaultPermissions('PLATFORM_ANALYST'),
    isActive: true,
    lastLoginAt: '2024-07-09T18:20:00Z',
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-07-09T18:20:00Z',
    department: '데이터 분석팀',
    description: '플랫폼 데이터 분석 및 리포팅'
  },

  // === 회사 레벨 관리자 (강남 파크골프장) ===
  {
    id: 5,
    username: 'company_owner_gangnam',
    email: 'owner@gangnam-golf.com',
    name: '강대표',
    role: 'COMPANY_OWNER',
    scope: 'COMPANY',
    permissions: getDefaultPermissions('COMPANY_OWNER'),
    isActive: true,
    lastLoginAt: '2024-07-10T09:00:00Z',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-07-10T09:00:00Z',
    companyId: 1,
    department: '경영진',
    description: '강남 파크골프장 대표',
    company: {
      id: 1,
      name: '강남 파크골프장',
      businessNumber: '123-45-67890',
      address: '서울시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      email: 'info@gangnam-golf.com',
      status: 'active',
      description: '강남 지역 최고의 파크골프 시설',
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z'
    }
  },
  {
    id: 6,
    username: 'company_manager_gangnam',
    email: 'manager@gangnam-golf.com',
    name: '남운영',
    role: 'COMPANY_MANAGER',
    scope: 'COMPANY',
    permissions: getDefaultPermissions('COMPANY_MANAGER'),
    isActive: true,
    lastLoginAt: '2024-07-10T08:30:00Z',
    createdAt: '2024-02-05T00:00:00Z',
    updatedAt: '2024-07-10T08:30:00Z',
    companyId: 1,
    department: '운영팀',
    description: '강남 파크골프장 운영 관리자'
  },
  {
    id: 7,
    username: 'course_manager_gangnam_a',
    email: 'course-a@gangnam-golf.com',
    name: '코스매니저A',
    role: 'COURSE_MANAGER',
    scope: 'COURSE',
    permissions: getDefaultPermissions('COURSE_MANAGER'),
    isActive: true,
    lastLoginAt: '2024-07-10T07:00:00Z',
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-07-10T07:00:00Z',
    companyId: 1,
    courseIds: [1],
    department: '코스 운영팀',
    description: 'A코스 전담 관리자'
  },
  {
    id: 8,
    username: 'staff_gangnam_a',
    email: 'staff-a@gangnam-golf.com',
    name: '김직원A',
    role: 'STAFF',
    scope: 'COURSE',
    permissions: getDefaultPermissions('STAFF'),
    isActive: true,
    lastLoginAt: '2024-07-10T06:30:00Z',
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-07-10T06:30:00Z',
    companyId: 1,
    courseIds: [1],
    department: '현장 운영팀',
    description: 'A코스 현장 직원'
  },

  // === 회사 레벨 관리자 (부산 파크골프장) ===
  {
    id: 9,
    username: 'company_owner_busan',
    email: 'owner@busan-golf.com',
    name: '부대표',
    role: 'COMPANY_OWNER',
    scope: 'COMPANY',
    permissions: getDefaultPermissions('COMPANY_OWNER'),
    isActive: true,
    lastLoginAt: '2024-07-09T19:15:00Z',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-07-09T19:15:00Z',
    companyId: 2,
    department: '경영진',
    description: '부산 파크골프장 대표',
    company: {
      id: 2,
      name: '부산 해운대 파크골프장',
      businessNumber: '987-65-43210',
      address: '부산시 해운대구 해운대로 456',
      phone: '051-9876-5432',
      email: 'info@busan-golf.com',
      status: 'active',
      description: '해운대 바다 뷰가 아름다운 파크골프장',
      createdAt: '2024-03-01T00:00:00Z',
      updatedAt: '2024-03-01T00:00:00Z'
    }
  },
  {
    id: 10,
    username: 'readonly_staff_busan',
    email: 'readonly@busan-golf.com',
    name: '조회직원',
    role: 'READONLY_STAFF',
    scope: 'COURSE',
    permissions: getDefaultPermissions('READONLY_STAFF'),
    isActive: true,
    lastLoginAt: '2024-07-09T17:45:00Z',
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-07-09T17:45:00Z',
    companyId: 2,
    courseIds: [2],
    department: '정보 관리팀',
    description: '데이터 조회 전담 직원'
  },

  // === 비활성 관리자 예시 ===
  {
    id: 11,
    username: 'inactive_admin',
    email: 'inactive@example.com',
    name: '비활성관리자',
    role: 'STAFF',
    scope: 'COURSE',
    permissions: getDefaultPermissions('STAFF'),
    isActive: false,
    lastLoginAt: '2024-06-15T14:20:00Z',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-06-20T00:00:00Z',
    companyId: 1,
    courseIds: [1],
    department: '퇴직자',
    description: '퇴사한 직원 (비활성 상태)'
  }
];

/**
 * 목 데이터에서 관리자 목록 가져오기
 */
export const getMockAdmins = (): Admin[] => {
  return mockAdminsData;
};

/**
 * ID로 관리자 찾기
 */
export const getMockAdminById = (id: number): Admin | undefined => {
  return mockAdminsData.find(admin => admin.id === id);
};

/**
 * 회사별 관리자 목록 가져오기
 */
export const getMockAdminsByCompany = (companyId: number): Admin[] => {
  return mockAdminsData.filter(admin => admin.companyId === companyId);
};

/**
 * 플랫폼 관리자만 가져오기
 */
export const getPlatformAdmins = (): Admin[] => {
  return mockAdminsData.filter(admin => admin.scope === 'PLATFORM');
};

/**
 * 회사 관리자만 가져오기
 */
export const getCompanyAdmins = (): Admin[] => {
  return mockAdminsData.filter(admin => admin.scope === 'COMPANY' || admin.scope === 'COURSE');
};