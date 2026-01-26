import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  currentUser: {
    username: string;
    email: string;
    role?: string;
  };
  onLogout: () => void;
  children: React.ReactNode;
}

const menuItems = [
  { path: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { path: '/bookings', label: '예약', icon: Calendar },
  { path: '/clubs', label: '골프장', icon: MapPin },
  { path: '/user-management', label: '회원', icon: Users },
  { path: '/system-settings', label: '설정', icon: Settings },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  onLogout,
  children
}) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const NavItem = ({ item }: { item: typeof menuItems[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'nav-item',
          active && 'active'
        )}
      >
        <Icon className="nav-item-icon" />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 fixed inset-y-0 left-0 z-30">
        <div className="flex flex-col h-full bg-[var(--color-nav-bg)] border-r border-[var(--color-border)]">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-semibold text-white">ParkMate</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium">
                    {currentUser.username?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {currentUser.username}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                    {currentUser.email}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-[var(--color-text-tertiary)] transition-transform',
                    userMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 glass-card p-2 animate-slide-up">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-white transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    프로필 설정
                  </Link>
                  <Link
                    to="/change-password"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    비밀번호 변경
                  </Link>
                  <div className="my-2 border-t border-[var(--color-border)]" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-error)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-nav-bg)] border-r border-[var(--color-border)] transform transition-transform duration-300 md:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-semibold text-white">ParkMate</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium">
                  {currentUser.username?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser.username}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--color-error)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-20 h-16 px-4 flex items-center justify-between bg-[var(--color-nav-bg)] border-b border-[var(--color-border)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-white">ParkMate</span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
