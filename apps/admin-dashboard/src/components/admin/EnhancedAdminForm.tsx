import React, { useState, useEffect } from 'react';
import { useFormManager } from '../../hooks/useFormManager';
import { useAdminActions } from '../../hooks/useAdminActions';
import { getRoleScope } from '@/utils';
import type { Admin, CreateAdminDto, UpdateAdminDto, AdminRole } from '../../types';

interface EnhancedAdminFormProps {
  admin?: Admin | null;
  onSuccess: (admin: Admin) => void;
  onCancel: () => void;
}

interface FormData {
  username: string;
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  role: AdminRole;
  isActive: boolean;
  phone?: string;
  department?: string;
  description?: string;
}

export const EnhancedAdminForm: React.FC<EnhancedAdminFormProps> = ({
  admin,
  onSuccess,
  onCancel,
}) => {
  const { createAdmin, updateAdmin } = useAdminActions();
  const isEditing = !!admin;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 다단계 폼: 1=기본정보, 2=추가정보

  // 폼 초기 데이터
  const initialData: FormData = {
    username: admin?.username || '',
    email: admin?.email || '',
    name: admin?.name || '',
    password: '',
    confirmPassword: '',
    role: admin?.role || 'VIEWER',
    isActive: admin?.isActive ?? true,
    phone: admin?.phone || '',
    department: admin?.department || '',
    description: admin?.description || '',
  };

  const formManager = useFormManager(initialData, {
    validationSchema: (data) => {
      const errors: Record<string, string> = {};

      // Step 1 검증
      if (step === 1) {
        // 사용자명 검증
        if (!data.username.trim()) {
          errors.username = '사용자명은 필수입니다';
        } else if (data.username.length < 3) {
          errors.username = '사용자명은 3자 이상이어야 합니다';
        } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
          errors.username = '사용자명은 영문, 숫자, 언더스코어만 가능합니다';
        }

        // 이메일 검증
        if (!data.email.trim()) {
          errors.email = '이메일은 필수입니다';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.email = '올바른 이메일 형식이 아닙니다';
        }

        // 이름 검증
        if (!data.name.trim()) {
          errors.name = '이름은 필수입니다';
        } else if (data.name.length < 2) {
          errors.name = '이름은 2자 이상이어야 합니다';
        }

        // 비밀번호 검증 (신규 생성인 경우)
        if (!isEditing) {
          if (!data.password) {
            errors.password = '비밀번호는 필수입니다';
          } else if (data.password.length < 8) {
            errors.password = '비밀번호는 8자 이상이어야 합니다';
          } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
            errors.password = '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다';
          }

          if (data.password !== data.confirmPassword) {
            errors.confirmPassword = '비밀번호가 일치하지 않습니다';
          }
        }
      }

      // Step 2 검증
      if (step === 2) {
        // 전화번호 검증 (선택적)
        if (data.phone && !/^[0-9-+\s()]+$/.test(data.phone)) {
          errors.phone = '올바른 전화번호 형식이 아닙니다';
        }
      }

      return errors;
    },
    onSubmit: async (data) => {
      try {
        if (isEditing && admin) {
          // 수정
          const updateData: UpdateAdminDto = {
            email: data.email,
            name: data.name,
            role: data.role,
            isActive: data.isActive,
            phone: data.phone,
            department: data.department,
            description: data.description,
          };

          const updatedAdmin = await updateAdmin(admin.id, updateData);
          if (updatedAdmin) {
            onSuccess(updatedAdmin);
          }
        } else {
          // 생성
          const createData: CreateAdminDto = {
            username: data.username,
            email: data.email,
            name: data.name,
            password: data.password,
            role: data.role,
            scope: getRoleScope(data.role),
            isActive: data.isActive,
            phone: data.phone,
            department: data.department,
            description: data.description,
          };

          const newAdmin = await createAdmin(createData);
          if (newAdmin) {
            onSuccess(newAdmin);
          }
        }
      } catch (error) {
        console.error('관리자 저장 실패:', error);
      }
    },
  });

  const { formData, errors, handleInputChange, handleSubmit, isSubmitting, isDirty } = formManager;

  // 역할 옵션 - v3 단순화된 역할 시스템
  const roleOptions = [
    {
      value: 'VIEWER' as AdminRole,
      label: '조회 전용',
      description: '데이터 조회만 가능',
      icon: '👁️',
      permissions: ['VIEW']
    },
    {
      value: 'STAFF' as AdminRole,
      label: '현장 직원',
      description: '타임슬롯/예약/고객지원',
      icon: '👷',
      permissions: ['TIMESLOTS', 'BOOKINGS', 'SUPPORT', 'VIEW']
    },
    {
      value: 'MANAGER' as AdminRole,
      label: '운영 관리자',
      description: '회사/코스 운영 관리',
      icon: '👨‍💼',
      permissions: ['COMPANIES', 'COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ADMINS', 'ANALYTICS', 'VIEW']
    },
    {
      value: 'SUPPORT' as AdminRole,
      label: '고객지원',
      description: '고객지원 및 분석 담당',
      icon: '🎧',
      permissions: ['BOOKINGS', 'USERS', 'ANALYTICS', 'SUPPORT', 'VIEW']
    },
    {
      value: 'ADMIN' as AdminRole,
      label: '시스템 관리자',
      description: '전체 시스템 관리 권한',
      icon: '👑',
      permissions: ['ALL']
    },
  ];

  // 부서 옵션
  const departmentOptions = [
    '관리팀',
    '운영팀',
    '고객서비스팀',
    '마케팅팀',
    'IT팀',
    '기타',
  ];

  const currentRole = roleOptions.find(r => r.value === formData.role);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handlePrevious = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  // 페이지 나가기 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="w-full">
      {/* 진행 단계 표시 */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
            }`}>
              1
            </div>
            <span className="font-medium">기본 정보</span>
          </div>
          <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
            }`}>
              2
            </div>
            <span className="font-medium">추가 정보</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {step === 1 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">👤</span>
                {isEditing ? '관리자 정보 수정' : '새 관리자 추가'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isEditing 
                  ? '관리자의 기본 정보를 수정합니다.' 
                  : '새로운 관리자의 기본 정보를 입력합니다.'
                }
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 사용자명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사용자명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isEditing}
                    placeholder="영문, 숫자, 언더스코어만 사용"
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.username ? 'border-red-300' : 'border-gray-300'
                    } ${isEditing ? 'bg-gray-50 text-gray-500' : ''}`}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.username}
                    </p>
                  )}
                  {isEditing && (
                    <p className="mt-1 text-xs text-gray-500">
                      사용자명은 수정할 수 없습니다.
                    </p>
                  )}
                </div>

                {/* 이름 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="실명을 입력하세요"
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.name}
                    </p>
                  )}
                </div>
              </div>

              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="example@company.com"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* 비밀번호 (생성 시에만) */}
              {!isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="8자 이상, 대소문자, 숫자 포함"
                        className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.password ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <span className="text-gray-400 hover:text-gray-600">
                          {showPassword ? '🙈' : '👁️'}
                        </span>
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 확인 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="위와 동일한 비밀번호 입력"
                        className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <span className="text-gray-400 hover:text-gray-600">
                          {showConfirmPassword ? '🙈' : '👁️'}
                        </span>
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 역할 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  역할 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roleOptions.map((role) => (
                    <div
                      key={role.value}
                      className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                        formData.role === role.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange({ target: { name: 'role', value: role.value } } as any)}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={formData.role === role.value}
                          onChange={() => {}}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{role.icon}</span>
                            <h4 className="text-sm font-medium text-gray-900">{role.label}</h4>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                          <div className="mt-2">
                            <div className="text-xs text-gray-600">주요 권한:</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {role.permissions.map((permission, index) => (
                                <span
                                  key={index}
                                  className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                                >
                                  {permission}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 계정 상태 */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange({ target: { name: 'isActive', value: e.target.checked } } as any)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    계정 활성화
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-7">
                  비활성화된 계정은 로그인할 수 없습니다.
                </p>
              </div>
            </div>

            {/* Step 1 버튼 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={Object.keys(errors).length > 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음 단계 →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">📋</span>
                추가 정보
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                관리자의 추가 정보를 입력합니다. (선택사항)
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* 연락처 정보 */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">연락처 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전화번호
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="010-1234-5678"
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      부서
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">부서를 선택하세요</option>
                      {departmentOptions.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="관리자에 대한 추가 정보나 설명을 입력하세요..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  최대 500자까지 입력할 수 있습니다.
                </p>
              </div>

              {/* 선택된 역할 요약 */}
              {currentRole && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                    <span className="mr-2">{currentRole.icon}</span>
                    선택된 역할: {currentRole.label}
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">{currentRole.description}</p>
                  <div>
                    <div className="text-xs text-blue-600 mb-1">부여될 권한:</div>
                    <div className="flex flex-wrap gap-1">
                      {currentRole.permissions.map((permission, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 버튼 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={handlePrevious}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← 이전 단계
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSubmitting 
                    ? (isEditing ? '저장 중...' : '생성 중...') 
                    : (isEditing ? '저장' : '생성')
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};