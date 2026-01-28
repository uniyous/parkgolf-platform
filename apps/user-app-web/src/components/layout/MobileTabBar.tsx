import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, MessageCircle, User, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabItem {
  icon: LucideIcon;
  label: string;
  path: string;
  matchPaths?: string[];
}

const tabs: TabItem[] = [
  { icon: Home, label: '홈', path: '/' },
  { icon: Calendar, label: '예약', path: '/bookings', matchPaths: ['/bookings', '/my-bookings', '/booking', '/search'] },
  { icon: Users, label: '소셜', path: '/social', matchPaths: ['/social', '/friends', '/chat'] },
  { icon: User, label: '마이', path: '/profile' },
];

/**
 * Mobile bottom tab bar navigation
 */
export function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((p) => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Safe area for iOS */}
      <div className="backdrop-blur-xl bg-[var(--color-nav-bg)]/90 border-t border-[var(--color-border)]">
        <div className="flex justify-around items-center h-16 pb-safe">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                  active
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-tertiary)]'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'scale-110')} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
