import '@tanstack/react-query';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /**
       * false로 설정하면 GlobalLoading에서 제외됩니다.
       * 로컬 로딩을 사용하는 쿼리에 설정하세요.
       * @default true
       */
      globalLoading?: boolean;
    };
    mutationMeta: {
      /**
       * false로 설정하면 GlobalLoading에서 제외됩니다.
       * 로컬 로딩을 사용하는 mutation에 설정하세요.
       * @default true
       */
      globalLoading?: boolean;
    };
  }
}
