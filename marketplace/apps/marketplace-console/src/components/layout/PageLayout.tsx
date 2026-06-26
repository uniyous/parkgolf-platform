import React from 'react';
import { BreadcrumbContainer } from '@/components/common';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      <BreadcrumbContainer />
      {children}
    </div>
  );
};

PageLayout.displayName = 'PageLayout';
