import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const testAdmins = [
    {
      username: 'admin',
      email: 'admin@parkgolf.com',
      password: 'admin123!',
      name: '일반 관리자',
      role: AdminRole.ADMIN,
      department: '운영팀',
      description: '일반 관리자 테스트 계정',
      phone: '010-1234-5678',
    },
    {
      username: 'moderator',
      email: 'moderator@parkgolf.com',
      password: 'mod123!',
      name: '운영자',
      role: AdminRole.MODERATOR,
      department: '고객지원팀',
      description: '운영자 테스트 계정',
      phone: '010-2345-6789',
    },
    {
      username: 'viewer',
      email: 'viewer@parkgolf.com',
      password: 'view123!',
      name: '조회자',
      role: AdminRole.VIEWER,
      department: '분석팀',
      description: '조회 권한만 있는 테스트 계정',
      phone: '010-3456-7890',
    },
    {
      username: 'manager',
      email: 'manager@parkgolf.com',
      password: 'manager123!',
      name: '김매니저',
      role: AdminRole.ADMIN,
      department: '관리팀',
      description: '매니저 테스트 계정',
      phone: '010-4567-8901',
    },
    {
      username: 'support',
      email: 'support@parkgolf.com',
      password: 'support123!',
      name: '이지원',
      role: AdminRole.MODERATOR,
      department: '고객지원팀',
      description: '고객지원 담당자',
      phone: '010-5678-9012',
    }
  ];

  console.log('🔧 Creating test admin accounts...');

  for (const adminData of testAdmins) {
    const { password, ...data } = adminData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.upsert({
      where: { username: data.username },
      update: {
        ...data,
        password: hashedPassword,
        isActive: true,
      },
      create: {
        ...data,
        password: hashedPassword,
        isActive: true,
      },
    });

    console.log(`✅ Created admin: ${admin.username} (${admin.name}) - ${admin.role}`);

    // Give permissions based on role
    const permissions = await prisma.permission.findMany();
    let allowedPermissions: any[] = [];

    switch (admin.role) {
      case AdminRole.SUPER_ADMIN:
        allowedPermissions = permissions; // All permissions
        break;
      case AdminRole.ADMIN:
        allowedPermissions = permissions.filter(p => 
          !p.code.includes('ADMIN_DELETE') && 
          p.level !== 'critical'
        );
        break;
      case AdminRole.MODERATOR:
        allowedPermissions = permissions.filter(p => 
          p.code.includes('_READ') || 
          p.code.includes('USER_') || 
          p.code.includes('COURSE_') ||
          p.code.includes('BOOKING_')
        );
        break;
      case AdminRole.VIEWER:
        allowedPermissions = permissions.filter(p => 
          p.code.includes('_READ')
        );
        break;
    }

    // Delete existing permissions
    await prisma.adminPermission.deleteMany({
      where: { adminId: admin.id },
    });

    // Grant new permissions
    for (const permission of allowedPermissions) {
      await prisma.adminPermission.create({
        data: {
          adminId: admin.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(`   🔑 Granted ${allowedPermissions.length} permissions`);
  }

  console.log('\n🎉 Test admin accounts created successfully!');
  console.log('\n📝 Login credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| Username    | Password    | Role        | Name         | Department    |');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| superadmin  | admin123!   | SUPER_ADMIN | 최고 관리자   | 시스템 관리   |');
  console.log('| admin       | admin123!   | ADMIN       | 일반 관리자   | 운영팀        |');
  console.log('| moderator   | mod123!     | MODERATOR   | 운영자        | 고객지원팀    |');
  console.log('| viewer      | view123!    | VIEWER      | 조회자        | 분석팀        |');
  console.log('| manager     | manager123! | ADMIN       | 김매니저      | 관리팀        |');
  console.log('| support     | support123! | MODERATOR   | 이지원        | 고객지원팀    |');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });