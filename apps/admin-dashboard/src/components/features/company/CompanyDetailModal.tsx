import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui';
import type { Company, CompanyStatus } from '@/types/company';

interface CompanyDetailModalProps {
  open: boolean;
  company?: Company;
  onClose: () => void;
  onEdit: (company: Company) => void;
}

const STATUS_BADGE_STYLES: Record<CompanyStatus, { bg: string; dot: string; label: string }> = {
  ACTIVE: { bg: 'bg-emerald-500/10 text-emerald-400 border-white/15', dot: 'bg-emerald-500', label: '활성' },
  INACTIVE: { bg: 'bg-red-500/10 text-red-400 border-white/15', dot: 'bg-red-500', label: '비활성' },
  MAINTENANCE: { bg: 'bg-yellow-500/10 text-yellow-400 border-white/15', dot: 'bg-yellow-500', label: '점검' },
  SUSPENDED: { bg: 'bg-white/5 text-white/50 border-white/10', dot: 'bg-white/50', label: '정지' },
  PENDING: { bg: 'bg-emerald-500/10 text-emerald-400 border-white/15', dot: 'bg-emerald-500', label: '대기' },
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
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto focus:outline-none"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root asChild>
            <Dialog.Title>{company.name} 상세 정보</Dialog.Title>
          </VisuallyHidden.Root>
          {/* Header */}
          <div className="relative bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 px-8 py-6">
          <div className="flex items-start justify-between">
            {/* Company Info */}
            <div className="flex items-start space-x-6">
              {/* Logo */}
              <div className="w-24 h-24 bg-white/10 rounded-xl flex items-center justify-center shadow-lg border border-white/15 overflow-hidden">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white/50">
                    {company.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="pt-2">
                <div className="flex items-center space-x-4 mb-3">
                  <h2 className="text-2xl font-bold text-white">{company.name}</h2>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${statusBadge.bg}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${statusBadge.dot}`}></div>
                    {statusBadge.label}
                  </div>
                </div>
                {company.description && (
                  <p className="text-white/70 text-sm leading-relaxed max-w-md">
                    {company.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => onEdit(company)}>
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="bg-white/5 rounded-xl p-5">
              <h3 className="text-base font-medium text-white mb-4">기본 정보</h3>
              <div className="space-y-3">
                <div className="flex">
                  <div className="w-24 text-sm font-medium text-white/60">사업자번호</div>
                  <div className="flex-1 text-white font-mono">{company.businessNumber || '-'}</div>
                </div>
                <div className="flex">
                  <div className="w-24 text-sm font-medium text-white/60">설립일</div>
                  <div className="flex-1 text-white">{company.establishedDate ? formatDate(company.establishedDate) : '정보없음'}</div>
                </div>
                <div className="flex">
                  <div className="w-24 text-sm font-medium text-white/60">코스 수</div>
                  <div className="flex-1 text-white">{company.coursesCount || 0}개</div>
                </div>
              </div>
            </div>

            {/* 연락처 정보 */}
            <div className="bg-white/5 rounded-xl p-5">
              <h3 className="text-base font-medium text-white mb-4">연락처 정보</h3>
              <div className="space-y-3">
                <div className="flex">
                  <div className="w-16 text-sm font-medium text-white/60">전화</div>
                  <div className="flex-1">
                    <a href={`tel:${company.phoneNumber}`} className="text-emerald-400 hover:text-emerald-300">
                      {company.phoneNumber || '-'}
                    </a>
                  </div>
                </div>
                <div className="flex">
                  <div className="w-16 text-sm font-medium text-white/60">이메일</div>
                  <div className="flex-1">
                    <a href={`mailto:${company.email}`} className="text-emerald-400 hover:text-emerald-300">
                      {company.email || '-'}
                    </a>
                  </div>
                </div>
                {company.website && (
                  <div className="flex">
                    <div className="w-16 text-sm font-medium text-white/60">웹사이트</div>
                    <div className="flex-1">
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 주소 */}
          <div className="mt-6 bg-white/5 rounded-xl p-5">
            <h3 className="text-base font-medium text-white mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              주소
            </h3>
            <p className="text-white">{company.address || '-'}</p>
          </div>
        </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-white/5 border-t border-white/10 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
