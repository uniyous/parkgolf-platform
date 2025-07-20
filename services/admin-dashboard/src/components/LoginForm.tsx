import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface AdminAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  description: string;
}

interface LoginFormProps {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error: string | null;
}

// 미리 정의된 관리자 계정 목록
const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    email: 'owner@parkgolf.com',
    password: 'admin123!@#',
    name: '김플랫폼',
    role: 'PLATFORM_OWNER',
    description: '플랫폼 최고 책임자'
  },
  {
    email: 'admin@parkgolf.com',
    password: 'admin123!@#',
    name: '박운영',
    role: 'PLATFORM_ADMIN',
    description: '플랫폼 운영 총괄'
  },
  {
    email: 'support@parkgolf.com',
    password: 'admin123!@#',
    name: '이지원',
    role: 'PLATFORM_SUPPORT',
    description: '고객 문의 및 기술 지원'
  },
  {
    email: 'analyst@parkgolf.com',
    password: 'admin123!@#',
    name: '최분석',
    role: 'PLATFORM_ANALYST',
    description: '플랫폼 데이터 분석 및 리포팅'
  },
  {
    email: 'owner@gangnam-golf.com',
    password: 'admin123!@#',
    name: '강대표',
    role: 'COMPANY_OWNER',
    description: '강남 파크골프장 대표'
  },
  {
    email: 'manager@gangnam-golf.com',
    password: 'admin123!@#',
    name: '남운영',
    role: 'COMPANY_MANAGER',
    description: '강남 파크골프장 운영 관리자'
  },
  {
    email: 'owner@busan-golf.com',
    password: 'admin123!@#',
    name: '부대표',
    role: 'COMPANY_OWNER',
    description: '부산 파크골프장 대표'
  }
];

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  error,
}) => {
  const handleAdminSelect = (admin: AdminAccount) => {
    onEmailChange(admin.email);
    onPasswordChange(admin.password);
  };

  // 현재 선택된 관리자 찾기
  const selectedAdmin = ADMIN_ACCOUNTS.find(admin => admin.email === email);

  const getRoleBadgeColor = (role: string) => {
    if (role.includes('OWNER')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (role.includes('ADMIN')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (role.includes('MANAGER')) return 'bg-green-100 text-green-800 border-green-200';
    if (role.includes('SUPPORT')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (role.includes('ANALYST')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* 로그인 폼 */}
          <div className="w-full lg:w-1/2">
            <div className="bg-white shadow-xl rounded-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  🏌️ 파크골프 관리자 시스템
                </h2>
                <p className="text-gray-600">
                  관리자 계정으로 로그인하세요
                </p>
                {selectedAdmin && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedAdmin.name}</strong> ({selectedAdmin.role}) 선택됨
                    </p>
                  </div>
                )}
              </div>

              <form className="space-y-6" onSubmit={onSubmit}>
                {!email && !password && (
                  <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      우측에서 관리자를 선택하거나 직접 입력하세요
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <Input
                    label="관리자 ID"
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="관리자 이메일을 입력하세요"
                    required
                    className="text-sm"
                  />
                  <Input
                    label="PASSWORD"
                    type="password"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    required
                    className="text-sm"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                    <strong>로그인 실패:</strong> {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full py-3 text-lg font-semibold"
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      로그인 중...
                    </div>
                  ) : '로그인'}
                </Button>
              </form>
            </div>
          </div>

          {/* 관리자 계정 선택 */}
          <div className="w-full lg:w-1/2">
            <div className="bg-white shadow-xl rounded-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                🎯 빠른 로그인 (테스트용)
              </h3>
              <p className="text-sm text-gray-600 mb-6 text-center">
                아래 관리자 계정을 선택하면 자동으로 ID/비밀번호가 입력됩니다
              </p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ADMIN_ACCOUNTS.map((admin, index) => {
                  const isSelected = selectedAdmin?.email === admin.email;
                  return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAdminSelect(admin)}
                    className={`w-full text-left p-4 border rounded-lg transition-all duration-200 group ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-100 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'}`}>
                            {admin.name}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(admin.role)}`}>
                            {admin.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{admin.description}</p>
                        <p className="text-xs text-gray-500 font-mono">{admin.email}</p>
                      </div>
                      <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">개발/테스트 환경 전용</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      실제 운영 환경에서는 보안을 위해 이 기능이 비활성화됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};