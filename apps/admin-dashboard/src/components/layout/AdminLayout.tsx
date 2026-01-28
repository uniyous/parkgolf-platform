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
  ChevronRight,
  Gamepad2,
  CreditCard,
  Building2,
  UserCog,
  Shield,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  path: string;
  label: string;
  icon?: LucideIcon;
}

interface MenuGroup {
  label: string;
  icon: LucideIcon;
  basePath: string;
  items: MenuItem[];
}

interface AdminLayoutProps {
  currentUser: {
    username: string;
    email: string;
    role?: string;
  };
  onLogout: () => void;
  children: React.ReactNode;
}

// 대분류 + 서브메뉴 구조 (도메인 관계 기반)
// 회사 → 골프장 소유, 관리자 소속, 역할/권한 관리
const menuGroups: MenuGroup[] = [
  {
    label: '대시보드',
    icon: LayoutDashboard,
    basePath: '/dashboard',
    items: [
      { path: '/dashboard', label: '홈 대시보드' },
    ],
  },
  {
    label: '회사',
    icon: Building2,
    basePath: '/companies',
    items: [
      { path: '/companies', label: '회사 관리', icon: Building2 },
      { path: '/admin-management', label: '관리자 관리', icon: UserCog },
      { path: '/roles', label: '역할 및 권한', icon: Shield },
    ],
  },
  {
    label: '골프장',
    icon: MapPin,
    basePath: '/clubs',
    items: [
      { path: '/clubs', label: '골프장 관리', icon: MapPin },
      { path: '/games', label: '라운드 관리', icon: Gamepad2 },
    ],
  },
  {
    label: '예약',
    icon: Calendar,
    basePath: '/bookings',
    items: [
      { path: '/bookings', label: '예약 현황', icon: Calendar },
      { path: '/bookings/cancellations', label: '환불 관리', icon: CreditCard },
    ],
  },
  {
    label: '회원',
    icon: Users,
    basePath: '/user',
    items: [
      { path: '/user-management', label: '사용자 관리', icon: Users },
    ],
  },
  {
    label: '설정',
    icon: Settings,
    basePath: '/settings',
    items: [
      { path: '/system-settings', label: '시스템 설정', icon: Wrench },
    ],
  },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  onLogout,
  children
}) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // 현재 경로에 해당하는 그룹을 기본 확장
    const currentGroup = menuGroups.find(group =>
      group.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    );
    return currentGroup ? [currentGroup.label] : ['대시보드'];
  });

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    // 정확한 매칭 또는 하위 경로 매칭
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: MenuGroup) => {
    return group.items.some(item => isActive(item.path));
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const NavGroup = ({ group }: { group: MenuGroup }) => {
    const Icon = group.icon;
    const isExpanded = expandedGroups.includes(group.label);
    const hasActiveItem = isGroupActive(group);
    const isSingleItem = group.items.length === 1;

    // 단일 아이템인 경우 바로 링크
    if (isSingleItem) {
      const item = group.items[0];
      return (
        <Link
          to={item.path}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'nav-item',
            isActive(item.path) && 'active'
          )}
        >
          <Icon className="nav-item-icon" />
          <span className="font-medium">{group.label}</span>
        </Link>
      );
    }

    return (
      <div className="space-y-1">
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(group.label)}
          className={cn(
            'w-full nav-item justify-between',
            hasActiveItem && 'text-[var(--color-primary-light)]'
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="nav-item-icon" />
            <span className="font-medium">{group.label}</span>
          </div>
          <ChevronRight
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        </button>

        {/* Sub Items */}
        {isExpanded && (
          <div className="ml-4 pl-4 border-l border-[var(--color-border)] space-y-1">
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item.path)
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-white'
                  )}
                >
                  {ItemIcon && <ItemIcon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
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
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuGroups.map((group) => (
              <NavGroup key={group.label} group={group} />
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
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuGroups.map((group) => (
              <NavGroup key={group.label} group={group} />
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
