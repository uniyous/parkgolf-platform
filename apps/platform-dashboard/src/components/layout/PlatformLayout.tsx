import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  UserCog,
  BarChart3,
  CalendarCheck,
  MapPin,
  DollarSign,
  Settings,
  ClipboardList,
  Bell,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_COLORS } from '@/utils/admin-permissions';
import type { Permission, AdminRole } from '@/types';
import type { LucideIcon } from 'lucide-react';

// ============================================
// Props
// ============================================

interface PlatformLayoutProps {
  currentUser: { username: string; email: string; role?: string };
  onLogout: () => void;
  children: React.ReactNode;
}

// ============================================
// Menu Configuration (hardcoded, not from DB)
// ============================================

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Permission(s) required to see this item. Empty = visible to all. */
  requiredPermissions?: Permission[];
  /** If true, user must have ALL listed permissions; otherwise ANY will do. */
  requireAll?: boolean;
  /** If true, only PLATFORM_ADMIN role can see this item */
  platformAdminOnly?: boolean;
  /** If set, only these roles can see this item */
  allowedRoles?: AdminRole[];
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry;

const PLATFORM_MENU: NavEntry[] = [
  // 대시보드 (visible to all)
  {
    label: '대시보드',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  // 가맹점 관리 group
  {
    label: '가맹점 관리',
    icon: Building2,
    items: [
      {
        label: '회사 관리',
        path: '/companies',
        icon: Building2,
        requiredPermissions: ['COMPANIES'],
      },
      {
        label: '파트너 연동',
        path: '/partners',
        icon: Link2,
        requiredPermissions: ['SYSTEM'],
        allowedRoles: ['PLATFORM_ADMIN'],
      },
    ],
  },
  // 현황 분석 group
  {
    label: '현황 분석',
    icon: BarChart3,
    items: [
      {
        label: '예약 현황',
        path: '/analytics/bookings',
        icon: CalendarCheck,
        requiredPermissions: ['ANALYTICS', 'VIEW'],
      },
      {
        label: '골프장 현황',
        path: '/analytics/clubs',
        icon: MapPin,
        requiredPermissions: ['ANALYTICS', 'VIEW'],
      },
      {
        label: '매출 현황',
        path: '/analytics/revenue',
        icon: DollarSign,
        requiredPermissions: ['ANALYTICS'],
      },
    ],
  },
  // 운영 관리 group
  {
    label: '운영 관리',
    icon: Settings,
    items: [
      {
        label: '정책 관리',
        path: '/policies',
        icon: ClipboardList,
        requiredPermissions: ['ALL'],
        allowedRoles: ['PLATFORM_ADMIN'],
      },
      {
        label: '회원 관리',
        path: '/members',
        icon: Users,
        requiredPermissions: ['USERS'],
      },
      {
        label: '관리자 관리',
        path: '/admins',
        icon: UserCog,
        requiredPermissions: ['ADMINS'],
      },
      {
        label: '역할 및 권한',
        path: '/roles',
        icon: Shield,
        requiredPermissions: ['ADMINS'],
        allowedRoles: ['PLATFORM_ADMIN'],
      },
      {
        label: '알림 설정',
        path: '/notifications',
        icon: Bell,
        requiredPermissions: ['ALL'],
        allowedRoles: ['PLATFORM_ADMIN'],
      },
    ],
  },
];

// ============================================
// Permission Check Helpers
// ============================================

function canSeeItem(
  item: NavItem,
  hasPermission: (p: Permission) => boolean,
  currentRole?: AdminRole,
): boolean {
  // Role restriction check
  if (item.allowedRoles && item.allowedRoles.length > 0) {
    if (!currentRole || !item.allowedRoles.includes(currentRole)) {
      return false;
    }
  }

  // Platform admin only check
  if (item.platformAdminOnly && currentRole !== 'PLATFORM_ADMIN') {
    return false;
  }

  // No permission required = visible to all
  if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
    return true;
  }

  // Check permissions
  if (item.requireAll) {
    return item.requiredPermissions.every((p) => hasPermission(p));
  }
  return item.requiredPermissions.some((p) => hasPermission(p));
}

function filterGroupItems(
  group: NavGroup,
  hasPermission: (p: Permission) => boolean,
  currentRole?: AdminRole,
): NavItem[] {
  return group.items.filter((item) => canSeeItem(item, hasPermission, currentRole));
}

// ============================================
// PlatformLayout Component
// ============================================

