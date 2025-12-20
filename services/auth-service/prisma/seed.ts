import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 역할별 권한 매핑 (seed 전용)
const ADMIN_ROLE_PERMISSIONS: Record<string, string[]> = {
  PLATFORM_OWNER: [
    'PLATFORM_ALL', 'PLATFORM_COMPANY_MANAGE', 'PLATFORM_USER_MANAGE', 'PLATFORM_SYSTEM_CONFIG',
    'PLATFORM_ANALYTICS', 'PLATFORM_SUPPORT', 'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE',
    'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE', 'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
    'VIEW_DASHBOARD', 'MANAGE_COMPANIES', 'MANAGE_COURSES', 'MANAGE_TIMESLOTS',
    'MANAGE_BOOKINGS', 'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS',
  ],
  PLATFORM_ADMIN: [
    'PLATFORM_COMPANY_MANAGE', 'PLATFORM_USER_MANAGE', 'PLATFORM_ANALYTICS', 'PLATFORM_SUPPORT',
    'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE', 'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS', 'VIEW_DASHBOARD', 'MANAGE_COMPANIES',
    'MANAGE_COURSES', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS', 'MANAGE_USERS',
    'MANAGE_ADMINS', 'VIEW_ANALYTICS',
  ],
  PLATFORM_SUPPORT: [
    'PLATFORM_SUPPORT', 'COMPANY_USER_MANAGE', 'COMPANY_BOOKING_MANAGE',
    'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'CUSTOMER_SUPPORT',
    'BOOKING_RECEPTION', 'VIEW_DASHBOARD', 'MANAGE_BOOKINGS', 'MANAGE_USERS',
  ],
  PLATFORM_ANALYST: [
    'PLATFORM_ANALYTICS', 'COMPANY_ANALYTICS', 'COURSE_ANALYTICS_VIEW',
    'READ_ONLY', 'VIEW_DASHBOARD', 'VIEW_ANALYTICS',
  ],
  COMPANY_OWNER: [
    'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE', 'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS', 'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW', 'VIEW_DASHBOARD', 'MANAGE_COURSES',
    'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS', 'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS',
  ],
  COMPANY_MANAGER: [
    'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE', 'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
    'VIEW_DASHBOARD', 'MANAGE_COURSES', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS',
    'MANAGE_USERS', 'VIEW_ANALYTICS',
  ],
  COURSE_MANAGER: [
    'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
    'BOOKING_RECEPTION', 'CUSTOMER_SUPPORT', 'VIEW_DASHBOARD', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS',
  ],
  STAFF: [
    'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'BOOKING_RECEPTION',
    'CUSTOMER_SUPPORT', 'VIEW_DASHBOARD', 'MANAGE_BOOKINGS',
  ],
  READONLY_STAFF: [
    'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW', 'READ_ONLY', 'VIEW_DASHBOARD',
  ],
};

const USER_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'PROFILE_VIEW', 'PROFILE_EDIT', 'COURSE_SEARCH', 'COURSE_VIEW', 'TIMESLOT_VIEW',
    'BOOKING_CREATE', 'BOOKING_VIEW', 'BOOKING_MODIFY', 'BOOKING_CANCEL', 'BOOKING_HISTORY',
    'PAYMENT_VIEW', 'PAYMENT_HISTORY', 'REFUND_REQUEST',
    'PREMIUM_BOOKING', 'PRIORITY_BOOKING', 'ADVANCED_SEARCH',
  ],
  MODERATOR: [
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
  VIEWER: [
    'PROFILE_VIEW', 'COURSE_SEARCH', 'COURSE_VIEW', 'TIMESLOT_VIEW',
    'BOOKING_VIEW', 'BOOKING_HISTORY', 'PAYMENT_VIEW', 'PAYMENT_HISTORY',
  ],
};

