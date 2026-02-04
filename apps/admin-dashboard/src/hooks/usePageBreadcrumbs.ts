import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBreadcrumbStore } from '@/stores/breadcrumb.store';
import type { BreadcrumbItem } from '@/stores/breadcrumb.store';
import { BREADCRUMB_MAP } from '@/config/breadcrumb.config';

/**
 * Route 기반 자동 브레드크럼 훅.
 * breadcrumbs 인자가 있으면 config 대신 사용 (디테일 페이지 동적 브레드크럼).
 */
export function usePageBreadcrumbs(breadcrumbs?: BreadcrumbItem[]): void {
  const { pathname } = useLocation();
  const setItems = useBreadcrumbStore((state) => state.setItems);

  useEffect(() => {
    if (breadcrumbs) {
      setItems(breadcrumbs);
      return;
    }

    const items = BREADCRUMB_MAP[pathname];
    if (items) {
      setItems(items);
    } else {
      setItems([]);
    }
  }, [pathname, breadcrumbs, setItems]);
}
