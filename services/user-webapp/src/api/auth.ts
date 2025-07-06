import axiosInstance from '../utils/axiosConfig';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Call logout endpoint if available
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },

  validateToken: async (): Promise<boolean> => {
    try {
      const response = await axiosInstance.get('/auth/validate');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },

  getProfile: async () => {
    const response = await axiosInstance.get('/auth/profile');
    return response.data;
  },
};