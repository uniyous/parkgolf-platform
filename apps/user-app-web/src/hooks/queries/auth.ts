import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type LoginRequest, type RegisterRequest, type ChangePasswordRequest } from '@/lib/api/authApi';
import { useAuthStore } from '@/stores/authStore';
import { authStorage } from '@/lib/storage';
import { authKeys } from './keys';

// Profile Query
export const useProfileQuery = () => {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: () => authApi.getProfile(),
    enabled: authStorage.isAuthenticated(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
};

// Login Mutation
export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

// Register Mutation
export const useRegisterMutation = () => {
  const queryClient = useQueryClient();
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: (userData: RegisterRequest) => authApi.register(userData),
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

// Logout Mutation
export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
    onError: () => {
      // Clear auth state even if API call fails
      logout();
      queryClient.clear();
    },
  });
};

// Change Password Mutation
export const useChangePasswordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authApi.changePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
};

// Password Expiry Query
export const usePasswordExpiryQuery = () => {
  return useQuery({
    queryKey: authKeys.passwordExpiry(),
    queryFn: () => authApi.checkPasswordExpiry(),
    enabled: authStorage.isAuthenticated(),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: false,
  });
};
