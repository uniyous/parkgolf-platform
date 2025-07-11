import React, { useState, useMemo } from 'react';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { Company, CompanyStatus } from '../../types/company';

interface EnhancedCompanyListProps {
  companies: Company[];
  isLoading: boolean;
  onSelectCompany: (company: Company) => void;
  onCreateCompany: () => void;
  onEditCompany: (company: Company) => void;
  onDeleteCompany: (company: Company) => void;
  onUpdateStatus: (company: Company, status: CompanyStatus) => void;
  selectedCompanies: Company[];
  onSelectionChange: (companies: Company[]) => void;
  onRefresh: () => void;
}

type SortField = 'name' | 'businessNumber' | 'status' | 'coursesCount' | 'totalRevenue' | 'totalBookings' | 'averageRating' | 'establishedDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  status: CompanyStatus | 'ALL';
  revenueRange: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';
  coursesRange: 'ALL' | 'SMALL' | 'MEDIUM' | 'LARGE';
}

export const EnhancedCompanyList: React.FC<EnhancedCompanyListProps> = ({
  companies,
  isLoading,
  onSelectCompany,
  onCreateCompany,
  onEditCompany,
  onDeleteCompany,
  onUpdateStatus,
  selectedCompanies,
  onSelectionChange,
  onRefresh,
}) => {
  const { showConfirmation } = useConfirmation();
  const { currentAdmin, hasPermission } = useAdminAuth();

  // 필터 및 정렬 상태
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'ALL',
    revenueRange: 'ALL',
    coursesRange: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // 필터링 및 정렬된 회사 목록
  const filteredAndSortedCompanies = useMemo(() => {
    if (!companies || !Array.isArray(companies)) {
      return [];
    }
    
    let filtered = companies.filter(company => {
      // 검색 필터
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          company.name.toLowerCase().includes(searchLower) ||
          company.businessNumber.includes(filters.search) ||
          company.email.toLowerCase().includes(searchLower) ||
          company.address.toLowerCase().includes(searchLower) ||
          company.phoneNumber.includes(filters.search)
        );
      }
      return true;
    }).filter(company => {
      // 상태 필터
      if (filters.status !== 'ALL') {
        return company.status === filters.status;
      }
      return true;
    }).filter(company => {
      // 매출 범위 필터
      if (filters.revenueRange !== 'ALL') {
        const revenue = company.totalRevenue;
        switch (filters.revenueRange) {
          case 'LOW': return revenue < 1000000000; // 10억 미만
          case 'MEDIUM': return revenue >= 1000000000 && revenue < 5000000000; // 10억~50억
          case 'HIGH': return revenue >= 5000000000; // 50억 이상
          default: return true;
        }
      }
      return true;
    }).filter(company => {
      // 코스 수 범위 필터
      if (filters.coursesRange !== 'ALL') {
        const courses = company.coursesCount;
        switch (filters.coursesRange) {
          case 'SMALL': return courses <= 2;
          case 'MEDIUM': return courses >= 3 && courses <= 5;
          case 'LARGE': return courses >= 6;
          default: return true;
        }
      }
      return true;
    });

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'businessNumber':
          aValue = a.businessNumber;
          bValue = b.businessNumber;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'coursesCount':
          aValue = a.coursesCount;
          bValue = b.coursesCount;
          break;
        case 'totalRevenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'totalBookings':
          aValue = a.totalBookings;
          bValue = b.totalBookings;
          break;
        case 'averageRating':
          aValue = a.averageRating;
          bValue = b.averageRating;
          break;
        case 'establishedDate':
          aValue = new Date(a.establishedDate).getTime();
          bValue = new Date(b.establishedDate).getTime();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [companies, filters, sortField, sortDirection]);

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredAndSortedCompanies);
    } else {
      onSelectionChange([]);
    }
  };

  // 개별 선택/해제
  const handleSelectCompany = (company: Company, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedCompanies, company]);
    } else {
      onSelectionChange(selectedCompanies.filter(c => c.id !== company.id));
    }
  };

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'ALL',
      revenueRange: 'ALL',
      coursesRange: 'ALL',
    });
  };

  // 삭제 확인
  const handleDeleteCompany = async (company: Company) => {
    const confirmed = await showConfirmation({
      title: '회사 삭제',
      message: `${company.name} 회사를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      type: 'danger',
    });

    if (confirmed) {
      onDeleteCompany(company);
    }
  };

  // 상태 변경 확인
  const handleStatusChange = async (company: Company, newStatus: CompanyStatus) => {
    const statusLabels = {
      ACTIVE: '활성',
      INACTIVE: '비활성',
      MAINTENANCE: '점검'
    };

    const confirmed = await showConfirmation({
      title: '상태 변경',
      message: `${company.name} 회사의 상태를 '${statusLabels[newStatus]}'로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      type: newStatus === 'INACTIVE' ? 'danger' : 'info',
    });

    if (confirmed) {
      onUpdateStatus(company, newStatus);
    }
  };

  // Status badge colors
  const getStatusBadgeColor = (status: CompanyStatus): string => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Status labels
  const getStatusLabel = (status: CompanyStatus): string => {
    switch (status) {
      case 'ACTIVE': return '활성';
      case 'INACTIVE': return '비활성';
      case 'MAINTENANCE': return '점검';
      default: return status;
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Format business number
  const formatBusinessNumber = (businessNumber: string): string => {
    // 123-45-67890 형태로 포맷팅
    if (businessNumber.length === 10) {
      return `${businessNumber.slice(0, 3)}-${businessNumber.slice(3, 5)}-${businessNumber.slice(5)}`;
    }
    return businessNumber;
  };

  const isAllSelected = filteredAndSortedCompanies.length > 0 && 
    filteredAndSortedCompanies.every(company => selectedCompanies.some(selected => selected.id === company.id));
  const isSomeSelected = selectedCompanies.length > 0 && !isAllSelected;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">회사 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">회사 관리</h2>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
            <span>전체 {companies.length}개</span>
            <span>•</span>
            <span>활성 {companies.filter(c => c.status === 'ACTIVE').length}개</span>
            <span>•</span>
            <span>점검중 {companies.filter(c => c.status === 'MAINTENANCE').length}개</span>
            <span>•</span>
            <span>비활성 {companies.filter(c => c.status === 'INACTIVE').length}개</span>
            {filteredAndSortedCompanies.length !== companies.length && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">필터링됨 {filteredAndSortedCompanies.length}개</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
          {hasPermission('MANAGE_COMPANIES') && (
            <button
              onClick={onCreateCompany}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 회사
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <div className="relative">
              <input
                type="text"
                placeholder="회사명, 사업자번호, 주소..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as CompanyStatus | 'ALL' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
              <option value="MAINTENANCE">점검</option>
            </select>
          </div>

          {/* Revenue Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">매출 규모</label>
            <select
              value={filters.revenueRange}
              onChange={(e) => setFilters({ ...filters, revenueRange: e.target.value as FilterState['revenueRange'] })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체</option>
              <option value="LOW">10억 미만</option>
              <option value="MEDIUM">10억 ~ 50억</option>
              <option value="HIGH">50억 이상</option>
            </select>
          </div>

          {/* Courses Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">코스 규모</label>
            <select
              value={filters.coursesRange}
              onChange={(e) => setFilters({ ...filters, coursesRange: e.target.value as FilterState['coursesRange'] })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체</option>
              <option value="SMALL">소규모 (2개 이하)</option>
              <option value="MEDIUM">중규모 (3-5개)</option>
              <option value="LARGE">대규모 (6개 이상)</option>
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              {filteredAndSortedCompanies.length}개 결과
            </span>
            {(filters.search || filters.status !== 'ALL' || filters.revenueRange !== 'ALL' || filters.coursesRange !== 'ALL') && (
              <button
                onClick={resetFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                필터 초기화
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">정렬:</span>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortField(field as SortField);
                setSortDirection(direction as SortDirection);
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="name-asc">이름 (가나다순)</option>
              <option value="name-desc">이름 (다가나순)</option>
              <option value="totalRevenue-desc">매출 높은순</option>
              <option value="totalBookings-desc">예약 많은순</option>
              <option value="averageRating-desc">평점 높은순</option>
              <option value="coursesCount-desc">코스 많은순</option>
              <option value="establishedDate-desc">설립일 최신순</option>
              <option value="createdAt-desc">등록일 최신순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Company List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* List Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {selectedCompanies.length > 0 ? `${selectedCompanies.length}개 선택됨` : '전체 선택'}
                </span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Company Items */}
        {filteredAndSortedCompanies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {companies.length === 0 ? '등록된 회사가 없습니다' : '검색 조건에 맞는 회사가 없습니다'}
            </h3>
            <p className="text-gray-500 mb-4">
              {companies.length === 0 
                ? '새 회사 등록 버튼을 클릭하여 첫 번째 회사를 추가하세요.' 
                : '다른 검색 조건을 시도해보세요.'
              }
            </p>
            {companies.length > 0 && (
              <button
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                모든 필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedCompanies.map((company) => {
              const isSelected = selectedCompanies.some(selected => selected.id === company.id);
              
              return (
                <div 
                  key={company.id}
                  className={`p-6 hover:bg-gray-50 transition-colors duration-150 ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Checkbox */}
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectCompany(company, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </label>

                    {/* Company Logo */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">🏢</span>
                        )}
                      </div>
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 
                          className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => onSelectCompany(company)}
                        >
                          {company.name}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(company.status)}`}>
                          {getStatusLabel(company.status)}
                        </span>
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">사업자번호:</span>
                          <br />
                          {formatBusinessNumber(company.businessNumber)}
                        </div>
                        <div>
                          <span className="font-medium">코스 수:</span>
                          <br />
                          {company.coursesCount}개
                        </div>
                        <div>
                          <span className="font-medium">평점:</span>
                          <br />
                          ⭐ {company.averageRating.toFixed(1)}
                        </div>
                        <div>
                          <span className="font-medium">설립일:</span>
                          <br />
                          {formatDate(company.establishedDate)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">📧</span> {company.email}
                        </div>
                        <div>
                          <span className="font-medium">📞</span> {company.phoneNumber}
                        </div>
                        <div>
                          <span className="font-medium">📍</span> {company.address}
                        </div>
                      </div>

                      {company.description && (
                        <div className="text-sm text-gray-600 mb-2">
                          {company.description}
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-600 font-medium">
                          매출: {formatCurrency(company.totalRevenue)}
                        </span>
                        <span className="text-blue-600 font-medium">
                          예약: {company.totalBookings.toLocaleString()}건
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => onSelectCompany(company)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          상세보기
                        </button>
                        {hasPermission('MANAGE_COMPANIES') && (
                          <>
                            <button
                              onClick={() => onEditCompany(company)}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              수정
                            </button>
                            
                            {/* Status Actions */}
                            <div className="flex space-x-1">
                              {company.status !== 'ACTIVE' && (
                                <button
                                  onClick={() => handleStatusChange(company, 'ACTIVE')}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  활성화
                                </button>
                              )}
                              {company.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleStatusChange(company, 'MAINTENANCE')}
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                >
                                  점검
                                </button>
                              )}
                            </div>
                          </>
                        )}
                        
                        {hasPermission('MANAGE_COMPANIES') && currentAdmin?.scope === 'PLATFORM' && (
                          <button
                            onClick={() => handleDeleteCompany(company)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};