import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { AdminRole } from '../types';

interface SignupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: AdminRole;
}

export const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'COMPANY_VIEWER',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) return '사용자명을 입력해주세요.';
    if (!formData.email.trim()) return '이메일을 입력해주세요.';
    if (!formData.password) return '비밀번호를 입력해주세요.';
    if (!formData.confirmPassword) return '비밀번호 확인을 입력해주세요.';
    if (!formData.name.trim()) return '이름을 입력해주세요.';
    
    if (formData.password !== formData.confirmPassword) {
      return '비밀번호가 일치하지 않습니다.';
    }
    
    if (formData.password.length < 6) {
      return '비밀번호는 최소 6자 이상이어야 합니다.';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return '올바른 이메일 형식을 입력해주세요.';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3091/api/admin/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '회원가입에 실패했습니다.');
      }
      
      setSuccess(true);
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'COMPANY_VIEWER',
      });

    } catch {
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              회원가입 완료!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              관리자 승인 후 로그인하실 수 있습니다.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                로그인 페이지로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            파크골프 관리자 시스템
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            새 관리자 계정을 생성하세요
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="사용자명"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="사용자명을 입력하세요"
              required
            />
            
            <Input
              label="이름"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="실명을 입력하세요"
              required
            />
            
            <Input
              label="이메일"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@company.com"
              required
            />
            
            <Input
              label="비밀번호"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="최소 6자 이상"
              required
            />
            
            <Input
              label="비밀번호 확인"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="비밀번호를 다시 입력하세요"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                권한 레벨
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <optgroup label="회사 역할">
                  <option value="COMPANY_VIEWER">조회 전용</option>
                  <option value="COMPANY_STAFF">현장 직원</option>
                  <option value="COMPANY_MANAGER">운영 관리자</option>
                  <option value="COMPANY_ADMIN">회사 관리자</option>
                </optgroup>
                <optgroup label="플랫폼 역할">
                  <option value="PLATFORM_VIEWER">플랫폼 조회</option>
                  <option value="PLATFORM_SUPPORT">고객지원</option>
                  <option value="PLATFORM_ADMIN">시스템 관리자</option>
                </optgroup>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '가입 처리 중...' : '회원가입'}
            </Button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">이미 계정이 있으신가요? </span>
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              로그인하기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};