import React, { useState, useEffect } from 'react';
import { EnhancedCompanyList } from './EnhancedCompanyList';
import { CompanyDetailView } from './CompanyDetailView';
import { CompanyForm } from './CompanyForm';
import { CompanyStats } from './CompanyStats';
import { CompanyBulkActions } from './CompanyBulkActions';
import type { Company, CompanyFilters as CompanyFiltersType, CompanyStatus } from '../../types/company';

// Mock data for development
const mockCompanies: Company[] = [
  {
    id: 1,
    name: '그린밸리 골프클럽',
    businessNumber: '123-45-67890',
    address: '경기도 용인시 처인구 모현읍 능원로 200',
    phoneNumber: '031-123-4567',
    email: 'info@greenvalley.co.kr',
    website: 'https://www.greenvalley.co.kr',
    description: '아름다운 자연 속에서 최고의 골프 경험을 제공하는 프리미엄 골프클럽입니다.',
    establishedDate: new Date('2010-03-15'),
    logoUrl: null,
    status: 'ACTIVE',
    isActive: true,
    coursesCount: 3,
    totalRevenue: 15750000,
    monthlyRevenue: 2500000,
    averageRating: 4.8,
    totalBookings: 245,
    createdAt: new Date('2010-03-15'),
    updatedAt: new Date('2024-07-07')
  },
  {
    id: 2,
    name: '선셋힐 컨트리클럽',
    businessNumber: '234-56-78901',
    address: '강원도 춘천시 동내면 순환대로 1500',
    phoneNumber: '033-234-5678',
    email: 'contact@sunsethill.com',
    website: 'https://www.sunsethill.com',
    description: '춘천의 아름다운 석양을 감상하며 골프를 즐길 수 있는 특별한 공간입니다.',
    establishedDate: new Date('2015-08-20'),
    logoUrl: null,
    status: 'ACTIVE',
    isActive: true,
    coursesCount: 2,
    totalRevenue: 9800000,
    monthlyRevenue: 1850000,
    averageRating: 4.6,
    totalBookings: 198,
    createdAt: new Date('2015-08-20'),
    updatedAt: new Date('2024-07-06')
  },
  {
    id: 3,
    name: '오션뷰 리조트',
    businessNumber: '345-67-89012',
    address: '부산광역시 기장군 일광면 해안대로 777',
    phoneNumber: '051-345-6789',
    email: 'info@oceanview.co.kr',
    website: 'https://www.oceanview.co.kr',
    description: '바다가 보이는 환상적인 뷰와 함께하는 럭셔리 골프 리조트입니다.',
    establishedDate: new Date('2018-05-10'),
    logoUrl: null,
    status: 'ACTIVE',
    isActive: true,
    coursesCount: 4,
    totalRevenue: 22500000,
    monthlyRevenue: 3200000,
    averageRating: 4.9,
    totalBookings: 312,
    createdAt: new Date('2018-05-10'),
    updatedAt: new Date('2024-07-07')
  },
  {
    id: 4,
    name: '마운틴 피크 골프',
    businessNumber: '456-78-90123',
    address: '경상북도 경주시 산내면 대현리 산 15-1',
    phoneNumber: '054-456-7890',
    email: 'info@mountainpeak.co.kr',
    website: 'https://www.mountainpeak.co.kr',
    description: '산악지형을 활용한 도전적인 코스로 유명한 골프장입니다.',
    establishedDate: new Date('2012-11-03'),
    logoUrl: null,
    status: 'MAINTENANCE',
    isActive: false,
    coursesCount: 2,
    totalRevenue: 7200000,
    monthlyRevenue: 1200000,
    averageRating: 4.3,
    totalBookings: 145,
    createdAt: new Date('2012-11-03'),
    updatedAt: new Date('2024-07-05')
  },
  {
    id: 5,
    name: '레이크사이드 클럽',
    businessNumber: '567-89-01234',
    address: '충청남도 천안시 동남구 목천읍 삼성리 200',
    phoneNumber: '041-567-8901',
    email: 'contact@lakeside.co.kr',
    website: 'https://www.lakeside.co.kr',
    description: '호수를 끼고 있는 평화로운 분위기의 클럽하우스와 코스를 자랑합니다.',
    establishedDate: new Date('2020-01-15'),
    logoUrl: null,
    status: 'ACTIVE',
    isActive: true,
    coursesCount: 1,
    totalRevenue: 5500000,
    monthlyRevenue: 1100000,
    averageRating: 4.5,
    totalBookings: 89,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2024-07-06')
  }
];

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

