import React from 'react';
import { useFormManager } from '../../hooks/useFormManager';
import { useAdminActions } from '../../hooks/useAdminActions';
import type { Admin, CreateAdminDto, UpdateAdminDto, AdminRole } from '../../types';

interface AdminFormProps {
  admin?: Admin | null; // null이면 생성, Admin이면 수정
  onSuccess: (admin: Admin) => void;
  onCancel: () => void;
}

export const AdminForm: React.FC<AdminFormProps> = ({
  admin,
  onSuccess,
  onCancel,
}) => {
  const { createAdmin, updateAdmin } = useAdminActions();
  const isEditing = !!admin;

  // 폼 초기 데이터
  const initialData = {
    username: admin?.username || '',
    email: admin?.email || '',
    name: admin?.name || '',
    password: '',
    confirmPassword: '',
    role: admin?.role || 'VIEWER' as AdminRole,
  };

  const formManager = useFormManager(initialData, {
    validationSchema: (data) => {
      const errors: Record<string, string> = {};

      // 사용자명 검증
      if (!data.username.trim()) {
        errors.username = '사용자명은 필수입니다';
      }

      // 이메일 검증
      if (!data.email.trim()) {
        errors.email = '이메일은 필수입니다';
      }

      // 이름 검증
      if (!data.name.trim()) {
        errors.name = '이름은 필수입니다';
      }

      // 비밀번호 검증 (신규 생성인 경우)
      if (!isEditing && !data.password) {
        errors.password = '비밀번호는 필수입니다';
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
            scope: 'OPERATION', // Default scope
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

  const { formData, errors, handleInputChange, handleSubmit, isSubmitting } = formManager;

  // 역할 옵션
  const roleOptions: { value: AdminRole; label: string; description: string }[] = [
    {
      value: 'VIEWER',
      label: '조회 전용',
      description: '정보 조회만 가능'
    },
    {
      value: 'STAFF',
      label: '현장 직원',
      description: '현장 업무 및 예약 접수'
    },
    {
      value: 'MANAGER',
      label: '운영 관리자',
      description: '회사 및 코스 운영 관리'
    },
    {
      value: 'SUPPORT',
      label: '고객지원',
      description: '고객 지원 및 예약 관리'
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {isEditing ? '관리자 정보 수정' : '새 관리자 추가'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isEditing 
                  ? '관리자의 정보를 수정합니다.' 
                  : '새로운 관리자를 추가합니다.'
                }
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="grid grid-cols-6 gap-6">
                {/* 사용자명 */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    사용자명
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isEditing} // 수정 시에는 사용자명 변경 불가
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                  {errors.username && (
                    <p className="mt-2 text-sm text-red-600">{errors.username}</p>
                  )}
                </div>

                {/* 이메일 */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    이메일
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* 이름 */}
                <div className="col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    이름
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* 비밀번호 (생성 시에만) */}
                {!isEditing && (
                  <>
                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        비밀번호
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                      {errors.password && (
                        <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        비밀번호 확인
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                      {errors.confirmPassword && (
                        <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </>
                )}

                {/* 역할 */}
                <div className="col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    역할
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting 
              ? (isEditing ? '저장 중...' : '생성 중...') 
              : (isEditing ? '저장' : '생성')
            }
          </button>
        </div>
      </form>
    </div>
  );
};