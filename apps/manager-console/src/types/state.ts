// 공통 상태 타입 정의
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: string | null;
  lastUpdated?: Date;
}

export interface PaginatedState<T> extends AsyncState<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 도메인별 상태 인터페이스
export interface EntityState<T> extends AsyncState<T[]> {
  selectedId: number | null;
  cache: Record<number, T>;
}

// 상태 액션 타입
export type StateAction<T> = 
  | { type: 'SET_LOADING' }
  | { type: 'SET_SUCCESS'; payload: T }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }
  | { type: 'UPDATE_ITEM'; payload: { id: number; data: Partial<T> } }
  | { type: 'REMOVE_ITEM'; payload: number };