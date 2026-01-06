/**
 * localStorage 추상화 레이어
 * - 타입 안전한 스토리지 접근
 * - 테스트 용이성 향상
 * - 중앙 집중식 스토리지 관리
 */

// 스토리지 키 상수
export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// 기본 스토리지 함수
export const storage = {
  get(key: StorageKey): string | null {
    return localStorage.getItem(key);
  },

  set(key: StorageKey, value: string): void {
    localStorage.setItem(key, value);
  },

  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};

// 인증 관련 스토리지 함수
export const authStorage = {
  getToken(): string | null {
    return storage.get(STORAGE_KEYS.TOKEN);
  },

  setToken(token: string): void {
    storage.set(STORAGE_KEYS.TOKEN, token);
  },

  getRefreshToken(): string | null {
    return storage.get(STORAGE_KEYS.REFRESH_TOKEN);
  },

  setRefreshToken(token: string): void {
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  getUser<T>(): T | null {
    const userStr = storage.get(STORAGE_KEYS.USER);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as T;
    } catch {
      return null;
    }
  },

  setUser<T>(user: T): void {
    storage.set(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  setAuth(token: string, refreshToken: string, user: unknown): void {
    storage.set(STORAGE_KEYS.TOKEN, token);
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    storage.set(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  clearAuth(): void {
    storage.remove(STORAGE_KEYS.TOKEN);
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    storage.remove(STORAGE_KEYS.USER);
  },

  isAuthenticated(): boolean {
    return !!storage.get(STORAGE_KEYS.TOKEN);
  },
};
