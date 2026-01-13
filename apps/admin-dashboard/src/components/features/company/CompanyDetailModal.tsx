import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import type { Company, CompanyStatus } from '@/types/company';

interface CompanyDetailModalProps {
  open: boolean;
  company?: Company;
  onClose: () => void;
  onEdit: (company: Company) => void;
}

const STATUS_BADGE_STYLES: Record<CompanyStatus, { bg: string; dot: string; label: string }> = {
  ACTIVE: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: '활성' },
  INACTIVE: { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: '비활성' },
  MAINTENANCE: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: '점검' },
  SUSPENDED: { bg: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-500', label: '정지' },
  PENDING: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: '대기' },
};

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  open,
  company,
  onClose,
  onEdit,
}) => {
  if (!company) return null;

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '정보없음';
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
    } catch {
      return '정보없음';
    }
  };

  const statusBadge = STATUS_BADGE_STYLES[company.status];

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto focus:outline-none"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root asChild>
            <Dialog.Title>{company.name} 상세 정보</Dialog.Title>
          </VisuallyHidden.Root>
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 px-8 py-6">
          <div className="flex items-start justify-between">
            {/* Company Info */}
            <div className="flex items-start space-x-6">
              {/* Logo */}
              <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200 overflow-hidden">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-500">
                    {company.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="pt-2">
                <div className="flex items-center space-x-4 mb-3">
                  <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${statusBadge.bg}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${statusBadge.dot}`}></div>
                    {statusBadge.label}
                  </div>
                </div>
                {company.description && (
                  <p className="text-gray-700 text-sm leading-relaxed max-w-md">
                    {company.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(company)}
                className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-base font-medium text-gray-900 mb-4">기본 정보</h3>
              <div className="space-y-3">
                <div className="flex">
                  <div className="w-24 text-sm font-medium text-gray-600">사업자번호</div>
                  <div className="flex-1 text-gray-900 font-mono">{company.businessNumber || '-'}</div>
                </div>
                <div className="flex">
                  <div className="w-24 text-sm font-medium text-gray-600">설립일</div>
                  <div className="flex-1 text-gray-900">{company.establishedDate ? formatDate(company.establishedDate) : '정보없음'}</div>
                </div>
                <div className="flex">
                  <div className="w-24 text-sm font-medium text-gray-600">코스 수</div>
                  <div className="flex-1 text-gray-900">{company.coursesCount || 0}개</div>
                </div>
              </div>
            </div>

            {/* 연락처 정보 */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-base font-medium text-gray-900 mb-4">연락처 정보</h3>
              <div className="space-y-3">
                <div className="flex">
                  <div className="w-16 text-sm font-medium text-gray-600">전화</div>
                  <div className="flex-1">
                    <a href={`tel:${company.phoneNumber}`} className="text-blue-600 hover:text-blue-800">
                      {company.phoneNumber || '-'}
                    </a>
                  </div>
                </div>
                <div className="flex">
                  <div className="w-16 text-sm font-medium text-gray-600">이메일</div>
                  <div className="flex-1">
                    <a href={`mailto:${company.email}`} className="text-blue-600 hover:text-blue-800">
                      {company.email || '-'}
                    </a>
                  </div>
                </div>
                {company.website && (
                  <div className="flex">
                    <div className="w-16 text-sm font-medium text-gray-600">웹사이트</div>
                    <div className="flex-1">
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 주소 */}
          <div className="mt-6 bg-gray-50 rounded-xl p-5">
            <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              주소
            </h3>
            <p className="text-gray-900">{company.address || '-'}</p>
          </div>
        </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
            >
              닫기
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