export const PlatformLayout: React.FC<PlatformLayoutProps> = ({
  currentUser,
  onLogout,
  children,
}) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const currentAdmin = useAuthStore((state) => state.currentAdmin);
  const currentRole = currentAdmin?.primaryRole;

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // Auto-expand groups that contain the current active path
    const active: string[] = [];
    for (const entry of PLATFORM_MENU) {
      if (isNavGroup(entry)) {
        const hasActive = entry.items.some(
          (item) =>
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/'),
        );
        if (hasActive) active.push(entry.label);
      }
    }
    return active;
  });

  // ---- Helpers ----

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => isActive(item.path));
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  // ---- Role badge ----

  const roleBadge = currentRole ? (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        ADMIN_ROLE_COLORS[currentRole] || 'bg-white/10 text-white/60',
      )}
    >
      {ADMIN_ROLE_LABELS[currentRole] || currentRole}
    </span>
  ) : null;

  // ---- Sub-components ----

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={cn('nav-item', isActive(item.path) && 'active')}
      >
        <Icon className="nav-item-icon" />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  const NavGroupComponent = ({ group }: { group: NavGroup }) => {
    const visibleItems = filterGroupItems(group, hasPermission, currentRole);
    if (visibleItems.length === 0) return null;

    const Icon = group.icon;
    const isExpanded = expandedGroups.includes(group.label);
    const hasActiveChild = isGroupActive(group);

    // If only one visible item, render as a direct link
    if (visibleItems.length === 1) {
      const item = visibleItems[0];
      return (
        <Link
          to={item.path}
          onClick={() => setSidebarOpen(false)}
          className={cn('nav-item', isActive(item.path) && 'active')}
        >
          <Icon className="nav-item-icon" />
          <span className="font-medium">{group.label}</span>
        </Link>
      );
    }

    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleGroup(group.label)}
          className={cn(
            'nav-item w-full justify-between',
            hasActiveChild && 'text-emerald-400',
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="nav-item-icon" />
            <span className="font-medium">{group.label}</span>
          </div>
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isExpanded && 'rotate-90',
            )}
          />
        </button>

        {isExpanded && (
          <div className="ml-4 space-y-1 border-l border-white/15 pl-4">
            {visibleItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive(item.path)
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-white/40 hover:bg-white/10 hover:text-white/80',
                  )}
                >
                  <ItemIcon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const SidebarNav = () => (
    <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
      {PLATFORM_MENU.map((entry) => {
        if (isNavGroup(entry)) {
          return <NavGroupComponent key={entry.label} group={entry} />;
        }
        // Single item
        if (!canSeeItem(entry, hasPermission, currentRole)) return null;
        return <NavLink key={entry.path} item={entry} />;
      })}
    </nav>
  );

  const UserProfile = ({ compact }: { compact?: boolean }) => (
    <div className="border-t border-white/10 p-4">
      {compact ? (
        <>
          <div className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full gradient-primary">
              <span className="font-medium text-white">
                {currentUser.username?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {currentUser.username}
              </p>
              <p className="truncate text-xs text-white/40">{currentUser.email}</p>
              {roleBadge && <div className="mt-1">{roleBadge}</div>}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-red-400 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </>
      ) : (
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/10"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full gradient-primary">
              <span className="font-medium text-white">
                {currentUser.username?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-white">
                {currentUser.username}
              </p>
              <p className="truncate text-xs text-white/40">{currentUser.email}</p>
              {roleBadge && <div className="mt-1">{roleBadge}</div>}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-white/40 transition-transform',
                userMenuOpen && 'rotate-180',
              )}
            />
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 animate-slide-up rounded-lg border border-white/15 bg-[#053929] p-2 shadow-lg">
              <Link
                to="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
              >
                <Users className="h-4 w-4" />
                프로필 설정
              </Link>
              <Link
                to="/change-password"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
              >
                <Settings className="h-4 w-4" />
                비밀번호 변경
              </Link>
              <div className="my-2 border-t border-white/15" />
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden md:flex md:w-64 md:flex-col">
        <div className="flex h-full flex-col border-r border-white/10 bg-[#053929]">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-white/10 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <span className="text-lg font-semibold text-white">Park Golf Platform</span>
            </div>
          </div>

          {/* Navigation */}
          <SidebarNav />

          {/* User Profile */}
          <UserProfile />
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-white/10 bg-[#053929] transition-transform duration-300 md:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <span className="text-lg font-semibold text-white">Park Golf Platform</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-white/40 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <SidebarNav />

          <UserProfile compact />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#053929] px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-white/40 hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="font-semibold text-white">Platform</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};
