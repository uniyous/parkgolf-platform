import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Permission, AdminRole, AdminScope, Admin } from '../../types';
import { 
  hasPermission, 
  canManageAdmin, 
  isPlatformAdmin, 
  isCompanyAdmin,
  ADMIN_ROLE_LABELS,
  getDefaultPermissions,
  getRoleScope
} from '../../utils/adminPermissions';

interface AuthState {
  currentAdmin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  currentAdmin: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunk for login
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await fetch('http://localhost:3091/api/admin/auth/login', {
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

    // admin-api 응답 형식: { success: true, data: { accessToken, refreshToken, user } }
    if (!result.success || !result.data) {
      throw new Error('로그인 응답이 올바르지 않습니다.');
    }

    const { accessToken, refreshToken, user } = result.data;
    
    // 토큰 저장
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('currentUser', JSON.stringify(user));

    return {
      user: user,
      token: accessToken,
    };
  }
);

// Async thunk for getting current user from API
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await fetch('http://localhost:3091/api/admin/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get current user');
    }

    return {
      user: result.data,
      token,
    };
  }
);

// Async thunk for checking auth status from localStorage
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async () => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('currentUser');
    
    if (!token || !userStr) {
      throw new Error('No authentication found');
    }

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
      localStorage.removeItem('currentUser');
      state.currentAdmin = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentAdmin: (state, action) => {
      state.currentAdmin = action.payload;
      state.isAuthenticated = !!action.payload;
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
        // Convert user to admin format
        const user = action.payload.user;
        const adminRole = (user.role as AdminRole) || 'PLATFORM_ADMIN';
        const scope = getRoleScope(adminRole);
        const permissions = user.permissions || getDefaultPermissions(adminRole);
        
        state.currentAdmin = {
          id: user.id,
          username: user.username || user.email,
          email: user.email,
          name: user.name || user.username || 'Unknown',
          role: adminRole,
          scope: scope,
          permissions: permissions,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        console.log('로그인 성공 - Redux Store 업데이트:', {
          admin: state.currentAdmin,
          token: action.payload.token
        });
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '로그인에 실패했습니다.';
      })
    // Get current user cases
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        // Convert API response to admin format
        const apiUser = action.payload.user;
        const adminRole = (apiUser.roleCode || apiUser.role) as AdminRole;
        const scope = getRoleScope(adminRole);
        const permissions = apiUser.permissions?.map((p: any) => 
          typeof p === 'string' ? p : p.permission
        ) || getDefaultPermissions(adminRole);
        
        state.currentAdmin = {
          id: apiUser.id,
          username: apiUser.email,
          email: apiUser.email,
          name: apiUser.name,
          role: adminRole,
          scope: scope,
          permissions: permissions,
          isActive: apiUser.isActive,
          lastLoginAt: apiUser.lastLoginAt,
          createdAt: apiUser.createdAt,
          updatedAt: apiUser.updatedAt,
          department: apiUser.department,
          description: apiUser.description,
          phone: apiUser.phone
        };
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        
        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          id: apiUser.id,
          username: apiUser.email,
          email: apiUser.email,
          name: apiUser.name,
          role: adminRole,
          type: 'admin',
          permissions: permissions
        }));
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get current user';
        // Don't clear currentAdmin immediately on API failure
        // Keep using cached data if available
      })
    // Check auth status cases
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        const user = action.payload.user;
        const adminRole = (user.role as AdminRole) || 'PLATFORM_ADMIN';
        const scope = getRoleScope(adminRole);
        const permissions = user.permissions || getDefaultPermissions(adminRole);
        
        state.currentAdmin = {
          id: user.id,
          username: user.username || user.email,
          email: user.email,
          name: user.name || user.username || 'Unknown',
          role: adminRole,
          scope: scope,
          permissions: permissions,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.currentAdmin = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { logout, clearError, setCurrentAdmin } = authSlice.actions;

// Selectors
export const selectCurrentAdmin = (state: { auth: AuthState }) => state.auth.currentAdmin;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

// Permission helper functions
export const selectHasPermission = (permission: Permission) => (state: { auth: AuthState }) => {
  const admin = state.auth.currentAdmin;
  if (!admin) return false;
  return hasPermission(admin.permissions, permission);
};

export const selectCanManageAdminRole = (targetRole: AdminRole) => (state: { auth: AuthState }) => {
  const admin = state.auth.currentAdmin;
  if (!admin) return false;
  return canManageAdmin(admin.role, targetRole);
};

export const selectCanAccessCompany = (companyId: number) => (state: { auth: AuthState }) => {
  const admin = state.auth.currentAdmin;
  if (!admin) return false;
  
  if (isPlatformAdmin(admin.role)) {
    return true;
  }
  
  return admin.companyId === companyId;
};

export const selectCanAccessCourse = (courseId: number) => (state: { auth: AuthState }) => {
  const admin = state.auth.currentAdmin;
  if (!admin) return false;
  
  if (isPlatformAdmin(admin.role)) {
    return true;
  }
  
  if (admin.scope === 'COMPANY') {
    return true;
  }
  
  if (admin.scope === 'COURSE' && admin.courseIds) {
    return admin.courseIds.includes(courseId);
  }
  
  return false;
};

export const selectDisplayInfo = (state: { auth: AuthState }) => {
  const admin = state.auth.currentAdmin;
  if (!admin) {
    return {
      name: '로그인 필요',
      role: '',
      scope: ''
    };
  }

  return {
    name: admin.name,
    role: ADMIN_ROLE_LABELS[admin.role],
    scope: admin.scope,
    company: admin.company?.name
  };
};

export default authSlice.reducer;