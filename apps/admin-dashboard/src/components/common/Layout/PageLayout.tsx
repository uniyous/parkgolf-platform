import React from 'react';
import { BreadcrumbContainer } from '../BreadcrumbContainer';

interface PageLayoutProps {
  children: React.ReactNode;
}

interface PageHeaderProps {
  children: React.ReactNode;
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> & {
  Header: React.FC<PageHeaderProps>;
  Content: React.FC<PageContentProps>;
} = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="w-full">
      <BreadcrumbContainer />
    </div>
    {children}
  </div>
);

PageLayout.Header = ({ children }: PageHeaderProps) => (
  <header className="bg-white shadow">
    <div className="w-full py-6">
      {children}
    </div>
  </header>
);

PageLayout.Content = ({ children, className = '' }: PageContentProps) => (
  <main className={`w-full py-4 ${className}`}>
    {children}
  </main>
);

PageLayout.displayName = 'PageLayout';
PageLayout.Header.displayName = 'PageLayout.Header';
PageLayout.Content.displayName = 'PageLayout.Content';