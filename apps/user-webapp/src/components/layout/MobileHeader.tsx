import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
  rightContent?: React.ReactNode;
  transparent?: boolean;
}

/**
 * Mobile header with back button and title
 */
export function MobileHeader({
  title,
  showBackButton,
  showLogo = false,
  rightContent,
  transparent = false,
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto detect if back button should show (main tab paths don't need back button)
  const mainPaths = ['/', '/bookings', '/social', '/profile'];
  const shouldShowBack = showBackButton ?? !mainPaths.includes(location.pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 md:hidden',
        transparent
          ? 'bg-transparent'
          : 'backdrop-blur-xl bg-[var(--color-nav-bg)]/90 border-b border-[var(--color-border)]'
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left Section */}
        <div className="flex items-center gap-2 flex-1">
          {shouldShowBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}

          {showLogo && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-2xl">🏌️</span>
              <span className="font-bold text-lg text-white">ParkMate</span>
            </button>
          )}

          {title && !showLogo && (
            <h1 className="text-lg font-semibold text-white">{title}</h1>
          )}
        </div>

        {/* Right Section */}
        {rightContent && <div>{rightContent}</div>}
      </div>
    </header>
  );
}
