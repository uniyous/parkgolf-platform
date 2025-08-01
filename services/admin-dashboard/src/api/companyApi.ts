import { apiClient } from './client';
import type { 
  Company, 
  CreateCompanyDto, 
  UpdateCompanyDto, 
  CompanyStatus 
} from '../types/company';

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
  // 회사 목록 조회 (기존 courses/companies 엔드포인트 사용)
  async getCompanies(filters: CompanyFiltersQuery = {}, page = 1, limit = 20): Promise<CompanyListResponse> {
    try {
      // 기존 courseApi와 같은 엔드포인트 사용
      const response = await apiClient.get<{companies: Company[], totalCount: number, totalPages: number, page: number}>('/admin/courses/companies');
      
      console.log('Company API Response:', response);
      console.log('Response.data:', response.data);
      
      // BFF 응답에서 companies 배열 추출
      const bffResponse = response.data;
      const companies = bffResponse?.companies || [];
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
          limit, 
          total: bffResponse?.totalCount || filteredCompanies.length, 
          totalPages: bffResponse?.totalPages || 1 
        }
      };
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      throw error;
    }
  },

  // 회사 상세 조회 (Mock 구현 - 실제 API 대기)
  async getCompanyById(id: number): Promise<Company> {
    try {
      // 기존 목록에서 해당 회사 찾기
      const companiesResponse = await this.getCompanies();
      const company = companiesResponse.data.find(c => c.id === id);
      
      if (!company) {
        throw new Error(`Company with ID ${id} not found`);
      }
      
      return transformCompanyData(company);
    } catch (error) {
      console.error(`Failed to fetch company ${id}:`, error);
      throw error;
    }
  },

  // 회사 생성 (Mock 구현 - 실제 API 대기)
  async createCompany(companyData: CreateCompanyDto): Promise<Company> {
    try {
      // Mock: 새 ID 생성하여 반환
      const newCompany: Company = {
        id: Math.floor(Math.random() * 10000),
        name: companyData.name,
        businessNumber: companyData.businessNumber,
        address: companyData.address,
        phoneNumber: companyData.phoneNumber,
        email: companyData.email,
        website: companyData.website || '',
        description: companyData.description || '',
        establishedDate: companyData.establishedDate,
        logoUrl: companyData.logoUrl || null,
        status: companyData.status || 'ACTIVE',
        isActive: companyData.status !== 'INACTIVE',
        coursesCount: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageRating: 0,
        totalBookings: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return newCompany;
    } catch (error) {
      console.error('Failed to create company:', error);
      throw error;
    }
  },

  // 회사 수정 (Mock 구현 - 실제 API 대기)
  async updateCompany(id: number, companyData: UpdateCompanyDto): Promise<Company> {
    try {
      // 기존 회사 정보 가져와서 업데이트
      const existingCompany = await this.getCompanyById(id);
      const updatedCompany: Company = {
        ...existingCompany,
        ...companyData,
        updatedAt: new Date().toISOString()
      };
      
      return updatedCompany;
    } catch (error) {
      console.error(`Failed to update company ${id}:`, error);
      throw error;
    }
  },

  // 회사 삭제 (Mock 구현 - 실제 API 대기)
  async deleteCompany(id: number): Promise<void> {
    try {
      // Mock: 단순히 성공으로 처리
      await new Promise(resolve => setTimeout(resolve, 500));
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