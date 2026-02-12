import { apiClient } from './client';
import { extractList } from './bffParser';

// ============================================
// 메뉴 타입
// ============================================

export interface MenuChildItem {
  id: number;
  code: string;
  name: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  isWritable: boolean;
}

export interface MenuTreeItem {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  children: MenuChildItem[];
}

// ============================================
// 정적 메뉴 폴백 (DB 메뉴 API 실패 시)
// ============================================

interface StaticMenuDef {
  code: string;
  name: string;
  icon: string;
  sortOrder: number;
  platformOnly?: boolean;
  permissions: string[];
  children: {
    code: string;
    name: string;
    path: string;
    icon: string;
    sortOrder: number;
    platformOnly?: boolean;
    writePermission?: string;
    permissions: string[];
  }[];
}

const ADMIN_STATIC_MENUS: StaticMenuDef[] = [
  {
    code: 'A_DASHBOARD', name: '대시보드', icon: 'LayoutDashboard', sortOrder: 1,
    permissions: ['VIEW', 'ALL'],
    children: [
      { code: 'A_DASHBOARD_HOME', name: '매장 현황', path: '/dashboard', icon: 'BarChart3', sortOrder: 1, permissions: ['VIEW', 'ALL'] },
    ],
  },
  {
    code: 'A_GOLF', name: '골프장', icon: 'Flag', sortOrder: 2,
    permissions: ['COURSES', 'TIMESLOTS', 'ALL'],
    children: [
      { code: 'A_CLUB_MGMT', name: '골프장 관리', path: '/clubs', icon: 'MapPin', sortOrder: 1, writePermission: 'COURSES', permissions: ['COURSES', 'VIEW', 'ALL'] },
      { code: 'A_GAME_MGMT', name: '라운드 관리', path: '/games', icon: 'Clock', sortOrder: 2, writePermission: 'TIMESLOTS', permissions: ['COURSES', 'TIMESLOTS', 'VIEW', 'ALL'] },
    ],
  },
  {
    code: 'A_BOOKING', name: '예약', icon: 'CalendarDays', sortOrder: 3,
    permissions: ['BOOKINGS', 'ALL'],
    children: [
      { code: 'A_BOOKING_LIST', name: '예약 현황', path: '/bookings', icon: 'CalendarCheck', sortOrder: 1, writePermission: 'BOOKINGS', permissions: ['BOOKINGS', 'VIEW', 'ALL'] },
      { code: 'A_BOOKING_CANCEL', name: '환불 관리', path: '/bookings/cancellations', icon: 'ReceiptText', sortOrder: 2, writePermission: 'BOOKINGS', permissions: ['BOOKINGS', 'VIEW', 'ALL'] },
    ],
  },
  {
    code: 'A_MANAGEMENT', name: '관리', icon: 'Users', sortOrder: 4,
    permissions: ['ADMINS', 'USERS', 'ALL'],
    children: [
      { code: 'A_ADMIN_MGMT', name: '직원 관리', path: '/admin-management', icon: 'UserCog', sortOrder: 1, writePermission: 'ADMINS', permissions: ['ADMINS', 'VIEW', 'ALL'] },
      { code: 'A_USER_MGMT', name: '회원 관리', path: '/user-management', icon: 'UserCheck', sortOrder: 2, writePermission: 'USERS', permissions: ['USERS', 'VIEW', 'ALL'] },
    ],
  },
];

/**
 * DB 메뉴 API 실패 시 정적 메뉴 트리 생성 (admin-dashboard용)
 */
export function getStaticMenuFallback(
  permissions: string[],
): MenuTreeItem[] {
  const hasAll = permissions.includes('ALL');
  const hasPerm = (required: string[]) =>
    hasAll || required.some((p) => permissions.includes(p));
  const isWritable = (wp?: string) => hasAll || (!!wp && permissions.includes(wp));

  const result: MenuTreeItem[] = [];
  let idCounter = 1000;

  for (const group of ADMIN_STATIC_MENUS) {
    if (!hasPerm(group.permissions)) continue;

    const filteredChildren: MenuChildItem[] = [];
    for (const child of group.children) {
      if (!hasPerm(child.permissions)) continue;
      filteredChildren.push({
        id: idCounter++,
        code: child.code,
        name: child.name,
        path: child.path,
        icon: child.icon,
        sortOrder: child.sortOrder,
        isWritable: isWritable(child.writePermission),
      });
    }

    if (filteredChildren.length > 0) {
      result.push({
        id: idCounter++,
        code: group.code,
        name: group.name,
        icon: group.icon,
        sortOrder: group.sortOrder,
        children: filteredChildren,
      });
    }
  }

  return result;
}

// ============================================
// API 호출
// ============================================

export const menuApi = {
  /**
   * 관리자 권한 기반 메뉴 트리 조회
   */
  getMenusByAdmin: async (
    permissions: string[],
    companyType: string,
    scope?: string,
  ): Promise<MenuTreeItem[]> => {
    const response = await apiClient.get<unknown>('/admin/menus', {
      permissions: permissions.join(','),
      companyType,
      scope,
    });
    return extractList<MenuTreeItem>(response.data);
  },
};
