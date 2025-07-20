import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3092';

// Create axios instance with interceptors
export const authApi = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return authApi(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens but don't redirect immediately
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Let the AuthContext handle the redirect
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

class AuthApiService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await authApi.post('/auth/login', credentials);
    
    // Store tokens
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await authApi.post('/auth/register', userData);
    
    // Store tokens
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await authApi.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async getProfile(): Promise<User> {
    const response = await authApi.get('/auth/profile');
    return response.data;
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await authApi.post('/auth/refresh', { refreshToken });
    const { accessToken } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getStoredToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}

export const authApiService = new AuthApiService();