import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { setBreadcrumb, clearBreadcrumb, pushBreadcrumb, popBreadcrumb, updateLastBreadcrumb, type BreadcrumbItem } from '../slices/breadcrumbSlice';

export const useBreadcrumb = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.breadcrumb.items);

  const setItems = useCallback((items: BreadcrumbItem[]) => {
    dispatch(setBreadcrumb(items));
  }, [dispatch]);

  const clear = useCallback(() => {
    dispatch(clearBreadcrumb());
  }, [dispatch]);

  const push = useCallback((item: BreadcrumbItem) => {
    dispatch(pushBreadcrumb(item));
  }, [dispatch]);

  const pop = useCallback(() => {
    dispatch(popBreadcrumb());
  }, [dispatch]);

  const updateLast = useCallback((item: BreadcrumbItem) => {
    dispatch(updateLastBreadcrumb(item));
  }, [dispatch]);

  return {
    items,
    setItems,
    clear,
    push,
    pop,
    updateLast,
  };
};

// 페이지 컴포넌트에서 사용할 훅
export const useSetBreadcrumb = (items: BreadcrumbItem[]) => {
  const { setItems } = useBreadcrumb();

  useEffect(() => {
    setItems(items);
    
    // 컴포넌트 언마운트 시 breadcrumb 초기화 (선택사항)
    // return () => {
    //   clear();
    // };
  }, [setItems]); // setItems는 useCallback으로 안정화됨
};