import { atom } from 'recoil';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export const authState = atom<AuthState>({
  key: 'authState',
  default: {
    isAuthenticated: false,
    user: null,
    token: localStorage.getItem('token'),
    loading: false,
    error: null,
  },
});

export const loginLoadingState = atom<boolean>({
  key: 'loginLoadingState',
  default: false,
});

export const loginErrorState = atom<string | null>({
  key: 'loginErrorState',
  default: null,
});