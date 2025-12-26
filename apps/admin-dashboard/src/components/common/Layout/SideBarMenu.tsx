// SideBar Menu Configuration

export interface MenuItem {
  name: string;
  href: string;
  icon: string;
  badge?: string | number;
  children?: MenuItem[];
  description?: string;
  permission?: string;
}

export interface MenuGroup {
  name: string;
  items: MenuItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  icon?: string;
}

export const menuConfig: MenuGroup[] = [
  {
    name: '대시보드',
    items: [
      {
        name: '홈 대시보드',
        href: '/dashboard',
        icon: '📊',
        description: '전체 현황 및 주요 지표',
        permission: 'VIEW_DASHBOARD'
      },
    ],
    defaultOpen: true,
  },
  {
    name: '골프장',
    items: [
      {
        name: '회사 관리',
        href: '/companies',
        icon: '🏢',
        description: '골프장 회사 정보 관리',
        permission: 'COMPANIES'
      },
      {
        name: '골프장 관리',
        href: '/club',
        icon: '🏌️',
        description: '9홀 단위 골프장 및 코스 관리',
        permission: 'MANAGE_GOLF_CLUBS'
      },
    ],
    collapsible: true,
    defaultOpen: true
  },
  {
    name: '예약',
    items: [
      {
        name: '예약 현황',
        href: '/bookings',
        icon: '📅',
        description: '예약 현황 및 관리',
        permission: 'BOOKINGS'
      },
      {
        name: '취소/환불',
        href: '/bookings/cancellations',
        icon: '🔄',
        description: '예약 취소 및 환불 처리',
        permission: 'MANAGE_PAYMENTS'
      },
    ],
    collapsible: true,
    defaultOpen: true
  },
  {
    name: '사용자',
    items: [
      {
        name: '사용자 관리',
        href: '/user-management',
        icon: '👥',
        description: '고객 계정 관리',
        permission: 'USERS'
      },
    ],
    collapsible: false,
    defaultOpen: true
  },
  {
    name: '시스템',
    items: [
      {
        name: '관리자 관리',
        href: '/admin-management',
        icon: '👨‍💼',
        description: '시스템 관리자 계정 관리',
        permission: 'ADMINS'
      },
      {
        name: '역할 및 권한 관리',
        href: '/roles',
        icon: '🔐',
        description: '시스템 역할과 권한 설정',
        permission: 'SYSTEM'
      },
    ],
    collapsible: true,
    defaultOpen: true
  },
];

// 즐겨찾기 (localStorage)
export const getFavorites = (): MenuItem[] => {
  const favorites = localStorage.getItem('favorites');
  return favorites ? JSON.parse(favorites) : [];
};

export const toggleFavorite = (item: MenuItem): void => {
  const favorites = getFavorites();
  const exists = favorites.some(f => f.href === item.href);

  if (exists) {
    localStorage.setItem('favorites', JSON.stringify(favorites.filter(f => f.href !== item.href)));
  } else {
    localStorage.setItem('favorites', JSON.stringify([...favorites, item]));
  }
};

export const isFavorite = (href: string): boolean => {
  return getFavorites().some(item => item.href === href);
};
