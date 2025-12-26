import React, { useState, useEffect } from 'react';
import type { Company, CompanyStatus, CreateCompanyDto, UpdateCompanyDto } from '../../types/company';
import { useCreateCompany, useUpdateCompany } from '@/hooks/queries';
import PostalSearchModal from './PostalSearchModal';

interface CompanyFormProps {
  company?: Company | null;
  onSuccess: (companyData: Partial<Company>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface FormData {
  name: string;
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

interface FormErrors {
  name?: string;
  businessNumber?: string;
  postalCode?: string;
  address1?: string;
  address2?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  establishedDate?: string;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({
  company,
  onSuccess,
  onCancel,
  isLoading
}) => {
  const isEdit = !!company;

  const [formData, setFormData] = useState<FormData>({
    name: '',
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
    status: 'ACTIVE'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPostalSearchOpen, setIsPostalSearchOpen] = useState(false);

  // Initialize form data when editing
  useEffect(() => {
    if (company) {
      // Parse existing address (assuming format: "postalCode address1 address2")
      const addressParts = company.address ? company.address.split(' ') : ['', '', ''];
      const postalCode = addressParts[0] || '';
      const address1 = addressParts.slice(1, -1).join(' ') || '';
      const address2 = addressParts[addressParts.length - 1] || '';
      
      setFormData({
        name: company.name || '',
        businessNumber: company.businessNumber || '',
        postalCode: postalCode,
        address1: address1,
        address2: address2,
        phoneNumber: company.phoneNumber || '',
        email: company.email || '',
        website: company.website || '',
        description: company.description || '',
        establishedDate: company.establishedDate ? company.establishedDate.split('T')[0] : '',
        logoUrl: company.logoUrl || '',
        status: company.status || 'ACTIVE'
      });
    }
  }, [company]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = '회사명은 필수입니다.';
    }

    if (!formData.businessNumber || !formData.businessNumber.trim()) {
      newErrors.businessNumber = '사업자번호는 필수입니다.';
    } else if (!/^\d{3}-\d{2}-\d{5}$/.test(formData.businessNumber)) {
      newErrors.businessNumber = '사업자번호 형식이 올바르지 않습니다. (예: 123-45-67890)';
    }

    if (!formData.postalCode || !formData.postalCode.trim()) {
      newErrors.postalCode = '우편번호는 필수입니다.';
    }

    if (!formData.address1 || !formData.address1.trim()) {
      newErrors.address1 = '기본주소는 필수입니다.';
    }

    if (!formData.phoneNumber || !formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '연락처는 필수입니다.';
    } else if (!/^0\d{1,2}-\d{3,4}-\d{4}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = '연락처 형식이 올바르지 않습니다. (예: 02-1234-5678)';
    }

    if (!formData.email || !formData.email.trim()) {
      newErrors.email = '이메일은 필수입니다.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '이메일 형식이 올바르지 않습니다.';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = '웹사이트 URL 형식이 올바르지 않습니다. (http:// 또는 https://로 시작)';
    }

    if (!formData.establishedDate) {
      newErrors.establishedDate = '설립일은 필수입니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const formatBusinessNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as 123-45-67890
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 5) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format based on length
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else if (digits.length <= 10) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value);
    setFormData(prev => ({ ...prev, businessNumber: formatted }));
    
    if (errors.businessNumber) {
      setErrors(prev => ({ ...prev, businessNumber: undefined }));
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phoneNumber: formatted }));
    
    if (errors.phoneNumber) {
      setErrors(prev => ({ ...prev, phoneNumber: undefined }));
    }
  };

  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();

  const handlePostalSearch = () => {
    setIsPostalSearchOpen(true);
  };

  const handlePostalSelect = (postalData: { postalCode: string; address: string }) => {
    setFormData(prev => ({
      ...prev,
      postalCode: postalData.postalCode,
      address1: postalData.address
    }));
    setIsPostalSearchOpen(false);
    
    // Clear errors for postal code and address1 since they're now filled
    if (errors.postalCode || errors.address1) {
      setErrors(prev => ({ 
        ...prev, 
        postalCode: undefined, 
        address1: undefined 
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const combinedAddress = [formData.postalCode, formData.address1, formData.address2].filter(Boolean).join(' ');

      if (isEdit && company) {
        // 수정 모드: TanStack Query mutation 사용
        const updateData: UpdateCompanyDto = {
          name: formData.name,
          businessNumber: formData.businessNumber,
          address: combinedAddress,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          website: formData.website || undefined,
          description: formData.description || undefined,
          establishedDate: formData.establishedDate,
          logoUrl: formData.logoUrl || undefined,
          status: formData.status
        };

        await updateCompanyMutation.mutateAsync({ id: company.id, data: updateData });
        alert('회사 정보가 성공적으로 수정되었습니다.');
      } else {
        // 생성 모드: TanStack Query mutation 사용
        const createData: CreateCompanyDto = {
          name: formData.name,
          businessNumber: formData.businessNumber,
          address: combinedAddress,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          website: formData.website || undefined,
          description: formData.description || undefined,
          establishedDate: formData.establishedDate,
          logoUrl: formData.logoUrl || undefined,
          status: formData.status
        };

        await createCompanyMutation.mutateAsync(createData);
        alert('새 회사가 성공적으로 등록되었습니다.');
      }

      // 성공 시 onSuccess 콜백 호출 (화면 전환용)
      const submitData: Partial<Company> = {
        ...formData,
        address: combinedAddress,
        establishedDate: formData.establishedDate,
        logoUrl: formData.logoUrl || null
      };
      onSuccess(submitData);

    } catch (error: any) {
      const errorMessage = error?.message || (isEdit ? '회사 정보 수정에 실패했습니다.' : '회사 등록에 실패했습니다.');
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEdit ? '회사 정보 수정' : '새 회사 등록'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit ? '회사의 기본 정보를 수정합니다.' : '새로운 골프장 운영 회사를 등록합니다.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="예: 그린밸리 골프클럽"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Business Number */}
              <div>
                <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  사업자번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="businessNumber"
                  name="businessNumber"
                  value={formData.businessNumber}
                  onChange={handleBusinessNumberChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.businessNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="123-45-67890"
                  maxLength={12}
                />
                {errors.businessNumber && <p className="mt-1 text-sm text-red-600">{errors.businessNumber}</p>}
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="02-1234-5678"
                  maxLength={13}
                />
                {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="info@company.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  웹사이트
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.website ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://www.company.com"
                />
                {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
              </div>

              {/* Established Date */}
              <div>
                <label htmlFor="establishedDate" className="block text-sm font-medium text-gray-700 mb-1">
                  설립일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="establishedDate"
                  name="establishedDate"
                  value={formData.establishedDate}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.establishedDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.establishedDate && <p className="mt-1 text-sm text-red-600">{errors.establishedDate}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">주소 정보</h4>
            <div className="space-y-4">
              {/* Postal Code */}
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                  우편번호 <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.postalCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="예: 12345"
                    maxLength={5}
                  />
                  <button
                    type="button"
                    onClick={handlePostalSearch}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    우편번호 검색
                  </button>
                </div>
                {errors.postalCode && <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>}
              </div>

              {/* Address 1 */}
              <div>
                <label htmlFor="address1" className="block text-sm font-medium text-gray-700 mb-1">
                  기본주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="address1"
                  name="address1"
                  value={formData.address1}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.address1 ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="예: 경기도 용인시 처인구 모현읍"
                />
                {errors.address1 && <p className="mt-1 text-sm text-red-600">{errors.address1}</p>}
              </div>

              {/* Address 2 */}
              <div>
                <label htmlFor="address2" className="block text-sm font-medium text-gray-700 mb-1">
                  상세주소
                </label>
                <input
                  type="text"
                  id="address2"
                  name="address2"
                  value={formData.address2}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 능원로 200"
                />
                {errors.address2 && <p className="mt-1 text-sm text-red-600">{errors.address2}</p>}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              회사 설명
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="회사에 대한 간단한 설명을 입력하세요..."
            />
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
              로고 URL
            </label>
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="url"
                  id="logoUrl"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/logo.png"
                />
                <p className="mt-1 text-sm text-gray-500">
                  로고 이미지의 URL을 입력하세요. (선택사항)
                </p>
              </div>
              {formData.logoUrl && (
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 border border-gray-300 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img
                      src={formData.logoUrl}
                      alt="로고 미리보기"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="text-xs text-gray-400 text-center p-2">이미지를<br/>불러올 수<br/>없습니다</div>';
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-1">미리보기</p>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              운영 상태
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ACTIVE">활성</option>
              <option value="MAINTENANCE">점검 중</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          
          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isLoading || isSubmitting) && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isEdit ? '수정하기' : '등록하기'}
          </button>
        </div>
      </form>

      {/* Postal Search Modal */}
      <PostalSearchModal
        isOpen={isPostalSearchOpen}
        onClose={() => setIsPostalSearchOpen(false)}
        onSelect={handlePostalSelect}
      />
    </div>
  );
};