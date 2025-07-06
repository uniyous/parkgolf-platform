import React from 'react';

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
    {children}
  </div>
);

PageLayout.Header = ({ children }: PageHeaderProps) => (
  <header className="bg-white shadow">
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </header>
);

PageLayout.Content = ({ children, className = '' }: PageContentProps) => (
  <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${className}`}>
    {children}
  </main>
);

PageLayout.displayName = 'PageLayout';
PageLayout.Header.displayName = 'PageLayout.Header';
PageLayout.Content.displayName = 'PageLayout.Content';