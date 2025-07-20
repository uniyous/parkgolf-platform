import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  role: string;
  type: string;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunk for login
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await fetch('http://localhost:3011/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '로그인에 실패했습니다.');
    }

    // auth-service 응답 형식: { accessToken, refreshToken, user }
    // 토큰 저장
    localStorage.setItem('accessToken', result.accessToken);
    if (result.refreshToken) {
      localStorage.setItem('refreshToken', result.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(result.user));

    return {
      user: result.user,
      token: result.accessToken,
    };
  }
);

// Async thunk for checking auth status
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async () => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      throw new Error('No authentication found');
    }

    // TODO: Validate token with backend
    const user = JSON.parse(userStr);
    
    return { user, token };
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login cases
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        console.log('로그인 성공 - Redux Store 업데이트:', {
          user: action.payload.user,
          token: action.payload.token
        });
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '로그인에 실패했습니다.';
      })
    // Check auth status cases
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;