export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface Company {
  id: number;
  name: string;
  businessNumber: string;
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  description?: string;
  establishedDate: Date;
  logoUrl?: string | null;
  status: CompanyStatus;
  isActive: boolean;
  coursesCount: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRating: number;
  totalBookings: number;
  createdAt: Date;
  updatedAt: Date;
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
  businessNumber: string;
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  description?: string;
  establishedDate: Date;
  logoUrl?: string;
  status?: CompanyStatus;
}

export interface UpdateCompanyDto {
  name?: string;
  businessNumber?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  establishedDate?: Date;
  logoUrl?: string;
  status?: CompanyStatus;
}