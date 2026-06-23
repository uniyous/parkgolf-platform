import React from 'react';
import { BreadcrumbContainer } from '@/components/common';
import { usePageBreadcrumbs } from '@/hooks/usePageBreadcrumbs';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/stores/breadcrumb.store';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, className, breadcrumbs }) => {
  usePageBreadcrumbs(breadcrumbs);

  return (
    <div className={cn('space-y-6', className)}>
      <BreadcrumbContainer />
      {children}
    </div>
  );
};

PageLayout.displayName = 'PageLayout';
