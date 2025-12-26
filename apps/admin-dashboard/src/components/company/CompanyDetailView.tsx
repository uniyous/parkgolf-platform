import React from 'react';
import type { Company, CompanyStatus } from '../../types/company';

interface CompanyDetailViewProps {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: CompanyStatus) => void;
}

export const CompanyDetailView: React.FC<CompanyDetailViewProps> = ({
  company,
  onEdit,
  onDelete,
  onUpdateStatus
}) => {
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return '정보없음';
      }
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.warn('Date formatting error:', error);
      return '정보없음';
    }
  };

  const getStatusBadge = (status: CompanyStatus) => {
    switch (status) {
      case 'ACTIVE':
        return { label: '활성', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' };
      case 'INACTIVE':
        return { label: '비활성', color: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-500' };
      case 'MAINTENANCE':
        return { label: '점검', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' };
      default:
        return { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200', dotColor: 'bg-gray-500' };
    }
  };

  const statusBadge = getStatusBadge(company.status);

  return (
    <div className="w-full">
      {/* Main Content Card */}
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        {/* Header Section */}
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 px-8 py-8">
          <div className="flex items-start justify-between">
            {/* Company Info Section */}
            <div className="flex items-start space-x-6">
              {/* Company Logo */}
              <div className="relative">
                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-200 overflow-hidden">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-gray-500">
                      {company.name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Company Details */}
              <div className="flex-1 pt-2">
                <div className="flex items-center space-x-4 mb-4">
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{company.name}</h1>
                  <div className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-medium ${statusBadge.color}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${statusBadge.dotColor}`}></div>
                    {statusBadge.label}
                  </div>
                </div>

                {/* Description */}
                {company.description && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/80 shadow-sm">
                    <p className="text-gray-700 leading-relaxed">{company.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 ml-6">
              <button
                onClick={onEdit}
                className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="수정"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </button>

              {company.status !== 'ACTIVE' ? (
                <button
                  onClick={() => onUpdateStatus('ACTIVE')}
                  className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="활성화"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  활성화
                </button>
              ) : (
                <button
                  onClick={() => onUpdateStatus('MAINTENANCE')}
                  className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="점검모드"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  점검모드
                </button>
              )}

              <button
                onClick={onDelete}
                className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="삭제"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제
              </button>
            </div>
          </div>
        </div>

        {/* Company Information Grid */}
        <div className="px-8 py-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">회사 정보</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-base font-medium text-gray-900 mb-4">기본 정보</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-32 text-sm font-medium text-gray-600 mt-1">사업자번호</div>
                    <div className="flex-1 text-gray-900 font-mono">{company.businessNumber}</div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-32 text-sm font-medium text-gray-600 mt-1">설립일</div>
                    <div className="flex-1 text-gray-900">{formatDate(company.establishedDate)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-base font-medium text-gray-900 mb-4">연락처 정보</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-20 text-sm font-medium text-gray-600 mt-1">전화</div>
                    <div className="flex-1">
                      <a href={`tel:${company.phoneNumber}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {company.phoneNumber}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-20 text-sm font-medium text-gray-600 mt-1">이메일</div>
                    <div className="flex-1">
                      <a href={`mailto:${company.email}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {company.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="mt-8">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                주소
              </h3>
              <p className="text-gray-900 text-sm leading-relaxed">{company.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};