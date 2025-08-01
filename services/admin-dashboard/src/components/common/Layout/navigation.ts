// Navigation Configuration
export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  badge?: string | number;
  children?: NavigationItem[];
  description?: string;
  shortcut?: string;
  permission?: string;
}

export interface NavigationGroup {
  name: string;
  items: NavigationItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  icon?: string;
}

export const navigationConfig: NavigationGroup[] = [
  {
    name: '대시보드',
    items: [
      { 
        name: '홈 대시보드', 
        href: '/dashboard', 
        icon: '📊',
        description: '전체 현황 및 주요 지표',
        shortcut: 'Ctrl+H',
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
        shortcut: 'Ctrl+C',
        permission: 'MANAGE_COMPANIES'
      },
      { 
        name: '코스 관리', 
        href: '/course-management', 
        icon: '⛳',
        description: '골프 코스 정보 및 설정',
        shortcut: 'Ctrl+G',
        permission: 'MANAGE_COURSES'
      },
      { 
        name: '타임슬롯 관리', 
        href: '/timeslots', 
        icon: '⏰',
        description: '예약 시간 슬롯 관리',
        shortcut: 'Ctrl+T',
        permission: 'MANAGE_TIMESLOTS'
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
        shortcut: 'Ctrl+B',
        permission: 'MANAGE_BOOKINGS'
      },
      { 
        name: '취소/환불', 
        href: '/bookings/cancellations', 
        icon: '🔄',
        description: '예약 취소 및 환불 처리',
        permission: 'MANAGE_PAYMENTS'
      },
      { 
        name: '예약 분석', 
        href: '/bookings/analytics', 
        icon: '📈',
        description: '예약 패턴 및 통계 분석',
        permission: 'VIEW_ANALYTICS'
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
        shortcut: 'Ctrl+U',
        permission: 'MANAGE_USERS'
      },
    ],
    collapsible: false,
    defaultOpen: true
  },
  {
    name: '시스템',
    items: [
      { 
        name: '시스템 설정', 
        href: '/settings', 
        icon: '⚙️',
        description: '시스템 환경 설정',
        permission: 'MANAGE_SYSTEM'
      },
      { 
        name: '관리자 관리', 
        href: '/admin-management', 
        icon: '👨‍💼',
        description: '시스템 관리자 계정 관리',
        permission: 'MANAGE_ADMINS'
      },
      { 
        name: '관리자 역할 데모', 
        href: '/admin-role-demo', 
        icon: '🎭',
        description: '계층적 관리자 시스템 데모',
        permission: 'VIEW_ADMIN_ROLES'
      },
      { 
        name: '권한 관리', 
        href: '/permissions', 
        icon: '🔐',
        description: '사용자 권한 및 역할 관리',
        permission: 'MANAGE_PERMISSIONS'
      },
      { 
        name: '로그 관리', 
        href: '/logs', 
        icon: '📋',
        description: '시스템 로그 조회',
        permission: 'VIEW_LOGS'
      },
      { 
        name: '백업 관리', 
        href: '/backups', 
        icon: '💾',
        description: '데이터 백업 및 복원',
        permission: 'MANAGE_BACKUPS'
      },
    ],
    collapsible: true,
    defaultOpen: false
  },
];

// 빠른 액세스 메뉴
export const quickAccessItems: NavigationItem[] = [
  { name: '새 예약', href: '/bookings/new', icon: '➕' },
  { name: '타임슬롯 추가', href: '/timeslots/new', icon: '⏰' },
  { name: '사용자 추가', href: '/users/new', icon: '👤' },
  { name: '보고서', href: '/reports', icon: '📊' },
];

// 최근 방문 페이지 (localStorage에서 관리)
export const getRecentPages = (): NavigationItem[] => {
  const recent = localStorage.getItem('recentPages');
  return recent ? JSON.parse(recent) : [];
};

export const addRecentPage = (page: NavigationItem): void => {
  const recent = getRecentPages();
  const filtered = recent.filter(item => item.href !== page.href);
  const updated = [page, ...filtered].slice(0, 5); // 최근 5개만 유지
  localStorage.setItem('recentPages', JSON.stringify(updated));
};

// 즐겨찾기 (localStorage에서 관리)
export const getFavorites = (): NavigationItem[] => {
  const favorites = localStorage.getItem('favorites');
  return favorites ? JSON.parse(favorites) : [];
};

export const toggleFavorite = (page: NavigationItem): void => {
  const favorites = getFavorites();
  const exists = favorites.some(item => item.href === page.href);
  
  if (exists) {
    const updated = favorites.filter(item => item.href !== page.href);
    localStorage.setItem('favorites', JSON.stringify(updated));
  } else {
    const updated = [...favorites, page];
    localStorage.setItem('favorites', JSON.stringify(updated));
  }
};

export const isFavorite = (href: string): boolean => {
  const favorites = getFavorites();
  return favorites.some(item => item.href === href);
};