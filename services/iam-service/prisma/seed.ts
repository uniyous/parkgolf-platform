import { PrismaClient, CompanyStatus, CompanyType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// IAM Service 시드 데이터 (v7)
// - CompanyType 기반 역할 관리
// - 본사/협회/가맹점 구조
// - DB 기반 동적 메뉴 시스템
// ============================================

// 역할-권한 매핑
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // 플랫폼 역할 (본사, 협회)
  PLATFORM_ADMIN: ['ALL'],
  PLATFORM_SUPPORT: ['BOOKINGS', 'USERS', 'ANALYTICS', 'SUPPORT', 'VIEW'],
  PLATFORM_VIEWER: ['VIEW'],

  // 회사 역할 (가맹점)
  COMPANY_ADMIN: ['COMPANIES', 'COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ADMINS', 'ANALYTICS', 'VIEW'],
  COMPANY_MANAGER: ['COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ANALYTICS', 'VIEW'],
  COMPANY_STAFF: ['TIMESLOTS', 'BOOKINGS', 'SUPPORT', 'VIEW'],
  COMPANY_VIEWER: ['VIEW'],

  // 사용자 역할
  PREMIUM: ['PROFILE', 'COURSE_VIEW', 'BOOKING_VIEW', 'BOOKING_MANAGE', 'PAYMENT', 'PREMIUM_BOOKING', 'PRIORITY_BOOKING', 'ADVANCED_SEARCH'],
  USER: ['PROFILE', 'COURSE_VIEW', 'BOOKING_VIEW', 'BOOKING_MANAGE', 'PAYMENT'],
  GUEST: ['COURSE_VIEW'],
};

// 회사 유형별 부여 가능 역할
const ALLOWED_ROLES_BY_COMPANY_TYPE: Record<string, string[]> = {
  PLATFORM: ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_VIEWER'],
  ASSOCIATION: ['PLATFORM_SUPPORT', 'PLATFORM_VIEWER'],
  FRANCHISE: ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_STAFF', 'COMPANY_VIEWER'],
};

async function clearAllData() {
  console.log('Clearing all existing data...');
  await prisma.menuCompanyType.deleteMany({});
  await prisma.menuPermission.deleteMany({});
  await prisma.menuMaster.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.adminActivityLog.deleteMany({});
  await prisma.adminRefreshToken.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.adminCompany.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.roleMaster.deleteMany({});
  await prisma.permissionMaster.deleteMany({});
  console.log('  All data cleared.');
}

// ============================================
// 메뉴 시드 데이터
// ============================================
interface MenuSeedItem {
  code: string;
  name: string;
  path?: string;
  icon?: string;
  sortOrder: number;
  platformOnly?: boolean;
  writePermission?: string;
  permissions: string[];          // 접근에 필요한 권한 (OR)
  companyTypes: CompanyType[];    // 표시 대상 회사 유형
  children?: MenuSeedItem[];
}

