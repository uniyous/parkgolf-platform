import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// 단순화된 역할/권한 구조 (v2)
// ============================================

// 관리자 역할별 권한 매핑
const ADMIN_ROLE_PERMISSIONS: Record<string, string[]> = {
  // 전체 시스템 관리자
  ADMIN: ['ALL'],

  // 고객지원/분석 담당
  SUPPORT: ['BOOKINGS', 'USERS', 'ANALYTICS', 'SUPPORT', 'VIEW'],

  // 회사/코스 운영 관리자
  MANAGER: ['COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ADMINS', 'ANALYTICS', 'VIEW'],

  // 현장 운영 직원
  STAFF: ['TIMESLOTS', 'BOOKINGS', 'SUPPORT', 'VIEW'],

  // 조회 전용
  VIEWER: ['VIEW'],
};

// 사용자 역할별 권한 매핑
const USER_ROLE_PERMISSIONS: Record<string, string[]> = {
  PREMIUM: [
    'PROFILE_VIEW', 'PROFILE_EDIT', 'COURSE_SEARCH', 'COURSE_VIEW', 'TIMESLOT_VIEW',
    'BOOKING_CREATE', 'BOOKING_VIEW', 'BOOKING_MODIFY', 'BOOKING_CANCEL', 'BOOKING_HISTORY',
    'PAYMENT_VIEW', 'PAYMENT_HISTORY', 'REFUND_REQUEST',
    'PREMIUM_BOOKING', 'PRIORITY_BOOKING', 'ADVANCED_SEARCH',
  ],
  USER: [
    'PROFILE_VIEW', 'PROFILE_EDIT', 'COURSE_SEARCH', 'COURSE_VIEW', 'TIMESLOT_VIEW',
    'BOOKING_CREATE', 'BOOKING_VIEW', 'BOOKING_MODIFY', 'BOOKING_CANCEL', 'BOOKING_HISTORY',
    'PAYMENT_VIEW', 'PAYMENT_HISTORY', 'REFUND_REQUEST',
  ],
  GUEST: [
    'PROFILE_VIEW', 'COURSE_SEARCH', 'COURSE_VIEW', 'TIMESLOT_VIEW',
  ],
};

async function clearAllData() {
  console.log('Clearing all existing data...');

  // 관계 테이블부터 삭제 (외래 키 순서)
  await prisma.adminPermission.deleteMany({});
  await prisma.userPermission.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.adminActivityLog.deleteMany({});
  await prisma.adminRefreshToken.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.roleMaster.deleteMany({});
  await prisma.permissionMaster.deleteMany({});

  console.log('All data cleared.');
}

