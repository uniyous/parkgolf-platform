import { apiClient } from './client';
import { extractList, extractPagination, extractSingle, type PaginatedResult } from './bffParser';
import type {
  Company,
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyStatus
} from '@/types/company';

// API 원본 응답 타입
interface RawCompanyData {
  id: number;
  name: string;
  businessNumber?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  establishedDate?: string;
  logoUrl?: string;
  status?: CompanyStatus;
  isActive?: boolean;
  coursesCount?: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  averageRating?: number;
  totalBookings?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface BffCompanyResponse {
  success?: boolean;
  data?: RawCompanyData[] | RawCompanyData | { companies: RawCompanyData[] };
  companies?: RawCompanyData[];
  page?: number;
  limit?: number;
  total?: number;
  totalCount?: number;
  totalPages?: number;
}

// Company API 응답 타입
export interface CompanyListResponse {
  data: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CompanyFiltersQuery {
  search?: string;
  status?: CompanyStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  showOnlyActive?: boolean;
  page?: number;
  limit?: number;
}

// 데이터 변환 헬퍼 함수
function transformCompanyData(rawCompany: RawCompanyData): Company {
  return {
    id: rawCompany.id,
    name: rawCompany.name,
    businessNumber: rawCompany.businessNumber || '',
    address: rawCompany.address || '',
    phoneNumber: rawCompany.phoneNumber || '',
    email: rawCompany.email || '',
    website: rawCompany.website,
    description: rawCompany.description,
    logoUrl: rawCompany.logoUrl,
    status: rawCompany.status || 'ACTIVE',
    // Date 필드들을 ISO 문자열로 유지 (Redux 직렬화 호환)
    establishedDate: rawCompany.establishedDate || new Date().toISOString(),
    createdAt: rawCompany.createdAt || new Date().toISOString(),
    updatedAt: rawCompany.updatedAt || new Date().toISOString(),
    // 숫자 필드들에 기본값 설정
    coursesCount: rawCompany.coursesCount || 0,
    totalRevenue: rawCompany.totalRevenue || 0,
    monthlyRevenue: rawCompany.monthlyRevenue || 0,
    averageRating: rawCompany.averageRating || 0,
    totalBookings: rawCompany.totalBookings || 0,
    // 불린 필드 설정
    isActive: rawCompany.isActive !== undefined ? rawCompany.isActive : rawCompany.status === 'ACTIVE'
  };
}

export const companyApi = {
  // 회사 목록 조회
  async getCompanies(filters: CompanyFiltersQuery = {}, page = 1, limit = 20): Promise<CompanyListResponse> {
    const response = await apiClient.get<unknown>('/admin/companies', { page, limit });

    // bffParser로 데이터 추출
    const rawCompanies = extractList<RawCompanyData>(response.data, 'companies');
    const pagination = extractPagination(response.data, rawCompanies.length, { page, limit });

    // 데이터 변환
    let companies = rawCompanies.map(transformCompanyData);

    // 클라이언트 사이드 필터링 적용
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      companies = companies.filter(company =>
        company.name.toLowerCase().includes(searchLower) ||
        (company.businessNumber && company.businessNumber.includes(filters.search!)) ||
        (company.address && company.address.toLowerCase().includes(searchLower)) ||
        (company.email && company.email.toLowerCase().includes(searchLower))
      );
    }

    if (filters.status) {
      companies = companies.filter(company => company.status === filters.status);
    }

    if (filters.showOnlyActive) {
      companies = companies.filter(company => company.isActive);
    }

    // 정렬
    if (filters.sortBy) {
      companies.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof Company] as string | number;
        const bValue = b[filters.sortBy as keyof Company] as string | number;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return filters.sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return filters.sortOrder === 'asc'
            ? aValue - bValue
            : bValue - aValue;
        }

