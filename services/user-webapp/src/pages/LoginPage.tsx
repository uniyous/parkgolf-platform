import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button, Text, FormField } from '../components';

export const LoginPage: React.FC = () => {
  const { login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    }
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const success = await login(formData.email, formData.password);
      
      if (!success) {
        setErrors({ submit: '이메일 또는 비밀번호가 일치하지 않습니다.' });
      }
    } catch (error) {
      setErrors({ submit: '네트워크 오류가 발생했습니다.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-golf-primary to-golf-secondary flex items-center justify-center p-5">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <Text variant="h1" className="text-golf-primary mb-2">
            ⛳ 골프장 예약
          </Text>
          <Text className="text-gray-600">로그인하여 예약을 시작하세요</Text>
        </div>

        <form onSubmit={handleLogin}>
          <FormField
            label="이메일"
            type="email"
            name="email"
            value={formData.email}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, email: value }));
              if (errors.email) {
                setErrors(prev => ({ ...prev, email: '' }));
              }
            }}
            placeholder="your@email.com"
            error={errors.email}
            required
          />

          <FormField
            label="비밀번호"
            type="password"
            name="password"
            value={formData.password}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, password: value }));
              if (errors.password) {
                setErrors(prev => ({ ...prev, password: '' }));
              }
            }}
            placeholder="비밀번호를 입력하세요"
            error={errors.password}
            required
          />

          {errors.submit && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text variant="error">{errors.submit}</Text>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoggingIn}
            loading={isLoggingIn}
            variant="primary"
            size="large"
            className="w-full"
          >
            로그인
          </Button>
        </form>

        <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Text variant="h4" className="mb-3 text-sm text-gray-700">
            🧪 테스트 계정 (클릭하여 자동 입력)
          </Text>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { email: 'king@parkgolf.com', password: 'user123', name: '킹(관리자)', role: 'ADMIN' },
              { email: 'kimcheolsu@parkgolf.com', password: 'user123', name: '김철수', role: 'USER' },
              { email: 'parkyounghee@parkgolf.com', password: 'user123', name: '박영희', role: 'USER' },
              { email: 'leeminsu@parkgolf.com', password: 'user123', name: '이민수', role: 'USER' },
              { email: 'jungsuyoung@parkgolf.com', password: 'user123', name: '정수영', role: 'USER' },
              { email: 'choijina@parkgolf.com', password: 'user123', name: '최진아', role: 'USER' },
              { email: 'limjihye@parkgolf.com', password: 'user123', name: '임지혜', role: 'ADMIN' },
              { email: 'kangminwoo@parkgolf.com', password: 'user123', name: '강민우', role: 'MOD' }
            ].map((testUser, index) => (
              <Button
                key={index}
                variant="outline"
                size="small"
                onClick={() => {
                  setFormData({ email: testUser.email, password: testUser.password });
                }}
                className="text-left h-auto p-2 flex-col items-start"
              >
                <div className="font-medium mb-1 text-xs">
                  {testUser.name}
                </div>
                <div className="text-xs opacity-60 text-gray-600">
                  {testUser.role}
                </div>
                <div className="text-xs opacity-70">
                  {testUser.email}
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="text-center mt-5">
          <Text className="text-gray-600 text-sm inline">
            계정이 없으신가요?{' '}
          </Text>
          <a 
            href="/signup" 
            className="text-golf-secondary no-underline text-sm font-medium hover:text-golf-dark"
          >
            회원가입
          </a>
          <br />
          <a 
            href="/booking" 
            className="text-golf-light no-underline text-sm mt-2 inline-block hover:text-golf-secondary"
          >
            로그인 없이 둘러보기 →
          </a>
        </div>
      </div>
    </div>
  );
};