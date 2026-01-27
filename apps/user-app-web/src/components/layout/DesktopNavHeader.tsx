import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, User, Bell, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCountQuery } from '@/hooks/queries/notification';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  { icon: Home, label: '홈', path: '/' },
  {
    icon: Calendar,
    label: '예약',
    path: '/bookings',
    matchPaths: ['/bookings', '/booking', '/search'],
  },
  {
    icon: Users,
    label: '소셜',
    path: '/social',
    matchPaths: ['/social', '/friends', '/chat'],
  },
  {
    icon: User,
    label: '마이',
    path: '/profile',
    matchPaths: ['/profile', '/my-bookings', '/payment-methods', '/settings'],
  },
];

/**
 * Desktop top navigation header
 */
export function DesktopNavHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCountQuery();

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some((p) => location.pathname.startsWith(p));
    }
    return location.pathname === item.path;
  };

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-[var(--color-nav-bg)]/95 backdrop-blur-lg border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🏌️</span>
            <span className="font-bold text-lg text-white">ParkMate</span>
          </button>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
                    active
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Notification & User Info */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
              aria-label="알림"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-[var(--color-error)] rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Info */}
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white max-w-[120px] truncate">
                {user?.name || '사용자'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
