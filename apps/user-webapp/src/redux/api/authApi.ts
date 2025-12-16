import { baseApi } from './baseApi';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  phoneNumber?: string;
  birthDate?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  phoneNumber?: string;
  createdAt: string;
  roleCode?: string;
  isActive?: boolean;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
      onQueryStarted: async (arg, { queryFulfilled, dispatch }) => {
        try {
          const { data } = await queryFulfilled;
          // Store tokens in localStorage
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Update Redux state
          const { updateToken } = await import('../slices/authSlice');
          dispatch(updateToken({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
          }));
        } catch (error) {
          console.error('Login failed:', error);
        }
      },
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: {
          ...userData,
          phone: userData.phoneNumber || userData.phone,
        },
      }),
      invalidatesTags: ['User'],
      onQueryStarted: async (arg, { queryFulfilled, dispatch }) => {
        try {
          const { data } = await queryFulfilled;
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Update Redux state
          const { updateToken } = await import('../slices/authSlice');
          dispatch(updateToken({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
          }));
        } catch (error) {
          console.error('Registration failed:', error);
        }
      },
    }),

    getProfile: builder.query<User, void>({
      query: () => '/auth/profile',
      providesTags: ['User'],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
      onQueryStarted: async (arg, { queryFulfilled, dispatch }) => {
        try {
          await queryFulfilled;
        } catch (error) {
          console.warn('Logout API call failed:', error);
        } finally {
          // Always clear local storage
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          // Clear Redux state
          const { logout } = await import('../slices/authSlice');
          dispatch(logout());
        }
      },
    }),

    refreshToken: builder.mutation<{ accessToken: string }, { refreshToken: string }>({
      query: ({ refreshToken }) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useLogoutMutation,
  useRefreshTokenMutation,
} = authApi;