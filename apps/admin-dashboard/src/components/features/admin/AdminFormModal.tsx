import React, { useState, useEffect } from 'react';
import { useCreateAdminMutation, useUpdateAdminMutation } from '@/hooks/queries';
import { Modal } from '@/components/ui';
import type { Admin, AdminRole, CompanyType } from '@/types';
import { ADMIN_ROLE_LABELS, getAllowedRolesForCompanyType, PLATFORM_ROLES, COMPANY_ROLES } from '@/utils/admin-permissions';

interface AdminFormModalProps {
  open: boolean;
  admin?: Admin;
  onClose: () => void;
  companyId?: number;         // 선택된 회사 ID
  companyType?: CompanyType;  // 회사 유형 (역할 옵션 결정)
}

interface FormData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  role: AdminRole;
  companyId?: number;
  isActive: boolean;
  phone?: string;
  department?: string;
}

const initialFormData: FormData = {
  email: '',
  name: '',
  password: '',
  confirmPassword: '',
  role: 'COMPANY_STAFF',
  isActive: true,
  phone: '',
  department: '',
};

export const AdminFormModal: React.FC<AdminFormModalProps> = ({
  open,
  admin,
  onClose,
  companyId,
  companyType = 'FRANCHISE'  // 기본값: 가맹점
}) => {
  const createAdmin = useCreateAdminMutation();
  const updateAdmin = useUpdateAdminMutation();
  const isEditing = !!admin;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // 회사 유형에 따라 부여 가능한 역할 목록
  const allowedRoles = getAllowedRolesForCompanyType(companyType);

  useEffect(() => {
    if (admin) {
      // primaryRole 또는 첫 번째 회사의 역할 사용
      const adminRole = admin.primaryRole || admin.companies?.[0]?.companyRoleCode || 'COMPANY_STAFF';
      const adminCompanyId = admin.primaryCompany?.companyId || admin.companyId;

      setFormData({
        email: admin.email || '',
        name: admin.name || '',
        password: '',
        confirmPassword: '',
        role: adminRole,
        companyId: adminCompanyId,
        isActive: admin.isActive ?? true,
        phone: admin.phone || '',
        department: admin.department || '',
      });
    } else {
      // 새 관리자 생성 시 회사 ID와 기본 역할 설정
      const defaultRole = allowedRoles[allowedRoles.length - 1] || 'COMPANY_STAFF'; // 가장 낮은 권한
      setFormData({
        ...initialFormData,
        companyId: companyId,
        role: defaultRole,
      });
    }
    setErrors({});
  }, [admin, open, companyId, allowedRoles]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = '비밀번호를 입력해주세요.';
      } else if (formData.password.length < 8) {
        newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
    } else if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // 회사 ID 확인
    const targetCompanyId = formData.companyId || companyId;
    if (!targetCompanyId) {
      setErrors({ ...errors, role: '회사를 선택해주세요.' });
      return;
    }

    try {
      if (isEditing && admin) {
        await updateAdmin.mutateAsync({
          id: admin.id,
          data: {
            email: formData.email,
            name: formData.name,
            companyAssignments: [{
              companyId: targetCompanyId,
              companyRoleCode: formData.role,
              isPrimary: true,
            }],
            isActive: formData.isActive,
            phone: formData.phone || undefined,
            department: formData.department || undefined,
            ...(formData.password ? { password: formData.password } : {}),
          },
        });
      } else {
        await createAdmin.mutateAsync({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          companyAssignments: [{
            companyId: targetCompanyId,
            companyRoleCode: formData.role,
            isPrimary: true,
          }],
          isActive: formData.isActive,
          phone: formData.phone || undefined,
          department: formData.department || undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isPending = createAdmin.isPending || updateAdmin.isPending;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEditing ? '관리자 수정' : '관리자 추가'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="admin@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="홍길동"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 {!isEditing && <span className="text-red-500">*</span>}
              {isEditing && <span className="text-gray-500 font-normal">(변경시에만 입력)</span>}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="********"
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 {!isEditing && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="********"
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {ADMIN_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              회사 유형에 따라 부여 가능한 역할이 다릅니다
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="010-1234-5678"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="운영팀"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              활성 상태
            </label>
          </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? '저장 중...' : isEditing ? '수정' : '추가'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
