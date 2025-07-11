import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { getMockAdmins } from '../../utils/mockAdminData';
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_COLORS } from '../../utils/adminPermissions';
import type { Admin } from '../../types';

export const AdminLoginForm: React.FC = () => {
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  
  const mockAdmins = getMockAdmins();
  console.log('Mock 관리자 데이터:', mockAdmins);

  const handleLogin = async () => {
    if (!selectedAdmin) {
      setError('관리자를 선택해주세요.');
      return;
    }

    console.log('선택된 관리자:', selectedAdmin);
    setIsLoading(true);
    setError(null);

    try {
      console.log('로그인 시도 중... ID:', selectedAdmin.id);
      await login(selectedAdmin.id);
      console.log('로그인 성공, 대시보드로 이동');
      navigate('/dashboard');
    } catch (err) {
      console.error('로그인 에러:', err);
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const groupedAdmins = {
    platform: mockAdmins.filter(admin => admin.scope === 'PLATFORM'),
    company: mockAdmins.filter(admin => admin.scope === 'COMPANY'),
    course: mockAdmins.filter(admin => admin.scope === 'COURSE')
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            파크골프 관리자 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            테스트할 관리자를 선택하세요 (역할별 권한이 다르게 적용됩니다)
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {/* 플랫폼 관리자 */}
            <div>
              <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                플랫폼 레벨 관리자 (본사)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupedAdmins.platform.map(admin => (
                  <button
                    key={admin.id}
                    onClick={() => setSelectedAdmin(admin)}
                    disabled={!admin.isActive}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      selectedAdmin?.id === admin.id
                        ? 'border-blue-500 bg-blue-50'
                        : admin.isActive
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{admin.name}</div>
                        <div className="text-sm text-gray-600">{admin.email}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ADMIN_ROLE_COLORS[admin.role]}`}>
                        {ADMIN_ROLE_LABELS[admin.role]}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {admin.department} • {admin.description}
                    </div>
                    {!admin.isActive && (
                      <div className="mt-1 text-xs text-red-600">비활성 계정</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 회사 관리자 */}
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                회사 레벨 관리자 (골프장 운영사)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupedAdmins.company.map(admin => (
                  <button
                    key={admin.id}
                    onClick={() => setSelectedAdmin(admin)}
                    disabled={!admin.isActive}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      selectedAdmin?.id === admin.id
                        ? 'border-blue-500 bg-blue-50'
                        : admin.isActive
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{admin.name}</div>
                        <div className="text-sm text-gray-600">{admin.email}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ADMIN_ROLE_COLORS[admin.role]}`}>
                        {ADMIN_ROLE_LABELS[admin.role]}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {admin.company?.name} • {admin.department}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {admin.description}
                    </div>
                    {!admin.isActive && (
                      <div className="mt-1 text-xs text-red-600">비활성 계정</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 코스 관리자 */}
            <div>
              <h3 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                코스 레벨 관리자 (현장 직원)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupedAdmins.course.map(admin => (
                  <button
                    key={admin.id}
                    onClick={() => setSelectedAdmin(admin)}
                    disabled={!admin.isActive}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      selectedAdmin?.id === admin.id
                        ? 'border-blue-500 bg-blue-50'
                        : admin.isActive
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{admin.name}</div>
                        <div className="text-sm text-gray-600">{admin.email}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ADMIN_ROLE_COLORS[admin.role]}`}>
                        {ADMIN_ROLE_LABELS[admin.role]}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {admin.company?.name || `회사 ID: ${admin.companyId}`} • {admin.department}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {admin.description}
                    </div>
                    {!admin.isActive && (
                      <div className="mt-1 text-xs text-red-600">비활성 계정</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedAdmin ? (
                  <span>
                    선택됨: <strong>{selectedAdmin.name}</strong> ({ADMIN_ROLE_LABELS[selectedAdmin.role]})
                  </span>
                ) : (
                  '관리자를 선택해주세요'
                )}
              </div>
              <button
                onClick={handleLogin}
                disabled={!selectedAdmin || isLoading}
                className={`px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                  selectedAdmin && !isLoading
                    ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-500">
            💡 각 관리자마다 다른 권한과 접근 범위를 가집니다
          </div>
          <div className="mt-2 text-xs text-gray-400">
            • 플랫폼 관리자: 모든 회사와 시스템 관리<br/>
            • 회사 관리자: 자신의 회사만 관리<br/>
            • 코스 관리자: 담당 코스만 관리
          </div>
        </div>
      </div>
    </div>
  );
};