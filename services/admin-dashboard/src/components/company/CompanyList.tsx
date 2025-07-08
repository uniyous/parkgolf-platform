import React from 'react';
import type { Company, CompanyStatus } from '../../types/company';

interface CompanyListProps {
  companies: Company[];
  selectedCompanies: number[];
  isLoading: boolean;
  onSelectCompanies: (ids: number[]) => void;
  onViewCompany: (company: Company) => void;
  onEditCompany: (company: Company) => void;
  onDeleteCompany: (company: Company) => void;
  onUpdateStatus: (company: Company, status: CompanyStatus) => void;
}

export const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  selectedCompanies,
  isLoading,
  onSelectCompanies,
  onViewCompany,
  onEditCompany,
  onDeleteCompany,
  onUpdateStatus
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getStatusBadge = (status: CompanyStatus) => {
    switch (status) {
      case 'ACTIVE':
        return { label: '활성', color: 'bg-green-100 text-green-800' };
      case 'INACTIVE':
        return { label: '비활성', color: 'bg-red-100 text-red-800' };
      case 'MAINTENANCE':
        return { label: '점검', color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return stars;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectCompanies(companies.map(c => c.id));
    } else {
      onSelectCompanies([]);
    }
  };

  const handleSelectCompany = (companyId: number, checked: boolean) => {
    if (checked) {
      onSelectCompanies([...selectedCompanies, companyId]);
    } else {
      onSelectCompanies(selectedCompanies.filter(id => id !== companyId));
    }
  };

  const isAllSelected = companies.length > 0 && selectedCompanies.length === companies.length;
  const isPartiallySelected = selectedCompanies.length > 0 && selectedCompanies.length < companies.length;

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="animate-pulse h-4 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {selectedCompanies.length > 0 ? `${selectedCompanies.length}개 선택됨` : '전체 선택'}
              </span>
            </label>
            
            <h3 className="text-lg font-medium text-gray-900">
              회사 목록 ({companies.length}개)
            </h3>
          </div>

          {/* View Options */}
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Company List */}
      {companies.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 회사가 없습니다</h3>
          <p className="text-gray-500 mb-4">새 회사 등록 버튼을 클릭하여 첫 번째 회사를 추가하세요.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {companies.map((company) => {
            const status = getStatusBadge(company.status);
            const isSelected = selectedCompanies.includes(company.id);
            
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
                      onChange={(e) => handleSelectCompany(company.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>

                  {/* Company Logo */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-xl font-semibold text-gray-600">
                          {company.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 
                        className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => onViewCompany(company)}
                      >
                        {company.name}
                      </h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                        {status.label}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">사업자번호:</span>
                        <br />
                        {company.businessNumber}
                      </div>
                      <div>
                        <span className="font-medium">연락처:</span>
                        <br />
                        {company.phoneNumber}
                      </div>
                      <div>
                        <span className="font-medium">설립일:</span>
                        <br />
                        {formatDate(company.establishedDate)}
                      </div>
                      <div>
                        <span className="font-medium">코스 수:</span>
                        <br />
                        {company.coursesCount}개
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">주소:</span> {company.address}
                    </div>

                    {company.description && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">설명:</span> {company.description}
                      </div>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex-shrink-0 text-right space-y-2">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(company.totalRevenue)}
                      </div>
                      <div className="text-xs text-gray-500">총 매출</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {company.totalBookings}건
                      </div>
                      <div className="text-xs text-gray-500">총 예약</div>
                    </div>
                    <div className="flex items-center justify-end space-x-1">
                      {getRatingStars(Math.round(company.averageRating))}
                      <span className="text-xs text-gray-500 ml-1">
                        {company.averageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => onViewCompany(company)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        상세보기
                      </button>
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
                            onClick={() => onUpdateStatus(company, 'ACTIVE')}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            활성화
                          </button>
                        )}
                        {company.status === 'ACTIVE' && (
                          <button
                            onClick={() => onUpdateStatus(company, 'MAINTENANCE')}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                          >
                            점검
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={() => onDeleteCompany(company)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};