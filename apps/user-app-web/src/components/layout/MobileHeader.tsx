import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCountQuery } from '@/hooks/queries/notification';

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
  rightContent?: React.ReactNode;
  transparent?: boolean;
  /** Hide user info even on main pages */
  hideUserInfo?: boolean;
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
  hideUserInfo = false,
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCountQuery();

  // Auto detect if back button should show (main tab paths don't need back button)
  const mainPaths = ['/', '/bookings', '/social', '/profile'];
  const isMainPage = mainPaths.includes(location.pathname);
  const shouldShowBack = showBackButton ?? !isMainPage;

  // Show user info on main pages
  const shouldShowUserInfo = isMainPage && !hideUserInfo && user;

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
        <div className="flex items-center gap-2">
          {rightContent && <div>{rightContent}</div>}

          {/* Notification Bell - shown on main pages */}
          {isMainPage && (
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
              aria-label="알림"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 text-[10px] font-bold text-white bg-[var(--color-error)] rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Info - shown on main pages */}
          {shouldShowUserInfo && (
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-[var(--color-surface)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-white max-w-[80px] truncate">
                {user.name || '사용자'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
