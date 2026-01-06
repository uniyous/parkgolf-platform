import { ReactNode } from 'react';
import { Header } from './Header';

type GradientVariant = 'none' | 'light' | 'forest';

interface MainLayoutProps {
  children: ReactNode;
  /** 헤더 표시 여부 (기본값: true) */
  showHeader?: boolean;
  /** 배경 그라디언트 종류 (기본값: 'forest') */
  gradient?: GradientVariant;
}

const gradientClasses: Record<GradientVariant, string> = {
  none: 'bg-gray-50',
  light: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
  forest: 'gradient-forest',
};

export const MainLayout = ({
  children,
  showHeader = true,
  gradient = 'forest',
}: MainLayoutProps) => {
  return (
    <div className={`min-h-screen ${gradientClasses[gradient]}`}>
      {showHeader && <Header />}
      <main className="max-w-lg md:max-w-3xl xl:max-w-6xl mx-auto">{children}</main>
    </div>
  );
};
