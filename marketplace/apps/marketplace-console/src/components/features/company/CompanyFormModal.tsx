import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { useCreateCompanyMutation, useUpdateCompanyMutation } from '@/hooks/queries';
import { Button } from '@/components/ui';
import PostalSearchModal from './PostalSearchModal';
import type { Company, CompanyStatus, CompanyType, CreateCompanyDto, UpdateCompanyDto } from '@/types/company';

interface CompanyFormModalProps {
  open: boolean;
  company?: Company;
  onClose: () => void;
}

interface FormData {
  name: string;
  companyType: CompanyType;
  businessNumber: string;
  postalCode: string;
  address1: string;
  address2: string;
  phoneNumber: string;
  email: string;
  website: string;
  description: string;
  establishedDate: string;
  logoUrl: string;
  status: CompanyStatus;
}

const initialFormData: FormData = {
  name: '',
  companyType: 'FRANCHISE',
  businessNumber: '',
  postalCode: '',
  address1: '',
  address2: '',
  phoneNumber: '',
  email: '',
  website: '',
  description: '',
  establishedDate: '',
  logoUrl: '',
  status: 'ACTIVE',
};

const COMPANY_TYPE_OPTIONS = [
  { value: 'FRANCHISE', label: '가맹점', icon: '🏢', description: '일반 골프장/파크골프장' },
  { value: 'ASSOCIATION', label: '협회', icon: '🤝', description: '골프 협회/연맹' },
  { value: 'PLATFORM', label: '플랫폼', icon: '🌐', description: '본사/플랫폼 운영사' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '운영 중', icon: '✅', color: 'bg-green-500/20 text-green-400' },
  { value: 'MAINTENANCE', label: '점검 중', icon: '🔧', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'INACTIVE', label: '비활성', icon: '⏸️', color: 'bg-red-500/20 text-red-400' },
];