async function main() {
  console.log('Starting database seeding with simplified structure...');

  // 기존 데이터 삭제
  await clearAllData();

  // 1. 권한 마스터 데이터 생성 (단순화된 10개)
  console.log('Creating simplified permission masters...');
  const permissions = [
    // 관리자 권한 (10개)
    { code: 'ALL', name: '전체 권한', category: 'ADMIN', level: 'high', description: '모든 기능 접근 가능' },
    { code: 'COMPANIES', name: '회사 관리', category: 'ADMIN', level: 'high', description: '회사 생성/수정/삭제' },
    { code: 'COURSES', name: '코스 관리', category: 'ADMIN', level: 'medium', description: '코스 생성/수정/삭제' },
    { code: 'TIMESLOTS', name: '타임슬롯 관리', category: 'ADMIN', level: 'medium', description: '타임슬롯 생성/수정/삭제' },
    { code: 'BOOKINGS', name: '예약 관리', category: 'ADMIN', level: 'medium', description: '예약 생성/수정/취소' },
    { code: 'USERS', name: '사용자 관리', category: 'ADMIN', level: 'medium', description: '사용자 계정 관리' },
    { code: 'ADMINS', name: '관리자 관리', category: 'ADMIN', level: 'high', description: '관리자 계정 관리' },
    { code: 'ANALYTICS', name: '분석/리포트', category: 'ADMIN', level: 'low', description: '통계 및 리포트 조회' },
    { code: 'SUPPORT', name: '고객 지원', category: 'ADMIN', level: 'low', description: '고객 응대 및 지원' },
    { code: 'VIEW', name: '조회', category: 'ADMIN', level: 'low', description: '데이터 조회만 가능' },

    // 사용자 권한 (기존 유지)
    { code: 'PROFILE_VIEW', name: '프로필 조회', category: 'USER', level: 'low', description: '내 프로필 조회' },
    { code: 'PROFILE_EDIT', name: '프로필 수정', category: 'USER', level: 'low', description: '내 프로필 수정' },
    { code: 'COURSE_SEARCH', name: '코스 검색', category: 'USER', level: 'low', description: '골프장 검색' },
    { code: 'COURSE_VIEW', name: '코스 조회', category: 'USER', level: 'low', description: '골프장 정보 조회' },
    { code: 'TIMESLOT_VIEW', name: '타임슬롯 조회', category: 'USER', level: 'low', description: '타임슬롯 조회' },
    { code: 'BOOKING_CREATE', name: '예약 생성', category: 'USER', level: 'low', description: '예약 생성' },
    { code: 'BOOKING_VIEW', name: '예약 조회', category: 'USER', level: 'low', description: '내 예약 조회' },
    { code: 'BOOKING_MODIFY', name: '예약 수정', category: 'USER', level: 'low', description: '예약 수정' },
    { code: 'BOOKING_CANCEL', name: '예약 취소', category: 'USER', level: 'low', description: '예약 취소' },
    { code: 'BOOKING_HISTORY', name: '예약 이력', category: 'USER', level: 'low', description: '예약 이력 조회' },
    { code: 'PAYMENT_VIEW', name: '결제 조회', category: 'USER', level: 'low', description: '결제 정보 조회' },
    { code: 'PAYMENT_HISTORY', name: '결제 이력', category: 'USER', level: 'low', description: '결제 이력 조회' },
    { code: 'REFUND_REQUEST', name: '환불 요청', category: 'USER', level: 'low', description: '환불 요청' },
    { code: 'PREMIUM_BOOKING', name: '프리미엄 예약', category: 'USER', level: 'medium', description: '프리미엄 타임슬롯 예약' },
    { code: 'PRIORITY_BOOKING', name: '우선 예약', category: 'USER', level: 'medium', description: '우선 예약권' },
    { code: 'ADVANCED_SEARCH', name: '고급 검색', category: 'USER', level: 'medium', description: '고급 검색 필터' },
  ];

  for (const permission of permissions) {
    await prisma.permissionMaster.create({ data: permission });
  }
  console.log(`Created ${permissions.length} permissions`);

  // 2. 역할 마스터 데이터 생성 (단순화된 5+3개)
  console.log('Creating simplified role masters...');
  const roles = [
    // 관리자 역할 (5개로 단순화)
    { code: 'ADMIN', name: '시스템 관리자', userType: 'ADMIN', level: 100, description: '전체 시스템 관리 권한' },
    { code: 'SUPPORT', name: '고객지원', userType: 'ADMIN', level: 80, description: '고객지원 및 분석 담당' },
    { code: 'MANAGER', name: '운영 관리자', userType: 'ADMIN', level: 60, description: '회사/코스 운영 관리' },
    { code: 'STAFF', name: '현장 직원', userType: 'ADMIN', level: 40, description: '현장 운영 담당' },
    { code: 'VIEWER', name: '조회 전용', userType: 'ADMIN', level: 20, description: '데이터 조회만 가능' },

    // 사용자 역할 (3개로 단순화)
    { code: 'PREMIUM', name: '프리미엄 회원', userType: 'USER', level: 30, description: '프리미엄 기능 이용 가능' },
    { code: 'USER', name: '일반 회원', userType: 'USER', level: 20, description: '일반 사용자' },
    { code: 'GUEST', name: '게스트', userType: 'USER', level: 10, description: '조회만 가능한 게스트' },
  ];

  for (const role of roles) {
    await prisma.roleMaster.create({ data: role });
  }
  console.log(`Created ${roles.length} roles`);

  // 3. 역할-권한 매핑 생성
  console.log('Creating role-permission mappings...');
  const allRolePermissions = { ...ADMIN_ROLE_PERMISSIONS, ...USER_ROLE_PERMISSIONS };

  let mappingCount = 0;
  for (const [roleCode, perms] of Object.entries(allRolePermissions)) {
    for (const permissionCode of perms) {
      await prisma.rolePermission.create({
        data: { roleCode, permissionCode },
      });
      mappingCount++;
    }
  }
  console.log(`Created ${mappingCount} role-permission mappings`);

  // 4. 테스트 관리자 생성
  console.log('Creating test administrators...');
  const testAdmins = [
    // 시스템 관리자
    {
      email: 'admin@parkgolf.com',
      password: 'admin123!@#',
      name: '시스템관리자',
      roleCode: 'ADMIN',
      phone: '010-1111-1111',
      department: '플랫폼 운영팀',
      description: '전체 시스템 관리',
    },

    // 고객지원 담당
    {
      email: 'support@parkgolf.com',
      password: 'admin123!@#',
      name: '고객지원담당',
      roleCode: 'SUPPORT',
      phone: '010-1111-2222',
      department: '고객지원팀',
      description: '고객 문의 및 분석 담당',
    },

    // 운영 관리자 (강남 파크골프장)
    {
      email: 'manager@gangnam-golf.com',
      password: 'admin123!@#',
      name: '강남매니저',
      roleCode: 'MANAGER',
      phone: '010-2222-1111',
      department: '강남 파크골프장',
      description: '강남 파크골프장 운영 관리',
    },

    // 현장 직원 (강남)
    {
      email: 'staff@gangnam-golf.com',
      password: 'admin123!@#',
      name: '강남직원',
      roleCode: 'STAFF',
      phone: '010-2222-2222',
      department: '강남 파크골프장',
      description: '현장 예약 및 고객 응대',
    },

    // 운영 관리자 (부산 파크골프장)
    {
      email: 'manager@busan-golf.com',
      password: 'admin123!@#',
      name: '부산매니저',
      roleCode: 'MANAGER',
      phone: '010-3333-1111',
      department: '부산 파크골프장',
      description: '부산 파크골프장 운영 관리',
    },

    // 조회 전용
    {
      email: 'viewer@parkgolf.com',
      password: 'admin123!@#',
      name: '조회담당',
      roleCode: 'VIEWER',
      phone: '010-4444-1111',
      department: '데이터팀',
      description: '데이터 조회 전담',
    },
  ];

  for (const adminData of testAdmins) {
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    const admin = await prisma.admin.create({
      data: {
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        roleCode: adminData.roleCode,
        phone: adminData.phone,
        department: adminData.department,
        description: adminData.description,
        isActive: true,
      },
    });
    console.log(`Created admin: ${admin.email} (${admin.name} - ${admin.roleCode})`);

    // 역할에 해당하는 권한 할당
    const rolePerms = ADMIN_ROLE_PERMISSIONS[adminData.roleCode] || [];
    for (const permissionCode of rolePerms) {
      await prisma.adminPermission.create({
        data: {
          adminId: admin.id,
          permission: permissionCode,
        },
      });
    }
    console.log(`  Assigned ${rolePerms.length} permissions: [${rolePerms.join(', ')}]`);
  }

  // 5. 테스트 사용자 생성
  console.log('Creating test users...');
  const testUsers = [
    { email: 'premium@test.com', password: 'user123!@#', name: '프리미엄회원', roleCode: 'PREMIUM' },
    { email: 'user1@test.com', password: 'user123!@#', name: '일반회원1', roleCode: 'USER' },
    { email: 'user2@test.com', password: 'user123!@#', name: '일반회원2', roleCode: 'USER' },
    { email: 'guest@test.com', password: 'user123!@#', name: '게스트', roleCode: 'GUEST' },
  ];

  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        roleCode: userData.roleCode,
        isActive: true,
      },
    });
    console.log(`Created user: ${user.email} (${user.name} - ${user.roleCode})`);

    // 역할에 해당하는 권한 할당
    const rolePerms = USER_ROLE_PERMISSIONS[userData.roleCode] || [];
    for (const permissionCode of rolePerms) {
      await prisma.userPermission.create({
        data: {
          userId: user.id,
          permission: permissionCode,
        },
      });
    }
  }

  console.log('\n========================================');
  console.log('Database seeding completed successfully!');
  console.log('========================================');
  console.log('\nTest Admin Accounts:');
  console.log('  - admin@parkgolf.com / admin123!@# (ADMIN)');
  console.log('  - support@parkgolf.com / admin123!@# (SUPPORT)');
  console.log('  - manager@gangnam-golf.com / admin123!@# (MANAGER)');
  console.log('  - staff@gangnam-golf.com / admin123!@# (STAFF)');
  console.log('  - manager@busan-golf.com / admin123!@# (MANAGER)');
  console.log('  - viewer@parkgolf.com / admin123!@# (VIEWER)');
  console.log('\nTest User Accounts:');
  console.log('  - premium@test.com / user123!@# (PREMIUM)');
  console.log('  - user1@test.com / user123!@# (USER)');
  console.log('  - guest@test.com / user123!@# (GUEST)');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
