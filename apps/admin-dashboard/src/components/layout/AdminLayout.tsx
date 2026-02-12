import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Users,
  Settings,
  LayoutDashboard,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMenuTreeQuery } from '@/hooks/queries/menu';
import { getIcon } from '@/utils/icon-map';
import { SupportBanner } from '@/components/layout/SupportBanner';
import { useAuthStore } from '@/stores/auth.store';
import type { MenuTreeItem } from '@/lib/api/menuApi';

interface AdminLayoutProps {
  currentUser: {
    username: string;
    email: string;
    role?: string;
  };
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  onLogout,
  children
}) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: menuTree, isLoading: menuLoading } = useMenuTreeQuery();
  const primaryScope = useAuthStore((state) => state.currentAdmin?.primaryScope);

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    return ['A_DASHBOARD', 'P_DASHBOARD'];
  });

  const isActive = (path: string | null) => {
    if (!path) return false;
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: MenuTreeItem) => {
    return group.children.some(item => isActive(item.path));
  };

  const toggleGroup = (code: string) => {
    setExpandedGroups(prev =>
      prev.includes(code)
        ? prev.filter(g => g !== code)
        : [...prev, code]
    );
  };

  const NavGroup = ({ group }: { group: MenuTreeItem }) => {
    const Icon = getIcon(group.icon);
    const isExpanded = expandedGroups.includes(group.code);
    const hasActiveItem = isGroupActive(group);
    const isSingleItem = group.children.length === 1;

    // 단일 아이템인 경우 바로 링크
    if (isSingleItem) {
      const item = group.children[0];
      return (
        <Link
          to={item.path || '/dashboard'}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'nav-item',
            isActive(item.path) && 'active'
          )}
        >
          <Icon className="nav-item-icon" />
          <span className="font-medium">{group.name}</span>
        </Link>
      );
    }

    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleGroup(group.code)}
          className={cn(
            'w-full nav-item justify-between',
            hasActiveItem && 'text-emerald-400'
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="nav-item-icon" />
            <span className="font-medium">{group.name}</span>
          </div>
          <ChevronRight
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        </button>

        {isExpanded && (
          <div className="ml-4 pl-4 border-l border-white/15 space-y-1">
            {group.children.map((item) => {
              const ItemIcon = getIcon(item.icon);
              return (
                <Link
                  key={item.code}
                  to={item.path || '#'}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item.path)
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-white/40 hover:bg-white/10 hover:text-white/80'
                  )}
                >
                  <ItemIcon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 메뉴 로딩 중 스켈레톤
  const MenuSkeleton = () => (
    <div className="space-y-4 px-4 py-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-9 bg-white/5 rounded-lg animate-pulse" />
          <div className="ml-8 space-y-1">
            <div className="h-7 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-7 bg-white/5 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  const SidebarNav = () => {
    if (menuLoading) return <MenuSkeleton />;
    if (!menuTree || menuTree.length === 0) {
      return (
        <div className="px-4 py-6 text-center text-white/40 text-sm">
          <AlertCircle className="w-5 h-5 mx-auto mb-2" />
          메뉴를 불러올 수 없습니다
        </div>
      );
    }
    return (
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuTree.map((group) => (
          <NavGroup key={group.code} group={group} />
        ))}
      </nav>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 fixed inset-y-0 left-0 z-30">
        <div className="flex flex-col h-full bg-[#053929] border-r border-white/10">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-semibold text-white">ParkMate</span>
            </div>
          </div>

          {/* Navigation */}
          <SidebarNav />

          {/* User Profile */}
          <div className="p-4 border-t border-white/10">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
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
                  <p className="text-xs text-white/40 truncate">
                    {currentUser.email}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-white/40 transition-transform',
                    userMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#053929] border border-white/15 rounded-lg shadow-lg p-2 animate-slide-up">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    프로필 설정
                  </Link>
                  <Link
                    to="/change-password"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    비밀번호 변경
                  </Link>
                  <div className="my-2 border-t border-white/15" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-white/10 transition-colors"
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-[#053929] border-r border-white/10 transform transition-transform duration-300 md:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-semibold text-white">ParkMate</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-white/40 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <SidebarNav />

          <div className="p-4 border-t border-white/10">
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
                <p className="text-xs text-white/40 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-white/10 transition-colors"
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
        <header className="md:hidden sticky top-0 z-20 h-16 px-4 flex items-center justify-between bg-[#053929] border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white/40 hover:bg-white/10"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-white">ParkMate</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Support Banner (본사/협회가 가맹점 지원 모드일 때) */}
        {primaryScope === 'PLATFORM' && <SupportBanner />}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
