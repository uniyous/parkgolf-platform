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
        name: '골프장 관리',
        href: '/clubs',
        icon: '🏌️',
        description: '골프장, 코스, 홀 마스터 데이터 관리',
        permission: 'MANAGE_GOLF_CLUBS'
      },
      {
        name: '라운드 관리',
        href: '/games',
        icon: '🎮',
        description: '18홀 라운드 조합 및 가격 설정',
        permission: 'MANAGE_GAMES'
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
        name: '환불 관리',
        href: '/bookings/cancellations',
        icon: '💸',
        description: '예약 취소 및 환불 처리',
        permission: 'MANAGE_PAYMENTS'
      },
      {
        name: '결제 관리',
        href: '/payments',
        icon: '💳',
        description: '결제 현황 및 매출 분석',
        permission: 'MANAGE_PAYMENTS'
      },
    ],
    collapsible: true,
    defaultOpen: true
  },
  {
    name: '알림',
    items: [
      {
        name: '알림 관리',
        href: '/notifications',
        icon: '🔔',
        description: '알림 발송 이력, 템플릿, 통계 관리',
        permission: 'SYSTEM'
      },
    ],
    collapsible: true,
    defaultOpen: true
  },
  {
    name: '시스템',
    items: [
      {
        name: '회사 관리',
        href: '/companies',
        icon: '🏢',
        description: '플랫폼/협회/가맹점 회사 정보 관리 (IAM)',
        permission: 'COMPANIES'
      },
      {
        name: '사용자 관리',
        href: '/user-management',
        icon: '👥',
        description: '앱 사용자 계정 및 멤버십 관리 (IAM)',
        permission: 'USERS'
      },
      {
        name: '관리자 관리',
        href: '/admin-management',
        icon: '👨‍💼',
        description: '관리자 계정 및 회사-역할 할당 관리 (IAM)',
        permission: 'ADMINS'
      },
      {
        name: '역할 및 권한 관리',
        href: '/roles',
        icon: '🔐',
        description: '플랫폼/회사 역할 및 권한 설정 (IAM)',
        permission: 'SYSTEM'
      },
      {
        name: '시스템 설정',
        href: '/system-settings',
        icon: '⚙️',
        description: '예약/알림/시스템 정책 설정',
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
