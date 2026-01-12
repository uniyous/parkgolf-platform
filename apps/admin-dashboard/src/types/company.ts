export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'MAINTENANCE';

// 회사 유형 (역할 부여 범위 결정)
export type CompanyType = 'PLATFORM' | 'ASSOCIATION' | 'FRANCHISE';

export interface Company {
  id: number;
  name: string;
  code: string;              // 회사 코드 (예: "GANGNAM-GC")
  businessNumber?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  companyType: CompanyType;  // 회사 유형
  establishedDate?: string;  // ISO 문자열 (Redux 직렬화 호환)
  logoUrl?: string | null;
  status: CompanyStatus;
  isActive: boolean;
  metadata?: Record<string, unknown>;  // 추가 설정 (운영시간, 정책 등)
  // 통계 필드 (선택)
  coursesCount?: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  averageRating?: number;
  totalBookings?: number;
  createdAt: string;  // ISO 문자열
  updatedAt: string;  // ISO 문자열
}

export interface CompanyFilters {
  search: string;
  status?: CompanyStatus;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  showOnlyActive: boolean;
}

export interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  maintenanceCompanies: number;
  totalCourses: number;
  totalRevenue: number;
  averageRevenue: number;
  topPerformer: Company | null;
}

export interface CreateCompanyDto {
  name: string;
  code: string;
  companyType: CompanyType;
  businessNumber?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  establishedDate?: string;
  logoUrl?: string;
  status?: CompanyStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateCompanyDto {
  name?: string;
  code?: string;
  companyType?: CompanyType;
  businessNumber?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  establishedDate?: string;
  logoUrl?: string;
  status?: CompanyStatus;
  metadata?: Record<string, unknown>;
}