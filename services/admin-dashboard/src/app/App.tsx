import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppRouter } from "./router";
import { getCurrentUser, checkAuthStatus } from '../redux/slices/authSlice';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // 앱 시작 시 인증 상태 확인
    const initializeAuth = async () => {
      try {
        // 먼저 localStorage에서 토큰 확인
        const checkResult = await dispatch(checkAuthStatus()).unwrap();
        
        // checkAuthStatus가 성공했을 때만 API 호출
        if (checkResult?.token) {
          console.log('Token found, fetching current user from API');
          await dispatch(getCurrentUser());
        }
      } catch (error) {
        console.log('Auth initialization failed, user needs to login');
      }
    };

    initializeAuth();
  }, [dispatch]);

  return <AppRouter />;
}

export default App;