export const CompanyFormModal: React.FC<CompanyFormModalProps> = ({ open, company, onClose }) => {
  const createCompany = useCreateCompanyMutation();
  const updateCompany = useUpdateCompanyMutation();
  const isEditing = !!company;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isPostalSearchOpen, setIsPostalSearchOpen] = useState(false);

  useEffect(() => {
    if (company) {
      const addressParts = company.address ? company.address.split(' ') : ['', '', ''];
      const postalCode = addressParts[0] || '';
      const address1 = addressParts.slice(1, -1).join(' ') || '';
      const address2 = addressParts[addressParts.length - 1] || '';

      setFormData({
        name: company.name || '',
        companyType: company.companyType || 'FRANCHISE',
        businessNumber: company.businessNumber || '',
        postalCode,
        address1,
        address2,
        phoneNumber: company.phoneNumber || '',
        email: company.email || '',
        website: company.website || '',
        description: company.description || '',
        establishedDate: company.establishedDate ? company.establishedDate.split('T')[0] : '',
        logoUrl: company.logoUrl || '',
        status: company.status || 'ACTIVE',
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [company, open]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '회사명을 입력해주세요.';
    }

    if (!formData.businessNumber.trim()) {
      newErrors.businessNumber = '사업자번호를 입력해주세요.';
    } else if (!/^\d{3}-\d{2}-\d{5}$/.test(formData.businessNumber)) {
      newErrors.businessNumber = '사업자번호 형식이 올바르지 않습니다. (예: 123-45-67890)';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = '우편번호를 입력해주세요.';
    }

    if (!formData.address1.trim()) {
      newErrors.address1 = '기본주소를 입력해주세요.';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '연락처를 입력해주세요.';
    } else if (!/^0\d{1,2}-\d{3,4}-\d{4}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = '연락처 형식이 올바르지 않습니다. (예: 02-1234-5678)';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '이메일 형식이 올바르지 않습니다.';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = '웹사이트 URL 형식이 올바르지 않습니다.';
    }

    if (!formData.establishedDate) {
      newErrors.establishedDate = '설립일을 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const combinedAddress = [formData.postalCode, formData.address1, formData.address2].filter(Boolean).join(' ');

    // 회사명에서 코드 자동 생성
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

    if (isEditing && company) {
      const updateData: UpdateCompanyDto = {
        name: formData.name,
        companyType: formData.companyType,
        businessNumber: formData.businessNumber,
        address: combinedAddress,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        website: formData.website || undefined,
        description: formData.description || undefined,
        establishedDate: formData.establishedDate,
        logoUrl: formData.logoUrl || undefined,
        status: formData.status,
      };
      await updateCompany.mutateAsync({ id: company.id, data: updateData });
    } else {
      const createData: CreateCompanyDto = {
        name: formData.name,
        code: generateCode(formData.name),
        companyType: formData.companyType,
        businessNumber: formData.businessNumber,
        address: combinedAddress,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        website: formData.website || undefined,
        description: formData.description || undefined,
        establishedDate: formData.establishedDate,
        logoUrl: formData.logoUrl || undefined,
        status: formData.status,
      };
      await createCompany.mutateAsync(createData);
    }
    onClose();
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const formatBusinessNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePostalSelect = (postalData: { postalCode: string; address: string }) => {
    setFormData((prev) => ({
      ...prev,
      postalCode: postalData.postalCode,
      address1: postalData.address,
    }));
    setIsPostalSearchOpen(false);
    setErrors((prev) => ({ ...prev, postalCode: undefined, address1: undefined }));
  };

  const isPending = createCompany.isPending || updateCompany.isPending;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl max-h-[90vh] overflow-hidden focus:outline-none"
            aria-describedby={undefined}
          >
            <VisuallyHidden.Root asChild>
              <Dialog.Title>{isEditing ? '회사 수정' : '회사 추가'}</Dialog.Title>
            </VisuallyHidden.Root>

            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {isEditing ? '회사 정보 수정' : '새 회사 등록'}
                    </h2>
                    <p className="text-white/70 text-sm mt-0.5">
                      {isEditing ? '회사 정보를 수정합니다' : '새로운 회사를 등록합니다'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="p-6 space-y-6">
                {/* 기본 정보 섹션 */}
                <div className="bg-white/5 rounded-xl p-5">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-medium text-white">기본 정보</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 회사명 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">
                        회사명 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white/10 text-white ${
                            errors.name ? 'border-red-500 bg-red-500/10' : 'border-white/15'
                          }`}
                          placeholder="그린밸리 골프클럽"
                        />
                      </div>
                      {errors.name && <p className="mt-1.5 text-sm text-red-500 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.name}</p>}
                    </div>

                    {/* 회사 유형 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">
                        회사 유형 <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {COMPANY_TYPE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleChange('companyType', option.value)}
                            className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-lg border-2 transition-all ${
                              formData.companyType === option.value
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                : 'border-white/15 hover:border-white/20 text-white/60'
                            }`}
                          >
                            <span className="text-lg mb-0.5">{option.icon}</span>
                            <span className="text-xs font-medium">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 사업자번호 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">
                        사업자번호 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={formData.businessNumber}
                          onChange={(e) => handleChange('businessNumber', formatBusinessNumber(e.target.value))}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white/10 text-white ${
                            errors.businessNumber ? 'border-red-500 bg-red-500/10' : 'border-white/15'
                          }`}
                          placeholder="123-45-67890"
                          maxLength={12}
                        />
                      </div>
                      {errors.businessNumber && <p className="mt-1.5 text-sm text-red-500 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.businessNumber}</p>}
                    </div>

                    {/* 연락처 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">
                        연락처 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={formData.phoneNumber}
                          onChange={(e) => handleChange('phoneNumber', formatPhoneNumber(e.target.value))}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white/10 text-white ${
                            errors.phoneNumber ? 'border-red-500 bg-red-500/10' : 'border-white/15'
                          }`}
                          placeholder="02-1234-5678"
                          maxLength={13}
                        />
                      </div>
                      {errors.phoneNumber && <p className="mt-1.5 text-sm text-red-500 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.phoneNumber}</p>}
                    </div>

                    {/* 이메일 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">
                        이메일 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white/10 text-white ${
                            errors.email ? 'border-red-500 bg-red-500/10' : 'border-white/15'
                          }`}
                          placeholder="info@company.com"
                        />
                      </div>
                      {errors.email && <p className="mt-1.5 text-sm text-red-500 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.email}</p>}
                    </div>

                    {/* 웹사이트 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">웹사이트</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                        </div>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => handleChange('website', e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white/10 text-white ${
                            errors.website ? 'border-red-500 bg-red-500/10' : 'border-white/15'
                          }`}
                          placeholder="https://www.company.com"
                        />
                      </div>
                      {errors.website && <p className="mt-1.5 text-sm text-red-500 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.website}</p>}
                    </div>

                    {/* 설립일 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">
                        설립일 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="date"
                          value={formData.establishedDate}
                          onChange={(e) => handleChange('establishedDate', e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white/10 text-white ${
                            errors.establishedDate ? 'border-red-500 bg-red-500/10' : 'border-white/15'
                          }`}
                        />
                      </div>
                      {errors.establishedDate && <p className="mt-1.5 text-sm text-red-500 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.establishedDate}</p>}
                    </div>
                  </div>
                </div>

                {/* 주소 정보 섹션 */}
                <div className="bg-white/5 rounded-xl p-5">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-medium text-white">주소 정보</h3>
                  </div>

                  <div className="space-y-4">
                    {/* 우편번호 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">
                        우편번호 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={formData.postalCode}
                            onChange={(e) => handleChange('postalCode', e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white/10 text-white ${
                              errors.postalCode ? 'border-red-500 bg-red-500/10' : 'border-white/15'
                            }`}
                            placeholder="12345"
                            maxLength={5}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPostalSearchOpen(true)}
                          className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center shadow-sm"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          주소 검색
                        </button>
                      </div>
                      {errors.postalCode && <p className="mt-1.5 text-sm text-red-500 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.postalCode}</p>}
                    </div>

                    {/* 기본주소 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">
                        기본주소 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address1}
                        onChange={(e) => handleChange('address1', e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white/10 text-white ${
                          errors.address1 ? 'border-red-500 bg-red-500/10' : 'border-white/15'
                        }`}
                        placeholder="경기도 용인시 처인구 모현읍"
                      />
                      {errors.address1 && <p className="mt-1.5 text-sm text-red-500 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.address1}</p>}
                    </div>

                    {/* 상세주소 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">상세주소</label>
                      <input
                        type="text"
                        value={formData.address2}
                        onChange={(e) => handleChange('address2', e.target.value)}
                        className="w-full px-4 py-2.5 border border-white/15 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/10 text-white transition-colors"
                        placeholder="능원로 200"
                      />
                    </div>
                  </div>
                </div>

                {/* 추가 정보 섹션 */}
                <div className="bg-white/5 rounded-xl p-5">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <h3 className="text-base font-medium text-white">추가 정보</h3>
                  </div>

                  <div className="space-y-4">
                    {/* 회사 설명 */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">회사 설명</label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="w-full px-4 py-2.5 border border-white/15 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/10 text-white transition-colors resize-none"
                        placeholder="회사에 대한 간단한 설명을 입력하세요..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 로고 URL */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">로고 URL</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="url"
                            value={formData.logoUrl}
                            onChange={(e) => handleChange('logoUrl', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-white/15 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/10 text-white transition-colors"
                            placeholder="https://example.com/logo.png"
                          />
                        </div>
                      </div>

                      {/* 운영 상태 */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">운영 상태</label>
                        <div className="grid grid-cols-3 gap-2">
                          {STATUS_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleChange('status', option.value)}
                              className={`flex items-center justify-center px-3 py-2.5 rounded-lg border-2 transition-all ${
                                formData.status === option.value
                                  ? `${option.color} border-current font-medium`
                                  : 'border-white/15 hover:border-white/20 text-white/60'
                              }`}
                            >
                              <span className="mr-1.5">{option.icon}</span>
                              <span className="text-sm">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  취소
                </Button>
                <Button type="submit" loading={isPending}>
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditing ? '수정 완료' : '회사 등록'}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Postal Search Modal */}
      <PostalSearchModal
        isOpen={isPostalSearchOpen}
        onClose={() => setIsPostalSearchOpen(false)}
        onSelect={handlePostalSelect}
      />
    </>
  );
};
