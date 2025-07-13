import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create default permissions
  const permissions = [
    // Admin management
    { code: 'ADMIN_READ', name: '관리자 조회', category: '관리자 관리', level: 'low' },
    { code: 'ADMIN_WRITE', name: '관리자 생성/수정', category: '관리자 관리', level: 'high' },
    { code: 'ADMIN_DELETE', name: '관리자 삭제', category: '관리자 관리', level: 'critical' },
    
    // User management
    { code: 'USER_READ', name: '사용자 조회', category: '사용자 관리', level: 'low' },
    { code: 'USER_WRITE', name: '사용자 생성/수정', category: '사용자 관리', level: 'medium' },
    { code: 'USER_DELETE', name: '사용자 삭제', category: '사용자 관리', level: 'high' },
    
    // Course management
    { code: 'COURSE_READ', name: '코스 조회', category: '코스 관리', level: 'low' },
    { code: 'COURSE_WRITE', name: '코스 생성/수정', category: '코스 관리', level: 'medium' },
    { code: 'COURSE_DELETE', name: '코스 삭제', category: '코스 관리', level: 'medium' },
    
    // Booking management
    { code: 'BOOKING_READ', name: '예약 조회', category: '예약 관리', level: 'low' },
    { code: 'BOOKING_WRITE', name: '예약 생성/수정', category: '예약 관리', level: 'medium' },
    { code: 'BOOKING_DELETE', name: '예약 삭제', category: '예약 관리', level: 'medium' },
    
    // System settings
    { code: 'SYSTEM_READ', name: '시스템 설정 조회', category: '시스템', level: 'medium' },
    { code: 'SYSTEM_WRITE', name: '시스템 설정 변경', category: '시스템', level: 'critical' },
  ];

  // Create permissions
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }

  console.log('✅ Permissions created');

  // Create super admin
  const hashedPassword = await bcrypt.hash('admin123!', 10);
  
  const superAdmin = await prisma.admin.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'superadmin@parkgolf.com',
      password: hashedPassword,
      name: '최고 관리자',
      role: AdminRole.SUPER_ADMIN,
      department: '시스템 관리',
      description: '시스템 최고 관리자',
      isActive: true,
    },
  });

  console.log('✅ Super admin created:', {
    username: superAdmin.username,
    email: superAdmin.email,
    role: superAdmin.role,
  });

  // Give all permissions to super admin
  const allPermissions = await prisma.permission.findMany();
  
  for (const permission of allPermissions) {
    await prisma.adminPermission.upsert({
      where: {
        adminId_permissionId: {
          adminId: superAdmin.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        adminId: superAdmin.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ All permissions granted to super admin');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });