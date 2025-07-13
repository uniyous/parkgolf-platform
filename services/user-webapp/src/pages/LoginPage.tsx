import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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

    setIsLoading(true);

    try {
      const success = await login(formData.email, formData.password);
      
      if (success) {
        navigate('/search');
      } else {
        setErrors({ submit: '이메일 또는 비밀번호가 일치하지 않습니다.' });
      }
    } catch (error) {
      setErrors({ submit: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--golf-primary) 0%, var(--golf-secondary) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', color: 'var(--golf-primary)', marginBottom: '8px' }}>
            ⛳ 골프장 예약
          </h1>
          <p style={{ color: '#666' }}>로그인하여 예약을 시작하세요</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              이메일
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '12px',
                border: errors.email ? '1px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              비밀번호
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              style={{
                width: '100%',
                padding: '12px',
                border: errors.password ? '1px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.password}
              </p>
            )}
          </div>

          {errors.submit && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '12px', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626'
            }}>
              {errors.submit}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              fontSize: '16px',
              background: isLoading ? '#9ca3af' : 'var(--golf-primary)',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#495057' }}>
            🧪 테스트 계정 (비밀번호: password123!)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '5px' }}>
            {[
              { email: 'test@example.com', name: '테스트 사용자' },
              { email: 'user1@golf.com', name: '김철수' },
              { email: 'user2@golf.com', name: '이영희' },
              { email: 'user3@golf.com', name: '박민수' },
              { email: 'user4@golf.com', name: '정수연' },
              { email: 'admin@golf.com', name: '관리자' }
            ].map((testUser, index) => (
              <button
                key={index}
                onClick={() => {
                  setFormData({ email: testUser.email, password: 'password123!' });
                }}
                style={{
                  background: 'white',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#495057'
                }}
              >
                <div style={{ fontWeight: '500' }}>{testUser.name}</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>{testUser.email}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>계정이 없으신가요? </span>
          <a 
            href="/signup" 
            style={{ 
              color: 'var(--golf-secondary)', 
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            회원가입
          </a>
          <br />
          <a 
            href="/booking" 
            style={{ 
              color: 'var(--golf-light)', 
              textDecoration: 'none',
              fontSize: '14px',
              marginTop: '8px',
              display: 'inline-block'
            }}
          >
            로그인 없이 둘러보기 →
          </a>
        </div>
      </div>
    </div>
  );
};