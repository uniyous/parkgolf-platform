import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components';

export const SignupPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phoneNumber: '',
    birthDate: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    // Name validation
    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요.';
    } else if (formData.name.length < 2) {
      newErrors.name = '이름은 2자 이상이어야 합니다.';
    }

    // Phone validation
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = '전화번호를 입력해주세요.';
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = '올바른 전화번호 형식을 입력해주세요. (010-1234-5678)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const success = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        birthDate: formData.birthDate || undefined,
      });

      if (success) {
        navigate('/search');
      } else {
        setErrors({ submit: '회원가입에 실패했습니다.' });
      }
    } catch (error) {
      setErrors({ submit: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
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

      <div className="glass-card w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
            <span className="text-3xl">⛳</span>
          </div>
          <h1 className="text-white mb-2 text-3xl font-bold">
            회원가입
          </h1>
          <p className="text-white/80 text-sm">골프장 예약 서비스에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="이메일 *"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            error={errors.email}
            glass
            className="mb-5"
          />

          <Input
            label="비밀번호 *"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            error={errors.password}
            glass
            className="mb-5"
          />

          <Input
            label="비밀번호 확인 *"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="비밀번호를 다시 입력하세요"
            error={errors.confirmPassword}
            glass
            className="mb-5"
          />

          <Input
            label="이름 *"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="홍길동"
            error={errors.name}
            glass
            className="mb-5"
          />

          <Input
            label="전화번호 *"
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="010-1234-5678"
            error={errors.phoneNumber}
            glass
            className="mb-5"
          />

          <Input
            label="생년월일 (선택)"
            type="date"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleChange}
            glass
            className="mb-6"
          />

          {errors.submit && (
            <div className="mb-5 p-4 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
              <p className="text-red-200">{errors.submit}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            loading={isLoading}
            variant="glass"
            size="lg"
            className="w-full !bg-white/90 hover:!bg-white !text-slate-800 font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-0"
          >
            회원가입
          </Button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <div>
            <span className="text-white/80 text-sm">이미 계정이 있으신가요? </span>
            <a
              href="/login"
              className="text-white font-medium text-sm hover:text-white/80 transition-colors duration-200 underline decoration-white/50 hover:decoration-white"
            >
              로그인
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
