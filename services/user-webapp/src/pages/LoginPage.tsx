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
    <div className="min-h-screen gradient-forest flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="glass-card w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
            <span className="text-3xl">⛳</span>
          </div>
          <Text variant="h1" className="text-white mb-2 text-2xl font-bold">
            Golf Course
          </Text>
          <Text className="text-white/80 text-sm">로그인하여 완벽한 골프 경험을 시작하세요</Text>
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
            <div className="mb-5 p-4 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
              <Text variant="error" className="text-red-200">{errors.submit}</Text>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoggingIn}
            loading={isLoggingIn}
            variant="primary"
            size="large"
            className="w-full !bg-white/90 hover:!bg-white !text-slate-800 font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-0"
          >
            로그인
          </Button>
        </form>

        <div className="mt-6 p-4 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
          <Text variant="h4" className="mb-3 text-sm text-white/90 font-medium">
            🧪 테스트 계정 (클릭하여 자동 입력)
          </Text>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { email: 'king@parkgolf.com', password: 'user123', name: '킹(관리자)', role: 'ADMIN' },
              { email: 'kimcheolsu@parkgolf.com', password: 'user123', name: '김철수', role: 'USER' },
              { email: 'parkyounghee@parkgolf.com', password: 'user123', name: '박영희', role: 'USER' },
              { email: 'leeminsu@parkgolf.com', password: 'user123', name: '이민수', role: 'USER' }
            ].map((testUser, index) => (
              <Button
                key={index}
                variant="outline"
                size="small"
                onClick={() => {
                  setFormData({ email: testUser.email, password: testUser.password });
                }}
                className="text-left h-auto p-3 flex-col items-start !bg-white/10 hover:!bg-white/20 !border-white/30 !text-white rounded-lg transition-all duration-200"
              >
                <div className="font-medium mb-1 text-xs text-white">
                  {testUser.name}
                </div>
                <div className="text-xs text-white/70">
                  {testUser.role}
                </div>
                <div className="text-xs text-white/60 truncate w-full">
                  {testUser.email}
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="text-center mt-6 space-y-2">
          <div>
            <Text className="text-white/80 text-sm inline">
              계정이 없으신가요?{' '}
            </Text>
            <a 
              href="/signup" 
              className="text-white font-medium text-sm hover:text-white/80 transition-colors duration-200 underline decoration-white/50 hover:decoration-white"
            >
              회원가입
            </a>
          </div>
          <div>
            <a 
              href="/booking" 
              className="text-white/70 hover:text-white text-sm inline-flex items-center gap-1 transition-colors duration-200"
            >
              로그인 없이 둘러보기 
              <span className="text-xs">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};