// Platform Dashboard 메뉴
const PLATFORM_MENUS: MenuSeedItem[] = [
  {
    code: 'P_DASHBOARD',
    name: '대시보드',
    icon: 'LayoutDashboard',
    sortOrder: 1,
    platformOnly: true,
    permissions: ['VIEW', 'ALL'],
    companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
    children: [
      {
        code: 'P_DASHBOARD_HOME',
        name: '플랫폼 현황',
        path: '/dashboard',
        icon: 'BarChart3',
        sortOrder: 1,
        platformOnly: true,
        permissions: ['VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
      },
    ],
  },
  {
    code: 'P_COMPANIES',
    name: '가맹점 관리',
    icon: 'Building2',
    sortOrder: 2,
    platformOnly: true,
    permissions: ['COMPANIES', 'ALL'],
    companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
    children: [
      {
        code: 'P_COMPANY_MGMT',
        name: '가맹점 관리',
        path: '/companies',
        icon: 'Building',
        sortOrder: 1,
        platformOnly: true,
        writePermission: 'COMPANIES',
        permissions: ['COMPANIES', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
      },
    ],
  },
  {
    code: 'P_ANALYTICS',
    name: '현황 분석',
    icon: 'BarChart3',
    sortOrder: 3,
    platformOnly: true,
    permissions: ['ANALYTICS', 'VIEW', 'ALL'],
    companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
    children: [
      {
        code: 'P_ANALYTICS_BOOKINGS',
        name: '예약 현황',
        path: '/analytics/bookings',
        icon: 'CalendarCheck',
        sortOrder: 1,
        platformOnly: true,
        permissions: ['ANALYTICS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
      },
      {
        code: 'P_ANALYTICS_CLUBS',
        name: '골프장 현황',
        path: '/analytics/clubs',
        icon: 'MapPin',
        sortOrder: 2,
        platformOnly: true,
        permissions: ['ANALYTICS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
      },
      {
        code: 'P_ANALYTICS_REVENUE',
        name: '매출 현황',
        path: '/analytics/revenue',
        icon: 'DollarSign',
        sortOrder: 3,
        platformOnly: true,
        writePermission: 'ANALYTICS',
        permissions: ['ANALYTICS', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
      },
    ],
  },
  {
    code: 'P_OPERATIONS',
    name: '운영 관리',
    icon: 'Settings',
    sortOrder: 4,
    platformOnly: true,
    permissions: ['ADMINS', 'USERS', 'ALL'],
    companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
    children: [
      {
        code: 'P_POLICIES',
        name: '정책 관리',
        path: '/policies',
        icon: 'ClipboardList',
        sortOrder: 1,
        platformOnly: true,
        writePermission: 'ALL',
        permissions: ['ALL'],
        companyTypes: [CompanyType.PLATFORM],
      },
      {
        code: 'P_USER_MGMT',
        name: '회원 관리',
        path: '/members',
        icon: 'Users',
        sortOrder: 2,
        platformOnly: true,
        writePermission: 'USERS',
        permissions: ['USERS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
      },
      {
        code: 'P_ADMIN_MGMT',
        name: '관리자 관리',
        path: '/admins',
        icon: 'UserCog',
        sortOrder: 3,
        platformOnly: true,
        writePermission: 'ADMINS',
        permissions: ['ADMINS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION],
      },
      {
        code: 'P_ROLES',
        name: '역할 및 권한',
        path: '/roles',
        icon: 'Shield',
        sortOrder: 4,
        platformOnly: true,
        writePermission: 'ALL',
        permissions: ['ALL'],
        companyTypes: [CompanyType.PLATFORM],
      },
      {
        code: 'P_NOTIFICATIONS',
        name: '알림 설정',
        path: '/notifications',
        icon: 'Bell',
        sortOrder: 5,
        platformOnly: true,
        writePermission: 'ALL',
        permissions: ['ALL'],
        companyTypes: [CompanyType.PLATFORM],
      },
    ],
  },
];

// Admin Dashboard 메뉴
const ADMIN_MENUS: MenuSeedItem[] = [
  {
    code: 'A_DASHBOARD',
    name: '대시보드',
    icon: 'LayoutDashboard',
    sortOrder: 1,
    permissions: ['VIEW', 'ALL'],
    companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
    children: [
      {
        code: 'A_DASHBOARD_HOME',
        name: '매장 현황',
        path: '/dashboard',
        icon: 'BarChart3',
        sortOrder: 1,
        permissions: ['VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
      },
    ],
  },
  {
    code: 'A_GOLF',
    name: '골프장',
    icon: 'Flag',
    sortOrder: 2,
    permissions: ['COURSES', 'TIMESLOTS', 'ALL'],
    companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
    children: [
      {
        code: 'A_CLUB_MGMT',
        name: '골프장 관리',
        path: '/clubs',
        icon: 'MapPin',
        sortOrder: 1,
        writePermission: 'COURSES',
        permissions: ['COURSES', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
      },
      {
        code: 'A_GAME_MGMT',
        name: '라운드 관리',
        path: '/games',
        icon: 'Clock',
        sortOrder: 2,
        writePermission: 'TIMESLOTS',
        permissions: ['COURSES', 'TIMESLOTS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
      },
    ],
  },
  {
    code: 'A_BOOKING',
    name: '예약',
    icon: 'CalendarDays',
    sortOrder: 3,
    permissions: ['BOOKINGS', 'ALL'],
    companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
    children: [
      {
        code: 'A_BOOKING_LIST',
        name: '예약 현황',
        path: '/bookings',
        icon: 'CalendarCheck',
        sortOrder: 1,
        writePermission: 'BOOKINGS',
        permissions: ['BOOKINGS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
      },
      {
        code: 'A_BOOKING_CANCEL',
        name: '환불 관리',
        path: '/bookings/cancellations',
        icon: 'ReceiptText',
        sortOrder: 2,
        writePermission: 'BOOKINGS',
        permissions: ['BOOKINGS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
      },
    ],
  },
  {
    code: 'A_MANAGEMENT',
    name: '관리',
    icon: 'Users',
    sortOrder: 4,
    permissions: ['ADMINS', 'USERS', 'ALL'],
    companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
    children: [
      {
        code: 'A_ADMIN_MGMT',
        name: '직원 관리',
        path: '/admin-management',
        icon: 'UserCog',
        sortOrder: 1,
        writePermission: 'ADMINS',
        permissions: ['ADMINS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
      },
      {
        code: 'A_USER_MGMT',
        name: '회원 관리',
        path: '/user-management',
        icon: 'UserCheck',
        sortOrder: 2,
        writePermission: 'USERS',
        permissions: ['USERS', 'VIEW', 'ALL'],
        companyTypes: [CompanyType.PLATFORM, CompanyType.ASSOCIATION, CompanyType.FRANCHISE],
      },
    ],
  },
];

async function seedMenus() {
  console.log('[7/7] Creating menu masters...');

  const allMenus = [...PLATFORM_MENUS, ...ADMIN_MENUS];
  let menuCount = 0;

  for (const group of allMenus) {
    // Level 1 그룹 생성
    const parentMenu = await prisma.menuMaster.create({
      data: {
        code: group.code,
        name: group.name,
        icon: group.icon,
        sortOrder: group.sortOrder,
        platformOnly: group.platformOnly ?? false,
        writePermission: group.writePermission,
        isActive: true,
      },
    });
    menuCount++;

    // 그룹 권한 매핑
    for (const perm of group.permissions) {
      await prisma.menuPermission.create({
        data: { menuId: parentMenu.id, permissionCode: perm },
      });
    }

    // 그룹 회사유형 매핑
    for (const ct of group.companyTypes) {
      await prisma.menuCompanyType.create({
        data: { menuId: parentMenu.id, companyType: ct },
      });
    }

    // Level 2 자식 메뉴 생성
    if (group.children) {
      for (const child of group.children) {
        const childMenu = await prisma.menuMaster.create({
          data: {
            code: child.code,
            name: child.name,
            path: child.path,
            icon: child.icon,
            parentId: parentMenu.id,
            sortOrder: child.sortOrder,
            platformOnly: child.platformOnly ?? false,
            writePermission: child.writePermission,
            isActive: true,
          },
        });
        menuCount++;

        // 자식 권한 매핑
        for (const perm of child.permissions) {
          await prisma.menuPermission.create({
            data: { menuId: childMenu.id, permissionCode: perm },
          });
        }

        // 자식 회사유형 매핑
        for (const ct of child.companyTypes) {
          await prisma.menuCompanyType.create({
            data: { menuId: childMenu.id, companyType: ct },
          });
        }
      }
    }
  }

  console.log(`  → ${menuCount} menus (platform + admin dashboard)`);
}

async function main() {
  console.log('========================================');
  console.log('IAM Service Database Seeding (v7)');
  console.log('CompanyType 기반 역할 관리 + 동적 메뉴');
  console.log('========================================\n');

  await clearAllData();

  // 1. 권한 마스터
  console.log('[1/7] Creating permission masters...');
  const permissions = [
    { code: 'ALL', name: '전체 권한', category: 'ADMIN', level: 'high', description: '모든 기능 접근' },
    { code: 'COMPANIES', name: '회사 관리', category: 'ADMIN', level: 'high', description: '회사 CRUD' },
    { code: 'COURSES', name: '코스 관리', category: 'ADMIN', level: 'medium', description: '코스 CRUD' },
    { code: 'TIMESLOTS', name: '타임슬롯 관리', category: 'ADMIN', level: 'medium', description: '타임슬롯 CRUD' },
    { code: 'BOOKINGS', name: '예약 관리', category: 'ADMIN', level: 'medium', description: '예약 CRUD' },
    { code: 'USERS', name: '사용자 관리', category: 'ADMIN', level: 'medium', description: '사용자 관리' },
    { code: 'ADMINS', name: '관리자 관리', category: 'ADMIN', level: 'high', description: '관리자 관리' },
    { code: 'ANALYTICS', name: '분석/리포트', category: 'ADMIN', level: 'low', description: '통계 조회' },
    { code: 'SUPPORT', name: '고객 지원', category: 'ADMIN', level: 'low', description: '고객 응대' },
    { code: 'VIEW', name: '조회', category: 'ADMIN', level: 'low', description: '데이터 조회' },
    { code: 'PROFILE', name: '프로필 관리', category: 'USER', level: 'low', description: '프로필 수정' },
    { code: 'COURSE_VIEW', name: '코스 조회', category: 'USER', level: 'low', description: '코스 조회' },
    { code: 'BOOKING_VIEW', name: '예약 조회', category: 'USER', level: 'low', description: '예약 조회' },
    { code: 'BOOKING_MANAGE', name: '예약 관리', category: 'USER', level: 'low', description: '예약 생성/취소' },
    { code: 'PAYMENT', name: '결제/환불', category: 'USER', level: 'low', description: '결제 처리' },
    { code: 'PREMIUM_BOOKING', name: '프리미엄 예약', category: 'USER', level: 'medium', description: '프리미엄 예약' },
    { code: 'PRIORITY_BOOKING', name: '우선 예약', category: 'USER', level: 'medium', description: '우선 예약' },
    { code: 'ADVANCED_SEARCH', name: '고급 검색', category: 'USER', level: 'medium', description: '고급 검색' },
  ];
  for (const p of permissions) {
    await prisma.permissionMaster.create({ data: p });
  }
  console.log(`  → ${permissions.length} permissions`);

  // 2. 역할 마스터
  console.log('[2/7] Creating role masters...');
  const roles = [
    // 플랫폼 역할 (본사, 협회용)
    { code: 'PLATFORM_ADMIN', name: '플랫폼 관리자', userType: 'ADMIN', scope: 'PLATFORM', level: 100, description: '본사 최고 관리자' },
    { code: 'PLATFORM_SUPPORT', name: '플랫폼 고객지원', userType: 'ADMIN', scope: 'PLATFORM', level: 80, description: '전체 고객지원/조회' },
    { code: 'PLATFORM_VIEWER', name: '플랫폼 조회', userType: 'ADMIN', scope: 'PLATFORM', level: 20, description: '전체 데이터 조회' },
    // 회사 역할 (가맹점용)
    { code: 'COMPANY_ADMIN', name: '회사 관리자', userType: 'ADMIN', scope: 'COMPANY', level: 90, description: '회사 대표/총괄' },
    { code: 'COMPANY_MANAGER', name: '회사 매니저', userType: 'ADMIN', scope: 'COMPANY', level: 60, description: '운영 매니저' },
    { code: 'COMPANY_STAFF', name: '회사 직원', userType: 'ADMIN', scope: 'COMPANY', level: 40, description: '현장 직원' },
    { code: 'COMPANY_VIEWER', name: '회사 조회', userType: 'ADMIN', scope: 'COMPANY', level: 20, description: '회사 데이터 조회' },
    // 사용자 역할
    { code: 'PREMIUM', name: '프리미엄 회원', userType: 'USER', scope: 'PLATFORM', level: 30, description: '프리미엄 회원' },
    { code: 'USER', name: '일반 회원', userType: 'USER', scope: 'PLATFORM', level: 20, description: '일반 회원' },
    { code: 'GUEST', name: '게스트', userType: 'USER', scope: 'PLATFORM', level: 10, description: '게스트' },
  ];
  for (const r of roles) {
    await prisma.roleMaster.create({ data: r });
  }
  console.log(`  → ${roles.length} roles`);

  // 3. 역할-권한 매핑
  console.log('[3/7] Creating role-permission mappings...');
  let mappingCount = 0;
  for (const [roleCode, perms] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permissionCode of perms) {
      await prisma.rolePermission.create({ data: { roleCode, permissionCode } });
      mappingCount++;
    }
  }
  console.log(`  → ${mappingCount} mappings`);

  // 4. 회사 생성 (본사, 가맹점)
  console.log('[4/7] Creating companies...');
  const hashedPassword = await bcrypt.hash('admin123!@#', 10);

  // 4-1. 본사 (PLATFORM)
  const platformCompany = await prisma.company.create({
    data: {
      name: '파크골프 플랫폼',
      code: 'PLATFORM-HQ',
      description: '파크골프 플랫폼 본사',
      companyType: CompanyType.PLATFORM,
      address: '서울시 강남구 테헤란로 123',
      phoneNumber: '02-1234-5678',
      email: 'platform@parkgolf.com',
      status: CompanyStatus.ACTIVE,
    },
  });
  console.log(`  → [본사] ${platformCompany.name} (${platformCompany.code})`);

  // 4-2. 가맹점 (FRANCHISE)
  const franchiseCompany = await prisma.company.create({
    data: {
      name: '강남 파크골프장',
      code: 'GANGNAM-GC',
      description: '강남 지역 파크골프장',
      companyType: CompanyType.FRANCHISE,
      businessNumber: '123-45-67890',
      address: '서울시 강남구 역삼동 456',
      phoneNumber: '02-2222-3333',
      email: 'gangnam@parkgolf.com',
      status: CompanyStatus.ACTIVE,
    },
  });
  console.log(`  → [가맹점] ${franchiseCompany.name} (${franchiseCompany.code})`);

  // 5. 관리자 생성 및 회사 연결
  console.log('[5/7] Creating admins with company assignments...');

  // 5-1. 본사 플랫폼 관리자
  const platformAdmin = await prisma.admin.create({
    data: {
      email: 'admin@parkgolf.com',
      password: hashedPassword,
      name: '플랫폼관리자',
      department: '본사',
      isActive: true,
    },
  });
  await prisma.adminCompany.create({
    data: {
      adminId: platformAdmin.id,
      companyId: platformCompany.id,
      companyRoleCode: 'PLATFORM_ADMIN',
      isPrimary: true,
    },
  });
  console.log(`  → ${platformAdmin.email} @ ${platformCompany.code} (PLATFORM_ADMIN)`);

  // 5-2. 가맹점 관리자
  const companyAdmin = await prisma.admin.create({
    data: {
      email: 'admin@gangnam.com',
      password: hashedPassword,
      name: '강남대표',
      department: '강남 파크골프장',
      isActive: true,
    },
  });
  await prisma.adminCompany.create({
    data: {
      adminId: companyAdmin.id,
      companyId: franchiseCompany.id,
      companyRoleCode: 'COMPANY_ADMIN',
      isPrimary: true,
    },
  });
  console.log(`  → ${companyAdmin.email} @ ${franchiseCompany.code} (COMPANY_ADMIN)`);

  // 5-3. 가맹점 매니저
  const companyManager = await prisma.admin.create({
    data: {
      email: 'manager@gangnam.com',
      password: hashedPassword,
      name: '강남매니저',
      department: '강남 파크골프장',
      isActive: true,
    },
  });
  await prisma.adminCompany.create({
    data: {
      adminId: companyManager.id,
      companyId: franchiseCompany.id,
      companyRoleCode: 'COMPANY_MANAGER',
      isPrimary: true,
    },
  });
  console.log(`  → ${companyManager.email} @ ${franchiseCompany.code} (COMPANY_MANAGER)`);

  // 5-4. 가맹점 직원
  const companyStaff = await prisma.admin.create({
    data: {
      email: 'staff@gangnam.com',
      password: hashedPassword,
      name: '강남직원',
      department: '강남 파크골프장',
      isActive: true,
    },
  });
  await prisma.adminCompany.create({
    data: {
      adminId: companyStaff.id,
      companyId: franchiseCompany.id,
      companyRoleCode: 'COMPANY_STAFF',
      isPrimary: true,
    },
  });
  console.log(`  → ${companyStaff.email} @ ${franchiseCompany.code} (COMPANY_STAFF)`);

  // 6. 테스트 사용자 (E2E 테스트용)
  console.log('[6/7] Creating test users...');
  const e2ePassword = await bcrypt.hash('test1234', 10);
  const e2eUsers = [
    { email: 'test@parkgolf.com', name: '테스트', phone: '01011112222', roleCode: 'USER' },
    { email: 'cheolsu@parkgolf.com', name: '김철수', phone: '01033334444', roleCode: 'USER' },
    { email: 'younghee@parkgolf.com', name: '박영희', phone: '01055556666', roleCode: 'USER' },
    { email: 'minsu@parkgolf.com', name: '이민수', phone: '01077778888', roleCode: 'USER' },
    { email: 'minsoo@parkgolf.com', name: '김민수', phone: '01099990001', roleCode: 'USER' },
    { email: 'jieun@parkgolf.com', name: '이지은', phone: '01099990002', roleCode: 'USER' },
    { email: 'junhyuk@parkgolf.com', name: '박준혁', phone: '01099990003', roleCode: 'USER' },
    { email: 'seoyeon@parkgolf.com', name: '최서연', phone: '01099990004', roleCode: 'USER' },
  ];
  for (const e2eUser of e2eUsers) {
    const created = await prisma.user.create({
      data: {
        email: e2eUser.email,
        password: e2ePassword,
        name: e2eUser.name,
        phone: e2eUser.phone,
        roleCode: e2eUser.roleCode,
        isActive: true,
      },
    });
    console.log(`  → ${created.email} / ${e2eUser.phone} (${e2eUser.roleCode}) [E2E]`);
  }

  // 7. 메뉴 시드 데이터
  await seedMenus();

  // 결과 요약
  console.log('\n========================================');
  console.log('Seeding completed!');
  console.log('========================================');
  console.log('\n회사 유형별 역할 부여 규칙:');
  console.log('  [PLATFORM 본사]     → PLATFORM_ADMIN, PLATFORM_SUPPORT, PLATFORM_VIEWER');
  console.log('  [ASSOCIATION 협회]  → PLATFORM_SUPPORT, PLATFORM_VIEWER');
  console.log('  [FRANCHISE 가맹점]  → COMPANY_ADMIN, COMPANY_MANAGER, COMPANY_STAFF, COMPANY_VIEWER');
  console.log('\n테스트 계정:');
  console.log('  [본사 관리자]');
  console.log(`  - ${platformAdmin.email} / admin123!@# (PLATFORM_ADMIN)`);
  console.log('  [가맹점]');
  console.log(`  - ${companyAdmin.email} / admin123!@# (COMPANY_ADMIN)`);
  console.log(`  - ${companyManager.email} / admin123!@# (COMPANY_MANAGER)`);
  console.log(`  - ${companyStaff.email} / admin123!@# (COMPANY_STAFF)`);
  console.log('  [일반 사용자 - E2E 테스트용]');
  console.log('  - test@parkgolf.com / test1234 / 01011112222');
  console.log('  - cheolsu@parkgolf.com / test1234 / 01033334444');
  console.log('  - younghee@parkgolf.com / test1234 / 01055556666');
  console.log('  - minsu@parkgolf.com / test1234 / 01077778888');
  console.log('  - minsoo@parkgolf.com / test1234 / 01099990001');
  console.log('  - jieun@parkgolf.com / test1234 / 01099990002');
  console.log('  - junhyuk@parkgolf.com / test1234 / 01099990003');
  console.log('  - seoyeon@parkgolf.com / test1234 / 01099990004');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
