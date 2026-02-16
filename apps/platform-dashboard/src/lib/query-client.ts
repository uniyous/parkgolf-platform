import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { showErrorToast, isAuthError, isApiError } from '@/lib/errors';

/**
 * React Query 전역 에러 핸들러
 *
 * 모든 쿼리/뮤테이션의 에러를 중앙에서 처리합니다.
 * - 401 에러: 인증 관련 처리 (client.ts에서 리다이렉트)
 * - 기타 에러: Toast 알림 표시
 */

// Query 캐시 - 데이터 조회 실패 시
const queryCache = new QueryCache({
  onError: (error, query) => {
    // meta.silent가 true면 에러 표시 생략
    if (query.meta?.silent) {
      return;
    }

    // 401 에러는 client.ts에서 처리하므로 생략
    if (isAuthError(error)) {
      return;
    }

    // 이미 데이터가 있는 상태에서 refetch 실패 시 조용히 처리
    if (query.state.data !== undefined) {
      console.warn('Background refetch failed:', error);
      return;
    }

    // 에러 토스트 표시
    const errorMessage = query.meta?.errorMessage as string | undefined;
    showErrorToast(error, errorMessage);
  },
});

// Mutation 캐시 - 데이터 변경 실패 시
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    // meta.silent가 true면 에러 표시 생략
    if (mutation.meta?.silent) {
      return;
    }

    // 401 에러는 client.ts에서 처리하므로 생략
    if (isAuthError(error)) {
      return;
    }

    // 에러 토스트 표시
    const errorMessage = mutation.meta?.errorMessage as string | undefined;
    showErrorToast(error, errorMessage);
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      gcTime: 1000 * 60 * 30, // 30분 (구 cacheTime)
      retry: (failureCount, error) => {
        // 401/403 에러는 재시도하지 않음
        if (isApiError(error) && (error.status === 401 || error.status === 403)) {
          return false;
        }
        // 최대 1회 재시도
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * React Query meta 타입 확장
 *
 * 사용 예시:
 * useQuery({
 *   queryKey: ['users'],
 *   queryFn: fetchUsers,
 *   meta: {
 *     silent: true,  // 에러 토스트 표시 안 함
 *     errorMessage: '사용자 목록을 불러오는데 실패했습니다.',  // 커스텀 에러 메시지
 *   }
 * })
 */
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /** 에러 토스트 표시 여부 (기본: false) */
      silent?: boolean;
      /** 글로벌 로딩 표시 여부 */
      globalLoading?: boolean;
      /** 커스텀 에러 메시지 */
      errorMessage?: string;
    };
    mutationMeta: {
      /** 에러 토스트 표시 여부 (기본: false) */
      silent?: boolean;
      /** 글로벌 로딩 표시 여부 */
      globalLoading?: boolean;
      /** 커스텀 에러 메시지 */
      errorMessage?: string;
    };
  }
}
