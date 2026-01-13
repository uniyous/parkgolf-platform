import React, { useState, useEffect, useMemo } from 'react';
import { useCreateAdminMutation, useUpdateAdminMutation, useRolesWithPermissionsQuery } from '@/hooks/queries';
import { Modal } from '@/components/ui';
import type { Admin, AdminRole, CompanyType } from '@/types';
import type { RoleWithPermissions, PermissionDetail } from '@/lib/api/adminApi';
import { ADMIN_ROLE_LABELS, getAllowedRolesForCompanyType } from '@/utils/admin-permissions';

interface AdminFormModalProps {
  open: boolean;
  admin?: Admin;
  onClose: () => void;
  companyId?: number;
  companyType?: CompanyType;
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

// 역할 메타데이터
const roleMeta: Record<string, { label: string; description: string; icon: string; color: string; bgColor: string }> = {
  PLATFORM_ADMIN: { label: '플랫폼 관리자', description: '전체 시스템 최고 권한', icon: '👑', color: 'text-red-800', bgColor: 'bg-red-50 border-red-200' },
  PLATFORM_SUPPORT: { label: '플랫폼 고객지원', description: '데이터 조회 및 지원', icon: '🎧', color: 'text-purple-800', bgColor: 'bg-purple-50 border-purple-200' },
  PLATFORM_VIEWER: { label: '플랫폼 조회', description: '읽기 전용', icon: '👁️', color: 'text-gray-800', bgColor: 'bg-gray-50 border-gray-200' },
  COMPANY_ADMIN: { label: '회사 대표', description: '회사 전체 권한', icon: '🏢', color: 'text-blue-800', bgColor: 'bg-blue-50 border-blue-200' },
  COMPANY_MANAGER: { label: '회사 매니저', description: '운영 관리', icon: '👨‍💼', color: 'text-cyan-800', bgColor: 'bg-cyan-50 border-cyan-200' },
  COMPANY_STAFF: { label: '회사 직원', description: '현장 업무', icon: '👤', color: 'text-green-800', bgColor: 'bg-green-50 border-green-200' },
  COMPANY_VIEWER: { label: '회사 조회', description: '읽기 전용', icon: '📖', color: 'text-slate-800', bgColor: 'bg-slate-50 border-slate-200' },
};

// 권한 메타데이터
const permissionMeta: Record<string, { name: string; icon: string }> = {
  COMPANIES: { name: '회사 관리', icon: '🏢' },
  COURSES: { name: '코스 관리', icon: '🏌️' },
  TIMESLOTS: { name: '타임슬롯', icon: '⏰' },
  BOOKINGS: { name: '예약 관리', icon: '📅' },
  USERS: { name: '사용자', icon: '👥' },
  ADMINS: { name: '관리자', icon: '👨‍💼' },
  ANALYTICS: { name: '분석', icon: '📊' },
  SUPPORT: { name: '지원', icon: '🎧' },
  VIEW: { name: '조회', icon: '👁️' },
  ALL: { name: '전체', icon: '✨' },
};

export const AdminFormModal: React.FC<AdminFormModalProps> = ({
  open,
  admin,
  onClose,
  companyId,
  companyType = 'FRANCHISE'
}) => {
  const createAdmin = useCreateAdminMutation();
  const updateAdmin = useUpdateAdminMutation();
  const { data: rolesData } = useRolesWithPermissionsQuery('ADMIN');
  const isEditing = !!admin;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // 회사 유형에 따라 부여 가능한 역할 목록 (메모이제이션으로 무한 루프 방지)
  const allowedRoles = useMemo(() => getAllowedRolesForCompanyType(companyType), [companyType]);

  // 역할을 플랫폼/회사로 그룹화
  const groupedRoles = useMemo(() => {
    const platform = allowedRoles.filter(r => r.startsWith('PLATFORM_'));
    const company = allowedRoles.filter(r => r.startsWith('COMPANY_'));
    return { platform, company };
  }, [allowedRoles]);

  // 역할별 권한 매핑
  const rolePermissionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    (rolesData || []).forEach((role: RoleWithPermissions) => {
      map[role.code] = role.permissions?.map((p: PermissionDetail | string) =>
        typeof p === 'string' ? p : p.code
      ) || [];
    });
    return map;
  }, [rolesData]);

  useEffect(() => {
    if (admin) {
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
      const defaultRole = allowedRoles[allowedRoles.length - 1] || 'COMPANY_STAFF';
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

  const getRoleMeta = (roleCode: string) =>
    roleMeta[roleCode] || { label: roleCode, description: '', icon: '🔐', color: 'text-gray-800', bgColor: 'bg-gray-50 border-gray-200' };

  const getPermissionName = (code: string) => permissionMeta[code]?.name || code;
  const getPermissionIcon = (code: string) => permissionMeta[code]?.icon || '📌';

  const isPending = createAdmin.isPending || updateAdmin.isPending;

  // 역할 카드 컴포넌트
  const RoleOption = ({ roleCode }: { roleCode: AdminRole }) => {
    const meta = getRoleMeta(roleCode);
    const isSelected = formData.role === roleCode;
    const permissions = rolePermissionsMap[roleCode] || [];
    const hasAllPermission = permissions.includes('ALL');

    return (
      <label
        className={`relative flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-sm'
            : `border-gray-200 hover:border-gray-300 ${meta.bgColor}`
        }`}
      >
        <input
          type="radio"
          name="role"
          value={roleCode}
          checked={isSelected}
          onChange={(e) => handleChange('role', e.target.value as AdminRole)}
          className="sr-only"
        />
        <span className="text-xl mr-2">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`font-medium text-sm ${isSelected ? 'text-blue-900' : meta.color}`}>
              {meta.label}
            </span>
            {isSelected && (
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
          {/* 권한 미리보기 */}
          <div className="mt-2 flex flex-wrap gap-1">
            {hasAllPermission ? (
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                ✨ 전체
              </span>
            ) : (
              permissions.slice(0, 4).map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center px-1.5 py-0.5 text-xs bg-white/70 text-gray-600 rounded"
                  title={getPermissionName(code)}
                >
                  {getPermissionIcon(code)}
                </span>
              ))
            )}
            {!hasAllPermission && permissions.length > 4 && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs text-gray-500">
                +{permissions.length - 4}
              </span>
            )}
          </div>
        </div>
      </label>
    );
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEditing ? '관리자 수정' : '관리자 추가'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* 비밀번호 */}
        <div className="grid grid-cols-2 gap-4">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 {!isEditing && <span className="text-red-500">*</span>}
              {isEditing && <span className="text-gray-400 font-normal text-xs">(변경시만)</span>}
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
        </div>

        {/* 역할 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            역할 선택 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            {/* 플랫폼 역할 */}
            {groupedRoles.platform.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm">🌐</span>
                  <span className="text-xs font-medium text-gray-500">플랫폼 역할</span>
                  <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">본사</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {groupedRoles.platform.map((role) => (
                    <RoleOption key={role} roleCode={role} />
                  ))}
                </div>
              </div>
            )}

            {/* 회사 역할 */}
            {groupedRoles.company.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm">🏢</span>
                  <span className="text-xs font-medium text-gray-500">회사 역할</span>
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">가맹점</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {groupedRoles.company.map((role) => (
                    <RoleOption key={role} roleCode={role} />
                  ))}
                </div>
              </div>
            )}
          </div>
          {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role}</p>}
        </div>

        {/* 추가 정보 */}
        <div className="grid grid-cols-2 gap-4">
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
