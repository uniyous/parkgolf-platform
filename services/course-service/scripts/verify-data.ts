import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('📊 테스트 데이터 검증을 시작합니다...\n');

  // 회사 통계
  const companyCount = await prisma.company.count();
  const activeCompanies = await prisma.company.count({ where: { isActive: true } });
  console.log(`🏢 회사 통계:`);
  console.log(`  • 전체 회사: ${companyCount}개`);
  console.log(`  • 활성 회사: ${activeCompanies}개\n`);

  // 코스 통계  
  const courseCount = await prisma.course.count();
  const activeCourses = await prisma.course.count({ where: { status: 'ACTIVE' } });
  console.log(`⛳ 코스 통계:`);
  console.log(`  • 전체 코스: ${courseCount}개`);
  console.log(`  • 활성 코스: ${activeCourses}개\n`);

  // 홀 통계
  const holeCount = await prisma.hole.count();
  console.log(`🕳️  홀 통계:`);
  console.log(`  • 전체 홀: ${holeCount}개\n`);

  // 티박스 통계
  const teeBoxCount = await prisma.teeBox.count();
  console.log(`📍 티박스 통계:`);
  console.log(`  • 전체 티박스: ${teeBoxCount}개\n`);

  // 주간 스케줄 통계
  const scheduleCount = await prisma.courseWeeklySchedule.count();
  const activeSchedules = await prisma.courseWeeklySchedule.count({ where: { isActive: true } });
  console.log(`📅 주간 스케줄 통계:`);
  console.log(`  • 전체 스케줄: ${scheduleCount}개`);
  console.log(`  • 활성 스케줄: ${activeSchedules}개\n`);

  // 샘플 회사 5개 조회
  console.log(`🏢 샘플 회사 목록 (상위 5개):`);
  const sampleCompanies = await prisma.company.findMany({
    take: 5,
    include: {
      courses: {
        take: 2,
        include: {
          holes: {
            take: 3
          }
        }
      }
    }
  });

  sampleCompanies.forEach((company, index) => {
    console.log(`  ${index + 1}. ${company.name}`);
    console.log(`     📧 ${company.email}`);
    console.log(`     📍 ${company.address}`);
    console.log(`     📞 ${company.phoneNumber}`);
    console.log(`     ⛳ 코스 ${company.courses.length}개:`);
    
    company.courses.forEach((course, courseIndex) => {
      console.log(`        ${courseIndex + 1}. ${course.name} (${course.status})`);
      console.log(`           🕳️  홀 ${course.holes.length}개 (샘플)`);
    });
    console.log('');
  });

  // 회사별 코스 수 분포
  console.log(`📊 회사별 코스 수 분포:`);
  const coursesPerCompany = await prisma.company.findMany({
    select: {
      name: true,
      _count: {
        select: {
          courses: true
        }
      }
    },
    orderBy: {
      courses: {
        _count: 'desc'
      }
    },
    take: 10
  });

  coursesPerCompany.forEach((company, index) => {
    console.log(`  ${index + 1}. ${company.name}: ${company._count.courses}개 코스`);
  });

  console.log('\n✅ 데이터 검증이 완료되었습니다!');
  console.log('🎯 테스트 준비가 완료되었습니다. 관리자 대시보드에서 확인해보세요.');
}

verifyData()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ 데이터 검증 중 오류 발생:', e);
    await prisma.$disconnect();
    process.exit(1);
  });