export const CompanyManagementContainer: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>(mockCompanies);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState<CompanyFiltersType>({
    search: '',
    status: undefined,
    sortBy: 'name',
    sortOrder: 'asc',
    showOnlyActive: false
  });

  // Apply filters
  useEffect(() => {
    let filtered = [...companies];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(searchLower) ||
        company.businessNumber.includes(filters.search) ||
        company.address.toLowerCase().includes(searchLower) ||
        company.email.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(company => company.status === filters.status);
    }

    // Active only filter
    if (filters.showOnlyActive) {
      filtered = filtered.filter(company => company.isActive);
    }

    // Sort
    filtered.sort((a, b) => {
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

    setFilteredCompanies(filtered);
  }, [companies, filters]);

  // Event handlers
  const handleCreateCompany = () => {
    setEditingCompany(null);
    setViewMode('create');
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setViewMode('edit');
  };

  const handleViewCompany = (company: Company) => {
    setSelectedCompany(company);
    setViewMode('detail');
  };

  const handleDeleteCompany = async (company: Company) => {
    const confirmed = window.confirm(
      `${company.name}을(를) 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 코스와 예약 정보도 함께 삭제됩니다.`
    );

    if (confirmed) {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setCompanies(prev => prev.filter(c => c.id !== company.id));
        alert('회사가 성공적으로 삭제되었습니다.');
      } catch (error) {
        alert('회사 삭제 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdateCompanyStatus = async (company: Company, status: CompanyStatus) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCompanies(prev => prev.map(c => 
        c.id === company.id 
          ? { ...c, status, isActive: status === 'ACTIVE', updatedAt: new Date() }
          : c
      ));
      
      alert(`회사 상태가 ${status === 'ACTIVE' ? '활성' : status === 'MAINTENANCE' ? '점검' : '비활성'}으로 변경되었습니다.`);
    } catch (error) {
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSuccess = (companyData: Partial<Company>) => {
    if (viewMode === 'create') {
      const newCompany: Company = {
        id: Math.max(...companies.map(c => c.id)) + 1,
        name: companyData.name!,
        businessNumber: companyData.businessNumber!,
        address: companyData.address!,
        phoneNumber: companyData.phoneNumber!,
        email: companyData.email!,
        website: companyData.website || '',
        description: companyData.description || '',
        establishedDate: companyData.establishedDate || new Date(),
        logoUrl: companyData.logoUrl || null,
        status: companyData.status || 'ACTIVE',
        isActive: companyData.status !== 'INACTIVE',
        coursesCount: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageRating: 0,
        totalBookings: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setCompanies(prev => [...prev, newCompany]);
      alert('새 회사가 성공적으로 등록되었습니다.');
    } else if (viewMode === 'edit' && editingCompany) {
      setCompanies(prev => prev.map(c => 
        c.id === editingCompany.id 
          ? { ...c, ...companyData, updatedAt: new Date() }
          : c
      ));
      alert('회사 정보가 성공적으로 수정되었습니다.');
    }
    
    setViewMode('list');
    setEditingCompany(null);
  };

  const handleFormCancel = () => {
    setViewMode('list');
    setEditingCompany(null);
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedCompany(null);
    setEditingCompany(null);
  };

  const handleFiltersChange = (newFilters: CompanyFiltersType) => {
    setFilters(newFilters);
  };

  const handleBulkAction = async (action: string, companyIds: number[]) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      switch (action) {
        case 'activate':
          setCompanies(prev => prev.map(c => 
            companyIds.includes(c.id) 
              ? { ...c, status: 'ACTIVE' as const, isActive: true, updatedAt: new Date() }
              : c
          ));
          break;
        case 'deactivate':
          setCompanies(prev => prev.map(c => 
            companyIds.includes(c.id) 
              ? { ...c, status: 'INACTIVE' as const, isActive: false, updatedAt: new Date() }
              : c
          ));
          break;
        case 'delete':
          if (window.confirm(`선택된 ${companyIds.length}개 회사를 삭제하시겠습니까?`)) {
            setCompanies(prev => prev.filter(c => !companyIds.includes(c.id)));
          }
          break;
      }
      
      setSelectedCompanies([]);
      alert('작업이 완료되었습니다.');
    } catch (error) {
      alert('작업 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {viewMode !== 'list' && (
            <button
              onClick={handleBack}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </button>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'list' && '회사 관리'}
              {viewMode === 'detail' && '회사 상세 정보'}
              {viewMode === 'create' && '새 회사 등록'}
              {viewMode === 'edit' && '회사 정보 수정'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {viewMode === 'list' && '골프장 운영 회사들을 관리합니다.'}
              {viewMode === 'detail' && '회사의 상세 정보와 운영 현황을 확인합니다.'}
              {viewMode === 'create' && '새로운 골프장 운영 회사를 등록합니다.'}
              {viewMode === 'edit' && '회사의 기본 정보를 수정합니다.'}
            </p>
          </div>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={handleCreateCompany}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 회사 등록
          </button>
        )}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'list' && (
        <>
          {/* Statistics */}
          <CompanyStats companies={companies} />

          {/* Bulk Actions */}
          {selectedCompanies.length > 0 && (
            <CompanyBulkActions
              selectedCount={selectedCompanies.length}
              onBulkAction={handleBulkAction}
              selectedCompanies={selectedCompanies}
              isLoading={isLoading}
            />
          )}

          {/* Enhanced Company List */}
          <EnhancedCompanyList
            companies={companies}
            isLoading={isLoading}
            onSelectCompany={handleViewCompany}
            onCreateCompany={handleCreateCompany}
            onEditCompany={handleEditCompany}
            onDeleteCompany={handleDeleteCompany}
            onUpdateStatus={handleUpdateCompanyStatus}
            selectedCompanies={companies.filter(c => selectedCompanies.includes(c.id))}
            onSelectionChange={(companies) => setSelectedCompanies(companies.map(c => c.id))}
            onRefresh={() => {
              // Refresh companies data
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 1000);
            }}
          />
        </>
      )}

      {viewMode === 'detail' && selectedCompany && (
        <CompanyDetailView
          company={selectedCompany}
          onEdit={() => handleEditCompany(selectedCompany)}
          onDelete={() => handleDeleteCompany(selectedCompany)}
          onUpdateStatus={(status) => handleUpdateCompanyStatus(selectedCompany, status)}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <CompanyForm
          company={editingCompany}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};