async function main() {
  console.log('Starting database seeding...');
  
  // 1. 권한 마스터 데이터 생성
  console.log('Creating permission masters...');
  const permissions = [
    // 플랫폼 권한
    { code: 'PLATFORM_ALL', name: '플랫폼 전체 관리', category: 'PLATFORM', level: 'high', description: '플랫폼 전체 관리 권한' },
    { code: 'PLATFORM_COMPANY_MANAGE', name: '플랫폼 회사 관리', category: 'PLATFORM', level: 'high', description: '플랫폼 내 회사 관리' },
    { code: 'PLATFORM_USER_MANAGE', name: '플랫폼 사용자 관리', category: 'PLATFORM', level: 'high', description: '플랫폼 사용자 관리' },
    { code: 'PLATFORM_SYSTEM_CONFIG', name: '시스템 설정', category: 'PLATFORM', level: 'high', description: '시스템 설정 관리' },
    { code: 'PLATFORM_ANALYTICS', name: '플랫폼 분석', category: 'PLATFORM', level: 'medium', description: '플랫폼 분석 데이터 조회' },
    { code: 'PLATFORM_SUPPORT', name: '플랫폼 지원', category: 'PLATFORM', level: 'medium', description: '플랫폼 고객 지원' },
    
    // 회사 권한
    { code: 'COMPANY_ALL', name: '회사 전체 관리', category: 'COMPANY', level: 'high', description: '회사 전체 관리 권한' },
    { code: 'COMPANY_ADMIN_MANAGE', name: '회사 관리자 관리', category: 'COMPANY', level: 'high', description: '회사 관리자 관리' },
    { code: 'COMPANY_COURSE_MANAGE', name: '회사 코스 관리', category: 'COMPANY', level: 'medium', description: '회사 코스 관리' },
    { code: 'COMPANY_BOOKING_MANAGE', name: '회사 예약 관리', category: 'COMPANY', level: 'medium', description: '회사 예약 관리' },
    { code: 'COMPANY_USER_MANAGE', name: '회사 사용자 관리', category: 'COMPANY', level: 'medium', description: '회사 사용자 관리' },
    { code: 'COMPANY_ANALYTICS', name: '회사 분석', category: 'COMPANY', level: 'low', description: '회사 분석 데이터 조회' },
    
    // 코스 권한
    { code: 'COURSE_TIMESLOT_MANAGE', name: '타임슬롯 관리', category: 'COURSE', level: 'medium', description: '타임슬롯 관리' },
    { code: 'COURSE_BOOKING_MANAGE', name: '코스 예약 관리', category: 'COURSE', level: 'medium', description: '예약 관리' },
    { code: 'COURSE_CUSTOMER_VIEW', name: '고객 정보 조회', category: 'COURSE', level: 'low', description: '고객 정보 조회' },
    { code: 'COURSE_ANALYTICS_VIEW', name: '코스 분석 조회', category: 'COURSE', level: 'low', description: '코스 분석 데이터 조회' },
    
    // 일반 관리 권한
    { code: 'VIEW_DASHBOARD', name: '대시보드 조회', category: 'GENERAL', level: 'low', description: '대시보드 조회' },
    { code: 'MANAGE_COMPANIES', name: '회사 관리', category: 'GENERAL', level: 'high', description: '회사 관리' },
    { code: 'MANAGE_COURSES', name: '코스 관리', category: 'GENERAL', level: 'medium', description: '코스 관리' },
    { code: 'MANAGE_TIMESLOTS', name: '타임슬롯 관리', category: 'GENERAL', level: 'medium', description: '타임슬롯 관리' },
    { code: 'MANAGE_BOOKINGS', name: '예약 관리', category: 'GENERAL', level: 'medium', description: '예약 관리' },
    { code: 'MANAGE_USERS', name: '사용자 관리', category: 'GENERAL', level: 'medium', description: '사용자 관리' },
    { code: 'MANAGE_ADMINS', name: '관리자 관리', category: 'GENERAL', level: 'high', description: '관리자 관리' },
    { code: 'VIEW_ANALYTICS', name: '분석 조회', category: 'GENERAL', level: 'low', description: '분석 데이터 조회' },
    
    // 고객 지원 권한
    { code: 'CUSTOMER_SUPPORT', name: '고객 지원', category: 'SUPPORT', level: 'low', description: '고객 지원' },
    { code: 'BOOKING_RECEPTION', name: '예약 접수', category: 'SUPPORT', level: 'low', description: '예약 접수' },
    { code: 'READ_ONLY', name: '읽기 전용', category: 'SUPPORT', level: 'low', description: '읽기 전용' },
    
    // 사용자 권한
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
    await prisma.permissionMaster.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }

  // 2. 역할 마스터 데이터 생성
  console.log('Creating role masters...');
  const roles = [
    // 관리자 역할
    { code: 'PLATFORM_OWNER', name: '플랫폼 소유자', userType: 'ADMIN', level: 10, description: '플랫폼 최고 책임자' },
    { code: 'PLATFORM_ADMIN', name: '플랫폼 관리자', userType: 'ADMIN', level: 9, description: '플랫폼 운영 총괄' },
    { code: 'PLATFORM_SUPPORT', name: '플랫폼 지원', userType: 'ADMIN', level: 7, description: '고객 문의 및 기술 지원' },
    { code: 'PLATFORM_ANALYST', name: '플랫폼 분석가', userType: 'ADMIN', level: 6, description: '플랫폼 데이터 분석 및 리포팅' },
    { code: 'COMPANY_OWNER', name: '회사 소유자', userType: 'ADMIN', level: 8, description: '회사 대표' },
    { code: 'COMPANY_MANAGER', name: '회사 관리자', userType: 'ADMIN', level: 5, description: '회사 운영 관리자' },
    { code: 'COURSE_MANAGER', name: '코스 관리자', userType: 'ADMIN', level: 4, description: '코스 전담 관리자' },
    { code: 'STAFF', name: '직원', userType: 'ADMIN', level: 3, description: '현장 직원' },
    { code: 'READONLY_STAFF', name: '조회 전용 직원', userType: 'ADMIN', level: 2, description: '데이터 조회 전담 직원' },
    
    // 사용자 역할
    { code: 'ADMIN', name: '관리자', userType: 'USER', level: 4, description: '사용자 관리자' },
    { code: 'MODERATOR', name: '모더레이터', userType: 'USER', level: 3, description: '사용자 모더레이터' },
    { code: 'USER', name: '일반 사용자', userType: 'USER', level: 2, description: '일반 사용자' },
    { code: 'VIEWER', name: '조회자', userType: 'USER', level: 1, description: '조회 전용 사용자' },
  ];

  for (const role of roles) {
    await prisma.roleMaster.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }

  // 3. 역할-권한 매핑 생성
  console.log('Creating role-permission mappings...');
  
  // 상수에서 가져온 역할별 권한 매트릭스를 사용하여 RolePermission 테이블에 데이터 삽입
  const allRolePermissions = { ...ADMIN_ROLE_PERMISSIONS, ...USER_ROLE_PERMISSIONS };
  
  for (const [roleCode, permissions] of Object.entries(allRolePermissions)) {
    for (const permissionCode of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleCode_permissionCode: {
            roleCode,
            permissionCode,
          }
        },
        update: {},
        create: {
          roleCode,
          permissionCode,
        },
      });
    }
  }
  
  // Park Golf Admin Dashboard 관리자들 (mockAdminData 기반)
  const parkGolfAdmins = [
    // 플랫폼 레벨 관리자
    {
      email: 'owner@parkgolf.com',
      password: 'admin123!@#',
      name: '김플랫폼',
      roleCode: 'PLATFORM_OWNER',
      phone: '010-1111-1111',
      department: '본사 경영진',
      description: '플랫폼 최고 책임자',
    },
    {
      email: 'admin@parkgolf.com',
      password: 'admin123!@#',
      name: '박운영',
      roleCode: 'PLATFORM_ADMIN',
      phone: '010-1111-2222',
      department: '본사 운영팀',
      description: '플랫폼 운영 총괄',
    },
    {
      email: 'support@parkgolf.com',
      password: 'admin123!@#',
      name: '이지원',
      roleCode: 'PLATFORM_SUPPORT',
      phone: '010-1111-3333',
      department: '고객 지원팀',
      description: '고객 문의 및 기술 지원',
    },
    {
      email: 'analyst@parkgolf.com',
      password: 'admin123!@#',
      name: '최분석',
      roleCode: 'PLATFORM_ANALYST',
      phone: '010-1111-4444',
      department: '데이터 분석팀',
      description: '플랫폼 데이터 분석 및 리포팅',
    },
    
    // 회사 레벨 관리자 - 강남 파크골프장
    {
      email: 'owner@gangnam-golf.com',
      password: 'admin123!@#',
      name: '강대표',
      roleCode: 'COMPANY_OWNER',
      phone: '010-2222-1111',
      department: '경영진',
      description: '강남 파크골프장 대표',
    },
    {
      email: 'manager@gangnam-golf.com',
      password: 'admin123!@#',
      name: '남운영',
      roleCode: 'COMPANY_MANAGER',
      phone: '010-2222-2222',
      department: '운영팀',
      description: '강남 파크골프장 운영 관리자',
    },
    {
      email: 'course-a@gangnam-golf.com',
      password: 'admin123!@#',
      name: '코스매니저A',
      roleCode: 'COURSE_MANAGER',
      phone: '010-2222-3333',
      department: '코스 운영팀',
      description: 'A코스 전담 관리자',
    },
    {
      email: 'staff-a@gangnam-golf.com',
      password: 'admin123!@#',
      name: '김직원A',
      roleCode: 'STAFF',
      phone: '010-2222-4444',
      department: '현장 운영팀',
      description: 'A코스 현장 직원',
    },
    
    // 회사 레벨 관리자 - 부산 파크골프장
    {
      email: 'owner@busan-golf.com',
      password: 'admin123!@#',
      name: '부대표',
      roleCode: 'COMPANY_OWNER',
      phone: '010-3333-1111',
      department: '경영진',
      description: '부산 파크골프장 대표',
    },
    {
      email: 'readonly@busan-golf.com',
      password: 'admin123!@#',
      name: '조회직원',
      roleCode: 'READONLY_STAFF',
      phone: '010-3333-2222',
      department: '정보 관리팀',
      description: '데이터 조회 전담 직원',
    },
    
    // 비활성 관리자 예시
    {
      email: 'inactive@example.com',
      password: 'admin123!@#',
      name: '비활성관리자',
      roleCode: 'STAFF',
      phone: '010-9999-9999',
      department: '퇴직자',
      description: '퇴사한 직원 (비활성 상태)',
      isActive: false,
    },
  ];


  console.log('Creating Park Golf administrators...');
  
  for (const adminData of parkGolfAdmins) {
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    const admin = await prisma.admin.upsert({
      where: { email: adminData.email },
      update: {},
      create: {
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        roleCode: adminData.roleCode,
        phone: adminData.phone,
        department: adminData.department,
        description: adminData.description,
        isActive: adminData.isActive ?? true,
      },
    });
    console.log(`Created admin: ${admin.email} (${admin.name} - ${admin.roleCode})`);
    
    // 관리자에게 권한 할당 (RolePermission 테이블에서 해당 역할의 권한 조회)
    const rolePermissionRecords = await prisma.rolePermission.findMany({
      where: { roleCode: adminData.roleCode },
      include: { permission: true }
    });
    
    const adminPermissions = rolePermissionRecords.map(rp => rp.permissionCode);
    for (const permissionCode of adminPermissions) {
      await prisma.adminPermission.upsert({
        where: {
          adminId_permission: {
            adminId: admin.id,
            permission: permissionCode
          }
        },
        update: {},
        create: {
          adminId: admin.id,
          permission: permissionCode
        }
      });
    }
    console.log(`Assigned ${adminPermissions.length} permissions to ${admin.email}`);
  }

  console.log('Creating user permissions...');
  
  // 기존 사용자들에게 권한 할당
  const users = await prisma.user.findMany();
  
  // 프리미엄 사용자 추가 권한 정의
  const premiumPermissions = [
    'PREMIUM_BOOKING',     // 프리미엄 타임슬롯 예약
    'PRIORITY_BOOKING',    // 우선 예약권
    'ADVANCED_SEARCH',     // 고급 검색 필터
  ];
  
  // 일부 사용자를 프리미엄으로 지정 (예: 이메일에 'premium' 포함 또는 특정 사용자)
  const premiumUserEmails = [
    'limjihye@parkgolf.com',      // 기존 ADMIN 역할 사용자를 프리미엄으로
    'kangminwoo@parkgolf.com',    // 기존 MODERATOR 역할 사용자를 프리미엄으로
    'jungsuyoung@parkgolf.com',   // 일반 사용자 중 프리미엄으로 승격
    'choijina@parkgolf.com',      // 일반 사용자 중 프리미엄으로 승격
  ];
  
  for (const user of users) {
    // 사용자의 역할을 기준으로 권한 할당 (RolePermission 테이블에서 조회)
    const userRole = user.roleCode || 'USER';
    const userRolePermissionRecords = await prisma.rolePermission.findMany({
      where: { roleCode: userRole },
      include: { permission: true }
    });
    
    const basePermissions = userRolePermissionRecords.map(rp => rp.permissionCode);
    
    // 기본 권한 할당
    for (const permissionCode of basePermissions) {
      await prisma.userPermission.upsert({
        where: {
          userId_permission: {
            userId: user.id,
            permission: permissionCode
          }
        },
        update: {},
        create: {
          userId: user.id,
          permission: permissionCode
        }
      });
    }
    
    // 프리미엄 사용자에게 추가 권한 할당
    const isPremiumUser = premiumUserEmails.includes(user.email);
    if (isPremiumUser && userRole === 'USER') {
      for (const permissionCode of premiumPermissions) {
        await prisma.userPermission.upsert({
          where: {
            userId_permission: {
              userId: user.id,
              permission: permissionCode
            }
          },
          update: {},
          create: {
            userId: user.id,
            permission: permissionCode
          }
        });
      }
      console.log(`⭐ Assigned ${basePermissions.length + premiumPermissions.length} permissions to PREMIUM user ${user.email} (${userRole})`);
    } else {
      console.log(`👤 Assigned ${basePermissions.length} permissions to user ${user.email} (${userRole})`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });