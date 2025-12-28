import { apiClient } from './client';
import type { 
  Company, 
  CreateCompanyDto, 
  UpdateCompanyDto, 
  CompanyStatus 
} from '@/types/company';

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
function transformCompanyData(rawCompany: any): Company {
  return {
    ...rawCompany,
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
    try {
      const response = await apiClient.get<any>('/admin/companies', { page, limit });

      console.log('Company API Response:', response);
      console.log('Response.data:', response.data);

      // API 응답 구조: { success: true, data: { companies: [...] }, total, page, limit, totalPages }
      const bffResponse = response.data;
      // data.companies 또는 companies 배열 추출
      const companies = bffResponse?.data?.companies || bffResponse?.companies || [];
      console.log('Final companies array:', companies);
      console.log('Companies count:', companies.length);
      
      // 데이터 변환
      const transformedCompanies = companies.map(transformCompanyData);
      
      // 클라이언트 사이드 필터링 적용
      let filteredCompanies = transformedCompanies;
      
      if (filters.search && filteredCompanies.length > 0) {
        const searchLower = filters.search.toLowerCase();
        filteredCompanies = filteredCompanies.filter(company => 
          company.name.toLowerCase().includes(searchLower) ||
          (company.businessNumber && company.businessNumber.includes(filters.search!)) ||
          (company.address && company.address.toLowerCase().includes(searchLower)) ||
          (company.email && company.email.toLowerCase().includes(searchLower))
        );
      }
      
      if (filters.status && filteredCompanies.length > 0) {
        filteredCompanies = filteredCompanies.filter(company => company.status === filters.status);
      }
      
      if (filters.showOnlyActive && filteredCompanies.length > 0) {
        filteredCompanies = filteredCompanies.filter(company => company.isActive);
      }
      
      // 정렬
      if (filters.sortBy && filteredCompanies.length > 0) {
        filteredCompanies.sort((a, b) => {
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
      
      return {
        data: filteredCompanies,
        pagination: {
          page: bffResponse?.page || page,
          limit: bffResponse?.limit || limit,
          total: bffResponse?.total || bffResponse?.totalCount || filteredCompanies.length,
          totalPages: bffResponse?.totalPages || Math.ceil(filteredCompanies.length / limit) || 1
        }
      };
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      throw error;
    }
  },

  // 회사 상세 조회
  async getCompanyById(id: number): Promise<Company> {
    try {
      const response = await apiClient.get<Company>(`/admin/companies/${id}`);
      console.log('Get company by ID response:', response);

      // API 응답에서 data 추출
      const companyData = (response.data as any)?.data || response.data;
      return transformCompanyData(companyData);
    } catch (error) {
      console.error(`Failed to fetch company ${id}:`, error);
      throw error;
    }
  },

  // 회사 생성 (실제 API 사용)
  async createCompany(companyData: CreateCompanyDto): Promise<Company> {
    try {
      console.log('Creating company with data:', companyData);
      
      // 백엔드가 지원하는 필드만 필터링
      const supportedFields = {
        name: companyData.name,
        businessNumber: companyData.businessNumber,
        address: companyData.address,
        phoneNumber: companyData.phoneNumber,
        email: companyData.email,
        website: companyData.website,
        description: companyData.description,
        establishedDate: companyData.establishedDate,
        logoUrl: companyData.logoUrl,
        status: companyData.status
      };
      
      // undefined 값 제거
      const filteredData = Object.entries(supportedFields)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      console.log('Filtered data for API:', filteredData);
      
      // 실제 API 호출
      const response = await apiClient.post<Company>('/admin/companies', filteredData);
      console.log('Create company API response:', response);

      // API 응답에서 data 추출
      const companyData = (response.data as any)?.data || response.data;
      const newCompany = transformCompanyData(companyData);
      return newCompany;
    } catch (error) {
      console.error('Failed to create company:', error);
      throw error;
    }
  },

  // 회사 수정 (실제 API 사용)
  async updateCompany(id: number, companyData: UpdateCompanyDto): Promise<Company> {
    try {
      console.log(`Updating company ${id} with data:`, companyData);
      
      // 백엔드가 지원하는 필드만 필터링
      const supportedFields = {
        name: companyData.name,
        businessNumber: companyData.businessNumber,
        address: companyData.address,
        phoneNumber: companyData.phoneNumber,
        email: companyData.email,
        website: companyData.website,
        description: companyData.description,
        establishedDate: companyData.establishedDate,
        logoUrl: companyData.logoUrl,
        status: companyData.status
      };
      
      // undefined 값 제거
      const filteredData = Object.entries(supportedFields)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      console.log('Filtered data for API:', filteredData);
      
      // 실제 API 호출
      const response = await apiClient.patch<Company>(`/admin/companies/${id}`, filteredData);
      console.log('Update company API response:', response);

      // API 응답에서 data 추출
      const companyData = (response.data as any)?.data || response.data;
      const updatedCompany = transformCompanyData(companyData);
      return updatedCompany;
    } catch (error) {
      console.error(`Failed to update company ${id}:`, error);
      throw error;
    }
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

  // 회사 상태 변경 (Mock 구현 - 실제 API 대기)
  async updateCompanyStatus(id: number, status: CompanyStatus): Promise<Company> {
    try {
      const existingCompany = await this.getCompanyById(id);
      const updatedCompany: Company = {
        ...existingCompany,
        status,
        isActive: status === 'ACTIVE',
        updatedAt: new Date().toISOString()
      };
      
      return updatedCompany;
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

  // 회사 통계 조회 (Mock 구현 - 실제 API 대기)
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
      const companiesResponse = await this.getCompanies();
      const companies = companiesResponse.data;
      
      const stats = {
        totalCompanies: companies.length,
        activeCompanies: companies.filter(c => c.status === 'ACTIVE').length,
        inactiveCompanies: companies.filter(c => c.status === 'INACTIVE').length,
        maintenanceCompanies: companies.filter(c => c.status === 'MAINTENANCE').length,
        totalCourses: companies.reduce((sum, c) => sum + (c.coursesCount || 0), 0),
        totalRevenue: companies.reduce((sum, c) => sum + (c.totalRevenue || 0), 0),
        averageRevenue: companies.length > 0 ? companies.reduce((sum, c) => sum + (c.totalRevenue || 0), 0) / companies.length : 0
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to fetch company stats:', error);
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