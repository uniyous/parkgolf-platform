import { selector } from 'recoil';
import { authState } from '../atoms/authAtom';

export const isAuthenticatedSelector = selector<boolean>({
  key: 'isAuthenticatedSelector',
  get: ({ get }) => {
    const auth = get(authState);
    return auth.isAuthenticated && !!auth.token;
  },
});

export const currentUserSelector = selector({
  key: 'currentUserSelector',
  get: ({ get }) => {
    const auth = get(authState);
    return auth.user;
  },
});

export const userRoleSelector = selector<string | null>({
  key: 'userRoleSelector',
  get: ({ get }) => {
    const auth = get(authState);
    return auth.user?.role || null;
  },
});

export const authTokenSelector = selector<string | null>({
  key: 'authTokenSelector',
  get: ({ get }) => {
    const auth = get(authState);
    return auth.token;
  },
});