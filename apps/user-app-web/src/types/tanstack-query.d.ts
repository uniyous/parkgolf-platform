import '@tanstack/react-query';

/**
 * React Query meta 타입 확장
 *
 * 사용 예시:
 * useQuery({
 *   queryKey: ['users'],
 *   queryFn: fetchUsers,
 *   meta: {
 *     silent: true,  // 에러 토스트 표시 안 함
 *     globalLoading: false, // 글로벌 로딩에서 제외
 *     errorMessage: '사용자 목록을 불러오는데 실패했습니다.',
 *   }
 * })
 */
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /** 에러 토스트 표시 여부 (true면 에러 표시 안 함) */
      silent?: boolean;
      /**
       * false로 설정하면 GlobalLoading에서 제외됩니다.
       * 로컬 로딩을 사용하는 쿼리에 설정하세요.
       * @default true
       */
      globalLoading?: boolean;
      /** 커스텀 에러 메시지 */
      errorMessage?: string;
    };
    mutationMeta: {
      /** 에러 토스트 표시 여부 (true면 에러 표시 안 함) */
      silent?: boolean;
      /**
       * false로 설정하면 GlobalLoading에서 제외됩니다.
       * 로컬 로딩을 사용하는 mutation에 설정하세요.
       * @default true
       */
      globalLoading?: boolean;
      /** 커스텀 에러 메시지 */
      errorMessage?: string;
    };
  }
}