        return 0;
      });
    }

    return { data: companies, pagination };
  },

  // 회사 상세 조회
  async getCompanyById(id: number): Promise<Company> {
    const response = await apiClient.get<unknown>(`/admin/companies/${id}`);
    const rawData = extractSingle<RawCompanyData>(response.data, 'company');
    if (!rawData) throw new Error('Company not found');
    return transformCompanyData(rawData);
  },

  // 회사 생성
  async createCompany(createData: CreateCompanyDto): Promise<Company> {
    // code가 없으면 회사명에서 자동 생성
    const generateCode = (name: string): string => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const nameCode = name
        .replace(/[^\w\s가-힣]/g, '')
        .split(/\s+/)
        .map(w => w.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 4);
      return `${nameCode}-${timestamp}`;
    };

    // 백엔드가 지원하는 필드
    const supportedFields = {
      name: createData.name,
      code: createData.code || generateCode(createData.name),
      companyType: createData.companyType || 'FRANCHISE',
      businessNumber: createData.businessNumber,
      address: createData.address,
      phoneNumber: createData.phoneNumber,
      email: createData.email,
      website: createData.website,
      description: createData.description,
      establishedDate: createData.establishedDate,
      logoUrl: createData.logoUrl,
      status: createData.status
    };

    // undefined 값 제거
    const filteredData = Object.entries(supportedFields)
      .filter(([_, value]) => value !== undefined)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const response = await apiClient.post<unknown>('/admin/companies', filteredData);
    const rawData = extractSingle<RawCompanyData>(response.data, 'company');
    if (!rawData) throw new Error('Failed to create company');
    return transformCompanyData(rawData);
  },

  // 회사 수정
  async updateCompany(id: number, updateData: UpdateCompanyDto): Promise<Company> {
    // 백엔드가 지원하는 필드만 필터링
    const supportedFields = {
      name: updateData.name,
      businessNumber: updateData.businessNumber,
      address: updateData.address,
      phoneNumber: updateData.phoneNumber,
      email: updateData.email,
      website: updateData.website,
      description: updateData.description,
      establishedDate: updateData.establishedDate,
      logoUrl: updateData.logoUrl,
      status: updateData.status
    };

    // undefined 값 제거
    const filteredData = Object.entries(supportedFields)
      .filter(([_, value]) => value !== undefined)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const response = await apiClient.patch<unknown>(`/admin/companies/${id}`, filteredData);
    const rawData = extractSingle<RawCompanyData>(response.data, 'company');
    if (!rawData) throw new Error('Failed to update company');
    return transformCompanyData(rawData);
  },

  // 회사 삭제 (실제 API 사용)
  async deleteCompany(id: number): Promise<void> {
    try {
      console.log(`Deleting company ${id}`);
      
      // 실제 API 호출
      await apiClient.delete(`/admin/companies/${id}`);
      console.log(`Company ${id} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete company ${id}:`, error);
      throw error;
    }
  },

  // 회사 상태 변경 (iam-service API)
  async updateCompanyStatus(id: number, status: CompanyStatus): Promise<Company> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/companies/${id}/status`, { status });
      const rawData = extractSingle<RawCompanyData>(response.data, 'company');
      if (!rawData) throw new Error('Failed to update company status');
      return transformCompanyData(rawData);
    } catch (error) {
      console.error(`Failed to update company ${id} status:`, error);
      throw error;
    }
  },

  // 대량 작업 - 상태 변경 (Mock 구현 - 실제 API 대기)
  async bulkUpdateStatus(companyIds: number[], status: CompanyStatus): Promise<Company[]> {
    try {
      // Mock: 각 회사의 상태를 개별적으로 업데이트
      const updatedCompanies: Company[] = [];
      for (const id of companyIds) {
        const updated = await this.updateCompanyStatus(id, status);
        updatedCompanies.push(updated);
      }
      
      return updatedCompanies;
    } catch (error) {
      console.error('Failed to bulk update company status:', error);
      throw error;
    }
  },

  // 대량 작업 - 삭제 (Mock 구현 - 실제 API 대기)
  async bulkDeleteCompanies(companyIds: number[]): Promise<void> {
    try {
      // Mock: 각 회사를 개별적으로 삭제
      for (const id of companyIds) {
        await this.deleteCompany(id);
      }
      
    } catch (error) {
      console.error('Failed to bulk delete companies:', error);
      throw error;
    }
  },

  // 회사 통계 조회 (iam-service API)
  async getCompanyStats(): Promise<{
    totalCompanies: number;
    activeCompanies: number;
    inactiveCompanies: number;
    maintenanceCompanies: number;
    totalCourses: number;
    totalRevenue: number;
    averageRevenue: number;
  }> {
    try {
      const response = await apiClient.get<{ data?: any }>('/admin/companies/stats');
      const apiStats = response.data?.data || response.data;

      // API 응답을 프론트엔드 형식으로 변환
      return {
        totalCompanies: apiStats?.totalCompanies || apiStats?.total || 0,
        activeCompanies: apiStats?.activeCompanies || apiStats?.byStatus?.ACTIVE || 0,
        inactiveCompanies: apiStats?.inactiveCompanies || apiStats?.byStatus?.INACTIVE || 0,
        maintenanceCompanies: apiStats?.maintenanceCompanies || apiStats?.byStatus?.MAINTENANCE || 0,
        totalCourses: apiStats?.totalCourses || 0,
        totalRevenue: apiStats?.totalRevenue || 0,
        averageRevenue: apiStats?.averageRevenue || 0,
      };
    } catch (error) {
      console.error('Failed to fetch company stats:', error);
      throw error;
    }
  },

  // 회사 코드로 조회 (iam-service API)
  async getCompanyByCode(code: string): Promise<Company> {
    try {
      const response = await apiClient.get<unknown>(`/admin/companies/code/${code}`);
      const rawData = extractSingle<RawCompanyData>(response.data, 'company');
      if (!rawData) throw new Error('Company not found');
      return transformCompanyData(rawData);
    } catch (error) {
      console.error(`Failed to fetch company by code ${code}:`, error);
      throw error;
    }
  },

  // 회사 관리자 목록 조회 (iam-service API)
  async getCompanyAdmins(companyId: number): Promise<any[]> {
    try {
      const response = await apiClient.get<{ data?: any[] }>(`/admin/companies/${companyId}/admins`);
      return response.data?.data || [];
    } catch (error) {
      console.error(`Failed to fetch admins for company ${companyId}:`, error);
      throw error;
    }
  }
} as const;

// Legacy exports for backward compatibility
export const fetchCompanies = companyApi.getCompanies;
export const fetchCompanyById = companyApi.getCompanyById;
export const createCompany = companyApi.createCompany;
export const updateCompany = companyApi.updateCompany;
export const deleteCompany = companyApi.deleteCompany;